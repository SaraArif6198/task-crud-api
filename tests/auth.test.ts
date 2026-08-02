import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app/app.js";
import type { AuthProvider, AuthSession, AuthUser } from "../src/auth/auth-provider.js";
import { openapiSpec } from "../src/docs/openapi.js";

const testUser: AuthUser = {
  id: "8bb33e2d-4239-4980-a11f-0c8582db850c",
  email: "test@example.com",
  created_at: "2026-08-03T00:00:00.000Z",
  app_metadata: {},
  user_metadata: {},
};

class FakeAuthProvider implements AuthProvider {
  loggedOutToken: string | null = null;

  async signUp(email: string, password: string): Promise<AuthUser> {
    if (email === "taken@example.com") throw new Error("User already registered");
    expect(password).not.toBe("");
    return { ...testUser, email };
  }

  async login(email: string, password: string): Promise<AuthSession> {
    if (email !== testUser.email || password !== "password123") {
      throw new Error("bad credentials");
    }
    return { accessToken: "valid.jwt.token", refreshToken: "refresh-token" };
  }

  async verifyToken(token: string): Promise<AuthUser> {
    if (token !== "valid.jwt.token") throw new Error("bad token");
    return testUser;
  }

  async logout(token: string): Promise<void> {
    this.loggedOutToken = token;
  }
}

function setup() {
  const provider = new FakeAuthProvider();
  return { app: createApp({ authProvider: provider }), provider };
}

describe("open authentication routes", () => {
  it("POST /auth/signup returns 201 and the created user", async () => {
    const { app } = setup();
    const response = await request(app)
      .post("/auth/signup")
      .send({ email: "new@example.com", password: "password123" });

    expect(response.status).toBe(201);
    expect(response.body.email).toBe("new@example.com");
    expect(response.body.password).toBeUndefined();
  });

  it("POST /auth/signup rejects missing or invalid fields with 400", async () => {
    const { app } = setup();
    expect((await request(app).post("/auth/signup").send({ email: "test@example.com" })).status).toBe(400);
    expect((await request(app).post("/auth/signup").send({ email: "not-an-email", password: "x" })).status).toBe(400);
  });

  it("POST /auth/login returns access and refresh tokens", async () => {
    const { app } = setup();
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ access_token: "valid.jwt.token", refresh_token: "refresh-token" });
  });

  it("POST /auth/login returns 400 for missing fields and 401 for bad credentials", async () => {
    const { app } = setup();
    expect((await request(app).post("/auth/login").send({ email: "test@example.com" })).status).toBe(400);
    const invalid = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "wrong" });
    expect(invalid.status).toBe(401);
    expect(invalid.body).toEqual({ error: "Invalid login credentials" });
  });

  it("GET /public/info is open", async () => {
    const { app } = setup();
    const response = await request(app).get("/public/info");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: "Welcome stranger! This info is public." });
  });
});

describe("JWT middleware and protected routes", () => {
  it("rejects missing and malformed Authorization headers with 401", async () => {
    const { app } = setup();
    const missing = await request(app).get("/protected/profile");
    const malformed = await request(app).get("/protected/profile").set("Authorization", "valid.jwt.token");
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: "Access token required" });
    expect(malformed.status).toBe(401);
    expect(malformed.body).toEqual({ error: "Access token required" });
  });

  it("rejects an invalid or tampered bearer token with 401", async () => {
    const { app } = setup();
    const response = await request(app)
      .get("/protected/profile")
      .set("Authorization", "Bearer tampered.jwt.token");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token" });
  });

  it("returns only safe profile fields for a valid token", async () => {
    const { app } = setup();
    const response = await request(app)
      .get("/protected/profile")
      .set("Authorization", "Bearer valid.jwt.token");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: testUser.id, email: testUser.email, created_at: testUser.created_at });
    expect(response.body.app_metadata).toBeUndefined();
  });

  it("reuses the same guard on the dashboard route", async () => {
    const { app } = setup();
    expect((await request(app).get("/protected/dashboard")).status).toBe(401);
    const valid = await request(app)
      .get("/protected/dashboard")
      .set("Authorization", "Bearer valid.jwt.token");
    expect(valid.status).toBe(200);
    expect(valid.body.message).toContain("test@example.com");
  });

  it("protects logout and returns 204 after signing out", async () => {
    const { app, provider } = setup();
    expect((await request(app).post("/auth/logout")).status).toBe(401);
    const response = await request(app)
      .post("/auth/logout")
      .set("Authorization", "Bearer valid.jwt.token");
    expect(response.status).toBe(204);
    expect(provider.loggedOutToken).toBe("valid.jwt.token");
  });
});

describe("Swagger bearer authentication", () => {
  it("documents bearerAuth and marks protected routes as secured", () => {
    const spec = openapiSpec as Record<string, any>;
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(spec.paths["/protected/profile"].get.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.paths["/auth/logout"].post.security).toEqual([{ bearerAuth: [] }]);
    expect(spec.paths["/public/info"].get.security).toBeUndefined();
  });
});
