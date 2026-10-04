import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  countProducts,
  filterWhere,
  getCollectionBySlug,
  listProducts,
  type SortKey,
} from "@/lib/queries/catalog";
import { ProductListing } from "@/components/storefront/product-listing";
import { FilterSheet, FilterSidebar } from "@/components/storefront/product-filters";
import type { Purity } from "@/generated/prisma";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ sort?: string
  minPrice?: string;
  maxPrice?: string;
  purity?: string | string[];
  inStock?: string;
}>;

export const revalidate = 300;

/** "all" is not a row in the database — it is the whole catalogue. */
const ALL = "all";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;

  if (slug === ALL) {
    return {
      title: "All jewellery",
      description: "Every piece we make, in 925 sterling and 999 fine silver.",
      alternates: { canonical: "/collections/all" },
    };
  }

  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};

  return {
    title: collection.name,
    description: collection.subtitle ?? `${collection.name} in handmade sterling silver.`,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { sort, minPrice, maxPrice, purity, inStock } = await searchParams;

  // The filter panel writes these into the URL; the server does the filtering,
  // so a shared link and a crawler both see the same list.
  const purities = (Array.isArray(purity) ? purity : purity ? [purity] : []) as Purity[];
  const filters = {
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    purity: purities.length ? purities : undefined,
    inStockOnly: inStock === "1",
  };
  const isAll = slug === ALL;

  const collection = isAll ? null : await getCollectionBySlug(slug);
  if (!isAll && !collection) notFound();

  const { products, nextCursor } = await listProducts({
    collectionSlug: isAll ? undefined : slug,
    ...filters,
    sort: (sort as SortKey) ?? "newest",
    limit: 24,
  });
  const total = await countProducts(
    {
      status: "ACTIVE",
      ...(isAll ? {} : { collections: { some: { collection: { slug } } } }),
      ...filterWhere(filters),
    },
    products.length,
  );

  const title = isAll ? "All jewellery" : (collection?.name ?? "");
  const subtitle = isAll
    ? "Everything we make, in 925 sterling and 999 fine silver."
    : collection?.subtitle;

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="px-1.5" aria-hidden>/</span>
        <span className="text-ink">{title}</span>
      </nav>

      <header className="mt-5 max-w-2xl">
        <h1 className="font-display text-[clamp(1.8rem,5vw,2.6rem)] text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-[15px] text-ink-2">{subtitle}</p> : null}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr] lg:items-start">
        <FilterSidebar />
        <ProductListing
          toolbar={<FilterSheet total={total} />}
          initial={products}
          initialCursor={nextCursor}
          query={isAll ? {} : { collection: slug }}
          total={total}
        />
      </div>
    </div>
  );
}
