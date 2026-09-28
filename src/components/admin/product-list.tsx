"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Archive, FileEdit, Trash2, Upload as Publish, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { bulkDeleteProducts, bulkSetProductStatus } from "@/app/admin/actions";

export type ProductRow = {
  id: string;
  title: string;
  sku: string;
  price: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  priceMode: "FIXED" | "WEIGHT";
  stock: number;
  categoryName: string;
  imagePublicId?: string;
};

/**
 * The product list, with selection.
 *
 * A shop loading three hundred pieces from a sheet needs to act on forty of them
 * at once — publish this morning's batch, archive last season's. Doing that one
 * row at a time is the same fifteen hours the importer just removed.
 *
 * Selection lives here rather than in the URL: it should not survive a filter
 * change, because "delete selected" after switching tabs would act on rows the
 * owner can no longer see.
 */
export function ProductList({ products }: { products: ProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const ids = [...selected];
  const allOnPage = products.length > 0 && products.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allOnPage ? new Set() : new Set(products.map((p) => p.id)));
  }

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      try {
        const res = await fn();
        if (res.ok) {
          toast.success(res.message ?? "Done.");
          setSelected(new Set());
          setConfirming(false);
        } else {
          toast.error(res.message ?? "That did not work.");
        }
      } catch {
        toast.error("Something went wrong. Nothing was changed.");
      }
    });
  }

  return (
    <>
      {products.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={allOnPage}
              onChange={toggleAll}
              className="size-4 rounded border-line-strong accent-[var(--brand)]"
            />
            Select all on this page
          </label>
          {selected.size > 0 && (
            <span className="text-sm text-muted">{selected.size} selected</span>
          )}
        </div>
      )}

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {products.map((p) => {
          const checked = selected.has(p.id);
          return (
            <li
              key={p.id}
              className={cn("flex items-center gap-2 pl-3 transition-colors", checked && "bg-brand/5")}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
                aria-label={`Select ${p.title}`}
                className="size-4 shrink-0 rounded border-line-strong accent-[var(--brand)]"
              />

              <Link
                href={`/admin/products/${p.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3 transition-colors hover:bg-surface-2"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <Image
                    src={imageUrl(p.imagePublicId, "thumb")}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium text-ink">{p.title}</p>
                  <p className="truncate text-[12.5px] text-muted tnum">
                    {p.sku} · {p.categoryName}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-semibold text-ink tnum">
                    {formatPaise(p.price)}
                    {p.priceMode === "WEIGHT" ? (
                      <span className="ml-1 text-[11px] font-normal text-muted">by weight</span>
                    ) : null}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-1.5">
                    {p.status !== "ACTIVE" ? (
                      <Badge tone={p.status === "DRAFT" ? "warn" : "neutral"} size="xs">
                        {p.status === "DRAFT" ? "Draft" : "Archived"}
                      </Badge>
                    ) : null}
                    <Badge
                      tone={p.stock === 0 ? "danger" : p.stock <= 3 ? "warn" : "neutral"}
                      size="xs"
                    >
                      {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                    </Badge>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* The action bar. Fixed to the bottom so it is reachable on a phone
          without scrolling back up past forty rows. */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
              {selected.size} selected
            </button>

            <div className="ms-auto flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-sm text-ink">
                    Delete {selected.size} product{selected.size === 1 ? "" : "s"}?
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirming(false)}
                    disabled={pending}
                  >
                    Keep them
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={pending}
                    onClick={() => run(() => bulkDeleteProducts(ids))}
                  >
                    {pending ? <Spinner label="Deleting" /> : <Trash2 className="size-4" aria-hidden />}
                    Yes, delete
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => bulkSetProductStatus(ids, "ACTIVE"))}
                  >
                    <Publish className="size-4" aria-hidden />
                    Put on sale
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => bulkSetProductStatus(ids, "DRAFT"))}
                  >
                    <FileEdit className="size-4" aria-hidden />
                    Move to drafts
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => bulkSetProductStatus(ids, "ARCHIVED"))}
                  >
                    <Archive className="size-4" aria-hidden />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={pending}
                    onClick={() => setConfirming(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keeps the last rows clear of the fixed bar. */}
      {selected.size > 0 && <div className="h-16" aria-hidden />}
    </>
  );
}
