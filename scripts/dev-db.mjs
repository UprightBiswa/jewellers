/**
 * A real Postgres for local development, with nothing to install.
 *
 * PGlite is Postgres compiled to WebAssembly. `pglite-socket` puts it behind a
 * genuine Postgres wire-protocol socket, so Prisma, `prisma migrate`, and
 * Prisma Studio all connect to it exactly as they would to Neon — same driver,
 * same SQL, same migrations. Nothing in the application knows the difference.
 *
 * This exists so the shop can be developed and tested end to end before the
 * client's Neon account is set up. It is NOT for production: single connection
 * at a time, and the data lives in a folder.
 *
 *   npm run db:local          # start it (leave running)
 *   npm run db:local:reset    # throw the data away and start fresh
 *
 * Data lives in .pglite/ which is git-ignored.
 */

import { rm } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const DATA_DIR = ".pglite";
const PORT = Number(process.env.PGLITE_PORT ?? 5432);
const reset = process.argv.includes("--reset");

if (reset) {
  await rm(DATA_DIR, { recursive: true, force: true });
  console.log("Wiped " + DATA_DIR);
}

const db = await PGlite.create({ dataDir: DATA_DIR });

// Prisma's shadow database for `migrate dev` opens a second connection, and the
// seed script opens its own. One at a time is not enough.
const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: "127.0.0.1",
  maxConnections: 10,
});

await server.start();

console.log(`
  Local Postgres is up.

    DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"
    DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres"

  Leave this running. In another terminal:

    npx prisma migrate dev --name init
    npm run db:seed
    npm run dev
`);

const shutdown = async () => {
  console.log("\nStopping local Postgres…");
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
