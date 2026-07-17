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
