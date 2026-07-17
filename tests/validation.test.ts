import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/app.js";
import { reset } from "../src/data/store.js";

const app = createApp();

beforeEach(() => {
  reset();
});

describe("POST validation", () => {
  it("400 when title is missing", async () => {
    const res = await request(app).post("/tasks").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it("400 when title is empty string", async () => {
    const res = await request(app).post("/tasks").send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("400 when title is whitespace only", async () => {
    const res = await request(app).post("/tasks").send({ title: "   " });
    expect(res.status).toBe(400);
  });

  it("ignores client-sent id and done", async () => {
    const res = await request(app).post("/tasks").send({ id: 99, done: true, title: "Sneaky" });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(4);
    expect(res.body.done).toBe(false);
  });

  it("400 on malformed JSON body", async () => {
    const res = await request(app)
      .post("/tasks")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(res.status).toBe(400);
  });
});

describe("PUT validation", () => {
  it("400 on empty body {}", async () => {
    const res = await request(app).put("/tasks/1").send({});
    expect(res.status).toBe(400);
  });

  it("400 on empty title", async () => {
    const res = await request(app).put("/tasks/1").send({ title: "" });
    expect(res.status).toBe(400);
  });
});
