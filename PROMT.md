You are a senior fullstack architect and engineer.

I want you to design and implement a production-ready fullstack budget tracking application with the following stack:

Frontend:

- Angular (latest version)
- Clean architecture (feature-based structure)
- State management (NgRx or a well-structured service-based approach)
- Responsive UI (use Angular Material or similar)

Backend:

- NestJS (latest version)
- Follow modular architecture (controllers, services, modules)
- Use DTOs, validation (class-validator), and guards
- JWT-based authentication and authorization
- Role-based access control (Admin, User)

Database:

- PostgreSQL
- ORM: Prisma or TypeORM (explain choice)
- Managed via pgAdmin

Core Features:

1. User Authentication
   - Register, login, logout
   - Password hashing (bcrypt)
   - JWT access + refresh tokens

2. User Roles
   - Admin: manage users, view all data
   - User: manage own budget

3. Budget Management
   - Create, update, delete budgets
   - Categories (e.g., food, transport, rent)
   - Monthly limits

4. Expense Tracking
   - Add/edit/delete expenses
   - Link expenses to categories
   - Track totals vs budget

5. Dashboard
   - Summary of spending
   - Charts (monthly breakdown, category distribution)

6. API Requirements
   - RESTful design
   - Proper error handling
   - Pagination, filtering

7. Security
   - Input validation
   - Rate limiting
   - CORS configuration

8. DevOps / Setup
   - Docker support (frontend + backend + db)
   - Environment configs (.env)
   - Clear README with setup steps

What I want from you:

1. System Design
   - Folder structure for frontend and backend
   - Database schema design

2. Step-by-step Implementation Plan

3. Backend Code
   - Auth module
   - User module
   - Budget & Expense modules

4. Frontend Code
   - Auth pages
   - Dashboard
   - Budget & expense UI

5. Database Schema (SQL or ORM models)

6. API contract (endpoints list)

7. Best practices and scalability considerations

Important:

- Write clean, maintainable, scalable code
- Use TypeScript everywhere
- Explain key decisions briefly
- Do NOT skip implementation details
- Assume this project may go to production

If the response is too long, split it into multiple parts and continue automatically.
