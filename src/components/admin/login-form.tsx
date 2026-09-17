"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { loginAction, type ActionResult } from "@/app/(auth)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? (
        <>
          <Spinner label="Signing in" />
          Signing in…
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  );
}

/**
 * Staff sign-in.
 *
 * Same server action as the storefront, with `scope=admin`, which makes the
 * credentials provider refuse a customer account outright — a customer's
 * password cannot open the panel even when it is correct.
 *
 * Submits through a server action rather than an onSubmit fetch: an unhydrated
 * form with no method does a native GET, which would put a staff password in
 * the URL and the server logs.
 */
export function AdminLoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [state, formAction] = useActionState<ActionResult | null, FormData>(loginAction, null);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand">
          <Lock className="size-4" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl text-ink">Staff sign in</h1>
          <p className="text-[13px] text-muted">Shop management</p>
        </div>
      </div>

      <form action={formAction} method="post" className="grid gap-4">
        <input type="hidden" name="scope" value="admin" />
        <input type="hidden" name="next" value={next} />

        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password" name="password" type="password"
            autoComplete="current-password" required
          />
        </Field>

        {state && !state.ok ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.message}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <p className="mt-5 text-[13px] leading-relaxed text-muted">
        Locked out? Ask the shop owner to reset your password from the staff list. Password
        resets by email do not work for staff accounts.
      </p>
    </div>
  );
}
