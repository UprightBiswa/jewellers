import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { isRazorpayConfigured } from "@/lib/integrations";

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

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

/**
 * "Set" is not the same as "usable".
 *
 * A hosting dashboard full of half-filled boxes will hand us a "1" or an "xxx",
 * and an optional integration that trusts a non-empty string can throw while the
 * module is still evaluating — which fails the build, not the request. So the
 * shape is checked: every Razorpay key id begins with rzp_test_ or rzp_live_.
 */
export const isConfigured = isRazorpayConfigured(keyId, keySecret);

function createClient(): Razorpay | null {
  if (!isConfigured) return null;
  try {
    return new Razorpay({ key_id: keyId!, key_secret: keySecret! });
  } catch (err) {
    console.warn("[razorpay] keys rejected — checkout stays on cash on delivery", err);
    return null;
  }
}

const client = createClient();

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

/**
 * What the browser needs to open the checkout. Never the secret.
 *
 * `RAZORPAY_KEY_ID` wins over `NEXT_PUBLIC_RAZORPAY_KEY_ID`, which is the
 * opposite of what this used to do, and the reason live payment failed the
 * first time it was switched on.
 *
 * The order is created server-side with `RAZORPAY_KEY_ID` and signed with its
 * secret. The browser then opens that order with whatever key id we hand it. If
 * the two name different accounts — and they do the moment one is live and the
 * other is still test — Razorpay refuses the order id, because it belongs to an
 * account the key cannot see. Handing over the key that actually created the
 * order makes that mismatch impossible.
 *
 * `NEXT_PUBLIC_RAZORPAY_KEY_ID` is inlined into the client bundle at build time
 * and so goes stale behind a cached build, while `RAZORPAY_KEY_ID` is read per
 * request. This module is server-only, so the per-request one is always here.
 * The public variable stays as a fallback for anyone who set only that one.
 */
export function publicCheckoutConfig() {
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim();

  if (keyId && publicKeyId && keyId !== publicKeyId) {
    console.warn(
      `[razorpay] RAZORPAY_KEY_ID (${keyId.slice(0, 12)}…) and ` +
        `NEXT_PUBLIC_RAZORPAY_KEY_ID (${publicKeyId.slice(0, 12)}…) disagree. ` +
        "Using the server one. Update both in the host and redeploy.",
    );
  }

  return {
    keyId: keyId ?? publicKeyId ?? "",
    enabled: isConfigured,
  };
}
