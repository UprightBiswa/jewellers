import { z } from "zod";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { fail, handleError, ok } from "@/lib/api/response";
import { isCrossSiteRequest } from "@/lib/api/csrf";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { getCart, readCartLines } from "@/lib/cart/server";
import { computeTotals } from "@/lib/orders/totals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  code: z.string().min(2).max(24),
  payment: z.enum(["ONLINE", "COD"]).default("ONLINE"),
});

/**
 * POST /api/v1/coupons/validate
 *
 * Returns the whole recomputed bill, not just the discount, so the checkout
 * summary updates from one source. Rate-limited because a coupon field is a
 * guessing game otherwise.
 */
export async function POST(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const limit = await rateLimit("coupon", callerKey(req, "coupon"));
    if (!limit.success) {
      return fail("rate_limited", "Too many code attempts. Try again in a few minutes.");
    }

    const { code, payment } = schema.parse(await req.json());

    const cart = await getCart();
    if (!cart) return fail("bad_request", "Your bag is empty.");

    const lines = await readCartLines(cart.id);
    const session = await auth();

    const totals = await computeTotals({
      lines,
      couponCode: code,
      payment,
      userId: session?.user?.id ?? null,
    });

    return ok({
      applied: true,
      code: totals.coupon?.code,
      description: totals.coupon?.description,
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        shippingFee: totals.shippingFee,
        codFee: totals.codFee,
        gstAmount: totals.gstAmount,
        total: totals.total,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
