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
      // Deliberately not "so customers will get theirs too". Until a domain is
      // verified this address is the ONLY one Resend will deliver to, and an
      // email that claims otherwise is the most convincing way to be wrong.
      "<p>It proves the API key works and that this address receives mail. " +
      "Whether customers can be reached is a separate question — the command " +
      "that sent this says which.</p>",
  }),
});

const body = await res.json().catch(() => null);

if (res.ok && body?.id) {
  console.log(`  ok    sent — id ${body.id}`);

  // Sending to the owner proves the key works. It does not prove a customer can
  // be reached, which is the thing that matters and the thing that fails in
  // silence.
  //
  // Decided from EMAIL_FROM rather than by sending a second message. A probe
  // would have to pick a real address: resend.dev is Resend's own test inbox and
  // always succeeds, so it proves nothing, and anything else risks mailing a
  // stranger the day the domain is verified.
  if (from.toLowerCase().endsWith("@resend.dev")) {
    console.log("");
    console.log("  WARNING  customers CANNOT be reached yet.");
    console.log("  EMAIL_FROM is " + from + ", which means no domain is verified.");
    console.log("  Resend then delivers only to " + to + " and refuses every other");
    console.log("  address with a 403. Order confirmations and password resets to");
    console.log("  customers are dropped, and the shop shows no error at all.");
    console.log("");
    console.log("  Fix: verify charubalasilver.in at resend.com/domains, then set");
    console.log("  EMAIL_FROM to an address on it, such as orders@charubalasilver.in.");
  } else {
    console.log("  ok    sending from a verified domain, so customers can be reached");
  }

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
