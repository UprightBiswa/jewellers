import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { imageUrl } from "@/lib/images/cloudinary";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { ProductCard } from "./product-card";
import type { ProductCard as Card } from "@/lib/queries/catalog";

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Sized to its content rather than to the viewport, so the first thing below it
 * — the categories — is already visible without scrolling. A 100vh opener on a
 * phone pushes the entire shop off the first screen.
 */
export function Hero({
  storeName,
  since,
  image,
}: {
  storeName: string;
  since?: string;
  image?: string | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold">
            <span className="inline-block size-1.5 rotate-45 bg-gold" aria-hidden />
            925 Sterling &amp; 999 Fine Silver
          </p>

          <h1 className="mt-4 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.08] text-ink">
            Silver made by hand,
            <br />
            <span className="text-brand">not by a catalogue.</span>
          </h1>

          <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-ink-2">
            Every piece on this site is cast, filed and polished on our own bench
            {since ? ` — as it has been since ${since}` : ""}. Hallmarked where marked,
            tested always, and shipped across India in two days.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/collections/all">
                Shop all jewellery
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/collections/under-999">Under ₹999</Link>
            </Button>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ["2 days", "to dispatch"],
              ["7 days", "to return"],
              ["Lifetime", "exchange"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-lg text-ink">{value}</dt>
                <dd className="text-[12.5px] text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] bg-surface-2 md:aspect-square">
          <Image
            src={imageUrl(image ?? "demo/hero/workbench", "banner")}
            alt={`${storeName} workshop`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section heading                                                            */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  href,
  hrefLabel = "View all",
  className,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 font-display text-[clamp(1.5rem,3.5vw,2rem)] text-ink">{title}</h2>
      </div>

      {href ? (
        <Link
          href={href}
          className="group shrink-0 text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          {hrefLabel}
          <ArrowRight className="ml-1 inline size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Category rail                                                              */
/* -------------------------------------------------------------------------- */

export function CategoryRail({
  categories,
}: {
  categories: { slug: string; name: string; nameHi: string | null; imagePublicId: string | null }[];
}) {
  return (
    <ul
      className={cn(
        "no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4",
        "sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6",
      )}
    >
      {categories.map((c) => (
        <li key={c.slug} className="w-28 shrink-0 snap-start sm:w-auto">
          <Link href={`/categories/${c.slug}`} className="group block text-center">
            <div className="relative aspect-square overflow-hidden rounded-full bg-surface-2 ring-1 ring-line transition-[box-shadow,transform] duration-300 group-hover:ring-brand sm:rounded-[var(--radius-card)]">
              <Image
                src={imageUrl(c.imagePublicId ?? `demo/categories/${c.slug}`, "card")}
                alt=""
                fill
                sizes="(max-width: 640px) 112px, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <p className="mt-2.5 text-[13.5px] font-medium text-ink group-hover:text-brand">
              {c.name}
            </p>
            {c.nameHi ? <p className="deva text-[12px] text-muted">{c.nameHi}</p> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* Product rail & grid                                                        */
/* -------------------------------------------------------------------------- */

export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: Card[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}

/** Horizontal on a phone, a grid from small up. No JS — CSS scroll-snap. */
export function ProductRail({ products }: { products: Card[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-4 sm:gap-y-8 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="w-44 shrink-0 snap-start sm:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Collection banners                                                         */
/* -------------------------------------------------------------------------- */

export function CollectionBanners({
  collections,
}: {
  collections: { slug: string; name: string; subtitle: string | null; bannerPublicId: string | null }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c, i) => (
        <Reveal key={c.slug} delay={i * 0.05}>
          <Link
            href={`/collections/${c.slug}`}
            className="group relative block aspect-16/9 overflow-hidden rounded-[var(--radius-card)] bg-surface-2"
          >
            <Image
              src={imageUrl(c.bannerPublicId ?? `demo/collections/${c.slug}`, "banner")}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-xl text-white">{c.name}</h3>
              {c.subtitle ? (
                <p className="mt-0.5 text-[13px] text-white/80">{c.subtitle}</p>
              ) : null}
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Story strip                                                                */
/* -------------------------------------------------------------------------- */

export function StoryStrip({ storeName, city }: { storeName: string; city?: string }) {
  return (
    <section className="border-y border-line bg-surface">
      <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2">
        <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <Image
            src={imageUrl("demo/story/bench", "banner")}
            alt="Silversmith at the bench"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Our workshop</p>
          <h2 className="mt-2 font-display text-[clamp(1.6rem,4vw,2.4rem)] leading-tight text-ink">
            Four people, one bench{city ? `, ${city}` : ""}
          </h2>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-2">
            We do not import finished pieces and put our name on them. Everything here is
            cast, filed, set and polished by people we work beside every day — which is why
            an oxidised finish is never quite identical twice, and why we will happily make
            a ring in a size no chart lists.
          </p>
          <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-2">
            Send a photo on WhatsApp of something you have seen. That is how about half of
            what we make starts.
          </p>

          <Button asChild variant="secondary" className="mt-6">
            <Link href="/pages/about">Read our story</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Testimonials                                                               */
/* -------------------------------------------------------------------------- */

export function Testimonials({
  reviews,
}: {
  reviews: { id: string; name: string; city: string; rating: number; body: string; product: string }[];
}) {
  if (reviews.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
      {reviews.map((r) => (
        <figure
          key={r.id}
          className="w-[78%] shrink-0 snap-start rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:w-auto"
        >
          <div className="flex gap-0.5 text-gold" aria-label={`${r.rating} out of 5`}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} aria-hidden className={i < r.rating ? "opacity-100" : "opacity-25"}>
                ★
              </span>
            ))}
          </div>
          <blockquote className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
            “{r.body}”
          </blockquote>
          <figcaption className="mt-4 border-t border-line pt-3 text-[13px]">
            <span className="font-medium text-ink">{r.name}</span>
            <span className="text-muted"> · {r.city}</span>
            <span className="mt-0.5 block text-muted">bought {r.product}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
