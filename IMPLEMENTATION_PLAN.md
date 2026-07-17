# Week 2 · A1 (BE-01) — Build Your First CRUD API

**Implementation Plan**

> Status: Reviewed & implementation-ready. Every assignment requirement (mandatory, stretch, extras, "Done means") is mapped. Build stage-by-stage, one commit per stage.

---

## 1. Goal

Build a small API that manages a to-do list — Create, Read, Update, Delete tasks — test it in Swagger UI, and publish it to a public GitHub repo. Data lives **in memory only** (no database — that is deliberate; losing data on restart is Week 3's lesson).

## 2. Strategic positioning — how this stands out

The assignment targets beginners (~100 lines of plain JS, zero tests). This build instead applies **Week 1 engineering discipline** to the beginner brief, while respecting every explicit rule (in-memory only, ≥6 commits one-per-stage, Swagger, README).

Differentiators over the base brief:

1. **TypeScript + Zod** validation instead of plain JS + manual `if` checks
2. **App-factory pattern** — `createApp()` decoupled from the port listener (same as Week 1; makes it testable)
3. **Vitest + supertest** integration tests asserting every status code (assignment asks for *none*)
4. **swagger-jsdoc** generating OpenAPI from code comments (this is the *stretch* goal, not the base)
5. **All optional extras**: filter, search, `/stats`, `/reset`, pagination
6. **The "mortality experiment"** write-up → sets up why Week 3 needs a database
7. **A genuine Stage 7 "AI vs me"** code review, quarantined in `ai-version/`
8. **Clean 6+ commit history** so `git log` tells the story stage by stage
9. **A neobrutalist web UI** (see §14) — a real, clickable product for non-technical viewers, hirers, and clients; a full-stack showcase on top of the required Swagger UI

Lane: **JavaScript/TypeScript** (matches Week 1 — consistency is intentional). On the JS lane, generating the OpenAPI spec ourselves is the harder, more impressive path than Python's free `/docs` — the README calls this out.

## 3. Repo strategy

- **Dedicated standalone public GitHub repo** (e.g. `task-crud-api`) so a stranger can clone-and-run in under 5 minutes.
- A copy also lives here in `backend-ai-engineering-track/week-1/Week 2 Assignment 1/`.
- Independent of the Week 1 "AI Core" project — the two are unrelated services and stay in separate repos.

## 4. Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Dev runner | tsx |
| Validation | Zod (body + query params) |
| API docs | swagger-ui-express + swagger-jsdoc |
| Tests | Vitest + supertest |

### 4.1 npm scripts (package.json)

```json
"scripts": {
  "dev":   "tsx watch src/server.ts",   // the ONE documented run command
  "build": "tsc",
  "start": "node dist/server.js",
  "test":  "vitest run"
}
```

Server listens on `PORT` (default **3000** to match the assignment; overridable via env). No `.env` file is required to run — 3000 is the built-in default.

## 5. Target file structure

```
Week 2 Assignment 1/
├── src/
│   ├── app/
│   │   └── app.ts              # createApp() — mounts routes, docs, error handler
│   ├── data/
│   │   └── store.ts            # in-memory tasks array + nextId + seed()/reset()
│   ├── routes/
│   │   ├── tasks.routes.ts     # 5 CRUD routes + /stats, /reset
│   │   └── meta.routes.ts      # GET / (API info) + GET /health
│   ├── schemas/
│   │   └── task.schema.ts      # Zod: Task, CreateTask, UpdateTask, query params
│   ├── docs/
│   │   └── openapi.ts          # swagger-jsdoc config + serve setup
│   ├── middleware/
│   │   └── error.ts            # central error handler → JSON {error}
│   └── server.ts               # imports createApp(), listens on PORT
├── public/                     # neobrutalist web UI (static, zero-build) — see §14
│   ├── index.html              # single-page task manager
│   ├── styles.css              # neobrutalist design system
│   └── app.js                  # vanilla JS: fetch() calls, render, toasts
├── tests/
│   ├── crud.test.ts            # full CRUD cycle + status codes via supertest
│   ├── validation.test.ts      # 400 paths (missing/empty title)
│   └── extras.test.ts          # filter/search/stats/pagination/reset
├── ai-version/                 # Stage 7 quarantine (AI-generated code, untouched)
├── screenshots/
│   └── swagger.png             # Stage 5 screenshot for README
├── .gitignore                  # node_modules, dist
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## 6. Data model (Zod-first)

```
Task        = { id: number, title: string(min 1), done: boolean }
CreateTask  = { title: string(min 1) }                    // 400 if missing/empty
UpdateTask  = { title?: string(min 1), done?: boolean }   // at least one field
TasksQuery  = { done?: "true"|"false", search?, limit?, offset? }
```

Store seeds 3 example tasks on startup; `reset()` restores them.

### 6.1 Behavioral rules (nail these to avoid rework)

- **ID assignment:** a monotonic `nextId` counter (starts at 4 after the 3 seeds). IDs are **never reused** — deleting task 2 does not free id 2. This is more correct than `array.length + 1` (which breaks after deletes).
- **`:id` parsing:** parse the path param to a number; a non-numeric id (e.g. `/tasks/abc`) → **404** (treated as "no such task"), never a 500.
- **Body parsing:** `express.json()` mounted globally. Malformed JSON → caught by the error handler → **400** `{error:"..."}` (not an unhandled 500).
- **POST ignores client-sent `id`/`done`:** even if the client sends `{id:99, done:true, title:"x"}`, the server assigns its own id and forces `done:false`. Server never trusts the client.
- **PUT is a partial update** (PATCH-like, but the assignment names it PUT): applies whichever of `title`/`done` are present; an empty body `{}` → **400** (nothing to update). Returns the full updated task with **200**.
- **Seed tasks** (fixed, deterministic — so tests and demos are reproducible):
  ```
  { id: 1, title: "Learn what an API is",   done: true  }
  { id: 2, title: "Build a CRUD endpoint",  done: false }
  { id: 3, title: "Write the README",       done: false }
  ```

### 6.2 Canonical response shapes

- **Error (all 400/404):** `{ "error": "<human message>" }` — single `error` string key, always.
- **Task object:** `{ "id": 1, "title": "...", "done": false }` — exactly these three keys.
- **404 message format:** `"Task 99 not found"` (matches the assignment example verbatim).
- **Validation 400 message:** derived from Zod (e.g. `"title is required and must be a non-empty string"`).

## 7. Endpoint map

| Method | Path | Status | Notes |
|---|---|---|---|
| GET | `/` | 200 | Serves the **web UI** (HTML). With `Accept: application/json` (curl) → returns API info `{name, version, endpoints}` — see §14.1 |
| GET | `/api` | 200 | API info `{name, version, endpoints}` (always JSON) |
| GET | `/health` | 200 | `{status:"ok"}` |
| GET | `/tasks` | 200 | supports `?done=`, `?search=`, `?limit=`, `?offset=` |
| GET | `/tasks/:id` | 200 / 404 | 404 → `{error:"Task 99 not found"}` |
| POST | `/tasks` | 201 / 400 | Zod-validated body |
| PUT | `/tasks/:id` | 200 / 400 / 404 | partial update |
| DELETE | `/tasks/:id` | 204 / 404 | empty body on success |
| GET | `/stats` | 200 | `{total, done, open}` (extra) |
| POST | `/reset` | 200 | restore seed (extra) |
| GET | `/docs` | — | Swagger UI |

## 8. Stage-by-stage execution + commit plan

Graded on ≥6 commits, one per stage.

| Stage | Work | Commit message |
|---|---|---|
| 0 | Scaffold TS/Express, `createApp()`, hello route, `npm run dev` | `Stage 0: hello server` |
| 1 | `GET /` info JSON + `GET /health` (see note) | `Stage 1: root and health endpoints` |
| 2 | In-memory store + seed, `GET /tasks`, `GET /tasks/:id` with 404 | `Stage 2: read endpoints with 404` |
| 3 | `POST /tasks` + Zod validation (400) | `Stage 3: create with validation` |
| 4 | `PUT /tasks/:id`, `DELETE /tasks/:id` (204) | `Stage 4: full CRUD` |
| 5 | swagger-jsdoc annotations + `/docs`, screenshot | `Stage 5: Swagger UI` |
| 6 | README (run cmd, endpoint table, curl -i output, screenshot), push | `Stage 6: publish and docs` |
| + | Extras: filter/search/stats/reset/pagination | `Extras: filtering, search, stats, reset, pagination` |
| + | Vitest + supertest suite | `test: integration tests for full CRUD and validation` |
| + | Neobrutalist web UI (§14) | `Extras: neobrutalist web UI` |
| 7 | AI rematch in `ai-version/`, "AI vs me" README section | `Stage 7: AI vs me` |

> **Stage 1 → UI transition:** In Stage 1, `GET /` returns the API-info JSON directly (satisfies the checkpoint). When the UI is added later (§14), `GET /` becomes **content-negotiated** — HTML for browsers, the same JSON for `Accept: application/json`. The `GET /api` alias is added at the same time so a pure-JSON root is always available. No stage checkpoint breaks.

> The UI ships as its own commit **after** the graded Stage 0–6 work is complete and pushed — it never mixes into the stage commits, so the backend story stays clean.

## 9. Testing plan (edge over the brief — assignment asks for none)

### 9.1 Per-stage checkpoint commands (copy-paste to verify each stage)

Run these after each stage — they mirror the assignment's checkpoints exactly:

```bash
# Stage 0 — hello server
curl -i http://localhost:3000/            # 200 + message

# Stage 1 — root + health
curl -i http://localhost:3000/api         # 200 + {name,version,endpoints}
curl -i http://localhost:3000/health      # 200 + {status:"ok"}

# Stage 2 — read + 404
curl -i http://localhost:3000/tasks       # 200 + array of 3 seed tasks
curl -i http://localhost:3000/tasks/1     # 200 + one task
curl -i http://localhost:3000/tasks/99    # 404 + {error:"Task 99 not found"}

# Stage 3 — create + validation
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'   # 201 + new task
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{}'                     # 400 + error

# Stage 4 — update + delete
curl -i -X PUT    http://localhost:3000/tasks/1 -H "Content-Type: application/json" -d '{"done":true}'      # 200 + updated
curl -i -X DELETE http://localhost:3000/tasks/1                                                             # 204 empty body
curl -i -X DELETE http://localhost:3000/tasks/99                                                            # 404 + error

# Extras
curl -i "http://localhost:3000/tasks?done=true"        # filtered
curl -i "http://localhost:3000/tasks?search=milk"      # searched
curl -i "http://localhost:3000/tasks?limit=2&offset=1" # paginated
curl -i http://localhost:3000/stats                    # {total,done,open}
curl -i -X POST http://localhost:3000/reset            # 200 restore seeds
```

> **Windows note:** the shell here is Git Bash, so the single-quote `curl` syntax above works as-is. (In PowerShell/cmd the quoting differs — the README will show the Git Bash form, which the grader can paste.)

### 9.2 Automated suite — Vitest + supertest

Import `createApp()` (no port conflicts — same trick as Week 1):

- Full CRUD lifecycle: create → read → update → delete → confirm gone
- Every status code asserted: 200, 201, 204, 400, 404
- Validation: `POST {}` → 400, `POST {title:""}` → 400, `POST {title:"   "}` (whitespace) → 400, `PUT {}` → 400, `PUT`/`DELETE` unknown id → 404, non-numeric id → 404
- Extras: `?done=true` filters, `?search=` matches (case-insensitive), `/stats` math, pagination bounds, `/reset` restores 3 seeds
- **Test isolation:** call `reset()` in a `beforeEach` so the in-memory store is deterministic across tests.

## 10. Stage 7 — the AI rematch (key differentiator)

1. Write your **own prompt from memory** (do not copy the PDF): TS+Express, 5 endpoints, exact status codes, in-memory, validation rules, Swagger. Save the prompt verbatim in the README.
2. Generate into `ai-version/` — quarantined; `src/` stays hand-built.
3. Run it, fire the Stage-4 curls, record pass/fail.
4. `git diff --no-index` your file vs AI's. Answer the 3 required questions:
   - What the AI did better (and can you explain it)
   - What it got wrong / ignored (missing 400? wrong status? unasked-for DB?)
   - What your prompt failed to specify (what the AI silently decided)
5. One improved rematch; note what changed in one sentence.

## 11. README structure (Stage 6 deliverable)

What it is → one-command run (`npm install && npm run dev`) → endpoint table → one pasted `curl -i` output (showing the status line + headers, per the assignment) → Swagger screenshot → **mortality experiment** (2 sentences on data loss after restart → why Week 3/databases exist) → **AI vs me** section (prompt + 3 diffs) → **Web UI** section (screenshot + browser instructions) → tech-stack note explaining why TS/Zod/tests exceed the brief.

### 11.1 Stretch goals (assignment-listed — all covered)

- **swagger-jsdoc** — OpenAPI spec generated from JSDoc comments on the routes (not hand-written). ✅ Stage 5.
- **Pagination** — `GET /tasks?limit=&offset=` **plus a README paragraph** explaining *why real APIs never return "everything"* (payload size, latency, memory). The assignment explicitly asks for this explanation, not just the feature.
- **Stage 7 AI rematch** — ✅ §10.

## 12. Requirements checklist (Done = every box ticked)

**Mandatory (from the assignment "Requirements" section):**

- [ ] Server starts with one documented command on localhost (`npm run dev`)
- [ ] `GET /tasks`, `GET /tasks/:id`, `POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id` — full CRUD on in-memory list (no database, no files)
- [ ] Correct status codes: 200 reads, 201 create, 204 delete, 400 invalid body, 404 unknown id — each error with a JSON error message
- [ ] POST and PUT validate input (missing/empty title → 400)
- [ ] Swagger UI at `/docs` lists every endpoint; full CRUD cycle works via "Try it out"
- [ ] Public GitHub repo, ≥6 meaningful commits (one per stage), README with run instructions, endpoint table, one `curl -i` output, and the Swagger screenshot

**"Done means" (the assignment's final gate — dual verification):**

- [ ] Full CRUD cycle works **twice**: once via `curl -i` (right status codes visible), once via Swagger UI "Try it out"
- [ ] Repo is public, README works on a clean machine, `git log` shows one honest commit per stage

**Stretch (optional — all planned as covered):**

- [ ] swagger-jsdoc generates the OpenAPI spec from code comments
- [ ] Pagination `?limit=&offset=` + README rationale
- [ ] Stage 7 AI rematch with "AI vs me" README section

**Optional extras ("Make it yours" — all planned):**

- [ ] Filtering `?done=true`
- [ ] Search `?search=`
- [ ] `/stats` endpoint
- [ ] `POST /reset` seed restore
- [ ] Mortality experiment write-up in README

**Bonus (this build):**

- [ ] Neobrutalist web UI (§14)
- [ ] Vitest + supertest test suite

### 12.1 Repo hygiene

- **`.gitignore`** must exclude `node_modules/` and `dist/` (and `.env` if one is ever added). Confirm before first push.
- **`ai-version/`** IS committed (Stage 7 requires the AI code visible in its own folder), but its own `node_modules` is gitignored.
- The 3 seed tasks and all task data are in-memory only — **nothing** is written to disk (satisfies "no database, no files").

## 13. Prerequisites before building

1. GitHub account + chosen repo name (e.g. `task-crud-api`)
2. Node.js installed (`node -v` prints a version)

---

## 14. Web UI — neobrutalist task manager (bonus layer)

A real, clickable product so **non-technical viewers, hirers, and clients** can use the API without ever touching Swagger or curl. It is a **bonus layer that never compromises the clean-backend story**: the backend stands alone, Swagger UI at `/docs` stays as the engineer's proof, and the UI is purely additive.

### 14.1 The `GET /` resolution (design decision)

The assignment requires `GET /` to return API-info JSON; the UI wants `GET /` to serve the page. Resolved with **content negotiation** so both are satisfied:

- `GET /` → serves `public/index.html` (the UI) for browsers
- `GET /` with header `Accept: application/json` (e.g. curl) → returns `{name, version, endpoints}` JSON, so the assignment checkpoint `curl -i http://localhost:3000/` still passes
- `GET /api` → the same API-info JSON, always, as an explicit stable endpoint

Documented in the README as a deliberate choice, not a workaround.

### 14.2 Architecture

- **Static, zero-build.** A `public/` folder (`index.html`, `styles.css`, `app.js`) served via `express.static`. No React, no bundler, no dependencies — loads instantly, nothing to break.
- **Same origin** as the API → no CORS setup. `app.js` calls `/tasks`, `/tasks/:id`, `/stats`, `/reset` with `fetch()`.
- **Backend untouched.** No route logic changes beyond adding static serving + the `GET /` negotiation.

### 14.3 Features (full showcase)

Surfaces every part of the API visually:

- **Add task** — input + button; empty title triggers the API's 400, shown as a red error toast (validation made visible)
- **List tasks** — rendered as cards; empty state when none
- **Toggle done** — checkbox → `PUT /tasks/:id`
- **Edit title** — inline edit → `PUT /tasks/:id`
- **Delete** — button → `DELETE /tasks/:id`
- **Search** — live search box → `GET /tasks?search=`
- **Filter** — all / open / done toggle → `GET /tasks?done=`
- **Stats bar** — total / done / open, refreshed live → `GET /stats`
- **Reset demo** — button → `POST /reset` restores the 3 seed tasks
- **Toasts** — green for success, red for API errors (surfaces the JSON `{error}` message to non-tech users)

### 14.4 Visual language — neobrutalism (deliberately not the "AI theme")

The generic AI look (purple gradients, glassmorphism, glow, blur, Inter everywhere) reads as auto-generated. Neobrutalism reads as *a human made deliberate choices* — ideal for attracting hirers and fitting a developer tool.

- **Borders:** 3px solid black on every interactive element
- **Shadows:** flat hard offsets (`6px 6px 0 #000`), never blurred
- **Palette:** paper/off-white background (`#f5f2e8`), black structure, electric-yellow accent (`#ffe600`), red for destructive actions + errors
- **Type:** bold grotesque headings (system `Arial Black` / `Helvetica` stack — no webfont dependency), monospace for task metadata (id, timestamps)
- **Interaction:** buttons physically "press" — shadow shrinks and element nudges down on click
- **Explicitly banned:** gradients, glow, glassmorphism, blur, rounded-everything

### 14.5 Responsiveness & scope

- Desktop-first, but responsive down to mobile (single-column stack)
- **Non-goals:** no framework/build step, no routing, no auth/login, no localStorage persistence (data stays server-side in memory — consistent with the mortality experiment)

### 14.6 README additions

A "Web UI" section with a screenshot of the neobrutalist interface, a one-line "open http://localhost:3000 in your browser" instruction, and a note on the `GET /` content-negotiation decision.

---

## 15. Decision log

| Decision | Alternatives considered | Why chosen |
|---|---|---|
| Add a custom web UI | Swagger-only (base brief) | Portfolio impact — attracts hirers/clients, makes it feel like a real product; low risk as an additive layer |
| Static vanilla JS (no build) | React/Vite SPA | Zero build/deploy complexity, loads instantly, nothing to break; ships inside the same repo/server. React deferred as a possible later portfolio iteration |
| Neobrutalist theme | Minimal/Notion style; bold/playful | Avoids the tell-tale "AI theme"; signals deliberate human taste; suits a developer tool |
| Full showcase features | Core CRUD only | Makes the extras (stats, search, filter, reset) and validation (400 toasts) visible to non-tech users |
| `GET /` content negotiation | Move API info to `/api` only; put UI at `/app` | Satisfies the assignment's `curl -i /` checkpoint AND serves the UI at the natural root URL |
| UI as a separate commit, after Stage 0–6 | Fold into stage commits | Keeps the graded backend commit history clean and honest |
| Served same-origin by Express | Separate static host | No CORS, one command to run, stranger can clone-and-run in <5 min |
