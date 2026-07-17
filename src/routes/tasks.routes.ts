import { Router } from "express";
import * as store from "../data/store.js";
import { CreateTaskSchema, UpdateTaskSchema } from "../schemas/task.schema.js";

export const tasksRouter = Router();

/** Parse a path :id to a positive integer, or null if it isn't one. */
function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

// GET /tasks — list all tasks.
tasksRouter.get("/tasks", (_req, res) => {
  res.status(200).json(store.getAll());
});

// GET /tasks/:id — one task, or 404.
tasksRouter.get("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  const task = store.getById(id);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(200).json(task);
});

// POST /tasks — create. Body validated by Zod; client-sent id/done are ignored.
tasksRouter.post("/tasks", (req, res, next) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);
  const task = store.create(parsed.data.title);
  res.status(201).json(task);
});

// PUT /tasks/:id — partial update (title and/or done). Empty body → 400.
tasksRouter.put("/tasks/:id", (req, res, next) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  const parsed = UpdateTaskSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);
  const task = store.update(id, parsed.data);
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(200).json(task);
});

// DELETE /tasks/:id — 204 on success, 404 if unknown.
tasksRouter.delete("/tasks/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }
  const removed = store.remove(id);
  if (!removed) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(204).end();
});
