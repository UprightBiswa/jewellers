import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { sendMail, notifyAdmin } from "@/lib/email/send";
import OrderConfirmationEmail from "@/emails/order-confirmation";

/**
 * Marking an order paid — the single place it happens.
 *
 * Two callers reach it: Razorpay's signed webhook, and the browser callback
 * whose signature we verified server-side with the key secret. Both are real
 * proof from Razorpay; the difference is reliability, not trust. The webhook
 * arrives even when the customer loses signal, and the callback arrives even
 * when the webhook is misconfigured. Taking whichever lands first is what makes
 * the shop survive both failures.
 *
 * What makes that safe is that this function is idempotent: an order already
 * PAID returns immediately, so a callback and a webhook for the same payment
 * cannot send two confirmation emails or count a sale twice.
 */
export async function confirmPayment(input: {
  providerOrderId: string;
  providerPaymentId?: string | null;
  method?: string | null;
  signature?: string | null;
  rawPayload?: unknown;
  source: "webhook" | "callback";
}): Promise<{ confirmed: boolean; reason?: string }> {
  const record = await db.payment.findFirst({
    where: { providerOrderId: input.providerOrderId },
    select: { id: true, orderId: true, status: true },
  });

  if (!record) return { confirmed: false, reason: "unknown_order" };
  if (record.status === "PAID") return { confirmed: false, reason: "already_paid" };

  const order = await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: record.id },
      data: {
        status: "PAID",
        providerPaymentId: input.providerPaymentId ?? null,
        method: input.method ?? null,
        signature: input.signature ?? null,
        ...(input.rawPayload ? { rawPayload: input.rawPayload as object } : {}),
      },
    });

    return tx.order.update({
      where: { id: record.orderId },
      data: { paymentStatus: "PAID", status: "CONFIRMED" },
      select: {
        id: true, orderNumber: true, email: true, total: true, subtotal: true,
        discount: true, shippingFee: true, gstAmount: true, placedAt: true,
        shippingAddress: true,
        items: {
          select: { titleSnapshot: true, variantLabel: true, qty: true, lineTotal: true },
        },
      },
    });
  });

  console.info(`[payment] ${order.orderNumber} confirmed via ${input.source}`);

  void sendOrderEmails(order, input.method ?? "Online");

  return { confirmed: true };
}

type ConfirmedOrder = {
  id: string;
  orderNumber: string;
  email: string;
  total: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  gstAmount: number;
  placedAt: Date;
  shippingAddress: unknown;
  items: { titleSnapshot: string; variantLabel: string | null; qty: number; lineTotal: number }[];
};

/** Best-effort. The order is already recorded; a mail failure must not undo it. */
export async function sendOrderEmails(order: ConfirmedOrder, method: string) {
  const settings = await getSettings();
  const address = order.shippingAddress as {
    fullName?: string; line1?: string; line2?: string;
    city?: string; state?: string; pincode?: string;
  } | null;

  const items = order.items.map((i) => ({
    title: i.titleSnapshot,
    variantLabel: i.variantLabel,
    qty: i.qty,
    lineTotal: formatPaise(i.lineTotal),
  }));

  const addressText = [
    address?.fullName,
    address?.line1,
    address?.line2,
    [address?.city, address?.state].filter(Boolean).join(", "),
    address?.pincode,
  ]
    .filter(Boolean)
    .join("\n");

  await sendMail({
    to: order.email,
    subject: `Order ${order.orderNumber} confirmed`,
    react: OrderConfirmationEmail({
      name: address?.fullName?.split(" ")[0] ?? "there",
      orderNumber: order.orderNumber,
      placedAt: formatDate(order.placedAt),
      items,
      subtotal: formatPaise(order.subtotal),
      discount: order.discount > 0 ? formatPaise(order.discount) : undefined,
      shipping: order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee),
      gst: order.gstAmount > 0 ? formatPaise(order.gstAmount) : undefined,
      total: formatPaise(order.total),
      paymentMethod: method,
      address: addressText,
      deliveryEstimate: settings.shipping.deliveryDays,
      trackUrl: absoluteUrl(`/account/orders`),
    }),
  });

  await notifyAdmin(
    `New order ${order.orderNumber} — ${formatPaise(order.total)}`,
    OrderConfirmationEmail({
      name: settings.store.name,
      orderNumber: order.orderNumber,
      placedAt: formatDate(order.placedAt, true),
      items,
      subtotal: formatPaise(order.subtotal),
      total: formatPaise(order.total),
      paymentMethod: method,
      address: addressText,
      deliveryEstimate: `Pack within ${settings.shipping.dispatchDays}`,
      trackUrl: absoluteUrl(`/admin/orders/${order.id}`),
    }),
  );
}
