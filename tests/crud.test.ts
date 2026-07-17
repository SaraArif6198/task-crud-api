import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/app.js";
import { reset } from "../src/data/store.js";

const app = createApp();

beforeEach(() => {
  reset();
});

describe("full CRUD lifecycle", () => {
  it("lists the 3 seed tasks", async () => {
    const res = await request(app).get("/tasks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toEqual({ id: 1, title: "Learn what an API is", done: true });
  });

  it("gets one task by id", async () => {
    const res = await request(app).get("/tasks/2");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 2, title: "Build a CRUD endpoint", done: false });
  });

  it("creates → reads → updates → deletes → confirms gone", async () => {
    const created = await request(app).post("/tasks").send({ title: "Buy milk" });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: 4, title: "Buy milk", done: false });

    const read = await request(app).get("/tasks/4");
    expect(read.status).toBe(200);

    const updated = await request(app).put("/tasks/4").send({ done: true });
    expect(updated.status).toBe(200);
    expect(updated.body.done).toBe(true);
    expect(updated.body.title).toBe("Buy milk");

    const deleted = await request(app).delete("/tasks/4");
    expect(deleted.status).toBe(204);
    expect(deleted.body).toEqual({});

    const gone = await request(app).get("/tasks/4");
    expect(gone.status).toBe(404);
  });

  it("assigns non-reused ids: id continues past deleted ids", async () => {
    const a = await request(app).post("/tasks").send({ title: "A" });
    expect(a.body.id).toBe(4);
    await request(app).delete("/tasks/4");
    const b = await request(app).post("/tasks").send({ title: "B" });
    expect(b.body.id).toBe(5); // not reusing 4
  });
});

describe("status codes and 404s", () => {
  it("404 for unknown numeric id", async () => {
    const res = await request(app).get("/tasks/99");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Task 99 not found" });
  });

  it("404 (not 500) for non-numeric id", async () => {
    const res = await request(app).get("/tasks/abc");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("not found");
  });

  it("PUT and DELETE on unknown id → 404", async () => {
    expect((await request(app).put("/tasks/99").send({ done: true })).status).toBe(404);
    expect((await request(app).delete("/tasks/99")).status).toBe(404);
  });
});
