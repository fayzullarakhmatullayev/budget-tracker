# Budget Tracker — Claude Code Context

## Project Overview

A production-ready fullstack budget tracking application.

- **Frontend**: Angular 21, feature-based architecture, Angular Material, `@supabase/supabase-js`
- **Backend**: Supabase (Auth + PostgreSQL + RLS + PostgreSQL functions) — no custom server
- **Infrastructure**: Docker Compose (frontend container only)

## Architecture Decisions

- **Supabase over NestJS+Prisma**: eliminates the backend server entirely; auth, DB, and security are handled by Supabase
- **Row Level Security**: every table has RLS policies — ownership is enforced at the DB level, not in application code
- **Supabase Auth**: handles token issuance, refresh, and session storage automatically; no manual JWT logic
- **PostgreSQL functions (RPC)**: complex aggregations (dashboard, admin stats) live as `SECURITY DEFINER` or `INVOKER` functions, called via `supabase.rpc()`
- **Role-based access**: `ADMIN` and `USER` roles stored in the `profiles` table; admin operations are gated via `assert_admin()` inside each RPC function
- **Feature-based folder structure**: each Angular feature (auth, budgets, expenses, dashboard, admin) is self-contained under `src/app/features/`

## Key File Locations

| Area | Path |
|------|------|
| Supabase schema | `supabase/schema.sql` |
| Supabase client | `frontend/src/app/core/services/supabase.service.ts` |
| Auth service | `frontend/src/app/core/services/auth.service.ts` |
| Budget service | `frontend/src/app/core/services/budget.service.ts` |
| Expense service | `frontend/src/app/core/services/expense.service.ts` |
| Category service | `frontend/src/app/core/services/category.service.ts` |
| Dashboard service | `frontend/src/app/core/services/dashboard.service.ts` |
| Admin service | `frontend/src/app/core/services/admin.service.ts` |
| Auth guard | `frontend/src/app/core/guards/auth.guard.ts` |
| Admin guard | `frontend/src/app/core/guards/admin.guard.ts` |
| Angular entry | `frontend/src/main.ts` |
| App routes | `frontend/src/app/app.routes.ts` |
| App config | `frontend/src/app/app.config.ts` |
| Environment (dev) | `frontend/src/environments/environment.ts` |
| Docker Compose | `docker-compose.yml` |

## Development Commands

```bash
cd frontend
ng serve                   # dev server at localhost:4200
ng build                   # production build → dist/
ng test                    # unit tests (Karma)
ng generate component ...  # scaffold component
```

```bash
docker-compose up --build  # start frontend container
docker-compose down        # stop
```

## Environment Variables

`frontend/src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};
```

## Database Models

- **profiles** — id (FK → auth.users), name, role (ADMIN|USER)
- **categories** — name, icon, color (shared across all users, admin-writable)
- **budgets** — monthly_limit per category per month/year, belongs to user
- **expenses** — amount, date, description, linked to category and optionally budget

Unique constraint on budgets: `(user_id, category_id, month, year)`

## Supabase RPC Functions

| Function | Security | Description |
|---|---|---|
| `get_dashboard_summary(p_month, p_year)` | INVOKER | Per-user dashboard data |
| `get_admin_overview()` | DEFINER | Platform stats (calls assert_admin) |
| `get_admin_users(p_page, p_limit, p_search)` | DEFINER | Paginated user list (calls assert_admin) |
| `admin_update_user_role(p_user_id, p_role)` | DEFINER | Update role (calls assert_admin) |
| `admin_delete_user(p_user_id)` | DEFINER | Delete auth user (calls assert_admin) |
| `assert_admin()` | INVOKER | Raises 42501 if caller is not ADMIN |
| `handle_new_user()` | DEFINER | Trigger: creates profile on auth.users insert |

## Data Service Pattern

All frontend services (budget, expense, category, dashboard, admin) follow this pattern:
- Inject `SupabaseService` to get the client
- Wrap Supabase promise calls in `from()` from rxjs to return `Observable<T>`
- Map snake_case DB columns to camelCase TypeScript models in a private `mapX()` method
- Throw `{ error: { message } }` on errors to match existing component error handling

## Auth Flow

1. `supabase.auth.signUp()` / `signInWithPassword()` → Supabase issues a session
2. `handle_new_user` trigger auto-creates a `profiles` row with name from metadata
3. `AuthService` calls `loadProfile()` to fetch name + role and populate the `_user` signal
4. `onAuthStateChange` keeps the signal in sync across tabs and after token refresh
5. Guards call `sb.auth.getSession()` directly (async) — no localStorage checks

## Original Project Specification

You are a senior fullstack architect and engineer.

Design and implement a production-ready fullstack budget tracking application with the following stack:

**Frontend**: Angular (latest), clean architecture (feature-based), state management (NgRx or service-based), responsive UI (Angular Material)

**Backend**: Supabase (Auth + PostgreSQL + RLS + Edge Functions if needed)

**Database**: PostgreSQL via Supabase, Row Level Security policies

### Core Features

1. **User Authentication** — register, login, logout, Supabase Auth
2. **User Roles** — Admin (manage users, view all data), User (manage own budget)
3. **Budget Management** — create/update/delete budgets, categories, monthly limits
4. **Expense Tracking** — add/edit/delete expenses, link to categories, track totals vs budget
5. **Dashboard** — spending summary, charts (monthly breakdown, category distribution)
6. **API** — Supabase client queries + RPC functions, pagination, filtering
7. **Security** — RLS on every table, input validation, admin-only RPC gate
8. **DevOps** — Docker support for frontend, Supabase cloud for backend

**Constraints**: TypeScript everywhere, clean/maintainable/scalable code, production-ready.
