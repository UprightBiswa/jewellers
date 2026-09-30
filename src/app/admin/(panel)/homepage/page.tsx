import type { Metadata } from "next";

import { db } from "@/lib/db";
import { HeroManager, type SlideRow } from "@/components/admin/hero-manager";

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

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Front page</h1>
        <p className="text-sm text-muted">
          The big pictures at the top of the shop. Change them for the season — they go live as soon
          as you save.
        </p>
      </header>

      <HeroManager slides={slides} />
    </div>
  );
}
