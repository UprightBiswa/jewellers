"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(null);

    // scope:"admin" makes the provider refuse a customer account outright, so
    // a customer's password can never open the panel even if it is correct.
    const res = await signIn("credentials", {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      scope: "admin",
      redirect: false,
    });

    setPending(false);

    if (res?.error) {
      setError("Those details do not match a staff account.");
      return;
    }

    router.push(next);
    router.refresh();
  }

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

      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
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

      <p className="mt-5 text-[13px] leading-relaxed text-muted">
        Locked out? Ask the shop owner to reset your password from the staff list. Password
        resets by email do not work for staff accounts.
      </p>
    </div>
  );
}
