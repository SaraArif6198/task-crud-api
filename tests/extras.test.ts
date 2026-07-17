import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/app.js";
import { reset } from "../src/data/store.js";

const app = createApp();

beforeEach(() => {
  reset();
});

describe("filtering and search", () => {
  it("?done=true returns only done tasks", async () => {
    const res = await request(app).get("/tasks?done=true");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body.every((t: { done: boolean }) => t.done)).toBe(true);
  });

  it("?done=false returns only open tasks", async () => {
    const res = await request(app).get("/tasks?done=false");
    expect(res.body).toHaveLength(2);
    expect(res.body.every((t: { done: boolean }) => !t.done)).toBe(true);
  });

  it("?search is case-insensitive", async () => {
    const res = await request(app).get("/tasks?search=README");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(3);
  });
});

describe("pagination", () => {
  it("?limit and ?offset slice the list", async () => {
    const res = await request(app).get("/tasks?limit=2&offset=1");
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(2);
  });

  it("400 on invalid limit", async () => {
    const res = await request(app).get("/tasks?limit=0");
    expect(res.status).toBe(400);
  });
});

describe("stats and reset", () => {
  it("/stats returns correct counts", async () => {
    const res = await request(app).get("/stats");
    expect(res.body).toEqual({ total: 3, done: 1, open: 2 });
  });

  it("/reset restores the 3 seeds after mutation", async () => {
    await request(app).delete("/tasks/1");
    await request(app).post("/tasks").send({ title: "Extra" });
    const res = await request(app).post("/reset");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toEqual({ id: 1, title: "Learn what an API is", done: true });
  });
});

describe("meta", () => {
  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /api returns API info", async () => {
    const res = await request(app).get("/api");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("task-crud-api");
    expect(res.body.endpoints).toBeTruthy();
  });

  it("GET / returns JSON for API clients (assignment checkpoint)", async () => {
    const res = await request(app).get("/").set("Accept", "application/json");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("task-crud-api");
  });

  it("GET / serves HTML for browsers", async () => {
    const res = await request(app).get("/").set("Accept", "text/html");
    expect(res.status).toBe(200);
    expect(res.type).toBe("text/html");
  });
});
