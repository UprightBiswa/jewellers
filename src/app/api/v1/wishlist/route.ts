import { z } from "zod";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api/response";
import { isCrossSiteRequest } from "@/lib/api/csrf";
import { toggleWishlist } from "@/app/(shop)/account/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/wishlist — just the product ids.
 *
 * Every heart on a listing page needs to know whether its piece is saved. One
 * request returning ids lets a shared client store answer for all of them,
 * instead of each card asking separately or the server threading a Set through
 * every query.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return ok({ productIds: [], signedIn: false });

    const rows = await db.wishlistItem.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    });

    return ok({ productIds: rows.map((r) => r.productId), signedIn: true });
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({ productId: z.string().min(1) });

/** POST /api/v1/wishlist — toggle one piece, and say what it is now. */
export async function POST(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const { productId } = schema.parse(await req.json());
    const result = await toggleWishlist(productId);

    if (!result.ok) return fail("unauthorized", result.message);
    return ok({ saved: result.saved });
  } catch (err) {
    return handleError(err);
  }
}
