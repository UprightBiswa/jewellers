import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma 7 takes its connection through a driver adapter rather than a URL in
 * schema.prisma. `DATABASE_URL` should be the POOLED connection string (Neon's
 * `-pooler` host); migrations use `DIRECT_URL` via prisma.config.ts.
 */
const createClient = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }

  const adapter = new PrismaPg({
    connectionString,
    // Serverless functions are short-lived; a large pool just exhausts Postgres.
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
};

// Next.js hot-reloads modules in dev; without this we leak a pool per reload.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
