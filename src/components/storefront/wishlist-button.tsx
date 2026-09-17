"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { useWishlist, wishlist } from "@/lib/wishlist/store";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * The heart.
 *
 * Signing in is required to save something — the list has to belong to an
 * account to survive a new phone. Rather than hiding the button from signed-out
 * visitors, it explains itself and offers the sign-in link, because a heart that
 * silently does nothing is the more annoying failure.
 */
export function WishlistButton({
  productId,
  productTitle,
  variant = "icon",
  className,
}: {
  productId: string;
  productTitle: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const { ids, signedIn, loaded } = useWishlist();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const saved = ids.has(productId);

  async function toggle() {
    if (pending) return;

    if (loaded && !signedIn) {
      toast.error("Sign in to save pieces for later.", {
        action: { label: "Sign in", onClick: () => router.push("/login?next=/account/wishlist") },
      });
      return;
    }

    setPending(true);
    try {
      const now = await wishlist.toggle(productId);
      toast.success(now ? `${productTitle} saved.` : `${productTitle} removed from saved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setPending(false);
    }
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-13 items-center justify-center gap-2 rounded-lg border px-5 text-[15px] font-medium transition-colors",
          saved
            ? "border-brand bg-brand-soft text-brand"
            : "border-line-strong text-ink hover:bg-surface-2",
          className,
        )}
      >
        {pending ? (
          <Spinner label="Saving" />
        ) : (
          <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
        )}
        {saved ? "Saved" : "Save for later"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productTitle} from saved` : `Save ${productTitle}`}
      className={cn(
        "grid size-9 place-items-center rounded-full bg-surface/85 backdrop-blur transition-colors",
        saved ? "text-brand" : "text-ink-2 hover:text-brand",
        className,
      )}
    >
      {pending ? (
        <Spinner label="Saving" />
      ) : (
        <Heart className={cn("size-4", saved && "fill-current")} aria-hidden />
      )}
    </button>
  );
}
