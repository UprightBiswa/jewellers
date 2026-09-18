import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting.
 *
 * Upstash when the keys exist, an in-process fallback when they do not, so the
 * app still runs locally and in CI without Redis. The fallback is per-instance
 * and therefore only a speed bump — that is fine for development and honest
 * about what it is.
 */

type Verdict = { success: boolean; remaining: number; reset: number };

/**
 * Upstash, but only if the variables hold something that could actually be
 * Upstash.
 *
 * Checking merely that they are set is not enough: a deploy with
 * UPSTASH_REDIS_REST_URL="1" — an empty box filled in with a placeholder —
 * passed that check, and the client threw on an invalid URL at module load,
 * which failed the entire production build. An optional integration must never
 * be able to do that. So the URL is validated, and construction is wrapped:
 * anything wrong falls back to the in-process limiter with a warning.
 */
function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;

  if (!url.startsWith("https://")) {
    console.warn(
      `[ratelimit] UPSTASH_REDIS_REST_URL is not an https URL (got "${url}") — ` +
        "using the in-process limiter. Remove the variable or set a real Upstash URL.",
    );
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (err) {
    console.warn("[ratelimit] could not start Upstash, using the in-process limiter", err);
    return null;
  }
}

const redis = createRedis();

/** Buckets tuned to what each endpoint actually costs us. */
export const LIMITS = {
  /** Public catalogue reads */
  api: { tokens: 120, window: "1 m" },
  /** Sign in, register — brute-force surface */
  auth: { tokens: 8, window: "5 m" },
  /** Password reset and OTP send — costs money per email */
  email: { tokens: 4, window: "15 m" },
  /** Coupon guessing */
  coupon: { tokens: 15, window: "10 m" },
  /** Contact form — spam surface */
  contact: { tokens: 3, window: "30 m" },
  /** Cloudinary upload signatures */
  upload: { tokens: 40, window: "5 m" },
  /** Order placement */
  checkout: { tokens: 10, window: "10 m" },
} as const;

export type LimitName = keyof typeof LIMITS;

const upstashCache = new Map<LimitName, Ratelimit>();

function upstashFor(name: LimitName): Ratelimit | null {
  if (!redis) return null;
  const cached = upstashCache.get(name);
  if (cached) return cached;

  const { tokens, window } = LIMITS[name];
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    prefix: `rl:${name}`,
    analytics: false,
  });
  upstashCache.set(name, limiter);
  return limiter;
}

// --- in-process fallback ----------------------------------------------------

const memory = new Map<string, { count: number; resetAt: number }>();

function windowMs(window: string): number {
  const [value, unit] = window.split(" ");
  const n = Number(value);
  return unit?.startsWith("s") ? n * 1000 : unit?.startsWith("h") ? n * 3_600_000 : n * 60_000;
}

function memoryLimit(name: LimitName, key: string): Verdict {
  const { tokens, window } = LIMITS[name];
  const ttl = windowMs(window);
  const now = Date.now();
  const id = `${name}:${key}`;

  const entry = memory.get(id);
  if (!entry || entry.resetAt < now) {
    memory.set(id, { count: 1, resetAt: now + ttl });
    return { success: true, remaining: tokens - 1, reset: now + ttl };
  }

  entry.count += 1;
  return {
    success: entry.count <= tokens,
    remaining: Math.max(0, tokens - entry.count),
    reset: entry.resetAt,
  };
}

/** Identify the caller: API key first, then the real client IP. */
export function callerKey(req: Request, extra?: string): string {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) return `k:${apiKey.slice(0, 12)}`;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return extra ? `${ip}:${extra}` : ip;
}

export async function rateLimit(name: LimitName, key: string): Promise<Verdict> {
  const limiter = upstashFor(name);
  if (!limiter) return memoryLimit(name, key);

  const res = await limiter.limit(key);
  return { success: res.success, remaining: res.remaining, reset: res.reset };
}
