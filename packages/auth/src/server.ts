import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import type { PrismaClient } from "@prisma/client";
import type { BetterAuthPlugin } from "better-auth";
import { ac, admin, member, owner } from "./plugins/permission.js";

export type CreateAuthOptions = {
  trustedOrigins?: string[];
  plugins?: BetterAuthPlugin[];
};

export function createAuth(prisma: PrismaClient, options?: CreateAuthOptions) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: options?.trustedOrigins,
    plugins: [
      organization({
        ac: ac,
        roles: {
          owner,
          admin,
          member,
        },
      }),
      ...(options?.plugins ?? []),
    ],
  });
}
