import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatPaise, paiseToRupees } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { MetalRateForm } from "@/components/admin/metal-rate-form";

export const metadata: Metadata = { title: "Silver rate" };
export const dynamic = "force-dynamic";

export default async function MetalRatePage() {
  const [latest, history, weightPriced] = await Promise.all([
    db.metalRate.findFirst({
      where: { metal: "SILVER" },
      orderBy: { effectiveFrom: "desc" },
      select: { ratePerGram: true, effectiveFrom: true, setBy: { select: { name: true } } },
    }),
    db.metalRate.findMany({
      where: { metal: "SILVER" },
      orderBy: { effectiveFrom: "desc" },
      take: 10,
      select: { id: true, ratePerGram: true, effectiveFrom: true },
    }),
    db.product.count({ where: { priceMode: "WEIGHT", status: "ACTIVE" } }),
  ]);

  return (
    <div className="grid max-w-2xl gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Today&apos;s silver rate</h1>
        <p className="text-sm text-muted">
          {weightPriced > 0
            ? `${weightPriced} ${weightPriced === 1 ? "product is" : "products are"} priced by weight. Changing this changes their prices right away.`
            : "No products are priced by weight yet, so this rate is not being used."}
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p className="text-[13px] uppercase tracking-[0.12em] text-muted">Rate in force</p>
        {latest ? (
          <>
            <p className="mt-1 font-display text-4xl text-ink tnum">
              {formatPaise(latest.ratePerGram)}
              <span className="ml-1.5 font-sans text-base text-muted">per gram</span>
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Set {formatDate(latest.effectiveFrom, true)}
              {latest.setBy?.name ? ` by ${latest.setBy.name}` : ""}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-muted">
            No rate set yet. Weight-priced items are falling back to their typed price.
          </p>
        )}
      </section>

      <MetalRateForm currentRupees={latest ? paiseToRupees(latest.ratePerGram) : null} />

      {history.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-lg text-ink">Recent rates</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {history.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-[14.5px]">
                <span className="text-muted">{formatDate(r.effectiveFrom, true)}</span>
                <span className="font-medium text-ink tnum">
                  {formatPaise(r.ratePerGram)}/g
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[13px] leading-relaxed text-muted">
        This is the rate for 999 fine silver. A 925 piece is priced at 92.5% of it, plus the
        making charge set on that product. Orders already placed never change.
      </p>
    </div>
  );
}
