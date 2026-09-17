import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { releaseOrder } from "@/lib/orders/create";
import { confirmPayment } from "@/lib/orders/confirm";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/razorpay
 *
 * The reliable half of payment confirmation.
 *
 * The browser callback can simply not arrive — the customer loses signal, or
 * closes the tab on the bank page. This webhook is server-to-server and signed,
 * so it lands regardless. Both routes hand off to the same idempotent
 * `confirmPayment`, and whichever arrives first wins.
 *
 * Three properties this handler has to have:
 *
 *   1. It hashes the RAW body text. Re-serialising the JSON would reorder keys
 *      and the signature would never match again.
 *   2. It is idempotent. Razorpay retries, and a retry must not send a second
 *      confirmation email or double-count anything.
 *   3. It always answers 200 once the signature is valid, even if our own
 *      processing failed — otherwise Razorpay retries forever against a bug
 *      that a retry cannot fix. Failures are logged instead.
 */

type RazorpayEntity = {
  id?: string;
  order_id?: string;
  amount?: number;
  method?: string;
  error_description?: string;
};

type RazorpayWebhook = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayEntity };
    order?: { entity?: RazorpayEntity };
  };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[razorpay] rejected a webhook with a bad signature");
    return new Response("invalid signature", { status: 401 });
  }

  let event: RazorpayWebhook;
  try {
    event = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  try {
    const payment = event.payload?.payment?.entity;
    const providerOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;

    if (!providerOrderId) {
      return Response.json({ ok: true, ignored: "no order id" });
    }

    const record = await db.payment.findFirst({
      where: { providerOrderId },
      select: { id: true, orderId: true, status: true },
    });

    if (!record) {
      console.warn(`[razorpay] webhook for unknown order ${providerOrderId}`);
      return Response.json({ ok: true, ignored: "unknown order" });
    }

    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        const result = await confirmPayment({
          providerOrderId,
          providerPaymentId: payment?.id,
          method: payment?.method,
          rawPayload: JSON.parse(raw),
          source: "webhook",
        });
        if (!result.confirmed) {
          return Response.json({ ok: true, skipped: result.reason });
        }
        break;
      }

      case "payment.failed": {
        if (record.status === "PAID") break; // a later capture wins
        await db.payment.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            providerPaymentId: payment?.id ?? null,
            failureReason: payment?.error_description ?? "Payment failed",
            rawPayload: JSON.parse(raw),
          },
        });
        await releaseOrder(record.orderId, "Payment failed at Razorpay");
        break;
      }

      default:
        return Response.json({ ok: true, ignored: event.event });
    }

    return Response.json({ ok: true });
  } catch (err) {
    // Signature was good, so this is our bug. Retrying will not fix it.
    console.error("[razorpay] webhook processing failed", err);
    return Response.json({ ok: true, logged: true });
  }
}
