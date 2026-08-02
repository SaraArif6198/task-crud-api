import type { Task } from "../schemas/task.schema.js";
import { InMemoryTaskRepository } from "../repositories/in-memory-task.repository.js";
import { PostgresTaskRepository } from "../repositories/postgres-task.repository.js";
import type { QueryOptions, TaskRepository, TaskStats } from "../repositories/task.repository.js";

export type { QueryOptions, TaskRepository, TaskStats };

// Tests use an isolated in-memory adapter. Every normal run uses PostgreSQL.
const repository: TaskRepository =
  process.env.NODE_ENV === "test" ? new InMemoryTaskRepository() : new PostgresTaskRepository();

export const getAll = (): Promise<Task[]> => repository.getAll();
export const query = (options: QueryOptions) => repository.query(options);
export const stats = (): Promise<TaskStats> => repository.stats();
export const getById = (id: number): Promise<Task | undefined> => repository.getById(id);
export const create = (title: string): Promise<Task> => repository.create(title);
export const update = (id: number, patch: { title?: string; done?: boolean }) => repository.update(id, patch);
export const remove = (id: number): Promise<boolean> => repository.remove(id);
export const reset = (): Promise<void> => repository.reset();
export const close = (): Promise<void> => repository.close();
