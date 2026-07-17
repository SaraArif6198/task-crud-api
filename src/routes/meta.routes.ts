import { Router } from "express";

/**
 * Meta routes: API info and health check.
 *
 * In Stage 1, GET / returns the API-info JSON directly. When the web UI is
 * added later, GET / becomes content-negotiated (HTML for browsers, this same
 * JSON for Accept: application/json), and GET /api remains the always-JSON alias.
 */
export const metaRouter = Router();

const apiInfo = {
  name: "task-crud-api",
  version: "1.0.0",
  endpoints: {
    "GET /tasks": "list tasks (supports ?done, ?search, ?limit, ?offset)",
    "GET /tasks/:id": "get one task",
    "POST /tasks": "create a task",
    "PUT /tasks/:id": "update a task",
    "DELETE /tasks/:id": "delete a task",
    "GET /stats": "task counts",
    "POST /reset": "restore seed tasks",
    "GET /docs": "Swagger UI",
  },
};

metaRouter.get("/", (_req, res) => {
  res.status(200).json(apiInfo);
});

metaRouter.get("/api", (_req, res) => {
  res.status(200).json(apiInfo);
});

metaRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
