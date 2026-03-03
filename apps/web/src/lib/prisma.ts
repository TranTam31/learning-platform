import { PrismaClient } from "@repo/db";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit connection pool size for serverless environment
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

// Cache globally in ALL environments to prevent exhausting DB connections
// In serverless (Vercel), this reuses the client within the same cold-start instance
globalForPrisma.prisma = prisma;

export default prisma;
