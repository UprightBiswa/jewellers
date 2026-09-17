"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Something broke on a shop page.
 *
 * Written for a customer, not a developer: it says what happened, offers the one
 * action that usually fixes it, and gives a way to reach a human. The digest is
 * shown in small print because it is the only thing that lets us find the error
 * in the logs when someone reports it.
 */
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[shop] render error", error);
  }, [error]);

  return (
    <div className="container-page grid place-items-center py-24 text-center">
      <div className="max-w-md">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Something went wrong</p>

        <h1 className="mt-3 font-display text-[clamp(1.7rem,4.5vw,2.2rem)] text-ink">
          That page did not load
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          This is our fault, not yours. Nothing has been charged and your bag is safe.
          Try again — it usually works the second time.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to the shop</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">Tell us about it</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-8 text-[12px] text-muted">
            Reference <span className="tnum">{error.digest}</span> — quote this if you
            contact us.
          </p>
        ) : null}
      </div>
    </div>
  );
}
