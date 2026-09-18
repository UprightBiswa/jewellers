/**
 * Sends a correctly signed Razorpay webhook to your own server.
 *
 * Razorpay can only call a public URL, so on localhost its "Test webhook"
 * button is useless. This does the same thing from your machine: it builds the
 * payload Razorpay sends, signs it with RAZORPAY_WEBHOOK_SECRET exactly as
 * Razorpay does, and posts it to /api/webhooks/razorpay.
 *
 *   npm run webhook:test                       # the newest pending order
 *   npm run webhook:test -- --event payment.failed
 *   npm run webhook:test -- --order order_XXXX
 *   npm run webhook:test -- --base https://charubala.com
 *
 * A bad signature must be rejected, so it also sends one deliberately wrong
 * payload and checks that the route answers 401.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { createHmac } from "node:crypto";
import pg from "pg";

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const BASE = (arg("base") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EVENT = arg("event", "payment.captured");
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

if (!SECRET) {
  console.error("\n  RAZORPAY_WEBHOOK_SECRET is not set in .env.local.\n");
  process.exit(1);
}

/** Find an order to act on, so the handler has something real to confirm. */
async function findOrder(explicit) {
  if (explicit) return { providerOrderId: explicit, orderNo: "(given)" };

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) return null;

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT p."providerOrderId", o."orderNumber", p.status, p.amount
         FROM "Payment" p JOIN "Order" o ON o.id = p."orderId"
        WHERE p."providerOrderId" IS NOT NULL
        ORDER BY p."createdAt" DESC LIMIT 1`,
    );
    if (res.rowCount === 0) return null;
    return {
      providerOrderId: res.rows[0].providerOrderId,
      orderNo: res.rows[0].orderNumber,
      status: res.rows[0].status,
      amount: res.rows[0].amount,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function body(event, providerOrderId, amount) {
  const entity = {
    id: `pay_TEST${Date.now().toString().slice(-10)}`,
    order_id: providerOrderId,
    amount: amount ?? 100000,
    currency: "INR",
    status: event === "payment.failed" ? "failed" : "captured",
    method: "upi",
    ...(event === "payment.failed" ? { error_description: "Test failure from webhook:test" } : {}),
  };

  return JSON.stringify({
    entity: "event",
    account_id: "acc_TEST",
    event,
    contains: ["payment"],
    payload: { payment: { entity } },
    created_at: Math.floor(Date.now() / 1000),
  });
}

async function post(raw, signature) {
  const res = await fetch(`${BASE}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": signature,
    },
    body: raw,
  });
  return { status: res.status, text: await res.text() };
}

const sign = (raw) => createHmac("sha256", SECRET).update(raw).digest("hex");

console.log(`\n  Webhook test → ${BASE}/api/webhooks/razorpay\n`);

const order = await findOrder(arg("order"));

if (!order) {
  console.log("  No order with a Razorpay order id yet.");
  console.log("  Place one online-payment order first, then run this again.");
  console.log("  Sending anyway, to prove the route verifies signatures.\n");
}

const providerOrderId = order?.providerOrderId ?? "order_TESTnothinghere";
const raw = body(EVENT, providerOrderId, order?.amount);

// 1. A wrong signature must be refused before anything is parsed.
const bad = await post(raw, "0".repeat(64));
console.log(`  bad signature   → ${bad.status} ${bad.status === 401 ? "rejected (correct)" : "SHOULD BE 401"}`);

// 2. The real thing.
const good = await post(raw, sign(raw));
console.log(`  ${EVENT.padEnd(15)} → ${good.status} ${good.text}`);

// 3. Razorpay retries. The second delivery must change nothing.
const again = await post(raw, sign(raw));
console.log(`  same again      → ${again.status} ${again.text}`);

console.log("");
if (order) {
  console.log(`  Order ${order.orderNo} (${providerOrderId}), payment was ${order.status}.`);
  console.log("  Open the admin panel and check it says Paid exactly once.");
}
console.log("");
