import { z } from "zod";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api/response";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { notifyAdmin } from "@/lib/email/send";
import ContactNotificationEmail from "@/emails/contact-notification";
import { PHONE_RE } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2, "Please tell us your name.").max(80),
  email: z.string().email("We need a valid email to reply to."),
  phone: z
    .string()
    .refine((v) => v === "" || PHONE_RE.test(v), "That phone number does not look right.")
    .optional(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10, "Please add a little more detail.").max(4000),
  orderRef: z.string().max(40).optional(),
  /** Honeypot — a real person never fills this in. */
  website: z.string().max(0).optional(),
});

/** POST /api/v1/contact */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      undefined;

    const limit = await rateLimit("contact", callerKey(req, "contact"));
    if (!limit.success) {
      return fail(
        "rate_limited",
        "We already have your message. We will reply as soon as we can.",
      );
    }

    const input = schema.parse(await req.json());

    // Silently accept a honeypot hit: telling a bot it failed just teaches it.
    if (input.website) return ok({ received: true });

    const saved = await db.contactMessage.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || null,
        subject: input.subject || null,
        message: input.message,
        orderRef: input.orderRef || null,
        ip,
      },
      select: { id: true, createdAt: true },
    });

    // The message is already saved; a failed email must not lose it.
    void notifyAdmin(
      `New message from ${input.name}`,
      ContactNotificationEmail({
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        orderRef: input.orderRef,
        receivedAt: saved.createdAt.toLocaleString("en-IN"),
      }),
    );

    return ok({ received: true, id: saved.id });
  } catch (err) {
    return handleError(err);
  }
}
