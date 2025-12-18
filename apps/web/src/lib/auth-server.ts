import { createAuth } from "@repo/auth/server";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";

export const auth = createAuth(prisma, {
  plugins: [nextCookies()],
});
