import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { computePrice } from "@/lib/pricing";
import type { Prisma, Purity } from "@/generated/prisma";

/**
 * Read side of the catalogue.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. Never `include` a whole relation tree — `select` exactly the columns the
 *     surface renders. A product grid that pulls full descriptions and every
 *     variant is the first thing that makes a shop feel slow.
 *  2. Paginate by cursor, never by OFFSET.
 */

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  titleHi: string | null;
  shortDesc: string | null;
  price: number;
  compareAtPrice: number | null;
  purity: Purity;
  weightG: number | null;
  hallmarked: boolean;
  isLivePrice: boolean;
  image: string | null;
  imageAlt: string | null;
  secondImage: string | null;
  categorySlug: string;
  categoryName: string;
  inStock: boolean;
  tags: string[];
};

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  titleHi: true,
  shortDesc: true,
  price: true,
  compareAtPrice: true,
  purity: true,
  priceMode: true,
  weightG: true,
  makingCharge: true,
  makingChargePct: true,
  hallmarked: true,
  stock: true,
  tags: true,
  createdAt: true,
  category: { select: { slug: true, name: true } },
  images: {
    select: { publicId: true, alt: true },
    orderBy: { sortOrder: "asc" },
    take: 2,
  },
  variants: { select: { stock: true }, where: { isActive: true } },
} satisfies Prisma.ProductSelect;

type RawCard = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

/** The silver rate in force right now, in paise per gram of pure metal. */
export const getMetalRate = cache(async (purity: Purity = "S999"): Promise<number | null> => {
  const rate = await db.metalRate.findFirst({
    where: { metal: "SILVER", purity, effectiveFrom: { lte: new Date() } },
    orderBy: { effectiveFrom: "desc" },
    select: { ratePerGram: true },
  });
  return rate?.ratePerGram ?? null;
});

function toCard(p: RawCard, ratePerGram: number | null): ProductCard {
  const weightG = p.weightG ? Number(p.weightG) : null;

  const { total, isLive } = computePrice({
    priceMode: p.priceMode,
    price: p.price,
    purity: p.purity,
    weightG,
    makingCharge: p.makingCharge,
    makingChargePct: p.makingChargePct ? Number(p.makingChargePct) : null,
    ratePerGram,
  });

  const variantStock = p.variants.reduce((sum, v) => sum + v.stock, 0);

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    titleHi: p.titleHi,
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
}

export type SortKey = "newest" | "price-asc" | "price-desc" | "popular";

const ORDER_BY: Record<SortKey, Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "desc" }],
  "price-asc": [{ price: "asc" }, { id: "desc" }],
  "price-desc": [{ price: "desc" }, { id: "desc" }],
  popular: [{ viewCount: "desc" }, { id: "desc" }],
};

export type ListProductsArgs = {
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  purity?: Purity[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: SortKey;
  cursor?: string | null;
  limit?: number;
};

export async function listProducts(args: ListProductsArgs = {}) {
  const limit = Math.min(Math.max(args.limit ?? 24, 1), 60);
  const sort = args.sort ?? "newest";

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(args.categorySlug ? { category: { slug: args.categorySlug } } : {}),
    ...(args.collectionSlug
      ? { collections: { some: { collection: { slug: args.collectionSlug } } } }
      : {}),
    ...(args.purity?.length ? { purity: { in: args.purity } } : {}),
    ...(args.minPrice !== undefined || args.maxPrice !== undefined
      ? { price: { gte: args.minPrice, lte: args.maxPrice } }
      : {}),
    ...(args.q
      ? {
          OR: [
            { title: { contains: args.q, mode: "insensitive" } },
            { shortDesc: { contains: args.q, mode: "insensitive" } },
            { tags: { has: args.q.toLowerCase() } },
            { sku: { contains: args.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Fetch one extra row: its presence is how we know there is a next page
  // without a second COUNT query.
  const rows = await db.product.findMany({
    where,
    select: cardSelect,
    orderBy: ORDER_BY[sort],
    take: limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const rate = await getMetalRate();

  return {
    products: page.map((p) => toCard(p, rate)),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

/** Homepage rails. One query each, small takes, no descriptions. */
export async function getShelf(
  kind: "featured" | "trending" | "new",
  take = 8,
): Promise<ProductCard[]> {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(kind === "featured" ? { isFeatured: true } : {}),
    ...(kind === "trending" ? { isTrending: true } : {}),
    ...(kind === "new" ? { isNewArrival: true } : {}),
  };

  const [rows, rate] = await Promise.all([
    db.product.findMany({
      where,
      select: cardSelect,
      orderBy: { createdAt: "desc" },
      take,
    }),
    getMetalRate(),
  ]);

  return rows.map((p) => toCard(p, rate));
}

export const getProductBySlug = cache(async (slug: string) => {
  const product = await db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    select: {
      ...cardSelect,
      sku: true,
      description: true,
      huid: true,
      metaTitle: true,
      metaDescription: true,
      priceMode: true,
      images: {
        select: { id: true, publicId: true, alt: true, width: true, height: true },
        orderBy: { sortOrder: "asc" },
      },
      variants: {
        where: { isActive: true },
        select: { id: true, label: true, sku: true, stock: true, priceDelta: true, weightG: true },
        orderBy: { sortOrder: "asc" },
      },
      category: { select: { id: true, slug: true, name: true, nameHi: true } },
      reviews: {
        where: { status: "APPROVED" },
        select: {
          id: true, rating: true, title: true, body: true, createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) return null;

  const rate = await getMetalRate();
  const weightG = product.weightG ? Number(product.weightG) : null;

  const breakdown = computePrice({
    priceMode: product.priceMode,
    price: product.price,
    purity: product.purity,
    weightG,
    makingCharge: product.makingCharge,
    makingChargePct: product.makingChargePct ? Number(product.makingChargePct) : null,
    ratePerGram: rate,
  });

  const ratingCount = product.reviews.length;
  const ratingAvg =
    ratingCount > 0
      ? product.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount
      : null;

  return {
    ...product,
    weightG,
    price: breakdown.total,
    breakdown,
    variants: product.variants.map((v) => ({
      ...v,
      weightG: v.weightG ? Number(v.weightG) : null,
    })),
    ratingAvg,
    ratingCount,
  };
});

export const listCategories = cache(async () => {
  return db.category.findMany({
    where: { isActive: true },
    select: {
      id: true, slug: true, name: true, nameHi: true, imagePublicId: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });
});

export const listCollections = cache(async () => {
  return db.collection.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true, subtitle: true, bannerPublicId: true },
    orderBy: { sortOrder: "asc" },
  });
});

export const getCategoryBySlug = cache(async (slug: string) => {
  return db.category.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, nameHi: true, description: true,
      imagePublicId: true, metaTitle: true, metaDescription: true,
    },
  });
});

export const getCollectionBySlug = cache(async (slug: string) => {
  return db.collection.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, subtitle: true, bannerPublicId: true },
  });
});

/** "You may also like" — same category, never the product being viewed. */
export async function getRelated(productId: string, categoryId: string, take = 4) {
  const [rows, rate] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", categoryId, id: { not: productId } },
      select: cardSelect,
      orderBy: { isFeatured: "desc" },
      take,
    }),
    getMetalRate(),
  ]);
  return rows.map((p) => toCard(p, rate));
}
