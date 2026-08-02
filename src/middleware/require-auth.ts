import type { NextFunction, Request, Response } from "express";
import type { AuthProvider, AuthUser } from "../auth/auth-provider.js";

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
  accessToken: string;
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function requireAuth(provider: AuthProvider) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractBearerToken(req.header("authorization"));
    if (!token) {
      res.status(401).json({ error: "Access token required" });
      return;
    }

    try {
      const user = await provider.verifyToken(token);
      const authenticated = req as AuthenticatedRequest;
      authenticated.user = user;
      authenticated.accessToken = token;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}
