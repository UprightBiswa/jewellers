/**
 * Admin access, decided in code rather than in environment variables.
 *
 * There used to be an `ADMIN ACCESS` block in .env — four variables Rahul would
 * never touch and that only ever went wrong. They are gone. What is left is this
 * file, and one command: `npm run admin`.
 *
 * The one thing NOT written here is the secret path itself. This repository is
 * public (GitHub Pages serves the client brief from it), so a literal secret in
 * a committed file is a published secret. Instead the door is *derived* from
 * AUTH_SECRET, which only ever exists in .env.local and in Vercel:
 *
 *   door = sha256("charubala:admin-door:" + AUTH_SECRET) → first 16 hex chars
 *
 * That gives a stable, unguessable URL per environment, with nothing to
 * configure and nothing to leak. Change AUTH_SECRET and the door moves, which is
 * the correct behaviour: rotating the session secret should lock the old URL.
 */

/**
 * The owner's sign-in address, used by the seed when it creates the first
 * account. Not a secret — it is the shop's own address.
 *
 * If an OWNER already exists the seed leaves its address alone, so changing this
 * line does not move a live account. To change a live one:
 *   npm run admin -- --email rahul@example.com
 */
export const ADMIN_EMAIL = "owner@charubala.com";

/** Where the staff sign-in form lives. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/** Cookie dropped by the secret door, checked on every /admin request. */
export const ADMIN_GATE_COOKIE = "cs_gate";

/**
 * IPs allowed to reach the panel at all. Empty means any IP — which is what
 * Charubala wants: Rahul works from a phone on mobile data, and that address
 * changes several times a day. Locking it would lock him out, not an attacker.
 */
export const ADMIN_IP_ALLOWLIST: readonly string[] = [];

const DOOR_HEX_LENGTH = 16;

let cachedDoor: string | null = null;

/**
 * The secret path, derived once per process.
 *
 * Async because this also runs inside `src/proxy.ts`, where the only hashing
 * available is Web Crypto — there is no synchronous `node:crypto` on the edge.
 * The result is memoised, so the digest is computed once per server instance,
 * not once per request.
 */
export async function adminDoorSecret(): Promise<string> {
  if (cachedDoor !== null) return cachedDoor;

  const authSecret = process.env.AUTH_SECRET?.trim();

  // No AUTH_SECRET means a half-configured install. Returning an empty door
  // makes /admin behave normally rather than 404 with no way in — being locked
  // out of your own panel is worse than the panel being findable.
  if (!authSecret) return (cachedDoor = "");

  const bytes = new TextEncoder().encode(`charubala:admin-door:${authSecret}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return (cachedDoor = hex.slice(0, DOOR_HEX_LENGTH));
}

/** The full URL to hand to Rahul, e.g. https://charubala.com/3efee305ebe18656 */
export async function adminDoorUrl(origin: string): Promise<string> {
  const door = await adminDoorSecret();
  return door ? `${origin.replace(/\/$/, "")}/${door}` : `${origin.replace(/\/$/, "")}/admin/login`;
}
