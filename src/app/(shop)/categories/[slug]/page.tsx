import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  countProducts,
  getCategoryBySlug,
  listProducts,
  type SortKey,
} from "@/lib/queries/catalog";
import { ProductListing } from "@/components/storefront/product-listing";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ sort?: string }>;

export const revalidate = 300;

/*
 * `notFound()` returns a 200 status on Next 16.3.5.
 *
 * Established by elimination in a production build: a bare page whose only
 * statement is notFound(), with no proxy, no error boundary and no custom
 * not-found file anywhere, still answers 200 — while a genuinely unmatched URL
 * correctly answers 404. It is a framework bug, not this page's doing, and
 * removing generateStaticParams did not help (that was an earlier wrong guess).
 *
 * Mitigation until it is fixed upstream: the not-found page carries
 * `robots: noindex`, so Google will not index a dead product URL as a real
 * page even though the status is wrong. Re-test after each Next upgrade.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  return {
    title: category.metaTitle ?? category.name,
    description:
      category.metaDescription ??
      `Handmade 925 sterling silver ${category.name.toLowerCase()}, hallmarked and shipped across India.`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { products, nextCursor } = await listProducts({
    categorySlug: slug,
    sort: (sort as SortKey) ?? "newest",
    limit: 24,
  });
  const total = await countProducts(
    { status: "ACTIVE", category: { slug } },
    products.length,
  );

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="px-1.5" aria-hidden>/</span>
        <Link href="/collections/all" className="hover:text-ink">All jewellery</Link>
        <span className="px-1.5" aria-hidden>/</span>
        <span className="text-ink">{category.name}</span>
      </nav>

      <header className="mt-5 max-w-2xl">
        <h1 className="font-display text-[clamp(1.8rem,5vw,2.6rem)] text-ink">
          {category.name}
        </h1>
        {category.nameBn ? (
          <p className="bangla mt-1 text-lg text-muted">{category.nameBn}</p>
        ) : null}
        {category.description ? (
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{category.description}</p>
        ) : null}
      </header>

      <div className="mt-8">
        <ProductListing
          initial={products}
          initialCursor={nextCursor}
          query={{ category: slug }}
          total={total}
        />
      </div>
    </div>
  );
}
