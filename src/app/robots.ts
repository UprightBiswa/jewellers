import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

const base = SITE_URL;

/**
 * Crawl rules.
 *
 * The admin, the API, the bag and checkout are disallowed — none of them are
 * pages anyone should find in a search result, and a crawler walking /cart with
 * a session cookie just creates noise. A preview deployment blocks everything,
 * so a staging URL can never outrank the real shop.
 */
export default function robots(): MetadataRoute.Robots {
  const isProduction =
    process.env.VERCEL_ENV === "production" ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === "production");

  if (!isProduction) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/cart",
          "/checkout",
          "/account",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/search",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
