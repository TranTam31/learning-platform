import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, { message: "Name must not be empty" }),
  email: z.string().email({ message: "Invalid email address" }),
  emailVerified: z.boolean().default(false),
  image: z.string().url().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sessions: z.any().array().optional(),
  accounts: z.any().array().optional(),
});

export type User = z.infer<typeof UserSchema>;
