"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Power, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deleteMaterial, saveMaterial } from "@/app/admin/content-actions";

export type MaterialRow = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  code: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type Draft = {
  id?: string;
  name: string;
  nameBn: string;
  code: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: Draft = { name: "", nameBn: "", code: "", sortOrder: "0", isActive: true };

const field =
  "h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20";

/**
 * The silver the shop works in.
 *
 * This was a fixed list in the code — 925, 999, plated, gold-plated, oxidised —
 * so offering rose gold plating meant a developer and a deploy. It is a table
 * now, like categories and collections.
 *
 * Two things are deliberate. A material that products are made of is switched
 * off rather than deleted, because deleting it would leave those pieces with
 * nothing saying what they are. And the short code is editable but unique: it is
 * what the import spreadsheet writes in its purity column, so two materials
 * sharing one would make a sheet ambiguous.
 */
export function MaterialManager({ materials }: { materials: MaterialRow[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const res = await saveMaterial({
        id: draft.id,
        name: draft.name,
        nameBn: draft.nameBn || undefined,
        code: draft.code,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      });
      res.ok ? (toast.success(res.message ?? "Saved."), setDraft(null)) : toast.error(res.message);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteMaterial(id);
      res.ok ? toast.success(res.message ?? "Done.") : toast.error(res.message);
      setConfirming(null);
    });
  }

  return (
    <div className="grid gap-5">
      {!draft && (
        <Button onClick={() => setDraft({ ...EMPTY, sortOrder: String(materials.length) })}>
          <Plus className="size-4" aria-hidden />
          Add a silver type
        </Button>
      )}

      {draft && (
        <form
          action={() => save()}
          className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">
              {draft.id ? "Edit silver type" : "New silver type"}
            </h2>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Name</span>
            <input
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="925 Sterling Silver"
              required
              className={field}
            />
            <span className="text-[13px] text-muted">
              This is what a customer reads on the product page.
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Name in Bengali</span>
            <input
              value={draft.nameBn}
              onChange={(e) => set("nameBn", e.target.value)}
              placeholder="রুপো ৯২৫"
              className={field}
            />
          </label>

          <div className="flex flex-wrap items-end gap-4">
            <label className="grid w-40 gap-1.5">
              <span className="text-sm font-medium text-ink">Short code</span>
              <input
                value={draft.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="925"
                required
                className={field}
              />
            </label>

            <label className="grid w-28 gap-1.5">
              <span className="text-sm font-medium text-ink">Order</span>
              <input
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className={`${field} tnum`}
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center gap-2 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 rounded border-line-strong accent-[var(--brand)]"
              />
              Offer on new products
            </label>
          </div>

          <p className="text-[13px] text-muted">
            The short code is what the import spreadsheet writes in its purity column, so keep it
            brief and do not reuse one.
          </p>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner label="Saving" /> : null}
              {draft.id ? "Save changes" : "Add it"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {materials.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-[15px] font-medium text-ink">
                {m.name}
                {!m.isActive && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">
                    Not offered
                  </span>
                )}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                code <span className="tnum">{m.code}</span> · {m.productCount}{" "}
                {m.productCount === 1 ? "piece" : "pieces"}
                {m.nameBn ? ` · ${m.nameBn}` : ""}
              </p>
            </div>

            {confirming === m.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">
                  {m.productCount > 0 ? "Stop offering it?" : "Delete it?"}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  No
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(m.id)} disabled={pending}>
                  Yes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: m.id,
                      name: m.name,
                      nameBn: m.nameBn ?? "",
                      code: m.code,
                      sortOrder: String(m.sortOrder),
                      isActive: m.isActive,
                    })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`Edit ${m.name}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(m.id)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  aria-label={`${m.productCount > 0 ? "Stop offering" : "Delete"} ${m.name}`}
                >
                  {m.productCount > 0 ? (
                    <Power className="size-4" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {materials.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-12 text-center text-muted">
          No silver types yet. A product cannot be added until there is at least one.
        </p>
      )}
    </div>
  );
}
