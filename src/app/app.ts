import express, { type Express } from "express";
import { metaRouter } from "../routes/meta.routes.js";
import { tasksRouter } from "../routes/tasks.routes.js";
import { errorHandler } from "../middleware/error.js";

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

  // Meta: GET / (API info), GET /api, GET /health
  app.use(metaRouter);

  // Task CRUD routes
  app.use(tasksRouter);

  // Central error handler — must be mounted last.
  app.use(errorHandler);

  return app;
}
