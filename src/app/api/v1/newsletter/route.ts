import { z } from "zod";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api/response";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email("That does not look like an email address."),
  source: z.string().max(40).optional(),
});

/** POST /api/v1/newsletter */
export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimit("email", callerKey(req, "newsletter"));
    if (!limit.success) {
      return fail("rate_limited", "You have already signed up. Check your inbox.");
    }

    const { email, source } = schema.parse(await req.json());

    // Re-subscribing someone who unsubscribed is a deliberate no-op on status:
    // they asked to leave once, so only an explicit resubscribe should flip it.
    await db.newsletterSubscriber.upsert({
      where: { email: email.toLowerCase().trim() },
      create: { email: email.toLowerCase().trim(), source },
      update: {},
    });

    return ok({ subscribed: true });
  } catch (err) {
    return handleError(err);
  }
}
