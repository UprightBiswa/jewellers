import { cn } from "@/lib/utils";

/**
 * Circular progress, for waits the person triggered and is watching — a button
 * that is submitting, a coupon being checked.
 *
 * For content that is still arriving, use a Skeleton instead: a spinner in the
 * middle of an empty page tells you nothing about what is coming, while a
 * skeleton shows the shape of it.
 *
 * `prefers-reduced-motion` is handled globally in globals.css, which slows every
 * animation to nothing — so this degrades to a static ring rather than vanishing.
 */
export function Spinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center">
      <svg
        className={cn("size-4 animate-spin", className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Fills a whole panel while its contents load. */
export function SpinnerBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="size-6 text-brand" label={label} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
