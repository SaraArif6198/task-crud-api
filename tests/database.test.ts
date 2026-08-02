import fs from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { create, databasePath, db, getAll, query, reset, stats } from "../src/data/store.js";

beforeEach(() => reset());

describe("SQLite persistence layer", () => {
  it("creates tasks.db and the tasks table automatically", () => {
    expect(fs.existsSync(databasePath)).toBe(true);
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = ? AND name = ?")
      .get("table", "tasks") as { name: string } | undefined;
    expect(table?.name).toBe("tasks");
  });

  it("does not duplicate seeds when the database already contains rows", () => {
    create("Persistent task");
    expect(getAll()).toHaveLength(4);
    expect(getAll().filter((task) => task.title === "Learn what an API is")).toHaveLength(1);
  });

  it("runs search, filtering, and stats in SQL", () => {
    expect(query({ search: "README" }).items).toHaveLength(1);
    expect(query({ done: true }).items.every((task) => task.done)).toBe(true);
    expect(stats()).toEqual({ total: 3, done: 1, open: 2 });
  });
});
