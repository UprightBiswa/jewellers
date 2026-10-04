"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Filters — a sidebar on a desktop, a sheet from the bottom of a phone.
 *
 * Most of Charubala's customers are on a phone, and a filter panel that opens
 * from the top means reaching for it with the hand that is holding the device.
 * The sheet rises from the bottom, where the thumb already is, and the Apply
 * button sits at the bottom of the sheet for the same reason.
 *
 * Everything lives in the URL. A filtered list is then shareable over WhatsApp —
 * which is how a customer actually asks "do you have this under a thousand?" —
 * and the back button undoes one choice at a time instead of leaving the page.
 */

const PURITIES = [
  { value: "S925", label: "925 Sterling" },
  { value: "S999", label: "999 Fine" },
  { value: "OXIDISED", label: "Oxidised" },
  { value: "GOLD_PLATED", label: "Gold plated" },
  { value: "PLATED", label: "Silver plated" },
];

const PRICE_BANDS = [
  { label: "Under ₹999", min: "", max: "99900" },
  { label: "₹999 – ₹1,999", min: "99900", max: "199900" },
  { label: "₹1,999 – ₹2,999", min: "199900", max: "299900" },
  { label: "Over ₹2,999", min: "299900", max: "" },
];

type Draft = { min: string; max: string; purity: string[]; inStock: boolean };

export function ProductFilters({ total }: { total?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const current: Draft = {
    min: params.get("minPrice") ?? "",
    max: params.get("maxPrice") ?? "",
    purity: params.getAll("purity"),
    inStock: params.get("inStock") === "1",
  };

  const [draft, setDraft] = useState<Draft>(current);

  // The URL is the source of truth: a back button or a shared link must be
  // reflected in the panel, not overwritten by whatever was last typed.
  useEffect(() => {
    setDraft({
      min: params.get("minPrice") ?? "",
      max: params.get("maxPrice") ?? "",
      purity: params.getAll("purity"),
      inStock: params.get("inStock") === "1",
    });
  }, [params]);

  const activeCount =
    (current.min || current.max ? 1 : 0) + current.purity.length + (current.inStock ? 1 : 0);

  function apply(next: Draft) {
    const url = new URLSearchParams(params.toString());
    url.delete("minPrice");
    url.delete("maxPrice");
    url.delete("purity");
    url.delete("inStock");
    url.delete("cursor");

    if (next.min) url.set("minPrice", next.min);
    if (next.max) url.set("maxPrice", next.max);
    for (const p of next.purity) url.append("purity", p);
    if (next.inStock) url.set("inStock", "1");

    router.push(`?${url.toString()}`, { scroll: false });
    setOpen(false);
  }

  function clear() {
    const url = new URLSearchParams(params.toString());
    for (const k of ["minPrice", "maxPrice", "purity", "inStock", "cursor"]) url.delete(k);
    router.push(url.toString() ? `?${url.toString()}` : "?", { scroll: false });
    setOpen(false);
  }

  const togglePurity = (v: string) =>
    setDraft((d) => ({
      ...d,
      purity: d.purity.includes(v) ? d.purity.filter((x) => x !== v) : [...d.purity, v],
    }));

  const band = (b: (typeof PRICE_BANDS)[number]) => draft.min === b.min && draft.max === b.max;

  const panel = (
    <div className="grid gap-6">
      <fieldset>
        <legend className="text-[13px] font-medium uppercase tracking-[0.1em] text-muted">
          Price
        </legend>
        <div className="mt-3 grid gap-2">
          {PRICE_BANDS.map((b) => (
            <label key={b.label} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink">
              <input
                type="radio"
                name="price-band"
                checked={band(b)}
                onChange={() => setDraft((d) => ({ ...d, min: b.min, max: b.max }))}
                className="size-4 accent-[var(--brand)]"
              />
              {b.label}
            </label>
          ))}
          {(draft.min || draft.max) && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, min: "", max: "" }))}
              className="justify-self-start text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Any price
            </button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-medium uppercase tracking-[0.1em] text-muted">
          Silver
        </legend>
        <div className="mt-3 grid gap-2">
          {PURITIES.map((p) => (
            <label key={p.value} className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={draft.purity.includes(p.value)}
                onChange={() => togglePurity(p.value)}
                className="size-4 rounded accent-[var(--brand)]"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={draft.inStock}
          onChange={(e) => setDraft((d) => ({ ...d, inStock: e.target.checked }))}
          className="size-4 rounded accent-[var(--brand)]"
        />
        Ready to send today
      </label>
    </div>
  );

  return (
    <>
      {/* Phone: a button that opens the sheet */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
          {activeCount > 0 && (
            <span className="ms-1 rounded-full bg-brand px-1.5 text-[11px] text-on-brand tnum">
              {activeCount}
            </span>
          )}
        </Button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Desktop: always there, no button needed */}
      <aside className="hidden lg:block">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-ink">Filter</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-5">{panel}</div>
        <Button className="mt-6 w-full" onClick={() => apply(draft)}>
          Show {total !== undefined ? `${total} ` : ""}pieces
        </Button>
      </aside>

      {/* Phone: the sheet itself */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filter">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
          />
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface",
              "motion-safe:animate-[sheet-up_220ms_ease-out]",
            )}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
              <h2 className="font-display text-lg text-ink">Filter</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="p-4">{panel}</div>

            {/* Actions at the bottom, under the thumb. */}
            <div className="sticky bottom-0 flex gap-2 border-t border-line bg-surface p-4">
              <Button variant="ghost" onClick={clear} className="flex-1">
                Clear
              </Button>
              <Button onClick={() => apply(draft)} className="flex-[2]">
                Show {total !== undefined ? `${total} ` : ""}pieces
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
