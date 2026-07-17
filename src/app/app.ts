import express, { type Express } from "express";

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

  // Stage 0 — hello server. Replaced by real routes in later stages.
  app.get("/", (_req, res) => {
    res.status(200).json({ message: "Task API is running. Visit /api for details." });
  });

  return app;
}
