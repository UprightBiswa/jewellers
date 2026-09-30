/**
 * Proves email works, end to end.
 *
 * A sending-only Resend key cannot list domains or keys — every read endpoint
 * answers 401 with "restricted to only send emails". That is the correct shape
 * for a production key, and it means the only honest test is to send something.
 *
 *   npm run check:email                     # to EMAIL_ADMIN_NOTIFY
 *   npm run check:email -- you@example.com  # to someone else
 *
 * Sends one plain message and reports what Resend said. Nothing is stored.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

const key = process.env.RESEND_API_KEY?.trim();
const from = process.env.EMAIL_FROM?.trim() || "onboarding@resend.dev";
const to = process.argv[2] || process.env.EMAIL_ADMIN_NOTIFY?.trim();

if (!key) {
  console.error("\n  RESEND_API_KEY is not set in .env.local.\n");
  process.exit(1);
}
if (!to) {
  console.error("\n  No recipient. Set EMAIL_ADMIN_NOTIFY, or pass an address.\n");
  process.exit(1);
}

console.log(`\n  Sending a test email\n`);
console.log(`    from  ${from}`);
console.log(`    to    ${to}\n`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from,
    to: [to],
    subject: "Charubala Silver — email is working",
    html:
      "<p>This is the test message from <strong>npm run check:email</strong>.</p>" +
      "<p>If you are reading it, order confirmations and password resets will reach customers too.</p>",
  }),
});

const body = await res.json().catch(() => null);

if (res.ok && body?.id) {
  console.log(`  ok    sent — id ${body.id}`);
  console.log(`\n  Check ${to}. Look in spam as well: a message from resend.dev`);
  console.log(`  often lands there until charubalasilver.in is verified in Resend.\n`);
  process.exit(0);
}

console.log(`  FAIL  ${res.status} ${body?.name ?? ""}`);
console.log(`        ${body?.message ?? "(no message)"}\n`);

// The two failures that actually happen, and what each one means.
if (body?.name === "validation_error" && /domain is not verified/i.test(body?.message ?? "")) {
  console.log(`  EMAIL_FROM is "${from}", and that domain is not verified in Resend.`);
  console.log(`  Until it is, use onboarding@resend.dev — see docs/EMAIL-AND-GOOGLE.md.\n`);
} else if (res.status === 403 || /testing emails/i.test(body?.message ?? "")) {
  console.log(`  With no verified domain, Resend only delivers to the address that`);
  console.log(`  owns the account. Verify charubalasilver.in to reach customers.\n`);
}

process.exit(1);
