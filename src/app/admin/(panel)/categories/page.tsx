import type { Metadata } from "next";

import { db } from "@/lib/db";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameBn: true,
      description: true,
      imagePublicId: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  const categories: CategoryRow[] = rows.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameBn: c.nameBn,
    description: c.description,
    imagePublicId: c.imagePublicId,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount: c._count.products,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Categories</h1>
        <p className="text-sm text-muted">
          The groups a customer browses by. The order here is the order on the shop.
        </p>
      </header>

      <CategoryManager categories={categories} />
    </div>
  );
}
