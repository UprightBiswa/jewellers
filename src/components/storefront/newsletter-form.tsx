"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);

    try {
      const res = await fetch("/api/v1/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setDone(true);
        setEmail("");
        toast.success("You're on the list.");
      } else {
        toast.error(json?.error?.message ?? "That didn't go through. Try again?");
      }
    } catch {
      toast.error("No connection. Check your internet and try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className={cn("text-sm text-success", className)}>
        Thank you — watch your inbox for the next drop.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("flex gap-2", className)}>
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        className="h-10"
      />
      <Button type="submit" size="sm" disabled={pending} className="h-10 shrink-0">
        {pending ? "…" : "Join"}
      </Button>
    </form>
  );
}
