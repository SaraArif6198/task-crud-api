import type { Task } from "../schemas/task.schema.js";

export interface QueryOptions {
  done?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TaskStats {
  total: number;
  done: number;
  open: number;
}

export interface TaskRepository {
  getAll(): Promise<Task[]>;
  query(options: QueryOptions): Promise<{ items: Task[]; total: number }>;
  stats(): Promise<TaskStats>;
  getById(id: number): Promise<Task | undefined>;
  create(title: string): Promise<Task>;
  update(id: number, patch: { title?: string; done?: boolean }): Promise<Task | undefined>;
  remove(id: number): Promise<boolean>;
  reset(): Promise<void>;
  close(): Promise<void>;
}
