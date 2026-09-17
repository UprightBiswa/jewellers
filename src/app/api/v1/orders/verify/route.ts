import { z } from "zod";
import type { NextRequest } from "next/server";

import { fail, handleError, ok } from "@/lib/api/response";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { confirmPayment } from "@/lib/orders/confirm";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(10),
});

/**
 * POST /api/v1/orders/verify
 *
 * The browser's half of payment confirmation, called from Razorpay's success
 * handler. The signature is checked HERE, on the server, with the key secret —
 * the browser is passing along Razorpay's proof, not making a claim of its own.
 * An unverified body is rejected outright.
 *
 * This exists alongside the webhook because each covers the other's failure:
 * the callback confirms instantly even if the webhook is misconfigured, and the
 * webhook confirms even if the customer's connection drops on the bank page.
 * `confirmPayment` is idempotent, so whichever lands first wins and the second
 * one is a no-op.
 */
export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimit("checkout", callerKey(req, "verify"));
    if (!limit.success) {
      return fail("rate_limited", "Too many attempts. Please wait a moment.");
    }

    const body = schema.parse(await req.json());

    const valid = verifyCheckoutSignature({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });

    if (!valid) {
      console.warn(`[razorpay] bad callback signature for ${body.razorpay_order_id}`);
      return fail("forbidden", "We could not verify that payment. Please contact us.");
    }

    const result = await confirmPayment({
      providerOrderId: body.razorpay_order_id,
      providerPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      source: "callback",
    });

    // "already_paid" is a success from the customer's point of view: the webhook
    // simply got here first.
    if (!result.confirmed && result.reason === "unknown_order") {
      return fail("not_found", "We could not find that order.");
    }

    return ok({ confirmed: true });
  } catch (err) {
    return handleError(err);
  }
}
