import { cn } from "@/lib/utils";

import Image from "next/image";

/**
 * The shop's own mark.
 *
 * This was a hand-drawn SVG kara until Rahul sent a photograph of his real
 * logo. The original note on this component said swapping it in would be a
 * change to this one file and nothing else, which turned out to be true.
 *
 * Served as a 128px WebP: the mark never draws larger than about 40px, so 128
 * covers a three-times screen, and the 1254px original it came from was 282 KB
 * on every page of the shop. `variant` is kept so existing callers do not have
 * to change — "bare" simply drops the rounded tile.
 */
export function Mark({
  className,
  variant = "badge",
}: {
  className?: string;
  variant?: "badge" | "bare";
}) {
  return (
    <Image
      src="/brand/logo.webp"
      alt=""
      width={128}
      height={128}
      priority
      aria-hidden
      className={cn(
        // Round, matching the favicon and the share card. A square crop of a
        // round logo reads as a mistake beside a circular tab icon.
        "size-8 shrink-0 rounded-full object-cover",
        className,
      )}
    />
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
