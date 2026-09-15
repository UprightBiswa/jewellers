import type { Metadata } from "next";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getShelf, listCategories, listCollections } from "@/lib/queries/catalog";
import { devFallback } from "@/lib/demo/fallback";
import {
  CategoryRail,
  CollectionBanners,
  Hero,
  ProductRail,
  SectionHeading,
  StoryStrip,
  Testimonials,
} from "@/components/storefront/sections";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  description:
    "Handmade 925 sterling and 999 fine silver — rings, payal, bracelets, pendants, mangalsutra and puja silver. Hallmarked, shipped across India.",
};

// The catalogue changes when the owner publishes, not on every request.
export const revalidate = 300;

async function getTestimonials() {
  // Nice to have, never load-bearing: an empty list just hides the section.
  const reviews = await devFallback(
    () =>
      db.review.findMany({
        where: { status: "APPROVED", rating: { gte: 4 } },
        select: {
          id: true,
          rating: true,
          body: true,
          user: { select: { name: true } },
          product: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    () => [],
  );

  return reviews.map((r) => ({
    id: r.id,
    name: r.user.name ?? "A customer",
    city: "",
    rating: r.rating,
    body: r.body,
    product: r.product.title,
  }));
}

export default async function HomePage() {
  const [settings, categories, collections, trending, featured, fresh, testimonials] =
    await Promise.all([
      getSettings(),
      listCategories(),
      listCollections(),
      getShelf("trending", 8),
      getShelf("featured", 8),
      getShelf("new", 8),
      getTestimonials(),
    ]);

  const banners = collections.filter((c) =>
    ["under-999", "festive", "oxidised", "gifting"].includes(c.slug),
  );

  return (
    <>
      <Hero storeName={settings.store.name} since={settings.store.sinceYear} />

      <section className="container-page py-12" aria-labelledby="categories-heading">
        <SectionHeading
          eyebrow="Shop by category"
          title="What are you looking for?"
          href="/collections/all"
          hrefLabel="See everything"
        />
        <div className="mt-6">
          <CategoryRail
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              nameHi: c.nameHi,
              imagePublicId: c.imagePublicId,
            }))}
          />
        </div>
        <h2 id="categories-heading" className="sr-only">Categories</h2>
      </section>

      {trending.length > 0 ? (
        <section className="container-page py-8">
          <SectionHeading
            eyebrow="Moving fast"
            title="Trending this week"
            href="/collections/best-sellers"
          />
          <Reveal className="mt-6">
            <ProductRail products={trending} />
          </Reveal>
        </section>
      ) : null}

      {banners.length > 0 ? (
        <section className="container-page py-12">
          <div className="rule-diamond mb-12" />
          <CollectionBanners collections={banners} />
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section className="container-page py-8">
          <SectionHeading
            eyebrow="Picked by the shop"
            title="Our own favourites"
            href="/collections/best-sellers"
          />
          <Reveal className="mt-6">
            <ProductRail products={featured} />
          </Reveal>
        </section>
      ) : null}

      <StoryStrip storeName={settings.store.name} city={settings.store.city} />

      {fresh.length > 0 ? (
        <section className="container-page py-12">
          <SectionHeading
            eyebrow="Off the bench"
            title="New arrivals"
            href="/collections/new-arrivals"
          />
          <Reveal className="mt-6">
            <ProductRail products={fresh} />
          </Reveal>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="container-page py-12">
          <SectionHeading eyebrow="In their words" title="What customers say" />
          <Reveal className="mt-6">
            <Testimonials reviews={testimonials} />
          </Reveal>
        </section>
      ) : null}
    </>
  );
}
