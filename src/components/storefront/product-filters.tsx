"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Filters, in two pieces.
 *
 * `FilterSidebar` is the desktop column; `FilterSheet` is the phone's button and
 * the drawer it opens — sliding in from the side, the same way the admin menu
 * does, so the two halves of the project behave alike. They are separate components rather than one that hides
 * half of itself, because the phone's button belongs in the toolbar beside Sort
 * — one bar, not two stacked ones — and the desktop column belongs beside the
 * grid. Nothing is shared between them: the URL is the state, so they cannot
 * disagree.
 *
 * They also behave differently on purpose. On a desktop a tick applies at once,
 * the way every shop does it. On a phone the sheet collects the choices and
 * applies them on one tap, because each apply reloads the grid underneath and
 * doing that four times while someone is still deciding is both slow and
 * disorienting.
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

function readParams(params: URLSearchParams): Draft {
  return {
    min: params.get("minPrice") ?? "",
    max: params.get("maxPrice") ?? "",
    purity: params.getAll("purity"),
    inStock: params.get("inStock") === "1",
  };
}

function toUrl(params: URLSearchParams, next: Draft): string {
  const url = new URLSearchParams(params.toString());
  for (const k of ["minPrice", "maxPrice", "purity", "inStock", "cursor"]) url.delete(k);

  if (next.min) url.set("minPrice", next.min);
  if (next.max) url.set("maxPrice", next.max);
  for (const p of next.purity) url.append("purity", p);
  if (next.inStock) url.set("inStock", "1");

  return url.toString();
}

export function countActive(params: URLSearchParams): number {
  const d = readParams(params);
  return (d.min || d.max ? 1 : 0) + d.purity.length + (d.inStock ? 1 : 0);
}

/** The controls themselves, used by both the sidebar and the sheet. */
function Controls({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
}) {
  const band = (b: (typeof PRICE_BANDS)[number]) => draft.min === b.min && draft.max === b.max;

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
          Price
        </legend>
        <div className="mt-3 grid gap-2.5">
          {PRICE_BANDS.map((b) => (
            <label
              key={b.label}
              className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink"
            >
              <input
                type="radio"
                name="price-band"
                checked={band(b)}
                onChange={() => onChange({ ...draft, min: b.min, max: b.max })}
                className="size-4 accent-[var(--brand)]"
              />
              {b.label}
            </label>
          ))}
          {(draft.min || draft.max) && (
            <button
              type="button"
              onClick={() => onChange({ ...draft, min: "", max: "" })}
              className="justify-self-start text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Any price
            </button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted">
          Silver
        </legend>
        <div className="mt-3 grid gap-2.5">
          {PURITIES.map((p) => (
            <label
              key={p.value}
              className="flex cursor-pointer items-center gap-2.5 text-[15px] text-ink"
            >
              <input
                type="checkbox"
                checked={draft.purity.includes(p.value)}
                onChange={() =>
                  onChange({
                    ...draft,
                    purity: draft.purity.includes(p.value)
                      ? draft.purity.filter((x) => x !== p.value)
                      : [...draft.purity, p.value],
                  })
                }
                className="size-4 rounded accent-[var(--brand)]"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-2.5 border-t border-line pt-5 text-[15px] text-ink">
        <input
          type="checkbox"
          checked={draft.inStock}
          onChange={(e) => onChange({ ...draft, inStock: e.target.checked })}
          className="size-4 rounded accent-[var(--brand)]"
        />
        Ready to send today
      </label>
    </div>
  );
}

/** Desktop column. Every tick applies immediately. */
export function FilterSidebar() {
  const router = useRouter();
  const params = useSearchParams();
  const draft = readParams(params);
  const active = countActive(params);

  const apply = (next: Draft) =>
    router.push(`?${toUrl(params, next)}`, { scroll: false });

  return (
    <aside className="hidden lg:block lg:sticky lg:top-24">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg text-ink">Filter</h2>
        {active > 0 && (
          <button
            type="button"
            onClick={() => apply({ min: "", max: "", purity: [], inStock: false })}
            className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="mt-5">
        <Controls draft={draft} onChange={apply} />
      </div>
      </div>
    </aside>
  );
}

/**
 * What is currently filtered, as removable chips above the grid.
 *
 * Without these, a customer who lands on a shared link sees a short list and no
 * reason for it — on a phone the panel is closed, so the only clue is a small
 * number on a button. Each chip says what it is and removes just itself.
 */
export function ActiveFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const d = readParams(params);

  const chips: { label: string; next: Draft }[] = [];

  if (d.min || d.max) {
    const band = PRICE_BANDS.find((b) => b.min === d.min && b.max === d.max);
    chips.push({
      label: band?.label ?? "Price",
      next: { ...d, min: "", max: "" },
    });
  }
  for (const value of d.purity) {
    chips.push({
      label: PURITIES.find((p) => p.value === value)?.label ?? value,
      next: { ...d, purity: d.purity.filter((x) => x !== value) },
    });
  }
  if (d.inStock) chips.push({ label: "Ready to send today", next: { ...d, inStock: false } });

  if (chips.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => router.push(`?${toUrl(params, c.next)}`, { scroll: false })}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-[13px] text-ink transition-colors hover:bg-surface-2"
        >
          {c.label}
          <X className="size-3.5 text-muted" aria-hidden />
          <span className="sr-only">Remove this filter</span>
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() =>
            router.push(`?${toUrl(params, { min: "", max: "", purity: [], inStock: false })}`, {
              scroll: false,
            })
          }
          className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

/** Phone: a button for the toolbar, and the sheet it opens. */
export function FilterSheet({ total }: { total?: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => readParams(params));

  // The URL is the truth. A back button or a shared link must be reflected in
  // the sheet, not overwritten by whatever was last tapped.
  useEffect(() => setDraft(readParams(params)), [params]);

  // A sheet over a page that still scrolls behind it feels broken on a phone.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const active = countActive(params);

  function apply(next: Draft) {
    router.push(`?${toUrl(params, next)}`, { scroll: false });
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden />
        Filter
        {active > 0 && (
          <span className="ms-1 rounded-full bg-brand px-1.5 text-[11px] text-on-brand tnum">
            {active}
          </span>
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filter"
        >
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
          />
          <div
            className={cn(
              "absolute inset-y-0 end-0 flex w-[86%] max-w-sm flex-col border-s border-line bg-surface",
              "motion-safe:animate-[drawer-in-end_220ms_ease-out]",
            )}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
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

            <div className="flex-1 overflow-y-auto p-4">
              <Controls draft={draft} onChange={setDraft} />
            </div>

            {/* Last in the drawer, which is where the thumb ends up. */}
            <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button
                variant="ghost"
                onClick={() => apply({ min: "", max: "", purity: [], inStock: false })}
                className="flex-1"
              >
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
