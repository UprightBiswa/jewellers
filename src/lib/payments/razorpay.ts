import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay.
 *
 * Charubala Silver does not have an account yet, so everything here is written
 * to be inert until the keys exist: `isConfigured` is false, checkout offers
 * cash on delivery only, and nothing throws. The day the keys land in
 * .env.local, online payment appears with no code change.
 *
 * Start with TEST keys (rzp_test_…). Switch to live only after a real order has
 * gone end to end.
 */

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

export const isConfigured = Boolean(keyId && keySecret);

const client = isConfigured
  ? new Razorpay({ key_id: keyId!, key_secret: keySecret! })
  : null;

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

/**
 * Creates the Razorpay order the browser checkout opens against.
 *
 * `amount` is paise, which is what Razorpay wants — one of the few APIs where
 * our internal unit and theirs already agree.
 */
export async function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (!client) {
    throw new Error("Razorpay is not configured — add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET");
  }

  const order = await client.orders.create({
    amount: input.amount,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes,
  });

  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}

/**
 * Verifies the signature the browser hands back after checkout.
 *
 * This proves the browser is not lying about which payment it made. It does NOT
 * confirm the order — only the webhook does that. A customer who closes the tab
 * mid-redirect still gets their order, and a customer who forges a callback
 * gets nothing.
 */
export function verifyCheckoutSignature(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  return timingSafeEqual(expected, input.signature);
}

/**
 * Verifies a webhook body against the webhook secret.
 *
 * The raw request text must be hashed, not a re-serialised object: JSON.parse
 * followed by JSON.stringify can reorder keys and change whitespace, and the
 * signature would never match again.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!webhookSecret) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** What the browser needs to open the checkout. Never the secret. */
export function publicCheckoutConfig() {
  return {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? keyId ?? "",
    enabled: isConfigured,
  };
}
