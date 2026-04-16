-- ============================================================
-- Budget Tracker — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
--
-- Before running:
--   1. In Supabase Dashboard → Authentication → Settings
--      disable "Enable email confirmations" for local dev
--   2. After running, go to Authentication → Hooks and
--      register get_dashboard_summary as a DB function if needed
-- ============================================================

-- ── Tables ────────────────────────────────────────────────────────────────

-- profiles: extends auth.users with name + role
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  monthly_limit NUMERIC(12,2) NOT NULL,
  month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          INTEGER NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES public.categories(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category_id, month, year)
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      NUMERIC(12,2) NOT NULL,
  description TEXT,
  date        TIMESTAMPTZ NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id   UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Auto-create profile on signup ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), 'USER');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────

ALTER TABLE public.profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses   ENABLE ROW LEVEL SECURITY;

-- is_admin(): SECURITY DEFINER so it bypasses RLS when querying profiles,
-- preventing infinite recursion in policies that check admin status.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN');
$$;

-- profiles
DROP POLICY IF EXISTS "profiles_select_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_select"        ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON public.profiles;
CREATE POLICY "profiles_select"     ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- categories: all authenticated users read; only admins write
DROP POLICY IF EXISTS "categories_select_auth" ON public.categories;
DROP POLICY IF EXISTS "categories_write_admin" ON public.categories;
CREATE POLICY "categories_select_auth" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_write_admin" ON public.categories FOR ALL USING (public.is_admin());

-- budgets
DROP POLICY IF EXISTS "budgets_own"          ON public.budgets;
DROP POLICY IF EXISTS "budgets_admin_select" ON public.budgets;
CREATE POLICY "budgets_own"          ON public.budgets FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "budgets_admin_select" ON public.budgets FOR SELECT USING (public.is_admin());

-- expenses
DROP POLICY IF EXISTS "expenses_own"          ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_select" ON public.expenses;
CREATE POLICY "expenses_own"          ON public.expenses FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "expenses_admin_select" ON public.expenses FOR SELECT USING (public.is_admin());

-- ── Helper: assert caller is admin ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Forbidden: admin access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ── Dashboard RPC ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_month INT, p_year INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_uid        UUID := auth.uid();
  v_from       TIMESTAMPTZ := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_to         TIMESTAMPTZ := v_from + INTERVAL '1 month';
  v_spent      NUMERIC;
  v_budgeted   NUMERIC;
  v_exp_count  INT;
  v_bud_count  INT;
  v_cat_break  JSONB;
  v_bva        JSONB;
  v_trend      JSONB;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
    INTO v_spent, v_exp_count
    FROM public.expenses
   WHERE user_id = v_uid AND date >= v_from AND date < v_to;

  SELECT COALESCE(SUM(monthly_limit), 0), COUNT(*)
    INTO v_budgeted, v_bud_count
    FROM public.budgets
   WHERE user_id = v_uid AND month = p_month AND year = p_year;

  -- Category breakdown
  SELECT COALESCE(jsonb_agg(cb ORDER BY cb->>'totalSpent' DESC), '[]'::JSONB)
    INTO v_cat_break
    FROM (
      SELECT jsonb_build_object(
        'id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color,
        'totalSpent', COALESCE(SUM(e.amount), 0)
      ) AS cb
      FROM public.expenses e
      JOIN public.categories c ON c.id = e.category_id
     WHERE e.user_id = v_uid AND e.date >= v_from AND e.date < v_to
     GROUP BY c.id, c.name, c.icon, c.color
    ) t;

  -- Budget vs actual
  SELECT COALESCE(jsonb_agg(bva), '[]'::JSONB)
    INTO v_bva
    FROM (
      SELECT jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'category', jsonb_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color),
        'monthlyLimit', b.monthly_limit,
        'totalSpent', COALESCE(SUM(e.amount), 0),
        'remaining', b.monthly_limit - COALESCE(SUM(e.amount), 0)
      ) AS bva
      FROM public.budgets b
      JOIN public.categories c ON c.id = b.category_id
      LEFT JOIN public.expenses e ON e.budget_id = b.id AND e.user_id = v_uid
     WHERE b.user_id = v_uid AND b.month = p_month AND b.year = p_year
     GROUP BY b.id, b.name, b.monthly_limit, c.id, c.name, c.icon, c.color
    ) t;

  -- Monthly trend (last 6 months)
  SELECT COALESCE(jsonb_agg(mt), '[]'::JSONB)
    INTO v_trend
    FROM (
      SELECT jsonb_build_object(
        'month', EXTRACT(MONTH FROM gs)::INT,
        'year',  EXTRACT(YEAR  FROM gs)::INT,
        'total', COALESCE((
          SELECT SUM(amount) FROM public.expenses
           WHERE user_id = v_uid
             AND date >= gs AND date < gs + INTERVAL '1 month'
        ), 0)
      ) AS mt
      FROM generate_series(
        date_trunc('month', NOW()) - INTERVAL '5 months',
        date_trunc('month', NOW()),
        INTERVAL '1 month'
      ) gs
    ) t;

  RETURN jsonb_build_object(
    'period',            jsonb_build_object('month', p_month, 'year', p_year),
    'totals',            jsonb_build_object(
                           'spent', v_spent, 'budgeted', v_budgeted,
                           'remaining', v_budgeted - v_spent,
                           'expenseCount', v_exp_count, 'budgetCount', v_bud_count),
    'categoryBreakdown', v_cat_break,
    'budgetVsActual',    v_bva,
    'monthlyTrend',      v_trend
  );
END;
$$;

-- ── Admin RPC functions ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_now          TIMESTAMPTZ := NOW();
  v_month_start  TIMESTAMPTZ := date_trunc('month', v_now);
  v_month_end    TIMESTAMPTZ := v_month_start + INTERVAL '1 month';
  v_last_start   TIMESTAMPTZ := v_month_start - INTERVAL '1 month';
  v_total_users  INT; v_total_budgets INT; v_total_expenses INT;
  v_spent_this   NUMERIC; v_spent_last NUMERIC;
  v_budgeted     NUMERIC; v_bud_count INT;
  v_new_users    INT; v_active_users INT;
  v_top_cats     JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COUNT(*) INTO v_total_users    FROM public.profiles;
  SELECT COUNT(*) INTO v_total_budgets  FROM public.budgets;
  SELECT COUNT(*) INTO v_total_expenses FROM public.expenses;

  SELECT COALESCE(SUM(amount),0) INTO v_spent_this FROM public.expenses WHERE date >= v_month_start AND date < v_month_end;
  SELECT COALESCE(SUM(amount),0) INTO v_spent_last FROM public.expenses WHERE date >= v_last_start  AND date < v_month_start;
  SELECT COALESCE(SUM(monthly_limit),0), COUNT(*) INTO v_budgeted, v_bud_count
    FROM public.budgets WHERE month = EXTRACT(MONTH FROM v_now)::INT AND year = EXTRACT(YEAR FROM v_now)::INT;

  SELECT COUNT(*) INTO v_new_users    FROM public.profiles WHERE created_at >= v_month_start;
  SELECT COUNT(DISTINCT user_id) INTO v_active_users FROM public.expenses WHERE date >= v_month_start AND date < v_month_end;

  SELECT COALESCE(jsonb_agg(tc), '[]'::JSONB) INTO v_top_cats FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'name', c.name, 'icon', c.icon, 'color', c.color,
      'totalSpent', COALESCE(SUM(e.amount),0), 'expenseCount', COUNT(*)
    ) AS tc
    FROM public.expenses e
    JOIN public.categories c ON c.id = e.category_id
   WHERE e.date >= v_month_start AND e.date < v_month_end
   GROUP BY c.id, c.name, c.icon, c.color
   ORDER BY COALESCE(SUM(e.amount),0) DESC
   LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'users',         jsonb_build_object('total', v_total_users, 'newThisMonth', v_new_users, 'activeThisMonth', v_active_users),
    'budgets',       jsonb_build_object('total', v_total_budgets, 'activeThisMonth', v_bud_count, 'totalLimitThisMonth', v_budgeted),
    'expenses',      jsonb_build_object(
                       'total', v_total_expenses, 'spentThisMonth', v_spent_this, 'spentLastMonth', v_spent_last,
                       'spendingChange', CASE WHEN v_spent_last > 0 THEN ROUND(((v_spent_this - v_spent_last)/v_spent_last)*100,1) ELSE NULL END),
    'topCategories', v_top_cats
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users(
  p_page   INT  DEFAULT 1,
  p_limit  INT  DEFAULT 10,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_offset      INT := (p_page - 1) * p_limit;
  v_now         TIMESTAMPTZ := NOW();
  v_month_start TIMESTAMPTZ := date_trunc('month', v_now);
  v_month_end   TIMESTAMPTZ := v_month_start + INTERVAL '1 month';
  v_total       INT;
  v_users       JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COUNT(*) INTO v_total
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
   WHERE p_search IS NULL
      OR p.name   ILIKE '%' || p_search || '%'
      OR au.email ILIKE '%' || p_search || '%';

  SELECT COALESCE(jsonb_agg(u), '[]'::JSONB) INTO v_users FROM (
    SELECT jsonb_build_object(
      'id',        p.id,
      'name',      p.name,
      'email',     au.email,
      'role',      p.role,
      'createdAt', p.created_at,
      'stats', jsonb_build_object(
        'budgetCount',       (SELECT COUNT(*) FROM public.budgets  WHERE user_id = p.id),
        'expenseCount',      (SELECT COUNT(*) FROM public.expenses WHERE user_id = p.id),
        'allTimeSpent',      COALESCE((SELECT SUM(amount) FROM public.expenses WHERE user_id = p.id), 0),
        'thisMonthSpent',    COALESCE((SELECT SUM(amount) FROM public.expenses WHERE user_id = p.id AND date >= v_month_start AND date < v_month_end), 0),
        'thisMonthBudgeted', COALESCE((SELECT SUM(monthly_limit) FROM public.budgets WHERE user_id = p.id AND month = EXTRACT(MONTH FROM v_now)::INT AND year = EXTRACT(YEAR FROM v_now)::INT), 0),
        'lastActiveAt',      (SELECT date FROM public.expenses WHERE user_id = p.id ORDER BY date DESC LIMIT 1)
      )
    ) AS u
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
   WHERE p_search IS NULL
      OR p.name   ILIKE '%' || p_search || '%'
      OR au.email ILIKE '%' || p_search || '%'
   ORDER BY p.created_at DESC
   LIMIT p_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('data', v_users, 'total', v_total, 'page', p_page, 'limit', p_limit);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_result JSONB;
BEGIN
  PERFORM public.assert_admin();
  IF p_role NOT IN ('ADMIN', 'USER') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  UPDATE public.profiles SET role = p_role WHERE id = p_user_id;
  SELECT jsonb_build_object('id', p.id, 'name', p.name, 'email', au.email, 'role', p.role)
    INTO v_result
    FROM public.profiles p JOIN auth.users au ON au.id = p.id
   WHERE p.id = p_user_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.assert_admin();
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- ── Seed categories ──────────────────────────────────────────────────────

INSERT INTO public.categories (name, icon, color) VALUES
  ('Food & Dining',  '🍽️', '#FF6B6B'),
  ('Transport',      '🚗', '#4ECDC4'),
  ('Housing',        '🏠', '#45B7D1'),
  ('Entertainment',  '🎬', '#96CEB4'),
  ('Healthcare',     '💊', '#FFEAA7'),
  ('Shopping',       '🛍️', '#DDA0DD'),
  ('Education',      '📚', '#98D8C8'),
  ('Travel',         '✈️', '#F7DC6F'),
  ('Utilities',      '💡', '#A8E6CF'),
  ('Other',          '📦', '#B0BEC5')
ON CONFLICT (name) DO NOTHING;
