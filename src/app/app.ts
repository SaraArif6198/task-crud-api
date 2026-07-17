import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import { metaRouter } from "../routes/meta.routes.js";
import { tasksRouter } from "../routes/tasks.routes.js";
import { errorHandler } from "../middleware/error.js";
import { openapiSpec } from "../docs/openapi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../public");

/**
 * Application factory.
 *
 * The Express app is created here and kept separate from the network listener
 * (see server.ts). This lets tests import a fresh app with supertest without
 * binding a real port.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json());

  // Serve web UI assets (styles.css, app.js). index:false so GET / stays
  // content-negotiated in the meta router rather than auto-serving index.html.
  app.use(express.static(publicDir, { index: false }));

  // Meta: GET / (API info), GET /api, GET /health
  app.use(metaRouter);

  // Swagger UI at /docs (spec generated from JSDoc @openapi comments)
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

  // Task CRUD routes
  app.use(tasksRouter);

  // Central error handler — must be mounted last.
  app.use(errorHandler);

  return app;
}
