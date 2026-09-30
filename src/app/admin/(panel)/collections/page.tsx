import type { Metadata } from "next";

import { db } from "@/lib/db";
import { CollectionManager, type CollectionRow } from "@/components/admin/collection-manager";

export const metadata: Metadata = { title: "Collections" };
export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const rows = await db.collection.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      subtitle: true,
      bannerPublicId: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  const collections: CollectionRow[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle,
    bannerPublicId: c.bannerPublicId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count.products,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Collections</h1>
        <p className="text-sm text-muted">
          Shelves on the front page — New arrivals, Under ₹999, Festive. Pieces are added to a
          collection from the product page.
        </p>
      </header>

      <CollectionManager collections={collections} />
    </div>
  );
}
