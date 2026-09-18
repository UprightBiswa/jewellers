import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { SITE_URL } from "@/lib/site-url";

/**
 * Email delivery.
 *
 * Every send is best-effort: a failed email must never fail the order that
 * triggered it. Failures are logged and returned, never thrown into a checkout
 * handler. Without RESEND_API_KEY the payload is logged instead of sent, so
 * local development works with no account.
 */

const apiKey = process.env.RESEND_API_KEY?.trim();

/**
 * A Resend key is always `re_…`. Anything else — an empty box filled with a
 * placeholder on a hosting dashboard — is treated as absent rather than passed
 * to the client, which can throw while this module is still evaluating and take
 * the whole build down with it.
 */
function createResend(): Resend | null {
  if (!apiKey?.startsWith("re_")) {
    if (apiKey) {
      console.warn("[email] RESEND_API_KEY does not look like a Resend key — logging mail instead");
    }
    return null;
  }
  try {
    return new Resend(apiKey);
  } catch (err) {
    console.warn("[email] could not start Resend — logging mail instead", err);
    return null;
  }
}

const resend = createResend();

const FROM = process.env.EMAIL_FROM ?? "orders@example.com";
const ADMIN = process.env.EMAIL_ADMIN_NOTIFY;

export type SendResult = { sent: boolean; id?: string; error?: string };

type SendArgs = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  /** Adds a List-Unsubscribe header for anything non-transactional */
  marketing?: boolean;
};

export async function sendMail({
  to,
  subject,
  react,
  replyTo,
  marketing,
}: SendArgs): Promise<SendResult> {
  if (!resend) {
    console.info(`[email] RESEND_API_KEY not set — would send "${subject}" to ${to}`);
    return { sent: false, error: "email_not_configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      replyTo,
      headers: marketing
        ? { "List-Unsubscribe": `<${SITE_URL}/unsubscribe>` }
        : undefined,
    });

    if (error) {
      console.error("[email] send failed", subject, error);
      return { sent: false, error: error.message };
    }
    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[email] threw", subject, err);
    return { sent: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

/** Notify the shop owner. Silently does nothing if no admin address is set. */
export async function notifyAdmin(subject: string, react: ReactElement): Promise<SendResult> {
  if (!ADMIN) return { sent: false, error: "no_admin_address" };
  return sendMail({ to: ADMIN, subject, react });
}
