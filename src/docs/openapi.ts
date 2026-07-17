import swaggerJsdoc from "swagger-jsdoc";

/**
 * OpenAPI spec generated from JSDoc @openapi annotations on the route files
 * (the stretch goal — the spec is derived from code comments, not hand-written).
 */
export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Task CRUD API",
      version: "1.0.0",
      description:
        "A small in-memory to-do CRUD API — FlyRank Backend AI Engineering, Week 2 Assignment 1. Data lives in memory only and resets when the server restarts.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local dev server" }],
    components: {
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
      },
    },
  },
  // Scan the compiled and source route files for @openapi annotations.
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
});
