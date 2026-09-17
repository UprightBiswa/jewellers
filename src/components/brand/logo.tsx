import { cn } from "@/lib/utils";

/**
 * The Charubala Silver mark: an open kara that also reads as a C, with a single
 * stone set in the gap.
 *
 * It renders as a filled badge by default — the same garnet tile as the favicon
 * and the share card — so the brand looks identical in the tab, in the header
 * and on WhatsApp. That also fixes the contrast problem a bare outline had: a
 * thin garnet stroke on a near-black background reads as almost nothing, while
 * the badge keeps the same weight in both themes because the tile carries the
 * colour and the glyph sits in cream on top of it.
 *
 * `variant="bare"` drops the tile for places that already have a coloured
 * surface behind them.
 *
 * Swapping in a logo the owner has drawn is a change to this one component;
 * nothing else in the app draws the brand.
 */
export function Mark({
  className,
  variant = "badge",
}: {
  className?: string;
  variant?: "badge" | "bare";
}) {
  const bare = variant === "bare";

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden
      focusable="false"
    >
      {!bare ? <rect width="32" height="32" rx="7" className="fill-brand" /> : null}
      <path
        d="M23 10.2A8.6 8.6 0 1 0 23 21.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        className={bare ? undefined : "text-on-brand"}
      />
      <rect
        x="21.6"
        y="13.6"
        width="4.8"
        height="4.8"
        rx="0.7"
        transform="rotate(45 24 16)"
        className="fill-gold"
      />
    </svg>
  );
}

/**
 * Mark plus wordmark. `storeName` comes from Settings, so renaming the shop in
 * the admin renames it here too.
 */
export function Logo({
  storeName,
  tagline,
  className,
  markClassName,
}: {
  storeName: string;
  tagline?: string;
  className?: string;
  markClassName?: string;
}) {
  const [first, ...rest] = storeName.split(" ");

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Mark className={cn("size-9 shrink-0", markClassName)} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-tight text-ink sm:text-[22px]">
          {first}
          {rest.length > 0 ? <span className="text-muted"> {rest.join(" ")}</span> : null}
        </span>
        {tagline ? (
          <span className="mt-1 hidden text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
