"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  loginAction,
  registerUser,
  requestPasswordReset,
  resetPassword,
  type ActionResult,
} from "@/app/(auth)/actions";

/**
 * Auth forms, driven by server actions.
 *
 * Every form here submits with `action={...}`, never an onSubmit fetch. A form
 * with only an onSubmit handler and no method falls back to a NATIVE GET when it
 * is submitted before React hydrates — which is how an email and password ended
 * up in the URL. With a server action the browser posts, and the form still
 * works with JavaScript switched off.
 */

function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? (
        <>
          <Spinner label={pendingLabel} />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function ErrorNotice({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

function GoogleButton({ next }: { next: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      block
      size="lg"
      onClick={() => signIn("google", { redirectTo: next })}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z" />
        <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3C3.7 21.4 7.6 24 12 24Z" />
        <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3Z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.7 1.2 15.1 0 12 0 7.6 0 3.7 2.6 1.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8Z" />
      </svg>
      Continue with Google
    </Button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-[13px] text-muted">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Surfaces a server action's message as a toast, once per result. */
function useResultToast(state: ActionResult | null) {
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    if (!state.ok) toast.error(state.message);
  }, [state]);
}

/* -------------------------------------------------------------------------- */

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [state, formAction] = useActionState<ActionResult | null, FormData>(loginAction, null);
  useResultToast(state);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in to track orders and check out faster.</p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      ) : null}

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="next" value={next} />

        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input
            id="password" name="password" type="password"
            autoComplete="current-password" required
          />
        </Field>

        <ErrorNotice message={state && !state.ok ? state.message : undefined} />

        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-ink-2 hover:text-ink">
          Create an account
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(registerUser, null);
  useResultToast(state);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Saves your addresses, keeps your orders in one place, and unlocks 20% off your
          first order.
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleButton next="/account" />
          <Divider />
        </>
      ) : null}

      <form action={formAction} className="grid gap-4">
        <Field label="Your name" htmlFor="name" required error={fieldErrors.name}>
          <Input id="name" name="name" autoComplete="name" required autoFocus />
        </Field>

        <Field label="Email" htmlFor="email" required error={fieldErrors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field
          label="Phone" htmlFor="phone" error={fieldErrors.phone}
          hint="Optional — for delivery updates on WhatsApp"
        >
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </Field>

        <Field
          label="Password" htmlFor="password" required error={fieldErrors.password}
          hint="At least 8 characters, with a number"
        >
          <Input
            id="password" name="password" type="password"
            autoComplete="new-password" required
          />
        </Field>

        <ErrorNotice
          message={state && !state.ok && !state.fieldErrors ? state.message : undefined}
        />

        <SubmitButton pendingLabel="Creating…">Create account</SubmitButton>
      </form>

      <p className="text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    requestPasswordReset,
    null,
  );

  if (state?.ok) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl text-ink">Check your inbox</h1>
        <p className="text-[15px] text-ink-2">{state.message}</p>
        <p className="text-sm text-muted">
          The link works once and expires in an hour. If it does not arrive in a few
          minutes, look in spam.
        </p>
        <Link href="/login" className="text-sm text-brand underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Forgot your password?</h1>
        <p className="mt-1 text-sm text-muted">
          Enter your email and we will send you a link to set a new one.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>

        <ErrorNotice message={state && !state.ok ? state.message : undefined} />

        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>

      <Link href="/login" className="text-sm text-brand underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(resetPassword, null);
  useResultToast(state);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  if (!token) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl text-ink">That link is incomplete</h1>
        <p className="text-[15px] text-ink-2">
          Open the link from your email again, or ask for a new one.
        </p>
        <Link href="/forgot-password" className="text-sm text-brand underline-offset-4 hover:underline">
          Send a new link
        </Link>
      </div>
    );
  }

  if (state?.ok) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl text-ink">Password changed</h1>
        <p className="text-[15px] text-ink-2">
          You can sign in with your new password now.
        </p>
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">
          This signs you out everywhere else, just to be safe.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="token" value={token} />

        <Field
          label="New password" htmlFor="password" required error={fieldErrors.password}
          hint="At least 8 characters, with a number"
        >
          <Input
            id="password" name="password" type="password"
            autoComplete="new-password" required autoFocus
          />
        </Field>

        <ErrorNotice
          message={state && !state.ok && !state.fieldErrors ? state.message : undefined}
        />

        <SubmitButton pendingLabel="Saving…">Save new password</SubmitButton>
      </form>
    </div>
  );
}
