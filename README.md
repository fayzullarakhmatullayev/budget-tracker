# Budget Tracker

A production-ready fullstack budget tracking application built with Angular and NestJS.

## Tech Stack

**Frontend**
- Angular 21 — feature-based clean architecture
- Angular Material — responsive UI components
- HTTP Interceptors — automatic JWT token injection

**Backend**
- NestJS — modular architecture with controllers, services, and guards
- Prisma ORM — type-safe database client with migrations
- PostgreSQL 16 — relational database
- JWT — access + refresh token authentication
- bcrypt — password hashing
- class-validator — DTO validation

**Infrastructure**
- Docker Compose — orchestrates all services (frontend, backend, db, pgAdmin)

## Features

- **Authentication** — register, login, logout with JWT access + refresh tokens
- **Role-based access control** — Admin (manage all users and data) / User (manage own data)
- **Budget management** — create, update, delete budgets with monthly limits per category
- **Expense tracking** — add/edit/delete expenses linked to categories and budgets
- **Dashboard** — spending summary with monthly breakdown and category distribution charts
- **Admin panel** — user management for administrators
- **API** — RESTful endpoints with pagination, filtering, and proper error handling
- **Security** — input validation, rate limiting, CORS configuration

## Database Schema

| Model    | Key Fields                                           |
|----------|------------------------------------------------------|
| User     | id, email, password, name, role, refreshToken        |
| Category | id, name, icon, color                                |
| Budget   | id, name, monthlyLimit, month, year, userId, categoryId |
| Expense  | id, amount, description, date, userId, budgetId, categoryId |

## Project Structure

```
Budget Tracker/
├── frontend/               # Angular app
│   └── src/app/
│       ├── core/           # Services, guards, interceptors, models
│       ├── features/       # Auth, dashboard, budgets, expenses, categories, admin
│       └── shared/         # Reusable components (spinner, alert)
├── backend/                # NestJS app
│   └── src/
│       ├── auth/           # JWT auth, strategies, guards
│       ├── users/          # User module
│       ├── budgets/        # Budget module
│       ├── expenses/       # Expense module
│       ├── categories/     # Category module
│       ├── dashboard/      # Dashboard aggregation
│       ├── admin/          # Admin module
│       ├── prisma/         # Prisma service & module
│       └── common/         # Decorators, filters, guards, DTOs
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Seed data
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- Node.js 20+ (for local development without Docker)

### Run with Docker

```bash
docker-compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:4200       |
| Backend  | http://localhost:3000       |
| pgAdmin  | http://localhost:5050       |

pgAdmin credentials: `admin@budget.com` / `admin`

### Local Development

**Backend**

```bash
cd backend
npm install
cp .env.example .env   # configure DATABASE_URL and JWT secrets
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

**Frontend**

```bash
cd frontend
npm install
ng serve
```

### Environment Variables (Backend)

Create `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:admin@localhost:5432/budget_tracker
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

## API Overview

| Method | Endpoint                  | Description              | Auth     |
|--------|---------------------------|--------------------------|----------|
| POST   | /auth/register            | Register new user        | Public   |
| POST   | /auth/login               | Login                    | Public   |
| POST   | /auth/refresh             | Refresh access token     | Refresh  |
| POST   | /auth/logout              | Logout                   | JWT      |
| GET    | /users/me                 | Get current user         | JWT      |
| GET    | /budgets                  | List budgets (paginated) | JWT      |
| POST   | /budgets                  | Create budget            | JWT      |
| PATCH  | /budgets/:id              | Update budget            | JWT      |
| DELETE | /budgets/:id              | Delete budget            | JWT      |
| GET    | /expenses                 | List expenses (paginated)| JWT      |
| POST   | /expenses                 | Create expense           | JWT      |
| PATCH  | /expenses/:id             | Update expense           | JWT      |
| DELETE | /expenses/:id             | Delete expense           | JWT      |
| GET    | /categories               | List categories          | JWT      |
| GET    | /dashboard                | Dashboard summary        | JWT      |
| GET    | /admin/users              | List all users           | Admin    |

## License

MIT
