# Task CRUD API — SQLite edition

A persistent REST API for FlyRank Backend AI Engineering, Week 3 Assignment A2 (BE-02). It keeps the exact CRUD contract from Assignment 1 while replacing the in-memory array with SQLite.

## Run it

Requires Node.js 18+.

```bash
npm install
npm run dev
```

The first start automatically creates `tasks.db`, creates the `tasks` table, and inserts three example tasks only when the table is empty. No database server or manual setup is needed.

- Web UI: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- API information: http://localhost:3000/api

Use `npm test` to run the integration tests and `npm run build` to compile TypeScript.

## Why SQLite

SQLite was chosen because it is a single local file, needs no separate server or configuration, and preserves data across application restarts. The database lives at `tasks.db` in the project root. It is Git-ignored so each clone creates a clean database automatically.

## API contract

| Method | Path | Success | Errors |
|---|---|---:|---:|
| `GET` | `/tasks` | 200 | 400 |
| `GET` | `/tasks/:id` | 200 | 404 |
| `POST` | `/tasks` | 201 | 400 |
| `PUT` | `/tasks/:id` | 200 | 400, 404 |
| `DELETE` | `/tasks/:id` | 204 | 404 |

A task remains `{ "id": number, "title": string, "done": boolean }`. Error responses remain `{ "error": "message" }`.

Optional SQL-backed features from Assignment 1 are retained:

- `GET /tasks?search=milk` uses `LIKE`.
- `GET /tasks?done=true` uses `WHERE done = ?`.
- `GET /tasks?limit=10&offset=0` uses SQL pagination.
- `GET /stats` uses `COUNT()` and `SUM()`.

Every client value is passed separately through a parameterized `?` placeholder. The status and title indexes help SQLite find filtered rows efficiently. The three seed inserts run in a transaction, so they either all succeed or all roll back.

## SQL explored by hand

Example query:

```sql
SELECT * FROM tasks WHERE done = 1;
```

It returned only completed tasks. Other Stage 4 queries:

```sql
SELECT * FROM tasks;
SELECT COUNT(*) FROM tasks;
UPDATE tasks SET done = 1;
DELETE FROM tasks WHERE done = 1;
```

After changing a row in a SQLite viewer, refresh `GET /tasks`; the API immediately returns the same data because both read the same `tasks.db` file.

## Database viewer

Open `tasks.db` in DB Browser for SQLite, select **Browse Data**, and choose the `tasks` table.

![Tasks table queried in DB Browser for SQLite](screenshots/phase%202/Screenshot%202026-08-02%20171248.png)

The Stage 4 evidence in [`screenshots/phase 2`](screenshots/phase%202/) also shows `WHERE done = 1`, `COUNT(*)`, `UPDATE`, `DELETE`, and the resulting changes in the frontend.

## Proving persistence

1. Start the app and create a task with `POST /tasks`.
2. Stop the process and run `npm run dev` again.
3. Call `GET /tasks`; the new task is still present.

The Assignment 1 endpoint tests still pass unchanged. That proves persistence is an implementation detail: the storage changed from an array to SQL, while the API’s URLs, bodies, responses, and status codes did not.

## Project structure

```text
src/data/store.ts        SQLite schema, seeding, and parameterized CRUD queries
src/routes/              unchanged HTTP/API layer
src/schemas/             unchanged Zod validation
public/                  browser task manager
tests/                   CRUD, validation, extras, and database tests
tasks.db                 generated local database (Git-ignored)
```
