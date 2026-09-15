import type { ProductCard } from "@/lib/queries/catalog";
import type { Settings } from "@/lib/settings";

/**
 * Preview data.
 *
 * Used ONLY in development, and only when the database cannot be reached, so
 * the storefront can be looked at and shown to a client before any account
 * exists. It is never served in production — see `devFallback` in ./fallback.ts,
 * which refuses to run when NODE_ENV is production.
 *
 * It is a subset of what `prisma/seed.ts` writes, not a second source of truth:
 * once the database is connected, every one of these rows comes from Postgres
 * and is editable in the admin.
 */

const rupees = (n: number) => n * 100;

export const DEMO_CATEGORIES = [
  { id: "d-rings", slug: "rings", name: "Rings", nameHi: "अंगूठी", imagePublicId: "demo/categories/rings", count: 3 },
  { id: "d-anklets", slug: "anklets", name: "Anklets", nameHi: "पायल", imagePublicId: "demo/categories/anklets", count: 2 },
  { id: "d-toe-rings", slug: "toe-rings", name: "Toe Rings", nameHi: "बिछिया", imagePublicId: "demo/categories/toe-rings", count: 1 },
  { id: "d-bracelets", slug: "bracelets", name: "Bracelets", nameHi: "ब्रेसलेट", imagePublicId: "demo/categories/bracelets", count: 1 },
  { id: "d-bangles", slug: "bangles", name: "Bangles & Kada", nameHi: "चूड़ी और कड़ा", imagePublicId: "demo/categories/bangles", count: 1 },
  { id: "d-chains", slug: "chains", name: "Chains", nameHi: "चेन", imagePublicId: "demo/categories/chains", count: 1 },
  { id: "d-pendants", slug: "pendants", name: "Pendants", nameHi: "लॉकेट", imagePublicId: "demo/categories/pendants", count: 2 },
  { id: "d-earrings", slug: "earrings", name: "Earrings", nameHi: "बालियाँ", imagePublicId: "demo/categories/earrings", count: 2 },
  { id: "d-nose-pins", slug: "nose-pins", name: "Nose Pins", nameHi: "नथ", imagePublicId: "demo/categories/nose-pins", count: 1 },
  { id: "d-necklaces", slug: "necklaces", name: "Necklaces", nameHi: "हार", imagePublicId: "demo/categories/necklaces", count: 1 },
  { id: "d-mangalsutra", slug: "mangalsutra", name: "Mangalsutra", nameHi: "मंगलसूत्र", imagePublicId: "demo/categories/mangalsutra", count: 1 },
  { id: "d-waist-chains", slug: "waist-chains", name: "Waist Chains", nameHi: "कमरबंद", imagePublicId: "demo/categories/waist-chains", count: 0 },
  { id: "d-kids", slug: "kids", name: "Kids' Silver", nameHi: "बच्चों की चाँदी", imagePublicId: "demo/categories/kids", count: 1 },
  { id: "d-puja-idols", slug: "puja-idols", name: "Puja & Idols", nameHi: "पूजा और मूर्ति", imagePublicId: "demo/categories/puja-idols", count: 1 },
  { id: "d-rudraksha", slug: "rudraksha-yantra", name: "Rudraksha & Yantra", nameHi: "रुद्राक्ष और यंत्र", imagePublicId: "demo/categories/rudraksha-yantra", count: 0 },
  { id: "d-coins", slug: "silver-coins", name: "Silver Coins", nameHi: "चाँदी के सिक्के", imagePublicId: "demo/categories/silver-coins", count: 1 },
  { id: "d-gift-sets", slug: "gift-sets", name: "Gift Sets", nameHi: "गिफ्ट सेट", imagePublicId: "demo/categories/gift-sets", count: 1 },
];

export const DEMO_COLLECTIONS = [
  { id: "c-new", slug: "new-arrivals", name: "New Arrivals", subtitle: "Fresh off the bench", bannerPublicId: "demo/collections/new-arrivals" },
  { id: "c-best", slug: "best-sellers", name: "Best Sellers", subtitle: "What everyone is buying", bannerPublicId: "demo/collections/best-sellers" },
  { id: "c-999", slug: "under-999", name: "Under ₹999", subtitle: "Everyday silver, easy on the pocket", bannerPublicId: "demo/collections/under-999" },
  { id: "c-1999", slug: "under-1999", name: "Under ₹1,999", subtitle: "A little something special", bannerPublicId: "demo/collections/under-1999" },
  { id: "c-festive", slug: "festive", name: "Festive Edit", subtitle: "Diwali, Karwa Chauth and wedding season", bannerPublicId: "demo/collections/festive" },
  { id: "c-oxidised", slug: "oxidised", name: "Oxidised Edit", subtitle: "Antique finish, tribal motifs", bannerPublicId: "demo/collections/oxidised" },
  { id: "c-gifting", slug: "gifting", name: "Gifting", subtitle: "Boxed and ready to give", bannerPublicId: "demo/collections/gifting" },
];

type DemoSeed = {
  slug: string;
  title: string;
  titleHi?: string;
  shortDesc: string;
  price: number;
  compareAt?: number;
  weightG: number;
  purity?: ProductCard["purity"];
  hallmarked?: boolean;
  category: string;
  tags: string[];
  shelves: ("featured" | "trending" | "new")[];
  collections: string[];
};

const SEEDS: DemoSeed[] = [
  { slug: "oxidised-peacock-ring", title: "Oxidised Peacock Ring", titleHi: "ऑक्सीडाइज़्ड मोर अंगूठी",
    shortDesc: "Hand-carved peacock motif with an antique finish.", price: 849, compareAt: 1299,
    weightG: 4.2, purity: "OXIDISED", category: "rings", tags: ["oxidised", "tribal"],
    shelves: ["trending", "new"], collections: ["oxidised", "under-999", "new-arrivals"] },

  { slug: "classic-925-band-ring", title: "Classic 925 Band",
    shortDesc: "A plain polished band that goes with everything.", price: 649,
    weightG: 3.1, hallmarked: true, category: "rings", tags: ["minimal", "unisex"],
    shelves: ["featured"], collections: ["best-sellers", "under-999"] },

  { slug: "adjustable-toe-ring-pair", title: "Adjustable Bichhiya Pair", titleHi: "बिछिया जोड़ी",
    shortDesc: "Traditional pair, adjustable — no size needed.", price: 549, compareAt: 799,
    weightG: 5.6, category: "toe-rings", tags: ["traditional", "pair"],
    shelves: ["trending"], collections: ["best-sellers", "under-999"] },

  { slug: "ghungroo-payal-pair", title: "Ghungroo Payal", titleHi: "घुँघरू पायल",
    shortDesc: "Twenty-four tiny bells on a flat chain.", price: 1899, compareAt: 2499,
    weightG: 22.4, hallmarked: true, category: "anklets", tags: ["traditional", "festive"],
    shelves: ["featured"], collections: ["best-sellers", "festive", "under-1999"] },

  { slug: "plain-silver-payal", title: "Everyday Plain Payal",
    shortDesc: "Quiet, flat and light enough to forget you're wearing it.", price: 1299,
    weightG: 16.8, category: "anklets", tags: ["minimal", "daily wear"],
    shelves: [], collections: ["under-1999"] },

  { slug: "kundan-jhumka-earrings", title: "Kundan Jhumka", titleHi: "कुंदन झुमका",
    shortDesc: "Oxidised dome with kundan stones and pearl drops.", price: 2299, compareAt: 2999,
    weightG: 12.2, purity: "OXIDISED", category: "earrings", tags: ["festive", "wedding"],
    shelves: ["featured", "trending"], collections: ["festive", "oxidised", "best-sellers"] },

  { slug: "sterling-stud-set", title: "Everyday Stud Set",
    shortDesc: "Three pairs — plain, cz and tiny hoop.", price: 749, compareAt: 999,
    weightG: 2.4, hallmarked: true, category: "earrings", tags: ["gifting", "set"],
    shelves: ["new"], collections: ["gifting", "under-999", "new-arrivals"] },

  { slug: "om-pendant-925", title: "Om Pendant", titleHi: "ॐ लॉकेट",
    shortDesc: "Clean-cut Om in polished sterling.", price: 899,
    weightG: 5.8, hallmarked: true, category: "pendants", tags: ["spiritual", "gifting"],
    shelves: ["featured"], collections: ["best-sellers", "under-999", "gifting"] },

  { slug: "evil-eye-pendant", title: "Evil Eye Pendant",
    shortDesc: "Blue enamel eye on a fine sterling bezel.", price: 699, compareAt: 999,
    weightG: 3.2, category: "pendants", tags: ["daily wear", "layering"],
    shelves: ["trending", "new"], collections: ["new-arrivals", "under-999"] },

  { slug: "rope-chain-20-inch", title: "Rope Chain, 20 inch",
    shortDesc: "A solid rope chain that holds a heavy pendant.", price: 1599,
    weightG: 14.6, hallmarked: true, category: "chains", tags: ["unisex", "chain"],
    shelves: [], collections: ["best-sellers", "under-1999"] },

  { slug: "oxidised-kada-mens", title: "Oxidised Kada", titleHi: "कड़ा",
    shortDesc: "Broad tribal kada with a hammered face.", price: 2899,
    weightG: 38.4, purity: "OXIDISED", category: "bangles", tags: ["men", "tribal"],
    shelves: ["trending"], collections: ["oxidised"] },

  { slug: "charm-bracelet-925", title: "Charm Bracelet",
    shortDesc: "Five charms on an adjustable sterling chain.", price: 1499, compareAt: 1999,
    weightG: 11.4, category: "bracelets", tags: ["gifting", "adjustable"],
    shelves: ["new"], collections: ["gifting", "new-arrivals", "under-1999"] },

  { slug: "nose-pin-cz-925", title: "CZ Nose Pin", titleHi: "नथ",
    shortDesc: "2mm cubic zirconia on a screw post.", price: 349,
    weightG: 0.6, category: "nose-pins", tags: ["daily wear", "minimal"],
    shelves: ["trending"], collections: ["under-999", "best-sellers"] },

  { slug: "black-bead-mangalsutra", title: "Black Bead Mangalsutra", titleHi: "मंगलसूत्र",
    shortDesc: "Short daily-wear style, 18 inch.", price: 2699, compareAt: 3499,
    weightG: 19.8, hallmarked: true, category: "mangalsutra", tags: ["traditional", "wedding"],
    shelves: ["featured"], collections: ["festive", "best-sellers"] },

  { slug: "oxidised-layered-necklace", title: "Oxidised Layered Necklace",
    shortDesc: "Three tiers of coin-drop chain.", price: 1799, compareAt: 2399,
    weightG: 24.6, purity: "OXIDISED", category: "necklaces", tags: ["oxidised", "festive"],
    shelves: ["trending", "new"], collections: ["oxidised", "new-arrivals", "under-1999"] },

  { slug: "baby-kada-pair", title: "Baby Kada Pair",
    shortDesc: "Smooth-edged pair for a newborn.", price: 1749,
    weightG: 18.2, hallmarked: true, category: "kids", tags: ["kids", "gifting"],
    shelves: [], collections: ["gifting", "under-1999"] },

  { slug: "laddu-gopal-idol-small", title: "Laddu Gopal Idol, 2 inch",
    shortDesc: "999 fine silver, two inches, solid cast.", price: 3299,
    weightG: 34.6, purity: "S999", category: "puja-idols", tags: ["puja", "gifting"],
    shelves: ["featured"], collections: ["gifting"] },

  { slug: "lakshmi-silver-coin-10g", title: "Lakshmi Coin, 10g",
    shortDesc: "999 fine, priced on the day's silver rate.", price: 1249,
    weightG: 10, purity: "S999", category: "silver-coins", tags: ["investment", "dhanteras"],
    shelves: ["featured"], collections: ["gifting", "festive", "under-1999"] },

  { slug: "couple-band-gift-set", title: "Couple Band Gift Set",
    shortDesc: "Two matched bands in a velvet box.", price: 1899, compareAt: 2499,
    weightG: 7.8, hallmarked: true, category: "gift-sets", tags: ["gifting", "couple"],
    shelves: ["new"], collections: ["gifting", "new-arrivals", "under-1999"] },
];

function toCard(s: DemoSeed): ProductCard & { shelves: string[]; collections: string[] } {
  const category = DEMO_CATEGORIES.find((c) => c.slug === s.category);
  return {
    id: `demo-${s.slug}`,
    slug: s.slug,
    title: s.title,
    titleHi: s.titleHi ?? null,
    shortDesc: s.shortDesc,
    price: rupees(s.price),
    compareAtPrice: s.compareAt ? rupees(s.compareAt) : null,
    purity: s.purity ?? "S925",
    weightG: s.weightG,
    hallmarked: s.hallmarked ?? false,
    isLivePrice: false,
    image: `demo/products/${s.slug}-1`,
    imageAlt: s.title,
    secondImage: `demo/products/${s.slug}-2`,
    categorySlug: s.category,
    categoryName: category?.name ?? "Silver",
    inStock: true,
    tags: s.tags,
    shelves: s.shelves,
    collections: s.collections,
  };
}

export const DEMO_PRODUCTS = SEEDS.map(toCard);

export function demoShelf(kind: "featured" | "trending" | "new", take = 8): ProductCard[] {
  return DEMO_PRODUCTS.filter((p) => p.shelves.includes(kind)).slice(0, take);
}

export function demoList(args: {
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  limit?: number;
}): ProductCard[] {
  let list = DEMO_PRODUCTS;

  if (args.categorySlug) list = list.filter((p) => p.categorySlug === args.categorySlug);
  if (args.collectionSlug) list = list.filter((p) => p.collections.includes(args.collectionSlug!));
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
    name: "Rajat Silver Arts",
    tagline: "Handcrafted 925 sterling silver, since 2011",
    email: "orders@example.com",
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    addressLines: ["Shop 14, Johari Bazaar", "Near Hawa Mahal"],
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302003",
    mapUrl: "",
    sinceYear: "2011",
  },
  announcements: [
    "Free delivery on orders above ₹999",
    "BIS hallmarked 925 sterling silver",
    "10% off your first order — code WELCOME10",
  ],
};

export const DEMO_PAGES: Record<string, { title: string; bodyMd: string }> = {
  about: {
    title: "About Us",
    bodyMd:
`We have been making silver in Johari Bazaar, Jaipur, since 2011.

Everything on this website is made on our own bench — cast, filed, set and polished by four people whose names we know. We do not import finished pieces and resell them.

We work in 925 sterling and 999 fine silver. Where a piece is hallmarked, it carries a BIS mark with its HUID.`,
  },
  "shipping-policy": {
    title: "Shipping & Delivery",
    bodyMd:
`We dispatch every order within **1–2 working days**.

Delivery takes **4–7 working days** across India. **Free delivery on orders above ₹999**; below that it is a flat ₹70.

You will get a tracking number by email the moment your order leaves us.`,
  },
  "returns-policy": {
    title: "Returns & Exchange",
    bodyMd:
`You can return any piece within **7 days of delivery**, unworn and in its original box.

**Exchange** is available for life against the day's silver rate.

**What we cannot take back:** engraved pieces, custom sizes, and nose pins.`,
  },
  "privacy-policy": {
    title: "Privacy Policy",
    bodyMd:
`We collect only what we need to send you your order.

**We never see your card details.** Payments run through Razorpay.

We do not sell your data. You can ask us to delete your account at any time.`,
  },
  terms: {
    title: "Terms & Conditions",
    bodyMd:
`All prices are in Indian Rupees and include GST where it applies.

**Handmade variation.** Every piece is made by hand. Weight can vary by up to 5%. This is not a defect.`,
  },
};
