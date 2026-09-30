"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { deleteCollection, saveCollection } from "@/app/admin/content-actions";

export type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  bannerPublicId: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

type Draft = {
  id?: string;
  name: string;
  subtitle: string;
  banner: UploadedImage[];
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: Draft = { name: "", subtitle: "", banner: [], sortOrder: "0", isActive: true };

/**
 * Collections — the shelves on the front page.
 *
 * A category is what a piece *is*; a collection is a reason to show it together
 * with others. "Under ₹999", "New arrivals", "Festive". A product belongs to a
 * collection without depending on it, which is why deleting one here takes
 * nothing away from the pieces in it.
 *
 * Products are put into a collection from the product page, not from here. That
 * keeps one list to maintain rather than two that can disagree.
 */
export function CollectionManager({ collections }: { collections: CollectionRow[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const res = await saveCollection({
        id: draft.id,
        name: draft.name,
        subtitle: draft.subtitle || undefined,
        bannerPublicId: draft.banner[0]?.publicId,
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      });
      res.ok ? (toast.success(res.message ?? "Saved."), setDraft(null)) : toast.error(res.message);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteCollection(id);
      res.ok ? toast.success(res.message ?? "Deleted.") : toast.error(res.message);
      setConfirming(null);
    });
  }

  return (
    <div className="grid gap-5">
      {!draft && (
        <Button onClick={() => setDraft({ ...EMPTY, sortOrder: String(collections.length) })}>
          <Plus className="size-4" aria-hidden />
          Add a collection
        </Button>
      )}

      {draft && (
        <form
          action={() => save()}
          className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">
              {draft.id ? "Edit collection" : "New collection"}
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
              placeholder="Under ₹999"
              required
              className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">One line under the name</span>
            <input
              value={draft.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Everyday pieces that do not cost much"
              className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
            />
          </label>

          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Banner photo</span>
            <ImageUploader
              images={draft.banner}
              onChange={(next) => set("banner", next.slice(0, 1))}
              max={1}
              folder="collections"
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="grid w-28 gap-1.5">
              <span className="text-sm font-medium text-ink">Order</span>
              <input
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => set("sortOrder", e.target.value)}
                className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink tnum focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
              />
            </label>

            <label className="flex h-11 cursor-pointer items-center gap-2 text-[15px] text-ink">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 rounded border-line-strong accent-[var(--brand)]"
              />
              Show on the shop
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner label="Saving" /> : null}
              {draft.id ? "Save changes" : "Add collection"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {collections.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-[15px] font-medium text-ink">
                {c.name}
                {!c.isActive && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">
                    Hidden
                  </span>
                )}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                /{c.slug} · {c.productCount} {c.productCount === 1 ? "piece" : "pieces"}
                {c.subtitle ? ` · ${c.subtitle}` : ""}
              </p>
            </div>

            {confirming === c.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">Delete it?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  No
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(c.id)} disabled={pending}>
                  Yes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: c.id,
                      name: c.name,
                      subtitle: c.subtitle ?? "",
                      banner: c.bannerPublicId
                        ? [{ publicId: c.bannerPublicId, url: "", alt: c.name }]
                        : [],
                      sortOrder: String(c.sortOrder),
                      isActive: c.isActive,
                    })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(c.id)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {collections.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-12 text-center text-muted">
          No collections yet. Try &ldquo;New arrivals&rdquo; and &ldquo;Under ₹999&rdquo;.
        </p>
      )}
    </div>
  );
}
