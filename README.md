# Task CRUD API

A production-shaped task management API built with TypeScript, Express, PostgreSQL, and Docker Compose. It provides a stable REST contract, runtime validation, interactive documentation, a browser interface, automated tests, and persistent database storage.

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

## Architecture

```text
Browser / API client
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

The API layer does not contain SQL. Storage behavior lives behind `TaskRepository`, so the HTTP contract remains stable while the persistence implementation evolves.

## Quick start with Docker

Requirements:

- Docker Desktop with Docker Compose
- Ports `3000` and `5432` available

Create the private environment file:

```bash
cp .env.example .env
```

Windows Command Prompt:

```cmd
copy .env.example .env
```

Change both `change_me` values in `.env` to the same local password. Then build and start the entire stack:

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
| Task manager | http://localhost:3000 |
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
```

The real `.env` file is Git-ignored and excluded from the Docker build context. `db` in `DATABASE_URL` is the PostgreSQL service name on the private Compose network.

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

Current result: **27 tests across 4 test files pass**. HTTP tests use an isolated repository adapter, preventing test resets from changing development PostgreSQL data.

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
src/routes/                                HTTP endpoints
src/schemas/                               Zod request and task schemas
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

That progression demonstrates the central design principle behind the repository boundary: the API describes what the application does, while the repository determines where its data lives.
