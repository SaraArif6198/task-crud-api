import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Task } from "../schemas/task.schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const databasePath = path.resolve(__dirname, "../../tasks.db");
export const db = new Database(databasePath);

type TaskRow = { id: number; title: string; done: number };
const SEED_TASKS = [
  { title: "Learn what an API is", done: 1 },
  { title: "Build a CRUD endpoint", done: 0 },
  { title: "Write the README", done: 0 },
] as const;

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_done ON tasks(done);
  CREATE INDEX IF NOT EXISTS idx_tasks_title ON tasks(title);
`);

const insertSeed = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
const seedDatabase = db.transaction(() => {
  for (const task of SEED_TASKS) insertSeed.run(task.title, task.done);
});
const rowCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as { count: number };
if (rowCount.count === 0) seedDatabase();

function toTask(row: TaskRow): Task {
  return { ...row, done: row.done === 1 };
}

export interface QueryOptions {
  done?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export function query(opts: QueryOptions): { items: Task[]; total: number } {
  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (opts.done !== undefined) {
    conditions.push("done = ?");
    values.push(opts.done ? 1 : 0);
  }
  if (opts.search) {
    conditions.push("title LIKE ? COLLATE NOCASE");
    values.push(`%${opts.search}%`);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  const totalRow = db.prepare(`SELECT COUNT(*) AS count FROM tasks${where}`).get(...values) as { count: number };
  let sql = `SELECT id, title, done FROM tasks${where} ORDER BY id`;
  const pageValues = [...values];
  if (opts.limit !== undefined) {
    sql += " LIMIT ? OFFSET ?";
    pageValues.push(opts.limit, opts.offset ?? 0);
  } else if (opts.offset !== undefined && opts.offset > 0) {
    sql += " LIMIT -1 OFFSET ?";
    pageValues.push(opts.offset);
  }
  const rows = db.prepare(sql).all(...pageValues) as TaskRow[];
  return { items: rows.map(toTask), total: totalRow.count };
}

export function getAll(): Task[] {
  return query({}).items;
}

export function stats(): { total: number; done: number; open: number } {
  const counts = db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done FROM tasks").get() as {
    total: number;
    done: number;
  };
  return { total: counts.total, done: counts.done, open: counts.total - counts.done };
}

export function getById(id: number): Task | undefined {
  const row = db.prepare("SELECT id, title, done FROM tasks WHERE id = ?").get(id) as TaskRow | undefined;
  return row ? toTask(row) : undefined;
}

export function create(title: string): Task {
  const result = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)").run(title, 0);
  return getById(Number(result.lastInsertRowid))!;
}

export function update(id: number, patch: { title?: string; done?: boolean }): Task | undefined {
  const current = getById(id);
  if (!current) return undefined;
  db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?").run(
    patch.title ?? current.title,
    (patch.done ?? current.done) ? 1 : 0,
    id,
  );
  return getById(id);
}

export function remove(id: number): boolean {
  return db.prepare("DELETE FROM tasks WHERE id = ?").run(id).changes > 0;
}

/** Test/demo helper: atomically restore exactly the original three rows. */
export const reset = db.transaction(() => {
  db.prepare("DELETE FROM tasks").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run("tasks");
  seedDatabase();
});
