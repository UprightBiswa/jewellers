import { z } from "zod";
import type { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api/response";
import { isCrossSiteRequest } from "@/lib/api/csrf";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import {
  addToCart,
  getCart,
  readCartLines,
  removeCartLine,
  setCartQty,
} from "@/lib/cart/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullish(),
  qty: z.number().int().min(1).max(20).default(1),
});

const patchSchema = z.object({
  lineId: z.string().min(1),
  qty: z.number().int().min(0).max(20),
});

const deleteSchema = z.object({ lineId: z.string().min(1) });

function summarise(lines: Awaited<ReturnType<typeof readCartLines>>) {
  return {
    lines,
    subtotal: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

/** GET /api/v1/cart — never creates a cart row. */
export async function GET() {
  try {
    const cart = await getCart(false);
    if (!cart) return ok(summarise([]));
    return ok(summarise(await readCartLines(cart.id)));
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/v1/cart — add a line. */
export async function POST(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const limit = await rateLimit("api", callerKey(req, "cart-add"));
    if (!limit.success) {
      return fail("rate_limited", "That is a lot of taps. Give it a moment.");
    }

    const input = addSchema.parse(await req.json());
    return ok(summarise(await addToCart(input)));
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH /api/v1/cart — change a line's quantity. 0 removes it. */
export async function PATCH(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const { lineId, qty } = patchSchema.parse(await req.json());
    return ok(summarise(await setCartQty(lineId, qty)));
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/v1/cart — remove a line. */
export async function DELETE(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const { lineId } = deleteSchema.parse(await req.json());
    return ok(summarise(await removeCartLine(lineId)));
  } catch (err) {
    return handleError(err);
  }
}
