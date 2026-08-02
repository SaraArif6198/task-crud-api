import swaggerJsdoc from "swagger-jsdoc";

/**
 * OpenAPI spec generated from JSDoc @openapi annotations on the route files
 * (the stretch goal — the spec is derived from code comments, not hand-written).
 */
export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Authenticated Task API",
      version: "4.0.0",
      description:
        "A Dockerized PostgreSQL task API with Supabase authentication, verified JWT bearer tokens, and reusable route protection.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local dev server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste the access_token returned by POST /auth/login.",
        },
      },
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            title: { type: "string", example: "Learn what an API is" },
            done: { type: "boolean", example: false },
          },
          required: ["id", "title", "done"],
        },
        CreateTask: {
          type: "object",
          properties: { title: { type: "string", example: "Buy milk" } },
          required: ["title"],
        },
        UpdateTask: {
          type: "object",
          properties: {
            title: { type: "string", example: "Buy oat milk" },
            done: { type: "boolean", example: true },
          },
        },
        Stats: {
          type: "object",
          properties: {
            total: { type: "integer", example: 3 },
            done: { type: "integer", example: 1 },
            open: { type: "integer", example: 2 },
          },
        },
        Error: {
          type: "object",
          properties: { error: { type: "string", example: "Task 99 not found" } },
          required: ["error"],
        },
        Credentials: {
          type: "object",
          properties: {
            email: { type: "string", format: "email", example: "test@example.com" },
            password: { type: "string", format: "password", example: "password123" },
          },
          required: ["email", "password"],
        },
        AuthTokens: {
          type: "object",
          properties: {
            access_token: { type: "string" },
            refresh_token: { type: "string" },
          },
          required: ["access_token", "refresh_token"],
        },
        Profile: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            created_at: { type: "string", format: "date-time" },
          },
          required: ["id", "email", "created_at"],
        },
      },
    },
    paths: {
      "/auth/signup": {
        post: {
          tags: ["Authentication"], summary: "Create a Supabase user account",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } } },
          responses: {
            "201": { description: "User created" },
            "400": { description: "Missing/invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/auth/login": {
        post: {
          tags: ["Authentication"], summary: "Log in and receive JWT tokens",
          requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Credentials" } } } },
          responses: {
            "200": { description: "Authenticated", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthTokens" } } } },
            "400": { description: "Missing/invalid credentials" },
            "401": { description: "Invalid login credentials" },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Authentication"], summary: "End the authenticated session", security: [{ bearerAuth: [] }],
          responses: { "204": { description: "Logged out" }, "401": { description: "Token missing or invalid" } },
        },
      },
      "/public/info": {
        get: {
          tags: ["Access demonstration"], summary: "Read public information",
          responses: { "200": { description: "Public response" } },
        },
      },
      "/protected/profile": {
        get: {
          tags: ["Access demonstration"], summary: "Read the verified user's profile", security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Verified profile", content: { "application/json": { schema: { $ref: "#/components/schemas/Profile" } } } },
            "401": { description: "Token missing, malformed, invalid, or expired" },
          },
        },
      },
      "/protected/dashboard": {
        get: {
          tags: ["Access demonstration"], summary: "Second route protected by the same middleware", security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Protected dashboard" }, "401": { description: "Token missing or invalid" } },
        },
      },
    },
  },
  // Scan the compiled and source route files for @openapi annotations.
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
});
