import type { Task } from "../schemas/task.schema.js";

/**
 * In-memory task store.
 *
 * Deliberately no database and no file persistence — data lives only in this
 * module's arrays for the lifetime of the process. Restarting the server wipes
 * everything back to the seeds (the "mortality experiment" — see README).
 */

// Fixed, deterministic seeds so tests and demos are reproducible.
const SEED_TASKS: readonly Task[] = [
  { id: 1, title: "Learn what an API is", done: true },
  { id: 2, title: "Build a CRUD endpoint", done: false },
  { id: 3, title: "Write the README", done: false },
];

let tasks: Task[] = [];
let nextId = 1;

/** Restore the store to its seeded starting state. */
export function reset(): void {
  tasks = SEED_TASKS.map((t) => ({ ...t }));
  // IDs are never reused; the counter continues past the highest seed id.
  nextId = tasks.length + 1;
}

// Seed on module load.
reset();

export function getAll(): Task[] {
  return tasks;
}

export interface QueryOptions {
  done?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Filtered/searched/paginated view of the tasks.
 * Returns the matching slice plus the total match count (pre-pagination),
 * which real APIs expose so clients can build page controls.
 */
export function query(opts: QueryOptions): { items: Task[]; total: number } {
  let result = tasks;

  if (opts.done !== undefined) {
    result = result.filter((t) => t.done === opts.done);
  }
  if (opts.search) {
    const needle = opts.search.toLowerCase();
    result = result.filter((t) => t.title.toLowerCase().includes(needle));
  }

  const total = result.length;
  const offset = opts.offset ?? 0;
  const items = opts.limit !== undefined ? result.slice(offset, offset + opts.limit) : result.slice(offset);

  return { items, total };
}

export function stats(): { total: number; done: number; open: number } {
  const done = tasks.filter((t) => t.done).length;
  return { total: tasks.length, done, open: tasks.length - done };
}

export function getById(id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function create(title: string): Task {
  const task: Task = { id: nextId++, title, done: false };
  tasks.push(task);
  return task;
}

export function update(id: number, patch: { title?: string; done?: boolean }): Task | undefined {
  const task = getById(id);
  if (!task) return undefined;
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.done !== undefined) task.done = patch.done;
  return task;
}

export function remove(id: number): boolean {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}
