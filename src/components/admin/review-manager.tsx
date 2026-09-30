"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, EyeOff, Star, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { deleteReview, setReviewStatus } from "@/app/admin/content-actions";

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  productSlug: string;
};

/**
 * Review moderation.
 *
 * `ReviewStatus` has been in the schema since the first migration and nothing
 * has ever set it, so every review a customer wrote sat at PENDING and was
 * invisible for ever. This is the screen that was missing.
 *
 * Nothing goes on the shop until Rahul says so. That is his rule, and it is the
 * right one for a shop where a single unfair review is a noticeable share of
 * the total.
 */
export function ReviewManager({ reviews }: { reviews: ReviewRow[] }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const res = await fn();
      res.ok ? toast.success(res.message ?? "Done.") : toast.error(res.message ?? "That did not work.");
      setConfirming(null);
    });
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg text-ink">Nothing here</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          When a customer writes about a piece, it waits here until you let it through.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {reviews.map((r) => (
        <li
          key={r.id}
          className="grid gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        "size-4",
                        n <= r.rating ? "fill-gold text-gold" : "text-line-strong",
                      )}
                      aria-hidden
                    />
                  ))}
                </span>
                <StatusPill status={r.status} />
              </div>

              <p className="mt-2 text-[15px] font-medium text-ink">{r.title ?? "No headline"}</p>
              <p className="mt-1 whitespace-pre-line text-[15px] text-ink-2">{r.body}</p>

              <p className="mt-2 text-[12.5px] text-muted">
                {r.customerName} · {r.customerEmail} · {r.createdAt} · on{" "}
                <Link
                  href={`/products/${r.productSlug}`}
                  className="underline-offset-4 hover:underline"
                  target="_blank"
                >
                  {r.productTitle}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {confirming === r.id ? (
              <>
                <span className="text-sm text-ink">Delete this review for good?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  Keep it
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => act(() => deleteReview(r.id))}
                >
                  {pending ? <Spinner label="Deleting" /> : <Trash2 className="size-4" aria-hidden />}
                  Delete
                </Button>
              </>
            ) : (
              <>
                {r.status !== "APPROVED" && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => act(() => setReviewStatus(r.id, "APPROVED"))}
                  >
                    <Check className="size-4" aria-hidden />
                    Put it on the shop
                  </Button>
                )}
                {r.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => act(() => setReviewStatus(r.id, "REJECTED"))}
                  >
                    <EyeOff className="size-4" aria-hidden />
                    Hide it
                  </Button>
                )}
                {r.status !== "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => act(() => setReviewStatus(r.id, "PENDING"))}
                  >
                    <Undo2 className="size-4" aria-hidden />
                    Back to waiting
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirming(r.id)}
                  className="ms-auto rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  aria-label="Delete review"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ status }: { status: ReviewRow["status"] }) {
  const label =
    status === "APPROVED" ? "On the shop" : status === "REJECTED" ? "Hidden" : "Waiting for you";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "APPROVED" && "bg-emerald-50 text-emerald-700",
        status === "REJECTED" && "bg-surface-2 text-muted",
        status === "PENDING" && "bg-amber-50 text-amber-800",
      )}
    >
      {label}
    </span>
  );
}
