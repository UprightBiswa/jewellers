/**
 * Where this site lives, resolved once.
 *
 * Eight different files used to write `process.env.NEXT_PUBLIC_SITE_URL ??
 * "http://localhost:3000"`, which is fine locally and quietly wrong the first
 * time you deploy: forget the variable and the sitemap, the canonical tags, the
 * OpenGraph images and every link in an order email point at localhost:3000.
 * Nothing errors. It just makes a site Google cannot index and emails whose
 * links go nowhere.
 *
 * So the fallback is Vercel's own address rather than localhost:
 *
 *   1. NEXT_PUBLIC_SITE_URL          — the real domain, once it is pointed
 *   2. …VERCEL_PROJECT_PRODUCTION_URL — the stable *.vercel.app name
 *   3. …VERCEL_URL                    — this one deployment (preview builds)
 *   4. http://localhost:3000          — development
 *
 * Both Vercel variables are read in their NEXT_PUBLIC_ form too, because a
 * client component only receives variables with that prefix; Vercel exposes
 * both spellings while "Automatically expose System Environment Variables" is
 * on, which is the default. Each is written out literally rather than looked up
 * dynamically — Next inlines these at build time by matching the text.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // The project's production domain — stable across deployments.
  const production =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/+$/, "")}`;

  // This specific deployment — what a preview build gets.
  const deployment =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

/** No trailing slash, ever — everything here builds `${SITE_URL}/path`. */
export const SITE_URL = resolveSiteUrl();

/** Absolute URL for a path, for emails, sitemaps and canonical tags. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
