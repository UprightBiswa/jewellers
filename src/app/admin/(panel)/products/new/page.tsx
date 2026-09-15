import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { ProductForm, EMPTY_PRODUCT } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Add a product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, collections] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.collection.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All products
        </Link>
        <h1 className="mt-2 font-display text-2xl text-ink">Add a product</h1>
        <p className="text-sm text-muted">
          Photos first, then the price. It takes about two minutes.
        </p>
      </div>

      <ProductForm initial={EMPTY_PRODUCT} categories={categories} collections={collections} />
    </div>
  );
}
