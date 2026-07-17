import { Router } from "express";
import * as store from "../data/store.js";
import { CreateTaskSchema, UpdateTaskSchema, TasksQuerySchema } from "../schemas/task.schema.js";

export const tasksRouter = Router();

/** Parse a path :id to a positive integer, or null if it isn't one. */
function parseId(raw: string): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

/**
 * @openapi
 * /tasks:
 *   get:
 *     summary: List tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: done
 *         schema: { type: string, enum: ["true", "false"] }
 *         description: Filter by completion state
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive title substring match
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *         description: Max items to return (pagination)
 *       - in: query
 *         name: offset
 *         schema: { type: integer, minimum: 0 }
 *         description: Items to skip (pagination)
 *     responses:
 *       200:
 *         description: Array of tasks
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Task' } }
 *       400:
 *         description: Invalid query parameter
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
tasksRouter.get("/tasks", (req, res, next) => {
  const parsed = TasksQuerySchema.safeParse(req.query);
  if (!parsed.success) return next(parsed.error);
  const { done, search, limit, offset } = parsed.data;
  const { items } = store.query({
    done: done === undefined ? undefined : done === "true",
    search,
    limit,
    offset,
  });
  res.status(200).json(items);
});

/**
 * @openapi
 * /stats:
 *   get:
 *     summary: Task counts
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: Totals
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Stats' }
 */
tasksRouter.get("/stats", (_req, res) => {
  res.status(200).json(store.stats());
});

/**
 * @openapi
 * /reset:
 *   post:
 *     summary: Restore the seed tasks
 *     tags: [Meta]
 *     responses:
 *       200:
 *         description: The restored seed tasks
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Task' } }
 */
tasksRouter.post("/reset", (_req, res) => {
  store.reset();
  res.status(200).json(store.getAll());
});

/**
 * @openapi
 * /tasks/{id}:
 *   get:
 *     summary: Get one task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: The task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Task' }
 *       404:
 *         description: No such task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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

/**
 * @openapi
 * /tasks:
 *   post:
 *     summary: Create a task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTask' }
 *     responses:
 *       201:
 *         description: The created task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Task' }
 *       400:
 *         description: Missing or empty title
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
tasksRouter.post("/tasks", (req, res, next) => {
  const parsed = CreateTaskSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);
  const task = store.create(parsed.data.title);
  res.status(201).json(task);
});

/**
 * @openapi
 * /tasks/{id}:
 *   put:
 *     summary: Update a task (partial)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTask' }
 *     responses:
 *       200:
 *         description: The updated task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Task' }
 *       400:
 *         description: Empty body or invalid field
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: No such task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Deleted (empty body)
 *       404:
 *         description: No such task
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
