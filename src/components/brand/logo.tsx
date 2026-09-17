import { cn } from "@/lib/utils";

/**
 * The Charubala Silver mark: an open kara that also reads as a C, with a single
 * stone set in the gap. Drawn rather than photographed so it stays crisp from a
 * 16px favicon up to a shop signboard, and takes its colour from the theme.
 *
 * This is a starting mark. If the owner has a logo he likes, swapping it is one
 * component — nothing else in the app draws the brand.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden
      focusable="false"
    >
      <path
        d="M23 10.2A8.6 8.6 0 1 0 23 21.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
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
      <Mark className={cn("size-8 shrink-0 text-brand", markClassName)} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl tracking-tight text-ink sm:text-[22px]">
          {first}
          {rest.length > 0 ? (
            <span className="text-muted"> {rest.join(" ")}</span>
          ) : null}
        </span>
        {tagline ? (
          <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.16em] text-muted sm:block">
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  );
}
