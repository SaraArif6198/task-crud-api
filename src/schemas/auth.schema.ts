import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Email must be valid"),
  password: z.string().min(1, "Password is required"),
});
