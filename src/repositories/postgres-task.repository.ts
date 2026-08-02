import "dotenv/config";
import { Pool, type PoolClient } from "pg";
import type { Task } from "../schemas/task.schema.js";
import type { QueryOptions, TaskRepository, TaskStats } from "./task.repository.js";

type TaskRow = { id: number; title: string; done: boolean };

const seedTasks = [
  ["Learn what an API is", true],
  ["Build a CRUD endpoint", false],
  ["Write the README", false],
] as const;

export class PostgresTaskRepository implements TaskRepository {
  private readonly pool: Pool;

  constructor(connectionString = process.env.DATABASE_URL) {
    if (!connectionString) throw new Error("DATABASE_URL is required");
    this.pool = new Pool({ connectionString });
  }

  async getAll(): Promise<Task[]> {
    return (await this.query({})).items;
  }

  async query(options: QueryOptions): Promise<{ items: Task[]; total: number }> {
    const conditions: string[] = [];
    const values: Array<string | number | boolean> = [];
    if (options.done !== undefined) {
      values.push(options.done);
      conditions.push(`done = $${values.length}`);
    }
    if (options.search) {
      values.push(`%${options.search}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await this.pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM tasks${where}`, values);

    let sql = `SELECT id, title, done FROM tasks${where} ORDER BY id`;
    const pageValues = [...values];
    if (options.limit !== undefined) {
      pageValues.push(options.limit, options.offset ?? 0);
      sql += ` LIMIT $${pageValues.length - 1} OFFSET $${pageValues.length}`;
    } else if (options.offset !== undefined && options.offset > 0) {
      pageValues.push(options.offset);
      sql += ` OFFSET $${pageValues.length}`;
    }
    const result = await this.pool.query<TaskRow>(sql, pageValues);
    return { items: result.rows, total: Number(countResult.rows[0].count) };
  }

  async stats(): Promise<TaskStats> {
    const result = await this.pool.query<{ total: string; done: string }>(
      "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE done) AS done FROM tasks",
    );
    const total = Number(result.rows[0].total);
    const done = Number(result.rows[0].done);
    return { total, done, open: total - done };
  }

  async getById(id: number): Promise<Task | undefined> {
    const result = await this.pool.query<TaskRow>("SELECT id, title, done FROM tasks WHERE id = $1", [id]);
    return result.rows[0];
  }

  async create(title: string): Promise<Task> {
    const result = await this.pool.query<TaskRow>(
      "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING id, title, done",
      [title, false],
    );
    return result.rows[0];
  }

  async update(id: number, patch: { title?: string; done?: boolean }): Promise<Task | undefined> {
    const current = await this.getById(id);
    if (!current) return undefined;
    const result = await this.pool.query<TaskRow>(
      "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING id, title, done",
      [patch.title ?? current.title, patch.done ?? current.done, id],
    );
    return result.rows[0];
  }

  async remove(id: number): Promise<boolean> {
    return (await this.pool.query("DELETE FROM tasks WHERE id = $1", [id])).rowCount === 1;
  }

  async reset(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("TRUNCATE tasks RESTART IDENTITY");
      await this.insertSeeds(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private async insertSeeds(client: PoolClient): Promise<void> {
    for (const [title, done] of seedTasks) {
      await client.query("INSERT INTO tasks (title, done) VALUES ($1, $2)", [title, done]);
    }
  }
}
