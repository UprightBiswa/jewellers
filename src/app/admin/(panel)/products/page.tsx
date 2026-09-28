import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Upload } from "lucide-react";

import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProductList, type ProductRow } from "@/components/admin/product-list";
import type { Prisma } from "@/generated/prisma";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string; q?: string; cursor?: string; category?: string }>;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "On sale" },
  { value: "DRAFT", label: "Drafts" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const PAGE_SIZE = 25;

export default async function AdminProductsPage({ searchParams }: { searchParams: Search }) {
  const { status, q, cursor, category } = await searchParams;

  const where: Prisma.ProductWhereInput = {
    ...(status === "ACTIVE" || status === "DRAFT" || status === "ARCHIVED" ? { status } : {}),
    ...(category ? { category: { slug: category } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Only the columns this table draws — never the descriptions.
  const rows = await db.product.findMany({
    where,
    select: {
      id: true, title: true, sku: true, price: true, status: true, stock: true,
      priceMode: true,
      category: { select: { name: true } },
      images: { select: { publicId: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { select: { stock: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  // For the category filter. Only those that actually hold something, so the
  // list does not fill with empty names after an import creates a few.
  const categories = await db.category.findMany({
    where: { products: { some: {} } },
    select: { slug: true, name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const products = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? products[products.length - 1]?.id : null;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Products</h1>
          <p className="text-sm text-muted">Everything you sell, and everything you are still writing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/products/import">
              <Upload className="size-4" aria-hidden />
              Import a sheet
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" aria-hidden />
              Add a product
            </Link>
          </Button>
        </div>
      </header>

      <form className="flex gap-2" action="/admin/products">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or item code"
          aria-label="Search products"
          className="h-10 flex-1 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
        />
        <Button type="submit" variant="secondary" className="h-10">Search</Button>
      </form>

      <nav className="flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Filter by status">
        {STATUS_TABS.map((tab) => {
          const active = (status ?? "") === tab.value;
          const href = `/admin/products?${new URLSearchParams({
            ...(tab.value ? { status: tab.value } : {}),
            ...(category ? { category } : {}),
            ...(q ? { q } : {}),
          })}`;
          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-on-brand"
                  : "shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-line-strong"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {categories.length > 1 ? (
        <nav className="flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Filter by category">
          {[{ slug: "", name: "Every category", count: 0 }, ...categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            count: c._count.products,
          }))].map((c) => {
            const active = (category ?? "") === c.slug;
            const href = `/admin/products?${new URLSearchParams({
              ...(status ? { status } : {}),
              ...(c.slug ? { category: c.slug } : {}),
              ...(q ? { q } : {}),
            })}`;
            return (
              <Link
                key={c.slug || "all"}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "shrink-0 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-ink ring-1 ring-line-strong"
                    : "shrink-0 rounded-full px-3 py-1 text-[13px] text-muted hover:text-ink"
                }
              >
                {c.name}
                {c.count ? <span className="ms-1 tnum text-muted">{c.count}</span> : null}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {products.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg text-ink">
            {q ? "Nothing matched that" : "No products yet"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {q
              ? "Try the item code, or part of the name."
              : "Take a photo of a piece, add a price, and it is on the shop."}
          </p>
          {!q ? (
            <Button asChild className="mt-5">
              <Link href="/admin/products/new">Add your first product</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ProductList
          products={products.map(
            (p): ProductRow => ({
              id: p.id,
              title: p.title,
              sku: p.sku,
              price: p.price,
              status: p.status,
              priceMode: p.priceMode,
              stock:
                p.variants.length > 0
                  ? p.variants.reduce((sum, v) => sum + v.stock, 0)
                  : p.stock,
              categoryName: p.category.name,
              imagePublicId: p.images[0]?.publicId,
            }),
          )}
        />
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="secondary">
            <Link
              href={`/admin/products?${new URLSearchParams({
                ...(status ? { status } : {}),
                ...(category ? { category } : {}),
                ...(q ? { q } : {}),
                cursor: nextCursor,
              })}`}
            >
              Next {PAGE_SIZE}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
