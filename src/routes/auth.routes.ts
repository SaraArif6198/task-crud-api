import { Router, type Request, type Response } from "express";
import { ZodError } from "zod";
import type { AuthProvider } from "../auth/auth-provider.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/require-auth.js";
import { credentialsSchema } from "../schemas/auth.schema.js";

export function createAuthRouter(provider: AuthProvider): Router {
  const router = Router();
  const guard = requireAuth(provider);

  router.get("/public/info", (_req, res) => {
    res.status(200).json({ message: "Welcome stranger! This info is public." });
  });

  router.post("/auth/signup", async (req, res, next) => {
    try {
      const { email, password } = credentialsSchema.parse(req.body);
      const user = await provider.signUp(email, password);
      res.status(201).json(user);
    } catch (error) {
      if (!(error instanceof ZodError)) {
        res.status(400).json({ error: error instanceof Error ? error.message : "Sign up failed" });
        return;
      }
      next(error);
    }
  });

  router.post("/auth/login", async (req, res, next) => {
    try {
      const { email, password } = credentialsSchema.parse(req.body);
      const session = await provider.login(email, password);
      res.status(200).json({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
    } catch (error) {
      if (!(error instanceof ZodError)) {
        res.status(401).json({ error: "Invalid login credentials" });
        return;
      }
      next(error);
    }
  });

  router.get("/protected/profile", guard, (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    res.status(200).json({ id: user.id, email: user.email, created_at: user.created_at });
  });

  router.get("/protected/dashboard", guard, (req: Request, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    res.status(200).json({ message: `Welcome to your protected dashboard, ${user.email ?? user.id}.` });
  });

  router.post("/auth/logout", guard, async (req: Request, res: Response, next) => {
    try {
      await provider.logout((req as AuthenticatedRequest).accessToken);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
