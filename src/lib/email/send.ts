import "server-only";
import { Resend } from "resend";
import { isResendKey } from "@/lib/integrations";
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
  if (!isResendKey(apiKey)) {
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

/**
 * The address mail is sent *from*. It has to be on a domain verified with
 * Resend — a Gmail address is rejected, because sending as gmail.com would be
 * spoofing someone else's domain. It does **not** need a real mailbox: nothing
 * is ever delivered to it.
 *
 * Replies are a different matter. Customers do answer order emails — to ask
 * where a parcel is, or to change a size — so every message is sent reply-to
 * EMAIL_ADMIN_NOTIFY, which is Rahul's own Gmail. No second address, and no new
 * mailbox to run the shop.
 */
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
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
      // A caller may override it; otherwise a reply reaches the owner rather
      // than a from-address with no mailbox behind it.
      replyTo: replyTo ?? ADMIN,
      headers: marketing
        ? { "List-Unsubscribe": `<${SITE_URL}/unsubscribe>` }
        : undefined,
    });

    if (error) {
      // One failure deserves its own words, because it is the one that will
      // actually happen and it looks like nothing at all: with no verified
      // domain, Resend accepts mail to the account owner and refuses everyone
      // else. A customer's password reset is simply never sent, the form still
      // says "a reset link is on its way" — as it must, so the form cannot be
      // used to discover which addresses have accounts — and nobody finds out.
      if (/only send testing emails/i.test(error.message)) {
        console.error(
          `[email] NOT SENT to ${to}. Resend has no verified domain, so it only ` +
            `delivers to the account's own address. Verify charubalasilver.in at ` +
            `resend.com/domains and set EMAIL_FROM to an address on it. ` +
            `Until then every customer email is silently dropped.`,
        );
      } else {
        console.error("[email] send failed", subject, error);
      }
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
