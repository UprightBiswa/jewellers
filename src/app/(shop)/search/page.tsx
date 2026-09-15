import type { Metadata } from "next";
import { Suspense } from "react";

import { listProducts, type SortKey } from "@/lib/queries/catalog";
import { ProductListing } from "@/components/storefront/product-listing";
import { SearchBox } from "@/components/storefront/search-box";

type Search = Promise<{ q?: string; sort?: string }>;

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q = "", sort } = await searchParams;
  const query = q.trim();

  const { products, nextCursor } = query
    ? await listProducts({ q: query, sort: (sort as SortKey) ?? "newest", limit: 24 })
    : { products: [], nextCursor: null };

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-[clamp(1.8rem,5vw,2.4rem)] text-ink">
        {query ? <>Results for “{query}”</> : "Search"}
      </h1>

      <div className="mt-5 max-w-lg">
        <Suspense fallback={<div className="h-10" />}>
          <SearchBox autoFocus={!query} />
        </Suspense>
      </div>

      {query ? (
        <div className="mt-10">
          <ProductListing
            initial={products}
            initialCursor={nextCursor}
            query={{ q: query }}
          />
        </div>
      ) : (
        <p className="mt-6 text-[15px] text-muted">
          Try “payal”, “oxidised ring”, “999 coin”, or an item code like SS-RNG-1001.
        </p>
      )}
    </div>
  );
}
