# Budget Tracker — Claude Code Context

## Project Overview

A production-ready fullstack budget tracking application.

- **Frontend**: Angular 21, feature-based architecture, Angular Material, HTTP interceptors
- **Backend**: NestJS, modular architecture, Prisma ORM, PostgreSQL, JWT auth
- **Infrastructure**: Docker Compose (frontend + backend + db + pgAdmin)

## Architecture Decisions

- **Prisma over TypeORM**: better DX, type-safe client, cleaner migrations
- **JWT access + refresh tokens**: short-lived access tokens (15m), long-lived refresh tokens (7d)
- **Role-based access**: `ADMIN` and `USER` roles defined in the Prisma schema and enforced via `RolesGuard`
- **Feature-based folder structure** on the frontend — each feature (auth, budgets, expenses, dashboard, admin) is self-contained under `src/app/features/`

## Key File Locations

| Area | Path |
|------|------|
| Prisma schema | `backend/prisma/schema.prisma` |
| Seed data | `backend/prisma/seed.ts` |
| NestJS entry | `backend/src/main.ts` |
| App module | `backend/src/app.module.ts` |
| Auth module | `backend/src/auth/` |
| Common guards/decorators | `backend/src/common/` |
| Angular entry | `frontend/src/main.ts` |
| App routes | `frontend/src/app/app.routes.ts` |
| Core services | `frontend/src/app/core/services/` |
| Auth guard | `frontend/src/app/core/guards/auth.guard.ts` |
| Admin guard | `frontend/src/app/core/guards/admin.guard.ts` |
| JWT interceptor | `frontend/src/app/core/interceptors/auth.interceptor.ts` |
| Docker Compose | `docker-compose.yml` |

## Development Commands

### Backend
```bash
cd backend
npm run start:dev          # dev server with watch
npx prisma migrate dev     # run migrations
npx prisma db seed         # seed database
npx prisma studio          # visual DB browser
npm run test               # unit tests
npm run test:e2e           # e2e tests
```

### Frontend
```bash
cd frontend
ng serve                   # dev server at localhost:4200
ng build                   # production build → dist/
ng test                    # unit tests (Karma)
ng generate component ...  # scaffold component
```

### Docker
```bash
docker-compose up --build  # start all services
docker-compose down        # stop all services
```

## Environment Variables

Backend requires `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:admin@localhost:5432/budget_tracker
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

## Database Models

- **User** — email, password (bcrypt), name, role (ADMIN|USER), refreshToken
- **Category** — name, icon, color (shared across all users)
- **Budget** — monthlyLimit per category per month/year, belongs to User
- **Expense** — amount, date, description, linked to Category and optionally Budget

Unique constraint on Budget: `(userId, categoryId, month, year)` — one budget per category per month.

## API Conventions

- All protected routes require `Authorization: Bearer <access_token>`
- Pagination via `?page=1&limit=10` query params
- Filtering on expenses: `?categoryId=`, `?budgetId=`, `?startDate=`, `?endDate=`
- Error responses follow NestJS `HttpException` format via `HttpExceptionFilter`
- Admin-only routes are guarded by `RolesGuard` + `@Roles(Role.ADMIN)` decorator

## Original Project Specification

You are a senior fullstack architect and engineer.

Design and implement a production-ready fullstack budget tracking application with the following stack:

**Frontend**: Angular (latest), clean architecture (feature-based), state management (NgRx or service-based), responsive UI (Angular Material)

**Backend**: NestJS (latest), modular architecture, DTOs + class-validator, JWT auth, role-based access control

**Database**: PostgreSQL, Prisma ORM, managed via pgAdmin

### Core Features

1. **User Authentication** — register, login, logout, bcrypt, JWT access + refresh tokens
2. **User Roles** — Admin (manage users, view all data), User (manage own budget)
3. **Budget Management** — create/update/delete budgets, categories, monthly limits
4. **Expense Tracking** — add/edit/delete expenses, link to categories, track totals vs budget
5. **Dashboard** — spending summary, charts (monthly breakdown, category distribution)
6. **API** — RESTful, proper error handling, pagination, filtering
7. **Security** — input validation, rate limiting, CORS
8. **DevOps** — Docker support, .env configs

### Deliverables

1. System design — folder structure, database schema
2. Step-by-step implementation plan
3. Backend code — auth, user, budget, expense modules
4. Frontend code — auth pages, dashboard, budget & expense UI
5. Database schema (Prisma models)
6. API contract (endpoints list)
7. Best practices and scalability considerations

**Constraints**: TypeScript everywhere, clean/maintainable/scalable code, production-ready.
