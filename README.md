# Budget Tracker

A production-ready fullstack budget tracking application powered by Angular and Supabase.

## Tech Stack

**Frontend**
- Angular 21 — feature-based clean architecture
- Angular Material — responsive UI components
- `@supabase/supabase-js` — Supabase client (auth + database)

**Backend (Supabase)**
- Supabase Auth — register, login, session management, token refresh
- PostgreSQL — hosted database with Row Level Security (RLS)
- PostgREST — auto-generated REST API from DB schema
- PostgreSQL Functions — dashboard aggregations and admin operations via `supabase.rpc()`

## Features

- **Authentication** — register, login, logout with Supabase Auth (sessions auto-refreshed)
- **Role-based access control** — Admin / User roles stored in `profiles` table, enforced via RLS
- **Budget management** — create, update, delete budgets with monthly limits per category
- **Expense tracking** — add/edit/delete expenses linked to categories and budgets
- **Dashboard** — spending summary with monthly breakdown and category distribution charts
- **Admin panel** — user management, platform stats (admin role required)
- **Security** — Row Level Security on every table; no backend server to maintain

## Database Schema

| Table      | Key columns                                                       |
|------------|-------------------------------------------------------------------|
| profiles   | id (→ auth.users), name, role (ADMIN\|USER)                       |
| categories | id, name, icon, color                                             |
| budgets    | id, name, monthly_limit, month, year, user_id, category_id        |
| expenses   | id, amount, description, date, user_id, budget_id, category_id   |

## Project Structure

```
budget-tracker/
├── frontend/               # Angular app
│   └── src/app/
│       ├── core/
│       │   ├── services/   # SupabaseService, AuthService, BudgetService, etc.
│       │   ├── guards/     # authGuard, guestGuard, adminGuard
│       │   └── models/     # TypeScript interfaces
│       ├── features/       # Auth, dashboard, budgets, expenses, categories, admin
│       └── shared/         # Reusable components (spinner, alert)
├── supabase/
│   └── schema.sql          # Full DB schema: tables, RLS, triggers, RPC functions
├── docker-compose.yml      # Frontend container only
└── README.md
```

## Getting Started

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then:

1. Open the **SQL Editor** and run the full contents of [`supabase/schema.sql`](supabase/schema.sql)
2. In **Authentication → Settings**, disable **"Enable email confirmations"** for local development
3. Copy your **Project URL** and **anon public key** from **Project Settings → API**

### 2. Configure the frontend

Edit `frontend/src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};
```

### 3. Run locally

```bash
cd frontend
npm install
ng serve
# → http://localhost:4200
```

### Run with Docker

```bash
docker-compose up --build
# → http://localhost:4200
```

## Development Commands

```bash
cd frontend
ng serve          # dev server
ng build          # production build → dist/
ng test           # unit tests
```

## Supabase RPC Functions

Complex queries are implemented as PostgreSQL functions called via `supabase.rpc()`:

| Function | Description |
|---|---|
| `get_dashboard_summary(p_month, p_year)` | Spending totals, category breakdown, budget vs actual, 6-month trend |
| `get_admin_overview()` | Platform-wide stats (admin only) |
| `get_admin_users(p_page, p_limit, p_search)` | Paginated user list with per-user stats (admin only) |
| `admin_update_user_role(p_user_id, p_role)` | Change a user's role (admin only) |
| `admin_delete_user(p_user_id)` | Delete a user and all their data (admin only) |

## License

MIT
