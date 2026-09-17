/**
 * Charubala Silver's starting catalogue.
 *
 * One source of truth, deliberately free of imports so that both
 * `prisma/seed.ts` (which runs under tsx, outside Next's path aliases) and
 * `src/lib/demo/data.ts` (which powers preview mode) can read it.
 *
 * Everything here is real information from the shop owner's brief, except the
 * fifteen product descriptions, which are written from the categories he listed
 * and are his to correct in the admin. Prices are in RUPEES here and converted
 * to paise on the way into the database.
 */

export const STORE = {
  name: "Charubala Silver",
  owner: "Rahul Sarkar",
  tagline: "Handmade silver from Tufanganj, since 2018",
  /** TODO: the owner has not given an email address yet. */
  email: "",
  phone: "+91 80112 10884",
  whatsapp: "918011210884",
  addressLines: ["Gourmohan Bazar", "Jhaljhali"],
  city: "Tufanganj",
  district: "Coochbehar",
  state: "West Bengal",
  pincode: "736159",
  sinceYear: "2018",
  domain: "charubala.com",
  languages: ["English", "Bengali"],
} as const;

export const CATEGORIES = [
  { slug: "earrings", name: "Earrings", nameBn: "কানের দুল", sortOrder: 1 },
  { slug: "rings", name: "Rings", nameBn: "আংটি", sortOrder: 2 },
  { slug: "chains", name: "Chains", nameBn: "গলার চেইন", sortOrder: 3 },
  { slug: "bracelets", name: "Bracelets", nameBn: "ব্রেসলেট", sortOrder: 4 },
  { slug: "anklets", name: "Anklets", nameBn: "পায়েল", sortOrder: 5 },
  { slug: "toe-rings", name: "Toe Rings", nameBn: "পায়ের আংটি", sortOrder: 6 },
  { slug: "baby-sets", name: "Baby Sets", nameBn: "শিশুর সেট", sortOrder: 7 },
];

export const COLLECTIONS = [
  { slug: "new-arrivals", name: "New Arrivals", subtitle: "Ten new designs every month", sortOrder: 1 },
  { slug: "best-sellers", name: "Best Sellers", subtitle: "What Tufanganj keeps asking for", sortOrder: 2 },
  { slug: "under-999", name: "Under ₹999", subtitle: "Everyday silver, easy on the pocket", sortOrder: 3, kind: "AUTO" as const, rule: { maxPrice: 99900 } },
  { slug: "lightweight", name: "Lightweight", subtitle: "Light enough to wear all day", sortOrder: 4 },
  { slug: "traditional", name: "Traditional", subtitle: "Jhumka, payel, chandbali", sortOrder: 5 },
  { slug: "modern", name: "Modern", subtitle: "Clean lines, everyday wear", sortOrder: 6 },
  { slug: "festive", name: "Festive Edit", subtitle: "Durga Puja, Lakshmi Puja and wedding season", sortOrder: 7 },
];

/** Indian ring sizes, as the owner listed them: 8 to 24. */
export const RING_SIZES = ["8", "10", "12", "14", "16", "18", "20", "22", "24"];

export type SeedProduct = {
  slug: string;
  title: string;
  titleBn?: string;
  category: string;
  /** rupees */
  price: number;
  compareAt?: number;
  weightG: number;
  purity?: "S925" | "S999" | "PLATED" | "GOLD_PLATED" | "OXIDISED";
  hallmarked?: boolean;
  stock?: number;
  sizes?: string[];
  shortDesc: string;
  description: string;
  tags: string[];
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  collections: string[];
};

export const PRODUCTS: SeedProduct[] = [
  // --- Earrings -------------------------------------------------------------
  {
    slug: "everyday-silver-stud-pair",
    title: "Everyday Silver Studs",
    titleBn: "দৈনন্দিন রুপোর কানের দুল",
    category: "earrings",
    price: 800, weightG: 1.8, hallmarked: true, stock: 6,
    shortDesc: "A plain 4mm stud pair for every day.",
    description:
      "A plain polished 4mm stud in 925 silver, on a hypoallergenic post with a silicone back. Light enough to sleep in and small enough for school or office. The pair most customers buy two of.",
    tags: ["lightweight", "daily wear", "modern"],
    trending: true, newArrival: true,
    collections: ["under-999", "lightweight", "modern", "new-arrivals", "best-sellers"],
  },
  {
    slug: "chhoto-jhumka",
    title: "Small Jhumka",
    titleBn: "ছোট ঝুমকা",
    category: "earrings",
    price: 1450, compareAt: 1799, weightG: 6.4, stock: 4,
    shortDesc: "A small jhumka with a fine bead fringe.",
    description:
      "The everyday jhumka — a small dome with a fine bead fringe, hung on a light hook so it does not drag on the ear. Traditional shape, made light enough to wear through a working day.",
    tags: ["traditional", "lightweight", "festive"],
    featured: true, trending: true,
    collections: ["traditional", "lightweight", "best-sellers", "festive"],
  },
  {
    slug: "chandbali-earrings",
    title: "Chandbali Earrings",
    titleBn: "চাঁদবালি",
    category: "earrings",
    price: 2900, compareAt: 3499, weightG: 14.2, stock: 2,
    shortDesc: "The crescent moon shape, hand-finished.",
    description:
      "The crescent chandbali, cut and filed by hand and finished with a row of drops along the lower edge. Weighted so it sits flat against the ear instead of tipping forward. Made for a wedding, a puja, or a reception.",
    tags: ["traditional", "wedding", "festive"],
    featured: true,
    collections: ["traditional", "festive"],
  },

  // --- Rings ----------------------------------------------------------------
  {
    slug: "lightweight-daily-ring",
    title: "Lightweight Daily Ring",
    titleBn: "হালকা দৈনন্দিন আংটি",
    category: "rings",
    price: 850, weightG: 2.4, hallmarked: true, sizes: RING_SIZES,
    shortDesc: "A slim 2mm band that goes with everything.",
    description:
      "Two millimetres of polished 925 silver, rounded on the inside so it sits flat through a full day of work. Available in Indian sizes 8 to 24 — tell us the size at checkout and we will make it to fit.",
    tags: ["lightweight", "modern", "unisex", "daily wear"],
    trending: true,
    collections: ["under-999", "lightweight", "modern", "best-sellers"],
  },
  {
    slug: "oxidised-floral-ring",
    title: "Oxidised Floral Ring",
    titleBn: "অক্সিডাইজড ফুল আংটি",
    category: "rings",
    price: 1150, compareAt: 1450, weightG: 4.1, purity: "OXIDISED", sizes: RING_SIZES,
    shortDesc: "A carved flower with an antique finish.",
    description:
      "A flower carved into the face of the band and darkened with an oxidised finish, so the pattern sits black in the grooves and rubs back to bright silver on the raised edges as you wear it. No two come out quite the same.",
    tags: ["traditional", "oxidised"],
    newArrival: true,
    collections: ["traditional", "new-arrivals"],
  },
  {
    slug: "couple-band-pair",
    title: "Couple Band Pair",
    category: "rings",
    price: 2400, compareAt: 2900, weightG: 6.8, hallmarked: true, sizes: RING_SIZES,
    shortDesc: "Two matched bands, one broad, one slim.",
    description:
      "A matched pair in 925 silver — one 4mm band and one 2.5mm — brushed on the outside and polished within. Boxed together. We can engrave a name or a date inside at no extra cost; write it in the order notes.",
    tags: ["gifting", "modern", "couple"],
    featured: true, newArrival: true,
    collections: ["modern", "new-arrivals"],
  },

  // --- Chains ---------------------------------------------------------------
  {
    slug: "womens-fine-chain-18",
    title: "Women's Fine Chain, 18 inch",
    titleBn: "মেয়েদের সরু চেইন",
    category: "chains",
    price: 1800, weightG: 7.2, hallmarked: true, stock: 5,
    shortDesc: "A fine 18 inch chain that sits at the collarbone.",
    description:
      "A fine cable chain in 925 silver, eighteen inches, with a small lobster clasp. Light enough to wear alone and strong enough to carry a small pendant. Sits at the collarbone on most people.",
    tags: ["lightweight", "modern", "daily wear"],
    featured: true,
    collections: ["lightweight", "modern", "best-sellers"],
  },
  {
    slug: "rice-bead-chain",
    title: "Rice-Bead Chain",
    titleBn: "চালের দানা চেইন",
    category: "chains",
    price: 2600, weightG: 12.4, stock: 3,
    shortDesc: "Hand-strung rice beads on a fine silver wire.",
    description:
      "Small silver beads, shaped like grains of rice, strung one at a time on a fine wire. A Bengali shape you will recognise from your grandmother's box, made new. Twenty inches with a hook clasp.",
    tags: ["traditional", "bengali"],
    trending: true,
    collections: ["traditional", "best-sellers"],
  },

  // --- Bracelets ------------------------------------------------------------
  {
    slug: "adjustable-charm-bracelet",
    title: "Adjustable Charm Bracelet",
    titleBn: "চার্ম ব্রেসলেট",
    category: "bracelets",
    price: 1650, compareAt: 1999, weightG: 8.6, stock: 4,
    shortDesc: "Four charms on a chain that fits any wrist.",
    description:
      "Four small charms — heart, star, moon and a plain disc — on an adjustable 925 chain that closes anywhere between six and eight inches, so it fits without a size. The plain disc can be engraved.",
    tags: ["gifting", "modern", "adjustable"],
    newArrival: true, trending: true,
    collections: ["modern", "new-arrivals", "lightweight"],
  },
  {
    slug: "flat-link-bracelet",
    title: "Flat Link Bracelet",
    category: "bracelets",
    price: 2200, weightG: 15.8, hallmarked: true, stock: 3,
    shortDesc: "Broad flat links, seven and a half inches.",
    description:
      "Solid flat links in 925 silver with a box clasp and a safety catch, so it cannot come off on its own. Seven and a half inches. Unisex — this one sells to men and women in about equal numbers.",
    tags: ["modern", "unisex"],
    collections: ["modern"],
  },

  // --- Anklets --------------------------------------------------------------
  {
    slug: "ghungur-payel-pair",
    title: "Ghungur Payel",
    titleBn: "ঘুঙুর পায়েল",
    category: "anklets",
    price: 2800, compareAt: 3299, weightG: 22.6, stock: 3,
    shortDesc: "A pair with small bells along the chain.",
    description:
      "A pair of payel in 925 silver, strung with small ghungur along a flat chain, with a lobster clasp and a two inch extender so they sit right on most ankles. Sold as a pair. The sound is the point.",
    tags: ["traditional", "festive", "pair"],
    featured: true,
    collections: ["traditional", "festive", "best-sellers"],
  },
  {
    slug: "plain-lightweight-payel",
    title: "Plain Lightweight Payel",
    titleBn: "সাদামাটা হালকা পায়েল",
    category: "anklets",
    price: 1900, weightG: 14.2, stock: 4,
    shortDesc: "No bells — quiet enough for office.",
    description:
      "A flat woven chain in 925 silver with a secure clasp and no bells, for wearing under trousers and through a working day. Sold as a pair.",
    tags: ["lightweight", "modern", "daily wear", "pair"],
    trending: true,
    collections: ["lightweight", "modern"],
  },

  // --- Toe rings ------------------------------------------------------------
  {
    slug: "adjustable-toe-ring-pair",
    title: "Adjustable Toe Ring Pair",
    titleBn: "পায়ের আংটি জোড়া",
    category: "toe-rings",
    price: 900, compareAt: 1100, weightG: 4.8, stock: 8,
    shortDesc: "Open shank — one size fits, no measuring.",
    description:
      "The everyday toe ring, made with an open adjustable shank so one size fits comfortably and you do not need to measure anything. Sold as a pair, in 925 silver that stands up to daily washing.",
    tags: ["traditional", "adjustable", "pair", "lightweight"],
    trending: true, newArrival: true,
    collections: ["under-999", "traditional", "lightweight", "new-arrivals", "best-sellers"],
  },

  // --- Baby sets ------------------------------------------------------------
  {
    slug: "baby-kara-payel-set",
    title: "Baby Kara & Payel Set",
    titleBn: "শিশুর কড়া ও পায়েল সেট",
    category: "baby-sets",
    price: 3400, weightG: 24.4, hallmarked: true, stock: 2,
    shortDesc: "A pair of kara and a pair of payel, all edges rounded.",
    description:
      "A pair of small kara and a pair of soft payel in 925 silver, every edge fully rounded and no clasp that can catch. Sized for six months to two years. The traditional gift, boxed together.",
    tags: ["baby", "gifting", "traditional"],
    featured: true,
    collections: ["traditional", "festive"],
  },
  {
    slug: "newborn-silver-gift-set",
    title: "Newborn Silver Gift Set",
    titleBn: "নবজাতকের উপহার সেট",
    category: "baby-sets",
    price: 4800, compareAt: 5400, weightG: 38.2, hallmarked: true, stock: 2,
    shortDesc: "Kara, payel and a small feeding spoon.",
    description:
      "The full first-gift set in 925 silver: a pair of kara, a pair of payel with tiny bells, and a small feeding spoon. Rounded everywhere, boxed together, and ready to give.",
    tags: ["baby", "gifting", "set"],
    featured: true, newArrival: true,
    collections: ["traditional", "new-arrivals", "festive"],
  },
];

export const COUPONS = [
  {
    code: "WELCOME20",
    description: "20% off the first order — the owner's standing offer",
    type: "PERCENT" as const,
    value: 20,
    minOrder: 800,
    maxDiscount: 600,
    firstOrderOnly: true,
  },
  {
    code: "PUJA500",
    description: "Durga Puja / Lakshmi Puja sale — turn on when the season starts",
    type: "FLAT" as const,
    value: 500,
    minOrder: 2500,
    firstOrderOnly: false,
    startsInactive: true,
  },
];

/**
 * Policy pages, written from the owner's answers. He edits these himself in the
 * admin — they are database rows, not code.
 */
export const PAGES = [
  {
    slug: "about",
    title: "About Charubala Silver",
    bodyMd: `We have been making silver at Gourmohan Bazar, Jhaljhali, in Tufanganj since **2018**.

Rahul Sarkar runs the shop. Everything you see here is made on our own bench — cut, filed, set and polished by hand. We do not buy finished pieces from a wholesaler and put our name on them.

We work mostly in **925 silver**, in three kinds of design: traditional shapes you already know, modern pieces for everyday wear, and lightweight jewellery for people who want to put it on in the morning and forget about it.

We add around **ten new designs every month**, and we make to order. If you have seen something you like — in a photo, on someone's wrist, in your grandmother's box — send us a picture on WhatsApp and we will tell you what it would cost and how long it would take.

**Find us:** Gourmohan Bazar, Jhaljhali, Tufanganj, Coochbehar, West Bengal 736159.`,
  },
  {
    slug: "shipping-policy",
    title: "Shipping & Delivery",
    bodyMd: `We pack every ready-stock order within **1 to 2 working days**.

**Made-to-order pieces** take longer — usually 7 to 10 days, and we will tell you the exact date before you pay.

We send parcels by **Delhivery**. Delivery takes about **3 to 6 working days** in West Bengal and a little longer elsewhere in India.

In **Tufanganj and around Coochbehar** we often deliver ourselves, usually the same day or the next. Call or WhatsApp us on **80112 10884** if you want it in a hurry.

Every piece goes out in a pouch inside a rigid box, wrapped so nothing moves. You get a tracking number by email and on WhatsApp as soon as it leaves us.

Please record a short video while you open the parcel. If anything is damaged in transit, that video is all we need to replace it free of charge.`,
  },
  {
    slug: "returns-policy",
    title: "Exchange Policy",
    bodyMd: `We **exchange** within **7 days of delivery**, for any other piece of the same value or more. Bring it in or post it back unworn, in its original box.

We do not give cash refunds. We would rather you end up with something you actually want to wear, and we will keep exchanging until you do.

**What we cannot take back:**

- Made-to-order and custom-size pieces
- Engraved pieces
- Anything that has been worn or damaged

**If your parcel arrives broken**, send us a video of you opening it within 24 hours and we will replace the piece at our cost.

**Made-to-order pieces** are started only after a **50% advance**. That advance is not refundable once we begin, because the piece is made to your size and design.`,
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    bodyMd: `We collect only what we need to get your order to you: your name, address, phone number and email.

**We never see your card details.** When online payment is switched on, card numbers go straight to the payment gateway and never touch our website.

We do not sell your information to anybody. We share your address with the courier who is delivering your parcel, and with nobody else.

We use cookies to remember what is in your bag and to keep you signed in. That is all they do.

Write to us at any time and we will delete your account and everything in it within 7 days.`,
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    bodyMd: `By ordering from this website you agree to these terms.

**Prices.** All prices are in Indian Rupees and are the price printed on the tag. Charubala Silver is **not registered for GST**, so no GST is charged or collected.

**Handmade variation.** Every piece is made by hand. Weight can vary by a few percent, and no two oxidised finishes come out identical. This is how handmade work is, not a defect.

**Silver purity.** We work in 925 silver. Some pieces are BIS hallmarked and say so on their page. The rest are tested in our own shop, and we will tell you plainly which is which.

**Made-to-order.** Custom pieces need a **50% advance** before we start. We agree the design, the size and the date with you first.

**Stock.** If something sells out between your order and our packing, we will call you the same day and refund you in full.`,
  },
];

/**
 * Seed reviews.
 *
 * Written as the kind of thing customers in Coochbehar actually say — a size
 * that fit, a delivery that arrived, a gift that landed. The owner approves or
 * deletes each one in the admin; they exist so the homepage is not missing a
 * section on day one.
 */
export const REVIEWS = [
  {
    productSlug: "ghungur-payel-pair",
    name: "Sumita Barman",
    email: "sumita.barman@example.com",
    rating: 5,
    title: "The sound is lovely",
    body: "Bought these for my sister's wedding. Light on the ankle and the ghungur sound is soft, not loud. The extender chain was needed and it was there.",
  },
  {
    productSlug: "chhoto-jhumka",
    name: "Priyanka Saha",
    email: "priyanka.saha@example.com",
    rating: 5,
    title: "Wear them every day",
    body: "I wanted a jhumka I could wear to work without my ears hurting by evening. These are the first pair that managed it.",
  },
  {
    productSlug: "lightweight-daily-ring",
    name: "Arindam Dutta",
    email: "arindam.dutta@example.com",
    rating: 4,
    title: "Made to my size",
    body: "Ordered size 18 and it fits exactly. Took about a week because they made it, which they told me before I paid. Simple and well finished.",
  },
  {
    productSlug: "newborn-silver-gift-set",
    name: "Moushumi Roy",
    email: "moushumi.roy@example.com",
    rating: 5,
    title: "Gave it at the annaprashan",
    body: "Everything is smooth, no sharp edges anywhere, which was my worry. Came in a proper box so I did not have to wrap it.",
  },
];
