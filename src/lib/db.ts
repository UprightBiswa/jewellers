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
    // Production must not start without a database — fail at boot, loudly.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is not set — see .env.example");
    }
    // Development: point at a local address that is almost certainly closed.
    // Nothing connects, the TCP probe in lib/demo/fallback.ts sees that, and the
    // storefront renders on preview data instead of crashing on import.
    console.warn("  DATABASE_URL is not set — running on preview data.");
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: "postgresql://localhost:1/none" }),
    });
  }

  // The local development database (scripts/dev-db.mjs) is PGlite behind a
  // socket. It serialises queries and hangs up on spare connections, so a pool
  // larger than one produces "Server has closed the connection" at random.
  // A single developer needs exactly one connection anyway.
  const isLocalPglite =
    process.env.NODE_ENV !== "production" && /127\.0\.0\.1|localhost/.test(connectionString);

  const adapter = new PrismaPg({
    connectionString,
    // Serverless functions are short-lived; a large pool just exhausts Postgres.
    max: isLocalPglite ? 1 : process.env.NODE_ENV === "production" ? 5 : 5,
    idleTimeoutMillis: isLocalPglite ? 0 : 30_000,
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
