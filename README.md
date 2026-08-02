# Task CRUD API

A production-shaped task management API built with TypeScript, Express, PostgreSQL, Docker Compose, and Supabase Auth. It combines persistent CRUD storage with sign-up, login, logout, verified JWT bearer tokens, protected routes, interactive documentation, a browser interface, and automated tests.

## Features

- Complete create, read, update, and delete workflow.
- PostgreSQL persistence through a named Docker volume.
- One-command app and database startup with Docker Compose.
- Repository abstraction separating HTTP behavior from storage.
- Zod validation with consistent JSON errors.
- Parameterized SQL queries throughout the PostgreSQL repository.
- Search, completion filtering, pagination, and SQL statistics.
- Automatically created schema, indexes, and initial example tasks.
- Swagger UI and a responsive browser task manager.
- Integration and repository contract tests with Vitest and Supertest.
- Graceful HTTP server and database-pool shutdown.
- Supabase-managed user accounts and password handling—the API never stores or hashes passwords.
- Strict `Authorization: Bearer <token>` parsing and server-side token verification.
- Reusable authentication middleware shared by multiple protected routes.
- Swagger UI bearer authorization and a browser-based login/profile demonstration.

## Architecture

```text
Browser / API client
        | credentials                | Authorization: Bearer JWT
        v                            v
   Supabase Auth <---------- Express auth middleware
                                     |
Express routes + Zod validation
        |
Repository facade
        |
TaskRepository interface
        |
PostgresTaskRepository (pg Pool)
        |
PostgreSQL container
        |
postgres_data named volume
```

The API layer does not contain SQL. Storage behavior lives behind `TaskRepository`, so the HTTP contract remains stable while the persistence implementation evolves. Authentication follows a separate trust path: Supabase stores accounts, hashes passwords, and signs tokens; the Express middleware verifies each presented token with Supabase before protected route code runs.

## Quick start with Docker

Requirements:

- Docker Desktop with Docker Compose
- A free Supabase project
- Ports `3000` and `5432` available

Create the private environment file:

```bash
cp .env.example .env
```

Windows Command Prompt:

```cmd
copy .env.example .env
```

Change both `change_me` values in `.env` to the same local password. In the Supabase dashboard, copy the project URL and the **anon/publishable key** from Project Settings → API into `SUPABASE_URL` and `SUPABASE_KEY`. Never use the `service_role` key. For this practice project, disable email confirmation under Authentication → Sign In / Providers → Email so a new account can log in immediately.

Then build and start the entire stack:

```bash
docker compose up --build -d
```

Check its status:

```bash
docker compose ps
```

Open:

| Interface | URL |
|---|---|
| Authentication | http://localhost:3000 |
| Protected task workspace | http://localhost:3000/app |
| Swagger UI | http://localhost:3000/docs |
| API information | http://localhost:3000/api |
| Health check | http://localhost:3000/health |

Stop the stack without deleting its data:

```bash
docker compose down
```

Do not add `-v` unless you intentionally want to delete the PostgreSQL volume and all stored tasks.

## Configuration

`.env.example` documents every required value:

```env
POSTGRES_USER=task_user
POSTGRES_PASSWORD=change_me
POSTGRES_DB=tasks_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://task_user:change_me@db:5432/tasks_db
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your-anon-or-publishable-key
```

The real `.env` file is Git-ignored and excluded from the Docker build context. `db` in `DATABASE_URL` is the PostgreSQL service name on the private Compose network. The browser never receives the configured Supabase key; all auth SDK calls in this project go through the Express backend.

## Authentication flow

```text
1. Client sends email + password to POST /auth/signup or /auth/login.
2. The backend forwards credentials to Supabase Auth; passwords are never stored locally.
3. Login returns an access token (JWT) and refresh token.
4. Client sends Authorization: Bearer <access_token> to a protected route.
5. Reusable middleware calls Supabase getUser(token).
6. A valid token opens the route; missing, malformed, expired, or forged tokens return 401.
```

The browser opens on a dedicated authentication page. After Supabase verifies the login, the client stores the access token in `sessionStorage` and transitions to `/app`. Opening `/app` without a valid token redirects back to the authentication page. Closing the tab clears the session token. Production authentication typically adds stronger browser protections and a deliberate refresh-token strategy.

## API reference

A task has this JSON shape:

```json
{
  "id": 1,
  "title": "Learn what an API is",
  "done": false
}
```

| Method | Path | Purpose | Success | Errors |
|---|---|---|---:|---:|
| `POST` | `/auth/signup` | Create a Supabase account | 201 | 400 |
| `POST` | `/auth/login` | Return access and refresh tokens | 200 | 400, 401 |
| `POST` | `/auth/logout` | End the presented session | 204 | 401 |
| `GET` | `/public/info` | Demonstrate an open route | 200 | — |
| `GET` | `/protected/profile` | Return safe verified-user metadata | 200 | 401 |
| `GET` | `/protected/dashboard` | Demonstrate reusable auth middleware | 200 | 401 |
| `GET` | `/tasks` | List tasks | 200 | 400 |
| `GET` | `/tasks/:id` | Read one task | 200 | 404 |
| `POST` | `/tasks` | Create a task | 201 | 400 |
| `PUT` | `/tasks/:id` | Update title and/or completion | 200 | 400, 404 |
| `DELETE` | `/tasks/:id` | Delete a task | 204 | 404 |
| `GET` | `/stats` | Return total, done, and open counts | 200 | — |
| `POST` | `/reset` | Restore the three example tasks | 200 | — |

Collection query parameters:

```text
GET /tasks?search=postgres
GET /tasks?done=true
GET /tasks?limit=10&offset=0
```

All errors use a consistent response:

```json
{
  "error": "message"
}
```

The task CRUD endpoints remain public to preserve the earlier assignment's API contract. The `/protected/*` routes and `/auth/logout` demonstrate authenticated access without silently changing existing clients.

## Test the complete auth flow

Sign up:

```bash
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Log in and copy the returned `access_token`:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Call the protected profile:

```bash
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN_HERE"
```

Change one token character and repeat the request. A forged token returns `401` with `{ "error": "Invalid or expired token" }`. Missing or malformed bearer headers return `401` with `{ "error": "Access token required" }`.

Log out:

```bash
curl -i -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer PASTE_ACCESS_TOKEN_HERE"
```

## Swagger bearer authorization

Open http://localhost:3000/docs, run `/auth/login`, copy its `access_token`, click **Authorize**, and paste the token. Swagger displays lock icons on `/protected/profile`, `/protected/dashboard`, and `/auth/logout`, and reuses the bearer token for those calls.

The OpenAPI specification defines HTTP bearer authentication and marks `/protected/profile`, `/protected/dashboard`, and `/auth/logout` as secured. Automated tests verify that security metadata. The current evidence set does not include an authorized Swagger profile response, so that manual checkpoint is not claimed here.

## Authentication evidence

### Supabase and Docker configuration

The application image was rebuilt and started beside a healthy PostgreSQL container after the Supabase variables were added to the private environment file.

![Authentication stack built and started](screenshots/phase%204/02-auth-stack-built-and-started.png)

The server then started with Supabase Auth configured:

![Server running with Supabase Auth configured](screenshots/phase%204/05-supabase-auth-configured-server.png)

### Test identity

A dedicated development user was created in Supabase Auth with automatic confirmation and appears in the project's Authentication users list. This proves the test identity exists, but it is not presented as evidence of the API signup route returning `201`.

![Supabase Auth test user](screenshots/phase%204/04-supabase-auth-user-created.png)

### Browser authentication flow

The browser now opens on a separate neobrutalist sign-in/create-account page written for non-technical users:

![Neobrutalist authentication page](screenshots/phase%204/06-neobrutalist-sign-in-page.png)

After login, Supabase returns an access token, `/protected/profile` verifies it, and the browser transitions to `/app`. The workspace displays a verified-session bar with the authenticated email and shortened user ID:

![Authenticated task workspace](screenshots/phase%204/07-authenticated-task-workspace.png)

The full Phase 4 evidence set, including the initial environment diagnosis, is stored under [`screenshots/phase 4/`](screenshots/phase%204/).

## Example requests

Create a task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Docker Compose"}'
```

Update it:

```bash
curl -X PUT http://localhost:3000/tasks/4 \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

Delete it:

```bash
curl -i -X DELETE http://localhost:3000/tasks/4
```

## Database

PostgreSQL runs from `postgres:17-alpine`. On the first creation of the named volume, [`db/init.sql`](db/init.sql):

1. Creates `tasks(id, title, done)`.
2. Adds indexes on `done` and `title`.
3. Inserts three examples only when the table is empty.

Inspect the live rows directly:

```bash
docker compose exec db psql -U task_user -d tasks_db \
  -c "SELECT * FROM tasks ORDER BY id;"
```

Every external value is bound through PostgreSQL parameters such as `$1`; input is never concatenated into SQL.

## Persistence check

Create a uniquely named task, stop both containers, restart them, and retrieve the same task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Survives Docker restart"}'

docker compose down
docker compose up -d
curl "http://localhost:3000/tasks?search=Survives"
```

The row remains because Compose reuses the `postgres_data` named volume.

The persistence checkpoint was verified with task `20005`: it was created, both containers were removed with `docker compose down`, the stack was recreated, and the same row was returned afterward.

![Task created before the stack restart](screenshots/phase%203/22-persistence-task-created-and-stack-restarted.png)

![The same task returned after both containers restarted](screenshots/phase%203/23-persistence-proven-after-restart.png)

The browser interface also loaded the persisted task from PostgreSQL after the restart:

![Persisted task displayed in the browser interface](screenshots/phase%203/24-frontend-persisted-task.png)

## Testing

Install dependencies and run the automated checks:

```bash
npm install
npm test
npm run build
```

Current automated result: **38 tests across 5 test files pass**. The existing CRUD tests use an isolated repository adapter, preventing test resets from changing development PostgreSQL data. Authentication tests inject a fake `AuthProvider`, so they verify status codes, token parsing, middleware reuse, safe responses, and Swagger bearer metadata without creating real Supabase users or requiring network access.

## Index experiment

The project includes indexes on `done` and `title`. An `EXPLAIN ANALYZE` experiment with 20,000 temporary rows showed PostgreSQL changing from a sequential scan to an index scan for a selective completed-task query. The experiment was wrapped in a transaction and rolled back afterward.

![EXPLAIN ANALYZE before and after the done index](screenshots/phase%203/18-explain-analyze-index-comparison.png)

## Project evidence

### Docker image and stack startup

![Docker image build and Compose startup](screenshots/phase%203/03-image-build-and-stack-start.png)

### Running containers after restart

![App and healthy PostgreSQL containers](screenshots/phase%203/16-containers-healthy-after-restart.png)

### Docker Desktop stack

![The application stack running in Docker Desktop](screenshots/phase%203/21-docker-desktop-stack-running.png)

### PostgreSQL rows

![Tasks queried directly from PostgreSQL](screenshots/phase%203/10-postgres-task-rows.png)

### Schema and indexes

![PostgreSQL task schema and indexes](screenshots/phase%203/11-postgres-schema-and-indexes.png)

### Persistent Docker volume

![PostgreSQL named Docker volume](screenshots/phase%203/12-postgres-named-volume.png)

### Automated test suite

![All automated tests passing](screenshots/phase%203/20-automated-tests-passing.png)

Additional historical and implementation evidence is organized under [`screenshots/`](screenshots/).

## Project structure

```text
Dockerfile                                  production application image
docker-compose.yml                         app + PostgreSQL stack
.env.example                               safe configuration template
db/init.sql                                schema, indexes, and seeds
src/app/                                   Express application setup
src/auth/auth-provider.ts                  Supabase adapter + testable auth contract
src/middleware/require-auth.ts             strict bearer parsing and reusable guard
src/routes/                                HTTP endpoints
src/schemas/                               Zod auth and task schemas
src/repositories/task.repository.ts        storage contract
src/repositories/postgres-task.repository.ts
src/repositories/in-memory-task.repository.ts
src/data/store.ts                          selected-repository facade
public/                                    browser task manager
tests/                                     HTTP and repository contract tests
screenshots/                               project evidence
```

## Project evolution

The project intentionally evolved without changing its public CRUD contract:

1. An in-memory implementation established the API behavior.
2. SQLite introduced local persistence.
3. PostgreSQL and Docker Compose introduced a containerized, portable development stack.
4. Supabase Auth introduced identity, verified JWTs, and reusable protected routes without changing the task repository.

That progression demonstrates the central design principle behind the repository boundary: the API describes what the application does, while the repository determines where its data lives.
