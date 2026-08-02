import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryTaskRepository } from "../src/repositories/in-memory-task.repository.js";

const repository = new InMemoryTaskRepository();

beforeEach(async () => repository.reset());

describe("task repository contract", () => {
  it("supports the complete CRUD lifecycle", async () => {
    const created = await repository.create("Repository contract");
    expect(await repository.getById(created.id)).toEqual(created);
    expect(await repository.update(created.id, { done: true })).toMatchObject({ done: true });
    expect(await repository.remove(created.id)).toBe(true);
    expect(await repository.getById(created.id)).toBeUndefined();
  });

  it("supports query options and SQL-shaped statistics", async () => {
    expect((await repository.query({ search: "README" })).items).toHaveLength(1);
    expect((await repository.query({ done: true })).items).toHaveLength(1);
    expect(await repository.stats()).toEqual({ total: 3, done: 1, open: 2 });
  });
});
