import { createAuth } from "@repo/auth/server";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";

export const auth = createAuth(prisma, {
  trustedOrigins: ["myapp://", "http://localhost:8081"],
  plugins: [nextCookies(), bearer()],
});
