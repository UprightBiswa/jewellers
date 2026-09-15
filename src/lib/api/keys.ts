import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Server-to-server access to /api/v1 via an `x-api-key` header.
 *
 * Keys are shown once, at creation, and only a SHA-256 digest is stored. The
 * first 8 characters are kept in the clear as a prefix so the owner can tell
 * two keys apart in the admin without us ever holding the secret.
 */

const PREFIX = "sk_live_";

export type ApiScope = "read" | "write" | "admin";

export function generateApiKey(): { key: string; keyPrefix: string; hashedKey: string } {
  const secret = randomBytes(24).toString("base64url");
  const key = `${PREFIX}${secret}`;
  return {
    key,
    keyPrefix: key.slice(0, 16),
    hashedKey: hashKey(key),
  };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export type ApiKeyContext = {
  id: string;
  name: string;
  scopes: ApiScope[];
};

/**
 * Returns null for anonymous callers — that is not an error. Public catalogue
 * endpoints work without a key; only write scopes require one.
 */
export async function authenticateApiKey(req: Request): Promise<ApiKeyContext | null> {
  const header = req.headers.get("x-api-key");
  if (!header) return null;

  const hashed = hashKey(header);
  const record = await db.apiKey.findUnique({
    where: { hashedKey: hashed },
    select: { id: true, name: true, scopes: true, isActive: true, expiresAt: true, hashedKey: true },
  });

  if (!record || !record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;
  if (!safeEqual(record.hashedKey, hashed)) return null;

  // Best-effort touch; a failed write must never block the request.
  void db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return { id: record.id, name: record.name, scopes: record.scopes as ApiScope[] };
}

export function hasScope(ctx: ApiKeyContext | null, scope: ApiScope): boolean {
  if (!ctx) return false;
  return ctx.scopes.includes(scope) || ctx.scopes.includes("admin");
}
