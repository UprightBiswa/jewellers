"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { submitReview, type ReviewResult } from "@/app/(shop)/review-actions";

type Existing = { rating: number; title: string | null; body: string; status: string } | null;

/**
 * Writing a review, on the product page.
 *
 * A server action with no `method` attribute of its own — React renders POST
 * for it, and adding method="post" as well is what breaks hydration (see the
 * forms rule in CLAUDE.md). It therefore also works with JavaScript off, which
 * matters on a patchy connection in Coochbehar.
 *
 * The four states are all shown honestly rather than hiding the form: someone
 * who cannot review yet should be told why, not left wondering where the button
 * is.
 */
export function ReviewForm({
  productId,
  productSlug,
  signedIn,
  bought,
  existing,
}: {
  productId: string;
  productSlug: string;
  signedIn: boolean;
  bought: boolean;
  existing: Existing;
}) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(
    submitReview,
    null,
  );
  const [rating, setRating] = useState(existing?.rating ?? 0);

  if (!signedIn) {
    return (
      <Card>
        <p className="text-[15px] text-ink">Bought this piece? Tell others what you think.</p>
        <p className="mt-1 text-[14px] text-muted">
          Sign in first — reviews are only from people who have bought it, so the ratings here
          mean something.
        </p>
        <Button asChild className="mt-4">
          <Link href={`/login?next=/products/${productSlug}`}>Sign in</Link>
        </Button>
      </Card>
    );
  }

  if (!bought) {
    return (
      <Card>
        <p className="text-[15px] text-ink">Only buyers can review this piece.</p>
        <p className="mt-1 text-[14px] text-muted">
          That is on purpose. It is a small shop, and a rating is worth something only when it
          comes from someone who has held the thing.
        </p>
      </Card>
    );
  }

  const done = state?.ok;
  const waiting = !done && existing?.status === "PENDING";

  return (
    <Card>
      {done ? (
        <>
          <p className="text-[15px] font-medium text-ink">Thank you</p>
          <p className="mt-1 text-[14px] text-muted">{state.message}</p>
        </>
      ) : (
        <form action={action} className="grid gap-4">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="rating" value={rating} />

          <div>
            <p className="text-[15px] font-medium text-ink">
              {existing ? "Change your review" : "Write a review"}
            </p>
            {waiting && (
              <p className="mt-1 text-[13px] text-muted">
                Your last one is waiting to be read. Saving again replaces it.
              </p>
            )}
          </div>

          <fieldset>
            <legend className="text-[14px] text-ink-2">How was it?</legend>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} out of 5`}
                  aria-pressed={rating === n}
                  className="rounded p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-7",
                      n <= rating ? "fill-gold text-gold" : "text-line-strong",
                    )}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
            {state?.fieldErrors?.rating && (
              <p className="mt-1 text-[13px] text-danger">{state.fieldErrors.rating}</p>
            )}
          </fieldset>

          <label className="grid gap-1.5">
            <span className="text-[14px] text-ink-2">A headline (optional)</span>
            <input
              name="title"
              defaultValue={existing?.title ?? ""}
              maxLength={80}
              placeholder="Lighter than I expected"
              className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-[14px] text-ink-2">What you thought</span>
            <textarea
              name="body"
              defaultValue={existing?.body ?? ""}
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              placeholder="The finish, the weight, how it arrived — whatever you would tell a friend."
              className="rounded-lg border border-line-strong bg-surface p-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
            />
            {state?.fieldErrors?.body && (
              <p className="text-[13px] text-danger">{state.fieldErrors.body}</p>
            )}
          </label>

          {state && !state.ok && !state.fieldErrors && (
            <p className="text-[14px] text-danger">{state.message}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner label="Sending" /> : null}
              {existing ? "Save changes" : "Send review"}
            </Button>
            <span className="text-[13px] text-muted">
              Read by the shop before it appears.
            </span>
          </div>
        </form>
      )}
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
      {children}
    </div>
  );
}
