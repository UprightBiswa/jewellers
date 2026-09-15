"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type Errors = Partial<Record<string, string>>;

export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form) as Record<string, string>;

    setPending(true);
    setErrors({});

    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setSent(true);
        return;
      }

      if (Array.isArray(json?.error?.details)) {
        const next: Errors = {};
        for (const d of json.error.details as { field: string; message: string }[]) {
          next[d.field] = d.message;
        }
        setErrors(next);
        toast.error("Please check the highlighted fields.");
      } else {
        toast.error(json?.error?.message ?? "That did not send. Please try again.");
      }
    } catch {
      toast.error("No connection. Check your internet and try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[var(--radius-card)] border border-success/30 bg-success-soft p-6">
        <p className="font-display text-xl text-ink">Message received</p>
        <p className="mt-2 text-[15px] text-ink-2">
          We read every message ourselves and usually reply the same day. If it is urgent,
          WhatsApp is faster.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" autoComplete="name" required
            aria-invalid={Boolean(errors.name)} />
        </Field>

        <Field label="Email" htmlFor="email" required error={errors.email}
          hint="So we can write back">
          <Input id="email" name="email" type="email" autoComplete="email" required
            aria-invalid={Boolean(errors.email)} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" error={errors.phone} hint="Optional">
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="98765 43210" aria-invalid={Boolean(errors.phone)} />
        </Field>

        <Field label="Order number" htmlFor="orderRef" hint="If this is about an order">
          <Input id="orderRef" name="orderRef" placeholder="SS-260915-0042" />
        </Field>
      </div>

      <Field label="Subject" htmlFor="subject" error={errors.subject}>
        <Input id="subject" name="subject" placeholder="Custom size, delivery, a question…" />
      </Field>

      <Field label="Your message" htmlFor="message" required error={errors.message}>
        <Textarea id="message" name="message" required rows={6}
          placeholder="Tell us what you need. If it is about a design, describe it or send a photo on WhatsApp."
          aria-invalid={Boolean(errors.message)} />
      </Field>

      {/* Honeypot — hidden from people, irresistible to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
      />

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
