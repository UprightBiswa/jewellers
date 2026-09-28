import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "That is gone", rendered directly by the page.
 *
 * The obvious way to write this is `if (!product) notFound()`. On Next 16.3.5
 * that does not work: the thrown notFound never reaches a not-found.tsx
 * boundary, the stream stalls on an unresolved Suspense placeholder, and the
 * owner is left looking at a skeleton that never becomes anything — on a URL
 * that in fact answered in under a second.
 *
 * So the page returns this instead of throwing. It is one `return` rather than
 * one `throw`, it does not depend on a framework bug being fixed, and it can say
 * something more useful than a generic 404 because it knows what was being
 * looked for.
 *
 * See defect #44 in docs/TASKS.md.
 */
export function Missing({
  what,
  backHref,
  backLabel,
}: {
  what: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="grid place-items-center py-20 text-center">
      <SearchX className="size-10 text-muted" aria-hidden />
      <h1 className="mt-4 font-display text-2xl text-ink">
        That {what} is not here any more
      </h1>
      <p className="mt-2 max-w-sm text-muted">
        It may have been deleted, or the link may be out of date. Nothing is broken.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/admin">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
