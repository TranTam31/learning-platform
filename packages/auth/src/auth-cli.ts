import { PrismaClient } from "@repo/db";
import { createAuth } from "./server";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({}),
});

export const auth = createAuth(prisma);
