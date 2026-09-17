import type { ProductCard } from "@/lib/queries/catalog";
import type { Settings } from "@/lib/settings";
import { CATEGORIES, COLLECTIONS, PAGES, PRODUCTS, STORE } from "./catalogue";

/**
 * Preview data.
 *
 * Derived from the same catalogue the seed writes, so the preview and the real
 * shop can never drift apart. Used ONLY in development, and only when the
 * database cannot be reached — see `devFallback` in ./fallback.ts, which refuses
 * to run when NODE_ENV is production.
 */

const paise = (rupees: number) => Math.round(rupees * 100);

const productsPerCategory = (slug: string) =>
  PRODUCTS.filter((p) => p.category === slug).length;

export const DEMO_CATEGORIES = CATEGORIES.map((c) => ({
  id: `demo-cat-${c.slug}`,
  slug: c.slug,
  name: c.name,
  nameBn: c.nameBn,
  imagePublicId: `demo/categories/${c.slug}`,
  count: productsPerCategory(c.slug),
}));

export const DEMO_COLLECTIONS = COLLECTIONS.map((c) => ({
  id: `demo-col-${c.slug}`,
  slug: c.slug,
  name: c.name,
  subtitle: c.subtitle,
  bannerPublicId: `demo/collections/${c.slug}`,
}));

type DemoCard = ProductCard & { shelves: string[]; collections: string[] };

export const DEMO_PRODUCTS: DemoCard[] = PRODUCTS.map((p) => {
  const category = CATEGORIES.find((c) => c.slug === p.category);

  const shelves: string[] = [];
  if (p.featured) shelves.push("featured");
  if (p.trending) shelves.push("trending");
  if (p.newArrival) shelves.push("new");

  return {
    id: `demo-${p.slug}`,
    slug: p.slug,
    title: p.title,
    titleBn: p.titleBn ?? null,
    shortDesc: p.shortDesc,
    price: paise(p.price),
    compareAtPrice: p.compareAt ? paise(p.compareAt) : null,
    purity: p.purity ?? "S925",
    weightG: p.weightG,
    hallmarked: p.hallmarked ?? false,
    isLivePrice: false,
    image: `demo/products/${p.slug}-1`,
    imageAlt: p.title,
    secondImage: `demo/products/${p.slug}-2`,
    categorySlug: p.category,
    categoryName: category?.name ?? "Silver",
    inStock: true,
    tags: p.tags,
    shelves,
    collections: p.collections,
  };
});

export function demoShelf(kind: "featured" | "trending" | "new", take = 8): ProductCard[] {
  return DEMO_PRODUCTS.filter((p) => p.shelves.includes(kind)).slice(0, take);
}

export function demoList(args: {
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  limit?: number;
}): ProductCard[] {
  let list: DemoCard[] = DEMO_PRODUCTS;

  if (args.categorySlug) list = list.filter((p) => p.categorySlug === args.categorySlug);
  if (args.collectionSlug) {
    const slug = args.collectionSlug;
    list = list.filter((p) => p.collections.includes(slug));
  }
  if (args.q) {
    const q = args.q.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.shortDesc?.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q)),
    );
  }

  return list.slice(0, args.limit ?? 24);
}

export const DEMO_SETTINGS: Partial<Settings> = {
  store: {
    name: STORE.name,
    tagline: STORE.tagline,
    email: STORE.email,
    phone: STORE.phone,
    whatsapp: STORE.whatsapp,
    addressLines: [...STORE.addressLines],
    city: STORE.city,
    state: STORE.state,
    pincode: STORE.pincode,
    mapUrl: "",
    sinceYear: STORE.sinceYear,
  },
  tax: { gstEnabled: false, gstin: "", ratePercent: 0, pricesIncludeGst: true },
  shipping: {
    flatFee: paise(60),
    freeAbove: paise(1500),
    dispatchDays: "1–2 working days",
    deliveryDays: "3–6 working days",
    shipsTo: "All India by Delhivery · same-day in Tufanganj and Coochbehar",
  },
  returns: {
    windowDays: 7,
    buyback: "Exchange for any other piece within 7 days",
    nonReturnable: "Made-to-order, custom-size and engraved pieces",
  },
  announcements: [
    "20% off your first order — code WELCOME20",
    "Handmade in Tufanganj since 2018",
    `Order on WhatsApp: ${STORE.phone}`,
  ],
  catalog: {
    defaultPriceMode: "FIXED",
    lowStockThreshold: 2,
    showWeight: false,
    showPurity: true,
  },
};

export const DEMO_PAGES: Record<string, { title: string; bodyMd: string }> = Object.fromEntries(
  PAGES.map((p) => [p.slug, { title: p.title, bodyMd: p.bodyMd }]),
);
