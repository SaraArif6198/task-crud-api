import { z } from "zod";

/**
 * Zod-first data model. These schemas are the single source of truth for both
 * runtime validation and the TypeScript types (via z.infer).
 */

// A stored task — exactly three keys.
export const TaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  done: z.boolean(),
});
export type Task = z.infer<typeof TaskSchema>;

// Create body: only title is accepted. Any client-sent id/done is ignored by
// the route (the server assigns id and forces done:false).
export const CreateTaskSchema = z.object({
  title: z
    .string({ error: "title is required and must be a non-empty string" })
    .trim()
    .min(1, "title is required and must be a non-empty string"),
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

// Update body: partial, but at least one updatable field must be present.
export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "title must be a non-empty string").optional(),
    done: z.boolean().optional(),
  })
  .refine((data) => data.title !== undefined || data.done !== undefined, {
    error: "provide at least one field to update (title or done)",
  });
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
