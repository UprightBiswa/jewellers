"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setMessageStatus } from "@/app/admin/actions";
import type { ContactStatus } from "@/generated/prisma";

const TONE = {
  NEW: "brand",
  READ: "neutral",
  REPLIED: "success",
  CLOSED: "neutral",
} as const;

const LABEL = {
  NEW: "New",
  READ: "Read",
  REPLIED: "Replied",
  CLOSED: "Closed",
} as const;

export function MessageRow({
  message,
}: {
  message: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subject: string | null;
    message: string;
    orderRef: string | null;
    status: ContactStatus;
    createdAtLabel: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(message.status === "NEW");
  const [pending, setPending] = useState(false);

  async function mark(status: ContactStatus) {
    setPending(true);
    const result = await setMessageStatus(message.id, status);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.refresh();
  }

  const replyHref = `mailto:${message.email}?subject=${encodeURIComponent(
    `Re: ${message.subject ?? "your message"}`,
  )}`;

  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-surface">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (message.status === "NEW") void mark("READ");
        }}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{message.name}</span>
            <Badge tone={TONE[message.status]} size="xs">{LABEL[message.status]}</Badge>
          </p>
          <p className="mt-0.5 truncate text-[13.5px] text-muted">
            {message.subject ?? message.message.slice(0, 70)}
          </p>
        </div>
        <span className="shrink-0 text-[12.5px] text-muted">{message.createdAtLabel}</span>
      </button>

      {open ? (
        <div className="border-t border-line p-4">
          <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">
            {message.message}
          </p>

          <dl className="mt-4 grid gap-1 text-[13.5px]">
            <div className="flex gap-2">
              <dt className="text-muted">Email</dt>
              <dd>
                <a href={`mailto:${message.email}`} className="text-brand hover:underline">
                  {message.email}
                </a>
              </dd>
            </div>
            {message.phone ? (
              <div className="flex gap-2">
                <dt className="text-muted">Phone</dt>
                <dd>
                  <a href={`tel:${message.phone}`} className="text-brand hover:underline tnum">
                    {message.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {message.orderRef ? (
              <div className="flex gap-2">
                <dt className="text-muted">Order</dt>
                <dd className="text-ink tnum">{message.orderRef}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={replyHref}>Reply by email</a>
            </Button>
            {message.phone ? (
              <Button asChild size="sm" variant="secondary">
                <a
                  href={`https://wa.me/91${message.phone.replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {message.status !== "REPLIED" ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => mark("REPLIED")}>
                Mark as replied
              </Button>
            ) : null}
            {message.status !== "CLOSED" ? (
              <Button size="sm" variant="quiet" disabled={pending} onClick={() => mark("CLOSED")}>
                Close
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
