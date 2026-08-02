import type { Task } from "../schemas/task.schema.js";
import type { QueryOptions, TaskRepository, TaskStats } from "./task.repository.js";

const seeds: readonly Task[] = [
  { id: 1, title: "Learn what an API is", done: true },
  { id: 2, title: "Build a CRUD endpoint", done: false },
  { id: 3, title: "Write the README", done: false },
];

export class InMemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = [];
  private nextId = 1;

  constructor() {
    this.restoreSeeds();
  }

  async getAll(): Promise<Task[]> {
    return this.tasks.map((task) => ({ ...task }));
  }

  async query(options: QueryOptions): Promise<{ items: Task[]; total: number }> {
    let result = this.tasks;
    if (options.done !== undefined) result = result.filter((task) => task.done === options.done);
    if (options.search) {
      const search = options.search.toLowerCase();
      result = result.filter((task) => task.title.toLowerCase().includes(search));
    }
    const total = result.length;
    const offset = options.offset ?? 0;
    const items = options.limit === undefined ? result.slice(offset) : result.slice(offset, offset + options.limit);
    return { items: items.map((task) => ({ ...task })), total };
  }

  async stats(): Promise<TaskStats> {
    const done = this.tasks.filter((task) => task.done).length;
    return { total: this.tasks.length, done, open: this.tasks.length - done };
  }

  async getById(id: number): Promise<Task | undefined> {
    const task = this.tasks.find((candidate) => candidate.id === id);
    return task ? { ...task } : undefined;
  }

  async create(title: string): Promise<Task> {
    const task = { id: this.nextId++, title, done: false };
    this.tasks.push(task);
    return { ...task };
  }

  async update(id: number, patch: { title?: string; done?: boolean }): Promise<Task | undefined> {
    const task = this.tasks.find((candidate) => candidate.id === id);
    if (!task) return undefined;
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.done !== undefined) task.done = patch.done;
    return { ...task };
  }

  async remove(id: number): Promise<boolean> {
    const index = this.tasks.findIndex((task) => task.id === id);
    if (index < 0) return false;
    this.tasks.splice(index, 1);
    return true;
  }

  async reset(): Promise<void> {
    this.restoreSeeds();
  }

  async close(): Promise<void> {}

  private restoreSeeds(): void {
    this.tasks = seeds.map((task) => ({ ...task }));
    this.nextId = 4;
  }
}
