import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

/**
 * Central error handler → always emits JSON { error: "<message>" }.
 *
 * Handles two families of error uniformly so routes never leak a 500:
 *  - Malformed JSON bodies (express.json() throws a SyntaxError) → 400
 *  - Zod validation errors passed via next(err) → 400 with the first issue
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Invalid request body" });
  }

  // express.json() raises a SyntaxError with a `body` property on bad JSON.
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Request body is not valid JSON" });
  }

  return res.status(500).json({ error: "Internal server error" });
};
