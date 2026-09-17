import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { computePrice } from "@/lib/pricing";
import { getMetalRate } from "@/lib/queries/catalog";
import { Button } from "@/components/ui/button";
import { ProductGrid } from "@/components/storefront/sections";

export const metadata: Metadata = {
  title: "Saved pieces",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();

  const [saved, rate] = await Promise.all([
    db.wishlistItem.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        product: {
          select: {
            id: true, slug: true, title: true, titleBn: true, shortDesc: true,
            price: true, compareAtPrice: true, purity: true, priceMode: true,
            weightG: true, makingCharge: true, makingChargePct: true,
            hallmarked: true, stock: true, tags: true, status: true,
            category: { select: { slug: true, name: true } },
            images: { select: { publicId: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 2 },
            variants: { select: { stock: true }, where: { isActive: true } },
          },
        },
      },
    }),
    getMetalRate(),
  ]);

  // An archived piece stays in the list but is not shown — the owner may bring
  // it back, and silently deleting someone's saved item is worse than hiding it.
  const products = saved
    .map((s) => s.product)
    .filter((p) => p.status === "ACTIVE")
    .map((p) => {
      const weightG = p.weightG ? Number(p.weightG) : null;
      const { total, isLive } = computePrice({
        priceMode: p.priceMode,
        price: p.price,
        purity: p.purity,
        weightG,
        makingCharge: p.makingCharge,
        makingChargePct: p.makingChargePct ? Number(p.makingChargePct) : null,
        ratePerGram: rate,
      });
      const variantStock = p.variants.reduce((sum, v) => sum + v.stock, 0);

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        titleBn: p.titleBn,
        shortDesc: p.shortDesc,
        price: total,
        compareAtPrice: p.compareAtPrice,
        purity: p.purity,
        weightG,
        hallmarked: p.hallmarked,
        isLivePrice: isLive,
        image: p.images[0]?.publicId ?? null,
        imageAlt: p.images[0]?.alt ?? p.title,
        secondImage: p.images[1]?.publicId ?? null,
        categorySlug: p.category.slug,
        categoryName: p.category.name,
        inStock: p.variants.length > 0 ? variantStock > 0 : p.stock > 0,
        tags: p.tags,
      };
    });

  if (products.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-xl text-ink">Nothing saved yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Tap the heart on any piece to keep it here while you think about it.
        </p>
        <Button asChild className="mt-5">
          <Link href="/collections/all">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="font-display text-lg text-ink">Saved for later</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          {products.length} {products.length === 1 ? "piece" : "pieces"}. Made-to-order items
          can still be made in your size — just ask.
        </p>
      </div>

      <ProductGrid products={products} />
    </div>
  );
}
