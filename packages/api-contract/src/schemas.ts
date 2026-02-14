import { z } from "zod";

// ── Auth form validation schemas ───────────────────────────
// Used by sign-in / sign-up forms (not ts-rest contracts).

export const SignUpSchema = z.object({
  fullname: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInInput = z.infer<typeof SignInSchema>;

// ── Shared entity schemas ──────────────────────────────────

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
