import type { Metadata } from "next";

import { db } from "@/lib/db";
import { devFallback } from "@/lib/demo/fallback";
import { getSettings } from "@/lib/settings";
import {
  getCategoryShelves,
  getShelf,
  listCategories,
  listCollections,
} from "@/lib/queries/catalog";
import {
  CategoryRail,
  CollectionBanners,
  MadeToOrderBand,
  ProductRail,
  CategoryShelves,
  PromiseBand,
  SectionHeading,
  ShopByPrice,
  StoryStrip,
  Testimonials,
} from "@/components/storefront/sections";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/hero-carousel";
import { StoreSchema } from "@/components/storefront/store-schema";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  description:
    "Handmade 925 silver earrings, rings, chains, bracelets, payel, toe rings and baby sets — made in Tufanganj, Coochbehar and shipped across India.",
  alternates: { canonical: "/" },
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

/**
 * Hero slides, from the database.
 *
 * These were a hardcoded buildSlides() function here, which meant Rahul could
 * not change a word of his own front page without a deploy. They are rows now,
 * editable at /admin/homepage.
 *
 * An empty table hides the carousel rather than showing a blank one — the rest
 * of the page stands on its own, and a half-drawn hero looks broken in a way
 * that no hero does not.
 */
async function getHeroSlides(): Promise<HeroSlide[]> {
  const rows = await devFallback(
    () =>
      db.heroSlide.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          eyebrow: true,
          title: true,
          titleAccent: true,
          body: true,
          ctaLabel: true,
          ctaHref: true,
          secondaryLabel: true,
          secondaryHref: true,
          imagePublicId: true,
        },
      }),
    () => [],
  );

  return rows.map((r) => ({
    id: r.id,
    eyebrow: r.eyebrow ?? "",
    title: r.title,
    titleAccent: r.titleAccent ?? undefined,
    body: r.body ?? "",
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
    secondaryLabel: r.secondaryLabel ?? undefined,
    secondaryHref: r.secondaryHref ?? undefined,
    image: r.imagePublicId,
  }));
}

export default async function HomePage() {
  const [settings, categories, collections, trending, featured, fresh, testimonials, slides, shelves] =
    await Promise.all([
      getSettings(),
      listCategories(),
      listCollections(),
      getShelf("trending", 8),
      getShelf("featured", 8),
      getShelf("new", 8),
      getTestimonials(),
      getHeroSlides(),
      getCategoryShelves(4, 8),
    ]);

  // Every claim here is a setting, so the band cannot quietly go stale when the
  // owner changes the free-delivery threshold or switches COD off.
  const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
  const promise = [
    { label: "925 Sterling", detail: "Every piece, hallmarked where it is marked" },
    { label: "Made by hand", detail: `On our own bench in ${settings.store.city || "Tufanganj"}` },
    settings.shipping.freeAbove
      ? {
          label: "Free delivery",
          detail: `On orders above ${rupees(settings.shipping.freeAbove)}`,
        }
      : { label: "All India delivery", detail: settings.shipping.deliveryDays },
    {
      label: `${settings.returns.windowDays}-day exchange`,
      detail: settings.returns.buyback || "Exchange at the shop",
    },
    settings.payments.codEnabled
      ? { label: "Cash on delivery", detail: "Pay when the parcel reaches you" }
      : { label: "UPI and cards", detail: "Paid securely before dispatch" },
  ];

  // Named explicitly rather than "the first four": these are the ones with a
  // banner image, in the order they should read.
  const BANNER_SLUGS = ["under-999", "lightweight", "traditional", "festive"];
  const banners = BANNER_SLUGS.map((slug) => collections.find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );

  return (
    <>
      <StoreSchema />

      {slides.length > 0 ? <HeroCarousel slides={slides} /> : null}

      <section className="container-page py-12" aria-labelledby="categories-heading">
        <SectionHeading
          eyebrow="Shop by category"
          title="What are you looking for?"
          href="/collections/all"
          hrefLabel="See everything"
        />
        <h2 id="categories-heading" className="sr-only">Categories</h2>
        <Reveal className="mt-6">
          <CategoryRail
            categories={categories.map((c) => ({
              slug: c.slug,
              name: c.name,
              nameBn: c.nameBn,
              imagePublicId: c.imagePublicId,
            }))}
          />
        </Reveal>
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

      <PromiseBand facts={promise} />

      <section className="container-page py-12">
        <SectionHeading eyebrow="Whatever you have in mind" title="Shop by price" />
        <Reveal className="mt-6">
          <ShopByPrice />
        </Reveal>
      </section>

      {banners.length > 0 ? (
        <section className="container-page pb-12">
          <div className="rule-diamond mb-12" />
          <CollectionBanners collections={banners} />
        </section>
      ) : null}

      <CategoryShelves shelves={shelves} />

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

      <MadeToOrderBand whatsapp={settings.store.whatsapp} />

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

      <StoryStrip storeName={settings.store.name} city={settings.store.city} />

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
