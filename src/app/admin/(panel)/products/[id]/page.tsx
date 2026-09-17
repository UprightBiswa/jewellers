import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/money";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { ProductDangerZone } from "@/components/admin/product-danger-zone";

export const metadata: Metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

const rupees = (paise: number | null | undefined) =>
  paise === null || paise === undefined ? "" : String(paiseToRupees(paise));

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, collections] = await Promise.all([
    db.product.findUnique({
      where: { id },
      select: {
        id: true, title: true, titleBn: true, slug: true, shortDesc: true, description: true,
        categoryId: true, status: true, purity: true, priceMode: true,
        price: true, compareAtPrice: true, makingCharge: true, weightG: true,
        stock: true, hallmarked: true, huid: true,
        isFeatured: true, isTrending: true, isNewArrival: true, tags: true,
        images: {
          select: { publicId: true, url: true, alt: true, width: true, height: true },
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          select: { id: true, label: true, stock: true, priceDelta: true },
          orderBy: { sortOrder: "asc" },
        },
        collections: { select: { collectionId: true } },
        _count: { select: { orderItems: true } },
      },
    }),
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

  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    title: product.title,
    titleBn: product.titleBn ?? "",
    categoryId: product.categoryId,
    shortDesc: product.shortDesc ?? "",
    description: product.description ?? "",
    status: product.status,
    purity: product.purity,
    priceMode: product.priceMode,
    priceRupees: rupees(product.price),
    compareAtRupees: rupees(product.compareAtPrice),
    makingChargeRupees: rupees(product.makingCharge),
    weightG: product.weightG ? String(Number(product.weightG)) : "",
    stock: String(product.stock),
    hallmarked: product.hallmarked,
    huid: product.huid ?? "",
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isNewArrival: product.isNewArrival,
    tags: product.tags.join(", "),
    images: product.images.map((i) => ({
      publicId: i.publicId,
      url: i.url,
      alt: i.alt ?? "",
      width: i.width ?? undefined,
      height: i.height ?? undefined,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      stock: String(v.stock),
      priceDelta: String(paiseToRupees(v.priceDelta)),
    })),
    collectionIds: product.collections.map((c) => c.collectionId),
  };

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

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-ink">{product.title}</h1>
          {product.status === "ACTIVE" ? (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline"
            >
              See it on the shop
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      <ProductForm initial={initial} categories={categories} collections={collections} />

      <ProductDangerZone
        productId={product.id}
        title={product.title}
        status={product.status}
        timesOrdered={product._count.orderItems}
      />
    </div>
  );
}
