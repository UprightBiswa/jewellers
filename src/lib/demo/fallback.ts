import "server-only";
import net from "node:net";

/**
 * Preview mode.
 *
 * Before the Neon database exists, every catalogue query would throw and the
 * whole storefront would be a stack trace — which makes it impossible to review
 * the design or show it to a client. So in DEVELOPMENT ONLY, an unreachable
 * database falls back to the demo catalogue in ./data.ts and the site renders
 * with a visible banner saying the data is not real.
 *
 * Two hard rules keep this from becoming a production bug:
 *
 *   1. It refuses to run when NODE_ENV is "production" — a real deployment that
 *      loses its database fails loudly, as it should.
 *   2. It only substitutes data when the database is UNREACHABLE. A malformed
 *      query, a missing column, a constraint violation — those still throw,
 *      because they are bugs, and hiding them behind demo data would be far
 *      worse than a crash.
 *
 * Why a TCP probe rather than just catching the query error: Prisma 7.10 with
 * the pg adapter throws `TypeError: object null is not iterable` from inside an
 * AggregateError constructor when the pool cannot connect, and it throws it
 * asynchronously, outside the promise chain. No try/catch around the await ever
 * sees it; it arrives as an uncaughtException and takes the dev server down. So
 * in development we check the socket first and never enter Prisma at all when
 * there is nothing listening.
 */

const PROBE_TTL_MS = 5_000;
const PROBE_TIMEOUT_MS = 1_500;

let probe: { checkedAt: number; reachable: boolean } | null = null;
let inFlight: Promise<boolean> | null = null;

function parseTarget(): { host: string; port: number } | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname, port: Number(parsed.port || 5432) };
  } catch {
    return null;
  }
}

function tcpProbe(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

/**
 * Whether something is listening where DATABASE_URL points. Cached for a few
 * seconds so a page render costs one probe, not one per query. Always true in
 * production — the probe is a development affordance, not a health check.
 */
export async function databaseReachable(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return true;

  const now = Date.now();
  if (probe && now - probe.checkedAt < PROBE_TTL_MS) return probe.reachable;
  if (inFlight) return inFlight;

  const target = parseTarget();
  if (!target) {
    probe = { checkedAt: now, reachable: false };
    return false;
  }

  inFlight = tcpProbe(target.host, target.port).then((reachable) => {
    probe = { checkedAt: Date.now(), reachable };
    inFlight = null;
    return reachable;
  });

  return inFlight;
}

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "\n  No database reachable — serving PREVIEW DATA so the UI renders.\n" +
      "  Set DATABASE_URL and DIRECT_URL in .env.local, then:\n" +
      "    npx prisma migrate dev --name init && npm run db:seed\n",
  );
}

const CONNECTION_CODES = new Set([
  "P1000", // authentication failed
  "P1001", // cannot reach database server
  "P1002", // timed out
  "P1003", // database does not exist
  "P1017", // server closed the connection
  "P2021", // table does not exist — migrations have not been run
  "P2022", // column does not exist — ditto
]);

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;

  const code = (err as { code?: string }).code;
  if (code && (CONNECTION_CODES.has(code) || code === "ECONNREFUSED" || code === "ENOTFOUND")) {
    return true;
  }

  const message = (err as { message?: string }).message ?? "";
  return /ECONNREFUSED|ENOTFOUND|Can't reach database server|does not exist in the current database/i.test(
    message,
  );
}

/**
 * Run `query`; in development, fall back to demo data when the database is not
 * there. The socket check happens before Prisma is touched — see the note above.
 */
export async function devFallback<T>(query: () => Promise<T>, fallback: () => T): Promise<T> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev && !(await databaseReachable())) {
    warnOnce();
    return fallback();
  }

  try {
    return await query();
  } catch (err) {
    // Reachable but unmigrated: the socket answered, the tables do not exist.
    if (!isDev || !isConnectionError(err)) throw err;
    warnOnce();
    return fallback();
  }
}
