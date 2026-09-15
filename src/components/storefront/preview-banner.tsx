import { databaseReachable } from "@/lib/demo/fallback";

/**
 * Shown only in development, only when the database is unreachable.
 *
 * Demo data that is not clearly labelled is worse than no data: someone shows
 * the client a shop, the client asks why an order never arrived, and nobody
 * remembers none of it was real. So the banner is loud, permanent and says
 * exactly what to do about it.
 */
export async function PreviewBanner() {
  if (process.env.NODE_ENV === "production") return null;
  if (await databaseReachable()) return null;

  return (
    <div className="border-b border-warn/40 bg-warn-soft">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
        <strong className="font-semibold text-warn">Preview data</strong>
        <span className="text-ink-2">
          No database connected — these products are examples and nothing you do here is
          saved.
        </span>
        <code className="rounded bg-surface px-1.5 py-0.5 text-[12px] text-ink-2">
          npx prisma migrate dev --name init
        </code>
      </div>
    </div>
  );
}
