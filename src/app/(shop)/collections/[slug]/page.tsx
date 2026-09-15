import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/lib/db";
import { getCollectionBySlug, listProducts, type SortKey } from "@/lib/queries/catalog";
import { ProductListing } from "@/components/storefront/product-listing";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ sort?: string }>;

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
  const { sort } = await searchParams;
  const isAll = slug === ALL;

  const collection = isAll ? null : await getCollectionBySlug(slug);
  if (!isAll && !collection) notFound();

  const [{ products, nextCursor }, total] = await Promise.all([
    listProducts({
      collectionSlug: isAll ? undefined : slug,
      sort: (sort as SortKey) ?? "newest",
      limit: 24,
    }),
    db.product.count({
      where: {
        status: "ACTIVE",
        ...(isAll ? {} : { collections: { some: { collection: { slug } } } }),
      },
    }),
  ]);

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

      <div className="mt-8">
        <ProductListing
          initial={products}
          initialCursor={nextCursor}
          query={isAll ? {} : { collection: slug }}
          total={total}
        />
      </div>
    </div>
  );
}
