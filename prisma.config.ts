import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 keeps connection URLs out of schema.prisma.
 *
 *   DATABASE_URL  pooled connection, used by the app at runtime
 *   DIRECT_URL    direct connection, used by the CLI for migrations
 *                 (Neon's pooler cannot run migrations)
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
});
