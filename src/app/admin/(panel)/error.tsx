"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * An admin screen failed.
 *
 * Unlike the shop's version, this one is allowed to be specific: the reader is
 * the shop owner, and knowing that nothing was saved is the thing he actually
 * needs to hear before he tries again.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] render error", error);
  }, [error]);

  return (
    <div className="grid place-items-center py-20 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-2xl text-ink">This screen did not load</h1>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          Nothing you were working on has been saved or lost — the screen simply failed to
          open. Try again, and if it keeps happening, check that the database is reachable.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="size-4" aria-hidden />
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin">Back to the dashboard</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-8 text-[12px] text-muted tnum">Reference {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
