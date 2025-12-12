import { initContract } from "@ts-rest/core";
import z from "zod";

const c = initContract();

export const SignUpSchema = z.object({
  fullname: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // roles: z.array(z.enum(["STUDENT", "TEACHER", "ADMIN"])).default(["STUDENT"]),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignInInput = z.infer<typeof SignInSchema>;

export const authContract = c.router(
  {
    signup: {
      method: "POST",
      path: "/signup",
      body: SignUpSchema,
      responses: {
        201: SignUpSchema.omit({ password: true }),
      },
    },
    // signin: {
    //   method: "POST",
    //   path: "/signin",
    //   body: SignInSchema,
    //   responses: {
    //     200: z.object({
    //       token: z.string(),
    //     }),
    //     401: z.object({
    //       error: z.string(),
    //     }),
    //   },
    // },
  },
  { pathPrefix: "/auth" }
);
