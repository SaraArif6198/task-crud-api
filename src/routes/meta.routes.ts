import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../public");

/**
 * Meta routes: API info and health check.
 *
 * GET / is content-negotiated: browsers (Accept: text/html) get the web UI;
 * curl / API clients (Accept: application/json) get the API-info JSON, so the
 * assignment's `curl -i http://localhost:3000/` checkpoint still passes.
 * GET /api is the always-JSON alias.
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

metaRouter.get("/", (req, res) => {
  // Browsers send an Accept header explicitly listing text/html → serve the UI.
  // Plain curl (Accept: */*) and API clients get the API-info JSON, so the
  // assignment's `curl -i http://localhost:3000/` checkpoint returns JSON.
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) {
    return res.status(200).sendFile(path.join(publicDir, "index.html"));
  }
  res.status(200).json(apiInfo);
});

metaRouter.get("/api", (_req, res) => {
  res.status(200).json(apiInfo);
});

metaRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});
