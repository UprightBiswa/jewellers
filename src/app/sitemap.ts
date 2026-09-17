import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { devFallback } from "@/lib/demo/fallback";
import { CATEGORIES, COLLECTIONS, PAGES, PRODUCTS } from "@/lib/demo/catalogue";

export const revalidate = 3600;

const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * The sitemap Google reads.
 *
 * Priorities are honest rather than flattering: products and categories are what
 * people search for, so they rank above the policy pages. Only ACTIVE products
 * appear — a draft is not a page, and submitting one earns a soft 404.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, collections, pages] = await Promise.all([
    devFallback(
      () =>
        db.product.findMany({
          where: { status: "ACTIVE" },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      () => PRODUCTS.map((p) => ({ slug: p.slug, updatedAt: new Date() })),
    ),
    devFallback(
      () =>
        db.category.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
      () => CATEGORIES.map((c) => ({ slug: c.slug, updatedAt: new Date() })),
    ),
    devFallback(
      () =>
        db.collection.findMany({
          where: { isActive: true },
          select: { slug: true, updatedAt: true },
        }),
      () => COLLECTIONS.map((c) => ({ slug: c.slug, updatedAt: new Date() })),
    ),
    devFallback(
      () =>
        db.page.findMany({
          where: { isPublished: true },
          select: { slug: true, updatedAt: true },
        }),
      () => PAGES.map((p) => ({ slug: p.slug, updatedAt: new Date() })),
    ),
  ]);

  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/collections/all`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...categories.map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...collections.map((c) => ({
      url: `${base}/collections/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...pages.map((p) => ({
      url: `${base}/pages/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
