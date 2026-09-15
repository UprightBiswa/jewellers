import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS for /api/v1.
 *
 * The storefront calls the API same-origin and needs no CORS at all. This exists
 * for the cases that come later: a separate admin app, a partner's dashboard, a
 * mobile build served from a different origin. The allow-list is explicit —
 * `*` is never returned when credentials are involved.
 */

const ALLOWED_METHODS = "GET,POST,PATCH,PUT,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, x-api-key, x-request-id";
const EXPOSED_HEADERS = "x-request-id, x-api-version, x-ratelimit-remaining";
const MAX_AGE = "86400";

function allowList(): string[] {
  const fromEnv = (process.env.API_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) fromEnv.push(site.replace(/\/$/, ""));

  if (process.env.NODE_ENV === "development") {
    fromEnv.push("http://localhost:3000", "http://localhost:3001");
  }
  return [...new Set(fromEnv)];
}

export function resolveOrigin(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // same-origin or server-to-server
  return allowList().includes(origin) ? origin : null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Expose-Headers": EXPOSED_HEADERS,
    Vary: "Origin",
  };
}

/** Answer a browser preflight. */
export function preflight(req: NextRequest): NextResponse {
  const origin = resolveOrigin(req);
  if (!origin) {
    // Unknown origin: refuse rather than reflect it back.
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(origin), "Access-Control-Max-Age": MAX_AGE },
  });
}

export function withCors(res: NextResponse, req: NextRequest): NextResponse {
  const origin = resolveOrigin(req);
  for (const [k, v] of Object.entries(corsHeaders(origin))) {
    res.headers.set(k, v);
  }
  return res;
}
