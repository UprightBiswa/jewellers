"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  registerUser,
  requestPasswordReset,
  resetPassword,
  type ActionResult,
} from "@/app/(auth)/actions";

type Errors = Record<string, string>;

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

/* -------------------------------------------------------------------------- */

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);

    const res = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      scope: "store",
      redirect: false,
    });

    setPending(false);

    if (res?.error) {
      // One message for every failure mode — a login form that distinguishes
      // "no such account" from "wrong password" is an account enumeration tool.
      setError("That email and password do not match an account.");
      return;
    }

    router.push(next);
    router.refresh();
  }

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

      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>

        <Field label="Password" htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const data = new FormData(e.currentTarget);
    setPending(true);
    setErrors({});
    setError(null);

    const result: ActionResult = await registerUser(data);

    if (!result.ok) {
      setError(result.message);
      setErrors(result.fieldErrors ?? {});
      setPending(false);
      return;
    }

    // Registration succeeded; sign them straight in rather than making them
    // type the same password again.
    const signedIn = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      scope: "store",
      redirect: false,
    });

    setPending(false);

    if (signedIn?.error) {
      toast.success("Account created — please sign in.");
      router.push("/login");
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Saves your addresses and keeps every order in one place.
        </p>
      </div>

      {googleEnabled ? (
        <>
          <GoogleButton next="/account" />
          <Divider />
        </>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Your name" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" autoComplete="name" required autoFocus />
        </Field>

        <Field label="Email" htmlFor="email" required error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Phone" htmlFor="phone" error={errors.phone} hint="Optional — for delivery updates">
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          required
          error={errors.password}
          hint="At least 8 characters, with a number"
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
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
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    const result = await requestPasswordReset(new FormData(e.currentTarget));
    setPending(false);
    setDone(result.message ?? "Check your inbox.");
  }

  if (done) {
    return (
      <div className="grid gap-4">
        <h1 className="font-display text-2xl text-ink">Check your inbox</h1>
        <p className="text-[15px] text-ink-2">{done}</p>
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

      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <Link href="/login" className="text-sm text-brand underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const data = new FormData(e.currentTarget);
    data.set("token", token);

    setPending(true);
    setError(null);
    setErrors({});

    const result = await resetPassword(data);
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success("Password changed. Sign in with your new one.");
    router.push("/login");
  }

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

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted">
          Signing you out everywhere else, just to be safe.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field
          label="New password"
          htmlFor="password"
          required
          error={errors.password}
          hint="At least 8 characters, with a number"
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required autoFocus />
        </Field>

        {error ? (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </div>
  );
}
