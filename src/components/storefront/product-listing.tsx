"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import type { ProductCard as Card, SortKey } from "@/lib/queries/catalog";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popular", label: "Most viewed" },
];

/**
 * Grid + "Load more".
 *
 * The first page is rendered on the server and handed in, so the listing is
 * complete and indexable on first paint; this component only ever appends.
 * Sorting round-trips through the URL, which keeps the choice shareable and
 * survives a back button.
 */
export function ProductListing({
  initial,
  initialCursor,
  query,
  total,
}: {
  initial: Card[];
  initialCursor: string | null;
  /** Passed straight through to /api/v1/products */
  query: Record<string, string | undefined>;
  total?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);

  const sort = (params.get("sort") as SortKey) ?? "newest";

  // A new server page (different category, different sort) replaces the list.
  useEffect(() => {
    setProducts(initial);
    setCursor(initialCursor);
  }, [initial, initialCursor]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);

    try {
      const search = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) if (v) search.set(k, v);
      search.set("cursor", cursor);
      search.set("sort", sort);

      const res = await fetch(`/api/v1/products?${search}`);
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? "Could not load more.");

      setProducts((prev) => [...prev, ...json.data.products]);
      setCursor(json.meta.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load more.");
    } finally {
      setLoading(false);
    }
  }

  function changeSort(next: string) {
    const url = new URLSearchParams(params.toString());
    url.set("sort", next);
    startTransition(() => router.replace(`?${url}`, { scroll: false }));
  }

  if (products.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-xl text-ink">Nothing here yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Try another category, or tell us what you are looking for — we make to order.
        </p>
        <Button asChild variant="secondary" className="mt-5">
          <a href="/contact">Ask us for it</a>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <p className="text-sm text-muted tnum">
          {total !== undefined ? `${total} pieces` : `${products.length} shown`}
        </p>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value)}
            disabled={isPending}
            className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} />
        ))}
        {loading
          ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={`s${i}`} />)
          : null}
      </div>

      {cursor ? (
        <div className="mt-12 flex justify-center">
          <Button variant="secondary" size="lg" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : products.length > 8 ? (
        <p className="mt-12 text-center text-sm text-muted">That is everything in this section.</p>
      ) : null}
    </>
  );
}
