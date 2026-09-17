import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { getProductBySlug, getRelated } from "@/lib/queries/catalog";
import { getSettings } from "@/lib/settings";
import { imageUrl } from "@/lib/images/url";
import { discountPercent, formatPaise } from "@/lib/money";
import { PURITY_LABEL } from "@/lib/pricing";
import { absoluteUrl } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/reveal";
import { BuyBox } from "@/components/storefront/buy-box";
import { PincodeCheck } from "@/components/storefront/pincode-check";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { ProductGrid, SectionHeading } from "@/components/storefront/sections";

type Params = Promise<{ slug: string }>;

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
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const image = imageUrl(product.images[0]?.publicId, "og");

  return {
    title: product.metaTitle ?? product.title,
    description: product.metaDescription ?? product.shortDesc ?? undefined,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.shortDesc ?? undefined,
      images: [{ url: image, width: 1200, height: 630 }],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([
    getSettings(),
    getRelated(product.id, product.category.id, 4),
  ]);

  const off = discountPercent(product.price, product.compareAtPrice);
  const url = absoluteUrl(`/products/${product.slug}`);
  const inStock =
    product.variants.length > 0
      ? product.variants.some((v) => v.stock > 0)
      : product.stock > 0;

  const specs: [string, string][] = [
    ["Purity", PURITY_LABEL[product.purity]],
    ...(settings.catalog.showWeight && product.weightG
      ? ([["Weight", `${product.weightG} g (approx.)`]] as [string, string][])
      : []),
    ["Hallmark", product.hallmarked ? `BIS hallmarked${product.huid ? ` · ${product.huid}` : ""}` : "Tested in our shop"],
    ["Item code", product.sku],
    ["Category", product.category.name],
  ];

  /* Product schema — how the listing gets a price and rating in Google. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDesc ?? product.description ?? undefined,
    sku: product.sku,
    image: product.images.map((i) => imageUrl(i.publicId, "detail")),
    brand: { "@type": "Brand", name: settings.store.name },
    material: PURITY_LABEL[product.purity],
    ...(product.weightG
      ? { weight: { "@type": "QuantitativeValue", value: product.weightG, unitCode: "GRM" } }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: (product.price / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.ratingAvg
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.ratingAvg.toFixed(1),
            reviewCount: product.ratingCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-page py-6">
        <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="px-1.5" aria-hidden>/</span>
          <Link href={`/categories/${product.category.slug}`} className="hover:text-ink">
            {product.category.name}
          </Link>
          <span className="px-1.5" aria-hidden>/</span>
          <span className="text-ink">{product.title}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductGallery images={product.images} title={product.title} />
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {product.hallmarked ? <Badge tone="gold">BIS Hallmark</Badge> : null}
              {off > 0 ? <Badge tone="solid">{off}% off</Badge> : null}
              {product.breakdown.isLive ? (
                <Badge tone="neutral">Priced on today&apos;s silver rate</Badge>
              ) : null}
            </div>

            <h1 className="mt-3 font-display text-[clamp(1.7rem,4.5vw,2.4rem)] leading-tight text-ink">
              {product.title}
            </h1>
            {product.titleBn ? (
              <p className="bangla mt-1 text-lg text-muted">{product.titleBn}</p>
            ) : null}

            {product.ratingAvg ? (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-gold" aria-hidden>
                  {"★".repeat(Math.round(product.ratingAvg))}
                </span>
                <span className="text-muted">
                  {product.ratingAvg.toFixed(1)} from {product.ratingCount}{" "}
                  {product.ratingCount === 1 ? "review" : "reviews"}
                </span>
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-baseline gap-3 tnum">
              <span className="font-display text-3xl text-ink">{formatPaise(product.price)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price ? (
                <span className="text-lg text-muted line-through">
                  {formatPaise(product.compareAtPrice)}
                </span>
              ) : null}
              <span className="text-[13px] text-muted">
                {settings.tax.gstEnabled
                  ? settings.tax.pricesIncludeGst
                    ? "Inclusive of GST"
                    : `+ ${settings.tax.ratePercent}% GST at checkout`
                  : "No GST applicable"}
              </span>
            </div>

            {product.breakdown.isLive ? (
              <p className="mt-2 text-[13px] text-muted">
                {formatPaise(product.breakdown.metalValue)} metal +{" "}
                {formatPaise(product.breakdown.makingValue)} making. This price moves with the
                silver rate and is locked the moment you order.
              </p>
            ) : null}

            {product.shortDesc ? (
              <p className="mt-5 text-[15px] leading-relaxed text-ink-2">{product.shortDesc}</p>
            ) : null}

            <div className="mt-7">
              <BuyBox
                productId={product.id}
                productTitle={product.title}
                basePrice={product.price}
                variants={product.variants.map((v) => ({
                  id: v.id,
                  label: v.label,
                  stock: v.stock,
                  priceDelta: v.priceDelta,
                }))}
                stock={product.stock}
                whatsapp={settings.store.whatsapp}
                productUrl={url}
              />
            </div>

            <div className="mt-4">
              <WishlistButton
                productId={product.id}
                productTitle={product.title}
                variant="full"
                className="w-full sm:w-auto"
              />
            </div>

            <div className="mt-7">
              <PincodeCheck
                dispatchDays={settings.shipping.dispatchDays}
                deliveryDays={settings.shipping.deliveryDays}
                freeAboveLabel={
                  settings.shipping.freeAbove ? formatPaise(settings.shipping.freeAbove) : null
                }
              />
            </div>

            <dl className="mt-8 divide-y divide-line border-y border-line">
              {specs.map(([label, value]) => (
                <div key={label} className="flex gap-4 py-3 text-[14.5px]">
                  <dt className="w-32 shrink-0 text-muted">{label}</dt>
                  <dd className="text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {product.description ? (
              <section className="mt-8">
                <h2 className="font-display text-xl text-ink">About this piece</h2>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">
                  {product.description}
                </p>
              </section>
            ) : null}

            <section className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <h2 className="font-display text-lg text-ink">Care and returns</h2>
              <ul className="mt-3 grid gap-2 text-[14.5px] text-ink-2">
                <li>{settings.returns.windowDays}-day returns, unworn and in its box.</li>
                <li>{settings.returns.buyback}</li>
                <li>Cannot be returned: {settings.returns.nonReturnable.toLowerCase()}.</li>
                <li>Store in the pouch provided; keep away from perfume and chlorine.</li>
              </ul>
            </section>
          </div>
        </div>

        {product.reviews.length > 0 ? (
          <section className="mt-16">
            <SectionHeading eyebrow="Verified buyers" title="Reviews" />
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.reviews.map((r) => (
                <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                  <div className="text-gold" aria-label={`${r.rating} out of 5`}>
                    {"★".repeat(r.rating)}
                    <span className="opacity-25">{"★".repeat(5 - r.rating)}</span>
                  </div>
                  {r.title ? <p className="mt-2 font-medium text-ink">{r.title}</p> : null}
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{r.body}</p>
                  <p className="mt-3 text-[13px] text-muted">
                    {r.user.name ?? "A customer"} · {r.createdAt.toLocaleDateString("en-IN")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-16">
            <SectionHeading
              eyebrow="More from this category"
              title="You may also like"
              href={`/categories/${product.category.slug}`}
            />
            <Reveal className="mt-6">
              <ProductGrid products={related} />
            </Reveal>
          </section>
        ) : null}
      </div>
    </>
  );
}
