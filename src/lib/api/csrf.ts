import type { NextRequest } from "next/server";

/**
 * Cross-site request forgery guard for the JSON API.
 *
 * Server actions already carry Next's own origin check, and the CORS layer
 * refuses unknown origins at preflight. This closes the remaining gap: a request
 * that avoids preflight entirely — a plain form post from another site, an image
 * or script tag — still arrives with the customer's session cookie attached.
 *
 * `Sec-Fetch-Site` is set by the browser and cannot be spoofed by page script.
 * Requests without it are server-to-server (curl, Razorpay, an API key holder),
 * which have no ambient cookie to abuse, so they pass.
 */
export function isCrossSiteRequest(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (!site) return false;
  if (site === "same-origin" || site === "none") return false;

  // Same-site but a different subdomain is still ours.
  if (site === "same-site") return false;

  // cross-site: allow only origins the operator listed.
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const allowed = (process.env.API_CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return !allowed.includes(origin);
}
