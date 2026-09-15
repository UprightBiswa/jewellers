import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type Purity, type PriceMode } from "../src/generated/prisma/index.js";

/**
 * Demo data for a silver jewellery shop.
 *
 * Everything here is realistic but invented — real categories, real Indian
 * product names, plausible weights and prices — so the owner opens the admin to
 * a working shop he can edit, rather than an empty database he has to imagine
 * his way into. Re-running is safe: every write is an upsert.
 *
 *   npm run db:seed
 */

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const rupees = (n: number) => Math.round(n * 100);

// ---------------------------------------------------------------------------
// Categories — the shape of an Indian silver catalogue
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { slug: "rings", name: "Rings", nameHi: "अंगूठी", sortOrder: 1 },
  { slug: "anklets", name: "Anklets", nameHi: "पायल", sortOrder: 2 },
  { slug: "toe-rings", name: "Toe Rings", nameHi: "बिछिया", sortOrder: 3 },
  { slug: "bracelets", name: "Bracelets", nameHi: "ब्रेसलेट", sortOrder: 4 },
  { slug: "bangles", name: "Bangles & Kada", nameHi: "चूड़ी और कड़ा", sortOrder: 5 },
  { slug: "chains", name: "Chains", nameHi: "चेन", sortOrder: 6 },
  { slug: "pendants", name: "Pendants", nameHi: "लॉकेट", sortOrder: 7 },
  { slug: "earrings", name: "Earrings", nameHi: "बालियाँ", sortOrder: 8 },
  { slug: "nose-pins", name: "Nose Pins", nameHi: "नथ", sortOrder: 9 },
  { slug: "necklaces", name: "Necklaces", nameHi: "हार", sortOrder: 10 },
  { slug: "mangalsutra", name: "Mangalsutra", nameHi: "मंगलसूत्र", sortOrder: 11 },
  { slug: "waist-chains", name: "Waist Chains", nameHi: "कमरबंद", sortOrder: 12 },
  { slug: "kids", name: "Kids' Silver", nameHi: "बच्चों की चाँदी", sortOrder: 13 },
  { slug: "puja-idols", name: "Puja & Idols", nameHi: "पूजा और मूर्ति", sortOrder: 14 },
  { slug: "rudraksha-yantra", name: "Rudraksha & Yantra", nameHi: "रुद्राक्ष और यंत्र", sortOrder: 15 },
  { slug: "silver-coins", name: "Silver Coins", nameHi: "चाँदी के सिक्के", sortOrder: 16 },
  { slug: "gift-sets", name: "Gift Sets", nameHi: "गिफ्ट सेट", sortOrder: 17 },
];

const COLLECTIONS = [
  { slug: "new-arrivals", name: "New Arrivals", subtitle: "Fresh off the bench", sortOrder: 1 },
  { slug: "best-sellers", name: "Best Sellers", subtitle: "What everyone is buying", sortOrder: 2 },
  { slug: "under-999", name: "Under ₹999", subtitle: "Everyday silver, easy on the pocket", sortOrder: 3, kind: "AUTO" as const, rule: { maxPrice: 99900 } },
  { slug: "under-1999", name: "Under ₹1,999", subtitle: "A little something special", sortOrder: 4, kind: "AUTO" as const, rule: { maxPrice: 199900 } },
  { slug: "festive", name: "Festive Edit", subtitle: "Diwali, Karwa Chauth and wedding season", sortOrder: 5 },
  { slug: "oxidised", name: "Oxidised Edit", subtitle: "Antique finish, tribal motifs", sortOrder: 6 },
  { slug: "gifting", name: "Gifting", subtitle: "Boxed and ready to give", sortOrder: 7 },
];

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

type SeedProduct = {
  slug: string;
  title: string;
  titleHi?: string;
  category: string;
  price: number; // rupees, converted below
  compareAt?: number;
  weightG: number;
  purity?: Purity;
  priceMode?: PriceMode;
  stock?: number;
  hallmarked?: boolean;
  shortDesc: string;
  description: string;
  tags: string[];
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  collections?: string[];
  sizes?: string[];
};

const RING_SIZES = ["12", "14", "16", "18", "20", "22"];

const PRODUCTS: SeedProduct[] = [
  {
    slug: "oxidised-peacock-ring",
    title: "Oxidised Peacock Ring",
    titleHi: "ऑक्सीडाइज़्ड मोर अंगूठी",
    category: "rings",
    price: 849, compareAt: 1299, weightG: 4.2, purity: "OXIDISED",
    shortDesc: "Hand-carved peacock motif with an antique finish.",
    description:
      "A peacock in full display, carved by hand into 925 sterling and finished with a deep oxidised patina that settles into the grooves. The antique black sits in the detail and rubs back to bright silver on the raised edges as you wear it.",
    tags: ["oxidised", "tribal", "daily wear"], trending: true, newArrival: true,
    collections: ["oxidised", "under-999", "new-arrivals"], sizes: RING_SIZES,
  },
  {
    slug: "classic-925-band-ring",
    title: "Classic 925 Band",
    category: "rings",
    price: 649, weightG: 3.1, hallmarked: true,
    shortDesc: "A plain polished band that goes with everything.",
    description:
      "Three millimetres of polished 925 sterling, comfort-curved on the inside so it sits flat all day. BIS hallmarked with HUID. The one ring people come back for a second of.",
    tags: ["minimal", "unisex", "hallmarked"], featured: true,
    collections: ["best-sellers", "under-999"], sizes: RING_SIZES,
  },
  {
    slug: "adjustable-toe-ring-pair",
    title: "Adjustable Bichhiya Pair",
    titleHi: "बिछिया जोड़ी",
    category: "toe-rings",
    price: 549, compareAt: 799, weightG: 5.6,
    shortDesc: "Traditional pair, adjustable — no size needed.",
    description:
      "The everyday bichhiya, made in an open adjustable shank so one size fits comfortably. Sold as a pair, in 925 sterling that stands up to daily wear and washing.",
    tags: ["traditional", "pair", "adjustable"], trending: true,
    collections: ["best-sellers", "under-999"],
  },
  {
    slug: "ghungroo-payal-pair",
    title: "Ghungroo Payal",
    titleHi: "घुँघरू पायल",
    category: "anklets",
    price: 1899, compareAt: 2499, weightG: 22.4, hallmarked: true,
    shortDesc: "Twenty-four tiny bells on a flat chain.",
    description:
      "Twenty-four hand-set ghungroo on a flat 925 chain, with a lobster clasp and a two-inch extender so it sits right on most ankles. Sold as a pair. The sound is the point.",
    tags: ["traditional", "pair", "festive"], featured: true,
    collections: ["best-sellers", "festive", "under-1999"],
  },
  {
    slug: "plain-silver-payal",
    title: "Everyday Plain Payal",
    category: "anklets",
    price: 1299, weightG: 16.8,
    shortDesc: "Quiet, flat and light enough to forget you're wearing it.",
    description:
      "No bells, no charms. A flat woven 925 chain with a secure clasp, for wearing under jeans and through a working day.",
    tags: ["minimal", "daily wear", "pair"],
    collections: ["under-1999"],
  },
  {
    slug: "kundan-jhumka-earrings",
    title: "Kundan Jhumka",
    titleHi: "कुंदन झुमका",
    category: "earrings",
    price: 2299, compareAt: 2999, weightG: 12.2, purity: "OXIDISED",
    shortDesc: "Oxidised dome with kundan stones and pearl drops.",
    description:
      "A full jhumka dome in oxidised 925, set with uncut kundan and finished with a fringe of freshwater pearls. Weighted so it hangs straight rather than tipping forward.",
    tags: ["festive", "wedding", "oxidised"], featured: true, trending: true,
    collections: ["festive", "oxidised", "best-sellers"],
  },
  {
    slug: "sterling-stud-set",
    title: "Everyday Stud Set",
    category: "earrings",
    price: 749, compareAt: 999, weightG: 2.4, hallmarked: true,
    shortDesc: "Three pairs — plain, cz and tiny hoop.",
    description:
      "Three pairs of 925 studs in one box: a plain 4mm ball, a 3mm cubic zirconia, and a small hinged hoop. Hypoallergenic posts with silicone backs.",
    tags: ["gifting", "daily wear", "set"], newArrival: true,
    collections: ["gifting", "under-999", "new-arrivals"],
  },
  {
    slug: "om-pendant-925",
    title: "Om Pendant",
    titleHi: "ॐ लॉकेट",
    category: "pendants",
    price: 899, weightG: 5.8, hallmarked: true,
    shortDesc: "Clean-cut Om in polished sterling.",
    description:
      "The Om cut clean from 3mm sterling sheet and polished on both faces, so it reads properly from either side. Comes with a 20 inch box chain.",
    tags: ["spiritual", "gifting", "hallmarked"], featured: true,
    collections: ["best-sellers", "under-999", "gifting"],
  },
  {
    slug: "evil-eye-pendant",
    title: "Evil Eye Pendant",
    category: "pendants",
    price: 699, compareAt: 999, weightG: 3.2,
    shortDesc: "Blue enamel eye on a fine sterling bezel.",
    description:
      "A small blue enamel nazar set in a 925 bezel, on a 45cm cable chain. Light enough to layer with a longer chain.",
    tags: ["daily wear", "layering", "gifting"], trending: true, newArrival: true,
    collections: ["new-arrivals", "under-999"],
  },
  {
    slug: "rope-chain-20-inch",
    title: "Rope Chain, 20 inch",
    category: "chains",
    price: 1599, weightG: 14.6, hallmarked: true,
    shortDesc: "A solid rope chain that holds a heavy pendant.",
    description:
      "3mm solid rope in 925 sterling, 20 inches, with a heavy lobster clasp rated for a full-size pendant. BIS hallmarked with HUID.",
    tags: ["unisex", "hallmarked", "chain"],
    collections: ["best-sellers", "under-1999"],
  },
  {
    slug: "figaro-chain-mens",
    title: "Men's Figaro Chain",
    category: "chains",
    price: 3499, compareAt: 4299, weightG: 32.8, hallmarked: true,
    shortDesc: "Heavy 6mm figaro, 22 inch.",
    description:
      "A proper weight chain — 6mm figaro links in 925 sterling, 22 inches, 32 grams. Double-locking clasp. Hallmarked.",
    tags: ["men", "heavy", "hallmarked"], featured: true,
    collections: ["best-sellers"],
  },
  {
    slug: "oxidised-kada-mens",
    title: "Oxidised Kada",
    titleHi: "कड़ा",
    category: "bangles",
    price: 2899, weightG: 38.4, purity: "OXIDISED",
    shortDesc: "Broad tribal kada with a hammered face.",
    description:
      "A broad open kada in oxidised 925, hammered across the face and left slightly flexible so it opens over the wrist. Sits heavy, which is what a kada should do.",
    tags: ["men", "oxidised", "tribal"], trending: true,
    collections: ["oxidised"],
  },
  {
    slug: "baby-kada-pair",
    title: "Baby Kada Pair",
    category: "kids",
    price: 1749, weightG: 18.2, hallmarked: true,
    shortDesc: "Smooth-edged pair for a newborn.",
    description:
      "A pair of small kada in 925 sterling with fully rounded edges and no clasp to catch. The traditional first gift, sized for six months to two years.",
    tags: ["kids", "gifting", "hallmarked"],
    collections: ["gifting", "under-1999"],
  },
  {
    slug: "nose-pin-cz-925",
    title: "CZ Nose Pin",
    titleHi: "नथ",
    category: "nose-pins",
    price: 349, weightG: 0.6,
    shortDesc: "2mm cubic zirconia on a screw post.",
    description:
      "A single 2mm CZ in a 925 setting on a screw post, so it stays put. The everyday one — buy two, because everyone loses one eventually.",
    tags: ["daily wear", "minimal"], trending: true,
    collections: ["under-999", "best-sellers"],
  },
  {
    slug: "charm-bracelet-925",
    title: "Charm Bracelet",
    category: "bracelets",
    price: 1499, compareAt: 1999, weightG: 11.4,
    shortDesc: "Five charms on an adjustable sterling chain.",
    description:
      "An adjustable 925 chain hung with five charms — heart, star, moon, evil eye and a plain disc you can get engraved. Fits 6 to 8 inches.",
    tags: ["gifting", "adjustable", "layering"], newArrival: true,
    collections: ["gifting", "new-arrivals", "under-1999"],
  },
  {
    slug: "cuban-link-bracelet",
    title: "Cuban Link Bracelet",
    category: "bracelets",
    price: 2199, weightG: 21.6, hallmarked: true,
    shortDesc: "8 inch, 5mm, solid links.",
    description:
      "Solid 5mm cuban links in 925 sterling with a box clasp and safety catch. Eight inches, twenty-one grams.",
    tags: ["men", "heavy", "hallmarked"],
    collections: ["best-sellers"],
  },
  {
    slug: "black-bead-mangalsutra",
    title: "Black Bead Mangalsutra",
    titleHi: "मंगलसूत्र",
    category: "mangalsutra",
    price: 2699, compareAt: 3499, weightG: 19.8, hallmarked: true,
    shortDesc: "Short daily-wear style, 18 inch.",
    description:
      "A short mangalsutra for daily wear: two rows of black beads on 925 sterling with a small vati pendant. Eighteen inches, light enough to sleep in.",
    tags: ["traditional", "daily wear", "wedding"], featured: true,
    collections: ["festive", "best-sellers"],
  },
  {
    slug: "temple-necklace-set",
    title: "Temple Necklace Set",
    category: "necklaces",
    price: 6499, compareAt: 8499, weightG: 62.4, purity: "OXIDISED",
    shortDesc: "Lakshmi motif choker with matching jhumka.",
    description:
      "A South Indian temple set — Lakshmi cast in relief across seven panels, oxidised and hand-finished, with matching jhumka. The piece for a wedding, not a Tuesday.",
    tags: ["wedding", "festive", "set", "oxidised"], featured: true,
    collections: ["festive", "oxidised"],
  },
  {
    slug: "kamarbandh-traditional",
    title: "Traditional Kamarbandh",
    titleHi: "कमरबंद",
    category: "waist-chains",
    price: 4999, weightG: 48.2,
    shortDesc: "Adjustable waist chain with ghungroo fringe.",
    description:
      "A traditional kamarbandh in 925 with a ghungroo fringe and a hook fastening that adjusts across four inches. Made for a saree, worn increasingly with a lehenga.",
    tags: ["wedding", "festive", "traditional"],
    collections: ["festive"],
  },
  {
    slug: "laddu-gopal-idol-small",
    title: "Laddu Gopal Idol, 2 inch",
    category: "puja-idols",
    price: 3299, weightG: 34.6, purity: "S999",
    shortDesc: "999 fine silver, two inches, solid cast.",
    description:
      "A solid-cast Laddu Gopal in 999 fine silver, two inches tall, on a lotus base. Finished by hand, hollow-free, and heavy for its size.",
    tags: ["puja", "gifting", "999"], featured: true,
    collections: ["gifting"],
  },
  {
    slug: "puja-thali-set",
    title: "Puja Thali Set",
    category: "puja-idols",
    price: 8999, weightG: 96.8, purity: "S999",
    shortDesc: "Thali, diya, kalash and chandan holder.",
    description:
      "A four-piece puja set in 999 fine silver: a six-inch thali with a raised rim, a diya, a small kalash and a chandan holder. Traditional engraved border on each piece.",
    tags: ["puja", "gifting", "999", "set"],
    collections: ["gifting", "festive"],
  },
  {
    slug: "sri-yantra-pendant",
    title: "Sri Yantra Pendant",
    category: "rudraksha-yantra",
    price: 1199, weightG: 7.4, purity: "S999",
    shortDesc: "Etched Sri Yantra in 999 fine silver.",
    description:
      "The Sri Yantra etched into a round 999 fine silver disc, 25mm across, with a plain bail. Energised before dispatch on request — say so in the order notes.",
    tags: ["spiritual", "999", "gifting"],
    collections: ["under-1999"],
  },
  {
    slug: "rudraksha-silver-cap-mala",
    title: "Rudraksha Mala, Silver Caps",
    category: "rudraksha-yantra",
    price: 2499, weightG: 28.2,
    shortDesc: "Five-mukhi beads capped in 925.",
    description:
      "One hundred and eight five-mukhi rudraksha beads, each capped in 925 sterling and strung on silk with a silver guru bead.",
    tags: ["spiritual", "traditional"],
    collections: [],
  },
  {
    slug: "lakshmi-silver-coin-10g",
    title: "Lakshmi Coin, 10g",
    category: "silver-coins",
    price: 1249, weightG: 10.0, purity: "S999", priceMode: "WEIGHT",
    shortDesc: "999 fine, priced on the day's silver rate.",
    description:
      "A ten gram 999 fine silver coin with Lakshmi on the obverse, in a sealed assay pack. Priced on the day's silver rate plus a flat minting charge — the price on this page updates when the rate does.",
    tags: ["investment", "gifting", "999", "dhanteras"], featured: true,
    collections: ["gifting", "festive", "under-1999"],
  },
  {
    slug: "ganesh-silver-coin-20g",
    title: "Ganesh Coin, 20g",
    category: "silver-coins",
    price: 2399, weightG: 20.0, purity: "S999", priceMode: "WEIGHT",
    shortDesc: "999 fine, assay sealed.",
    description:
      "Twenty grams of 999 fine silver, Ganesh on the obverse, sealed in an assay pack with its purity certificate. Priced live against the silver rate.",
    tags: ["investment", "gifting", "999", "dhanteras"],
    collections: ["gifting", "festive"],
  },
  {
    slug: "couple-band-gift-set",
    title: "Couple Band Gift Set",
    category: "gift-sets",
    price: 1899, compareAt: 2499, weightG: 7.8, hallmarked: true,
    shortDesc: "Two matched bands in a velvet box.",
    description:
      "Two 925 sterling bands, one 4mm and one 2.5mm, brushed on the outside and polished within. Boxed in velvet with space for an engraving card.",
    tags: ["gifting", "couple", "hallmarked"], newArrival: true,
    collections: ["gifting", "new-arrivals", "under-1999"], sizes: RING_SIZES,
  },
  {
    slug: "newborn-gift-hamper",
    title: "Newborn Silver Hamper",
    category: "gift-sets",
    price: 4499, weightG: 46.2, hallmarked: true,
    shortDesc: "Kada pair, payal pair and a feeding spoon.",
    description:
      "The full first-gift set in 925 sterling: a pair of baby kada, a pair of soft payal with tiny bells, and a small feeding spoon. All edges rounded, boxed together.",
    tags: ["kids", "gifting", "set", "hallmarked"], featured: true,
    collections: ["gifting"],
  },
  {
    slug: "oxidised-layered-necklace",
    title: "Oxidised Layered Necklace",
    category: "necklaces",
    price: 1799, compareAt: 2399, weightG: 24.6, purity: "OXIDISED",
    shortDesc: "Three tiers of coin-drop chain.",
    description:
      "Three tiers of chain hung with small stamped coins, oxidised for an antique finish. The piece that turns a plain kurta into an outfit.",
    tags: ["oxidised", "festive", "layering"], trending: true, newArrival: true,
    collections: ["oxidised", "new-arrivals", "under-1999"],
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding silver store…");

  // --- settings ----------------------------------------------------------
  const settings: Array<[string, object]> = [
    ["store", {
      name: "Rajat Silver Arts",
      tagline: "Handcrafted 925 sterling silver, since 2011",
      email: "orders@example.com",
      phone: "+91 98765 43210",
      whatsapp: "919876543210",
      addressLines: ["Shop 14, Johari Bazaar", "Near Hawa Mahal"],
      city: "Jaipur", state: "Rajasthan", pincode: "302003",
      mapUrl: "", sinceYear: "2011",
    }],
    ["tax", { gstEnabled: true, gstin: "08AAAAA0000A1Z5", ratePercent: 3, pricesIncludeGst: true }],
    ["shipping", {
      flatFee: rupees(70), freeAbove: rupees(999),
      dispatchDays: "1–2 working days", deliveryDays: "4–7 working days",
      shipsTo: "All India",
    }],
    ["payments", {
      codEnabled: true, codMaxOrder: rupees(5000), codFee: rupees(50), onlineEnabled: true,
    }],
    ["returns", {
      windowDays: 7,
      buyback: "Lifetime exchange at the shop, against the day's silver rate",
      nonReturnable: "Engraved pieces, custom sizes and nose pins",
    }],
    ["announcements", [
      "Free delivery on orders above ₹999",
      "BIS hallmarked 925 sterling silver",
      "10% off your first order — code WELCOME10",
    ]],
    ["social", { instagram: "", facebook: "", youtube: "" }],
    ["catalog", { defaultPriceMode: "FIXED", lowStockThreshold: 3, showWeight: true, showPurity: true }],
  ];

  for (const [key, value] of settings) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  console.log(`  settings: ${settings.length}`);

  // --- users -------------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "owner@silverstore.test").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!123";

  const owner = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Shop Owner",
      role: "OWNER",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      emailVerified: new Date(),
    },
    update: { role: "OWNER" },
  });

  const customer = await db.user.upsert({
    where: { email: "demo.customer@example.com" },
    create: {
      email: "demo.customer@example.com",
      name: "Meera Sharma",
      phone: "9876500011",
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash("Demo!2345", 12),
      emailVerified: new Date(),
      addresses: {
        create: {
          label: "Home", fullName: "Meera Sharma", phone: "9876500011",
          line1: "B-204, Sunrise Apartments", line2: "Vaishali Nagar",
          city: "Jaipur", state: "Rajasthan", pincode: "302021", isDefault: true,
        },
      },
    },
    update: {},
  });
  console.log("  users: owner + demo customer");

  // --- metal rate --------------------------------------------------------
  await db.metalRate.create({
    data: { metal: "SILVER", purity: "S999", ratePerGram: rupees(96), setById: owner.id },
  }).catch(() => undefined);

  // --- categories --------------------------------------------------------
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      create: {
        ...c,
        imagePublicId: `demo/categories/${c.slug}`,
        metaTitle: `${c.name} in 925 Sterling Silver`,
        metaDescription: `Hallmarked silver ${c.name.toLowerCase()}, handmade and shipped across India.`,
      },
      update: { name: c.name, nameHi: c.nameHi, sortOrder: c.sortOrder },
    });
    categoryIds.set(c.slug, row.id);
  }
  console.log(`  categories: ${CATEGORIES.length}`);

  // --- collections -------------------------------------------------------
  const collectionIds = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const row = await db.collection.upsert({
      where: { slug: c.slug },
      create: {
        slug: c.slug, name: c.name, subtitle: c.subtitle, sortOrder: c.sortOrder,
        kind: c.kind ?? "MANUAL", rule: c.rule ?? undefined,
        bannerPublicId: `demo/collections/${c.slug}`,
      },
      update: { name: c.name, subtitle: c.subtitle, sortOrder: c.sortOrder },
    });
    collectionIds.set(c.slug, row.id);
  }
  console.log(`  collections: ${COLLECTIONS.length}`);

  // --- products ----------------------------------------------------------
  let skuCounter = 1000;
  for (const p of PRODUCTS) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) continue;

    const sku = `SS-${p.category.slice(0, 3).toUpperCase()}-${++skuCounter}`;

    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        sku,
        title: p.title,
        titleHi: p.titleHi,
        shortDesc: p.shortDesc,
        description: p.description,
        categoryId,
        status: "ACTIVE",
        purity: p.purity ?? "S925",
        priceMode: p.priceMode ?? "FIXED",
        price: rupees(p.price),
        compareAtPrice: p.compareAt ? rupees(p.compareAt) : null,
        weightG: p.weightG,
        makingCharge: p.priceMode === "WEIGHT" ? rupees(12) : null,
        stock: p.sizes ? 0 : (p.stock ?? 12),
        hallmarked: p.hallmarked ?? false,
        huid: p.hallmarked ? `HUID${skuCounter}XY` : null,
        isFeatured: p.featured ?? false,
        isTrending: p.trending ?? false,
        isNewArrival: p.newArrival ?? false,
        tags: p.tags,
        publishedAt: new Date(),
        metaTitle: `${p.title} — 925 Sterling Silver`,
        metaDescription: p.shortDesc,
        images: {
          create: [0, 1, 2].map((i) => ({
            publicId: `demo/products/${p.slug}-${i + 1}`,
            url: "",
            alt: `${p.title}, view ${i + 1}`,
            sortOrder: i,
            isPrimary: i === 0,
            width: 1200,
            height: 1200,
          })),
        },
        ...(p.sizes
          ? {
              variants: {
                create: p.sizes.map((label, i) => ({
                  label: `Size ${label}`,
                  sku: `${sku}-${label}`,
                  stock: 4 + (i % 3),
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      update: { price: rupees(p.price), status: "ACTIVE" },
    });

    for (const slug of p.collections ?? []) {
      const collectionId = collectionIds.get(slug);
      if (!collectionId) continue;
      await db.productCollection.upsert({
        where: { productId_collectionId: { productId: product.id, collectionId } },
        create: { productId: product.id, collectionId },
        update: {},
      });
    }
  }
  console.log(`  products: ${PRODUCTS.length}`);

  // --- coupons -----------------------------------------------------------
  const coupons = [
    { code: "WELCOME10", description: "10% off your first order", type: "PERCENT" as const,
      value: 10, minOrder: rupees(499), maxDiscount: rupees(300), firstOrderOnly: true },
    { code: "FESTIVE500", description: "₹500 off orders above ₹2,999", type: "FLAT" as const,
      value: rupees(500), minOrder: rupees(2999) },
    { code: "FREESHIP", description: "Free delivery, any order", type: "FREESHIP" as const,
      value: 0, minOrder: null },
  ];
  for (const c of coupons) {
    await db.coupon.upsert({
      where: { code: c.code },
      create: { ...c, endsAt: new Date(Date.now() + 90 * 864e5) },
      update: { isActive: true },
    });
  }
  console.log(`  coupons: ${coupons.length}`);

  // --- policy pages ------------------------------------------------------
  const pages = [
    { slug: "shipping-policy", title: "Shipping & Delivery",
      bodyMd:
`We dispatch every order within **1–2 working days** of receiving it.

Delivery takes **4–7 working days** across India, depending on your pincode. Remote pincodes can take a little longer and we will tell you if yours is one of them.

**Free delivery on orders above ₹999.** Below that, delivery is a flat ₹70.

Every parcel is packed in a velvet pouch inside a rigid box, wrapped so nothing moves. Parcels above ₹5,000 are sent insured.

You will get a tracking number by email the moment your order leaves us.` },

    { slug: "returns-policy", title: "Returns & Exchange",
      bodyMd:
`You can return any piece within **7 days of delivery** for a full refund, as long as it comes back unworn and in its original box.

**Exchange** is available for life against the day's silver rate, at the shop or by post.

**What we cannot take back:** engraved pieces, custom sizes, and nose pins — for hygiene reasons.

**If your parcel arrives damaged**, send us a video of you opening it within 24 hours and we replace the piece free of charge. Please record the unboxing; it is the only proof a courier accepts.

Refunds reach your account within 5–7 working days of us receiving the piece.` },

    { slug: "privacy-policy", title: "Privacy Policy",
      bodyMd:
`We collect only what we need to send you your order: your name, address, phone number and email.

**We never see your card details.** Payments run through Razorpay, and card numbers go straight to them.

We do not sell your data. We share your address with the courier delivering your parcel, and nothing else with anyone.

You can ask us to delete your account and your data at any time — write to us and we will do it within 7 days.

Cookies: we use them to keep your cart and keep you signed in. Nothing more.` },

    { slug: "terms", title: "Terms & Conditions",
      bodyMd:
`By ordering from this website you agree to these terms.

**Prices.** All prices are in Indian Rupees and include GST where it applies. Silver coins and weight-priced items are billed at the rate shown at the moment you place the order.

**Handmade variation.** Every piece is made by hand. Weight can vary by up to 5% and no two oxidised finishes are identical. This is not a defect.

**Hallmarking.** Pieces marked as hallmarked carry a BIS mark and HUID. Pieces not marked as hallmarked are still 925 sterling, tested in our own shop.

**Stock.** If something sells out between your order and our packing, we will call you and refund in full the same day.` },

    { slug: "about", title: "About Us",
      bodyMd:
`We have been making silver in Johari Bazaar, Jaipur, since 2011.

Everything on this website is made on our own bench — cast, filed, set and polished by four people whose names we know. We do not import finished pieces and resell them.

We work in 925 sterling and 999 fine silver. Where a piece is hallmarked, it carries a BIS mark with its HUID. Where it is not, it has still been tested in our shop, and we will tell you what it is.

If you want something made to a size or a design we do not stock, send us a photo on WhatsApp. That is how half our work starts.` },
  ];

  for (const p of pages) {
    await db.page.upsert({
      where: { slug: p.slug },
      create: { ...p, metaTitle: p.title, metaDescription: p.bodyMd.slice(0, 150) },
      update: { title: p.title, bodyMd: p.bodyMd },
    });
  }
  console.log(`  pages: ${pages.length}`);

  // --- a demo order so the admin is not empty ---------------------------
  const someProducts = await db.product.findMany({
    take: 2,
    include: { images: { take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  if (someProducts.length === 2 && someProducts[0] && someProducts[1]) {
    const [a, b] = someProducts;
    const subtotal = a.price + b.price * 2;
    const shippingFee = subtotal >= rupees(999) ? 0 : rupees(70);

    const existing = await db.order.findUnique({ where: { orderNumber: "SS-DEMO-0001" } });
    if (!existing) {
      await db.order.create({
        data: {
          orderNumber: "SS-DEMO-0001",
          userId: customer.id,
          email: customer.email,
          phone: customer.phone ?? "9876500011",
          status: "CONFIRMED",
          paymentStatus: "PAID",
          subtotal,
          discount: 0,
          shippingFee,
          gstAmount: 0,
          total: subtotal + shippingFee,
          shippingAddress: {
            fullName: "Meera Sharma", phone: "9876500011",
            line1: "B-204, Sunrise Apartments", line2: "Vaishali Nagar",
            city: "Jaipur", state: "Rajasthan", pincode: "302021", country: "India",
          },
          items: {
            create: [
              {
                productId: a.id, titleSnapshot: a.title, slugSnapshot: a.slug,
                imageSnapshot: a.images[0]?.publicId ?? null, sku: a.sku,
                unitPrice: a.price, qty: 1, lineTotal: a.price,
                weightG: a.weightG, purity: a.purity,
              },
              {
                productId: b.id, titleSnapshot: b.title, slugSnapshot: b.slug,
                imageSnapshot: b.images[0]?.publicId ?? null, sku: b.sku,
                unitPrice: b.price, qty: 2, lineTotal: b.price * 2,
                weightG: b.weightG, purity: b.purity,
              },
            ],
          },
          payments: {
            create: {
              provider: "RAZORPAY", amount: subtotal + shippingFee, status: "PAID",
              providerOrderId: "order_demo000000001", providerPaymentId: "pay_demo000000001",
              method: "upi",
            },
          },
        },
      });
      console.log("  orders: 1 demo order");
    }
  }

  // --- a contact message -------------------------------------------------
  const contactCount = await db.contactMessage.count();
  if (contactCount === 0) {
    await db.contactMessage.create({
      data: {
        name: "Ankit Verma",
        email: "ankit.verma@example.com",
        phone: "9812345678",
        subject: "Custom size kada",
        message:
          "Do you make the oxidised kada in a smaller size? My wrist is 6.5 inches. Also can it be engraved inside with a date?",
      },
    });
    console.log("  contact messages: 1");
  }

  console.log("\nDone.");
  console.log(`  Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`  Customer login: demo.customer@example.com / Demo!2345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
