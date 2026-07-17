// AI-generated in one shot from the prompt in PROMPT.md. Left UNEDITED on
// purpose so the README's "AI vs me" comparison is honest. Run: node index.js
const express = require("express");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(express.json());

// In-memory store
let tasks = [
  { id: 1, title: "Learn Express", done: false },
  { id: 2, title: "Build a REST API", done: false },
  { id: 3, title: "Write some tests", done: true },
];
let nextId = 4;

// Swagger definition
const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "To-Do API", version: "1.0.0" },
  paths: {
    "/tasks": {
      get: { summary: "Get all tasks", responses: { 200: { description: "OK" } } },
      post: { summary: "Create a task", responses: { 201: { description: "Created" } } },
    },
    "/tasks/{id}": {
      get: { summary: "Get a task", responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
      put: { summary: "Update a task", responses: { 200: { description: "OK" } } },
      delete: { summary: "Delete a task", responses: { 204: { description: "Deleted" } } },
    },
  },
};
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// GET all
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// GET one
app.get("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id == req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// POST
app.post("/tasks", (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const task = { id: nextId++, title: title, done: false };
  tasks.push(task);
  res.status(201).json(task);
});

// PUT
app.put("/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id == req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  const { title, done } = req.body;
  if (title !== undefined) task.title = title;
  if (done !== undefined) task.done = done;
  res.json(task);
});

// DELETE
app.delete("/tasks/:id", (req, res) => {
  const index = tasks.findIndex((t) => t.id == req.params.id);
  if (index === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(index, 1);
  res.status(204).send();
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
