import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { db } from "@/lib/db";
import { hashResetToken } from "@/lib/password";
import { ResetPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The link from the email.
 *
 * The token is checked here, before the form is drawn. It used to be checked
 * only on submit, so someone arriving with an hour-old link chose a new
 * password, typed it twice, pressed the button and was then told the link was
 * dead — having learnt nothing they could not have been told at the start.
 *
 * Checking it costs one indexed lookup and nothing is revealed by the answer:
 * the token is already in the URL of whoever is asking.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const record = token
    ? await db.passwordResetToken.findFirst({
        where: {
          token: hashResetToken(token),
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      })
    : null;

  if (!record) {
    return (
      <div className="mx-auto w-full max-w-sm text-center">
        <KeyRound className="mx-auto size-9 text-muted" aria-hidden />
        <h1 className="mt-4 font-display text-2xl text-ink">This link has expired</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Reset links last an hour and work once. Ask for another and it will arrive in a
          minute.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-[15px] font-medium text-on-brand"
        >
          Send me a new link
        </Link>
        <p className="mt-4 text-[13.5px] text-muted">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return <ResetPasswordForm token={token ?? ""} />;
}
