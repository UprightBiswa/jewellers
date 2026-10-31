import type { Metadata } from "next";

import { db } from "@/lib/db";
import { HeroManager, type Destination, type SlideRow } from "@/components/admin/hero-manager";

export const metadata: Metadata = { title: "Front page" };
export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const slides: SlideRow[] = await db.heroSlide.findMany({
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
      sortOrder: true,
      isActive: true,
    },
  });

  /*
   * Everywhere a slide's button can point.
   *
   * It used to be a box to type a path into, and a path typed by hand is a path
   * that can be wrong: "/collections/dhantrass" was saved for a category that
   * lives at "/categories/dhantrass", so the button on the front page led to a
   * 404 and nothing in the admin said so. Chosen from a list, it cannot be.
   *
   * Hidden categories are included — a slide is often built before the category
   * it points at goes live, and leaving them out would make that impossible.
   */
  const [categories, collections] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, isActive: true },
    }),
    db.collection.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, isActive: true },
    }),
  ]);

  const destinations: Destination[] = [
    { href: "/collections/all", label: "All jewellery" },
    { href: "/collections/new-arrivals", label: "New arrivals" },
    ...collections.map((c) => ({
      href: `/collections/${c.slug}`,
      label: c.isActive ? c.name : `${c.name} (hidden)`,
    })),
    ...categories.map((c) => ({
      href: `/categories/${c.slug}`,
      label: c.isActive ? c.name : `${c.name} (hidden)`,
    })),
    { href: "/pages/about", label: "About us" },
    { href: "/contact", label: "Contact & support" },
  ].filter(
    (d, i, all) => all.findIndex((x) => x.href === d.href) === i,
  );

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Front page</h1>
        <p className="text-sm text-muted">
          The big pictures at the top of the shop. Change them for the season — they go live as soon
          as you save.
        </p>
      </header>

      <HeroManager slides={slides} destinations={destinations} />
    </div>
  );
}
