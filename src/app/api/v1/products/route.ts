import { z } from "zod";
import type { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api/response";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { listProducts, type SortKey } from "@/lib/queries/catalog";

export const runtime = "nodejs";

const querySchema = z.object({
  category: z.string().optional(),
  collection: z.string().optional(),
  q: z.string().max(80).optional(),
  purity: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"]).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

/**
 * GET /api/v1/products
 *
 * Public, read-only, cursor-paginated. Prices come back in PAISE — see
 * docs/API.md. No API key needed; the rate limiter is the only gate.
 */
export async function GET(req: NextRequest) {
  try {
    const limit = await rateLimit("api", callerKey(req));
    if (!limit.success) {
      return fail("rate_limited", "Too many requests. Try again shortly.", undefined, {
        headers: { "retry-after": String(Math.ceil((limit.reset - Date.now()) / 1000)) },
      });
    }

    const params = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const result = await listProducts({
      categorySlug: params.category,
      collectionSlug: params.collection,
      q: params.q,
      purity: params.purity
        ? (params.purity.split(",") as NonNullable<Parameters<typeof listProducts>[0]>["purity"])
        : undefined,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sort: params.sort as SortKey,
      cursor: params.cursor,
      limit: params.limit,
    });

    return ok(
      { products: result.products },
      {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        count: result.products.length,
      },
      { headers: { "x-ratelimit-remaining": String(limit.remaining) } },
    );
  } catch (err) {
    return handleError(err);
  }
}
