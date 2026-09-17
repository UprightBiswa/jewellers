import type { Metadata } from "next";

import { db } from "@/lib/db";
import { devFallback } from "@/lib/demo/fallback";
import { getSettings } from "@/lib/settings";
import { getShelf, listCategories, listCollections } from "@/lib/queries/catalog";
import {
  CategoryRail,
  CollectionBanners,
  MadeToOrderBand,
  ProductRail,
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
 * Hero slides.
 *
 * Hardcoded for now, but every field is the shape a `HomeSection` row will take
 * when the owner edits these himself — so moving to database-driven slides is a
 * change to this function, not to the carousel.
 */
function buildSlides(since: string): HeroSlide[] {
  return [
    {
      id: "handmade",
      eyebrow: "925 Silver · Handmade",
      title: "Silver made by hand,",
      titleAccent: "not by a catalogue.",
      body:
        "Every piece on this site is cut, filed and polished on our own bench in Tufanganj" +
        `${since ? `, as it has been since ${since}` : ""}. Ten new designs every month.`,
      ctaLabel: "Shop all jewellery",
      ctaHref: "/collections/all",
      secondaryLabel: "Under ₹999",
      secondaryHref: "/collections/under-999",
      image: "demo/hero/bench",
    },
    {
      id: "lightweight",
      eyebrow: "Light enough to forget",
      title: "Wear it from morning",
      titleAccent: "to the last bus home.",
      body:
        "Studs, fine chains and plain payel made deliberately light — the pieces you put on " +
        "without thinking and never take off.",
      ctaLabel: "See lightweight pieces",
      ctaHref: "/collections/lightweight",
      image: "demo/hero/lightweight",
    },
    {
      id: "festive",
      eyebrow: "Durga Puja · Lakshmi Puja",
      title: "Jhumka, chandbali,",
      titleAccent: "ghungur payel.",
      body:
        "The traditional shapes, made the traditional way, in time for the season. " +
        "Made to order takes about a week, so start early.",
      ctaLabel: "Festive edit",
      ctaHref: "/collections/festive",
      secondaryLabel: "Traditional",
      secondaryHref: "/collections/traditional",
      image: "demo/hero/festive",
    },
    {
      id: "baby",
      eyebrow: "The first gift",
      title: "Baby silver,",
      titleAccent: "every edge rounded.",
      body:
        "Kara, payel and feeding spoons in 925 silver, finished so there is nothing to catch. " +
        "Boxed together and ready to give.",
      ctaLabel: "Baby sets",
      ctaHref: "/categories/baby-sets",
      image: "demo/hero/baby",
    },
  ];
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

  // Named explicitly rather than "the first four": these are the ones with a
  // banner image, in the order they should read.
  const BANNER_SLUGS = ["under-999", "lightweight", "traditional", "festive"];
  const banners = BANNER_SLUGS.map((slug) => collections.find((c) => c.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );

  return (
    <>
      <StoreSchema />

      <HeroCarousel slides={buildSlides(settings.store.sinceYear)} />

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
