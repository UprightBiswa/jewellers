import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string; q?: string; cursor?: string }>;

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "On sale" },
  { value: "DRAFT", label: "Drafts" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

const PAGE_SIZE = 25;

export default async function AdminProductsPage({ searchParams }: { searchParams: Search }) {
  const { status, q, cursor } = await searchParams;

  const where: Prisma.ProductWhereInput = {
    ...(status === "ACTIVE" || status === "DRAFT" || status === "ARCHIVED" ? { status } : {}),
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
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="size-4" aria-hidden />
            Add a product
          </Link>
        </Button>
      </header>

      <form className="flex gap-2" action="/admin/products">
        {status ? <input type="hidden" name="status" value={status} /> : null}
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
          const href = tab.value ? `/admin/products?status=${tab.value}` : "/admin/products";
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
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {products.map((p) => {
            const stock =
              p.variants.length > 0
                ? p.variants.reduce((sum, v) => sum + v.stock, 0)
                : p.stock;

            return (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={imageUrl(p.images[0]?.publicId, "thumb")}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{p.title}</p>
                    <p className="truncate text-[12.5px] text-muted tnum">
                      {p.sku} · {p.category.name}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold text-ink tnum">
                      {formatPaise(p.price)}
                      {p.priceMode === "WEIGHT" ? (
                        <span className="ml-1 text-[11px] font-normal text-muted">by weight</span>
                      ) : null}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      {p.status !== "ACTIVE" ? (
                        <Badge tone={p.status === "DRAFT" ? "warn" : "neutral"} size="xs">
                          {p.status === "DRAFT" ? "Draft" : "Archived"}
                        </Badge>
                      ) : null}
                      <Badge
                        tone={stock === 0 ? "danger" : stock <= 3 ? "warn" : "neutral"}
                        size="xs"
                      >
                        {stock === 0 ? "Out of stock" : `${stock} in stock`}
                      </Badge>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="secondary">
            <Link
              href={`/admin/products?${new URLSearchParams({
                ...(status ? { status } : {}),
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
