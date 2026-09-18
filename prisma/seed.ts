import { config as loadEnv } from "dotenv";

// .env.local overrides .env, matching how Next.js itself resolves them. Prisma
// runs outside Next, so it does not get that for free.
loadEnv({ path: [".env.local", ".env"], quiet: true });
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/index.js";
import { ADMIN_EMAIL, adminDoorUrl } from "../src/config/admin.js";
import {
  CATEGORIES,
  COLLECTIONS,
  COUPONS,
  PAGES,
  PRODUCTS,
  REVIEWS,
  STORE,
} from "../src/lib/demo/catalogue.js";

/**
 * Seeds Charubala Silver.
 *
 * The shop details, categories, policies and offers are the owner's real
 * answers. The fifteen products are written from the categories he listed, at
 * prices in his stated ₹800–5,000 range, for him to correct in the admin.
 *
 * Re-running is safe: every write is an upsert.
 *
 *   npm run db:seed
 */

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const db = new PrismaClient({ adapter });

const paise = (rupees: number) => Math.round(rupees * 100);

async function main() {
  console.log(`Seeding ${STORE.name}…`);

  // --- settings ----------------------------------------------------------
  const settings: Array<[string, object]> = [
    ["store", {
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
    }],

    // Not registered for GST. Nothing is charged or collected until he is.
    ["tax", { gstEnabled: false, gstin: "", ratePercent: 0, pricesIncludeGst: true }],

    ["shipping", {
      flatFee: paise(60),
      freeAbove: paise(1500),
      dispatchDays: "1–2 working days",
      deliveryDays: "3–6 working days",
      shipsTo: "All India by Delhivery · same-day in Tufanganj and Coochbehar",
    }],

    // 50% advance on made-to-order, as the owner asked.
    ["payments", {
      codEnabled: true,
      codMaxOrder: paise(3000),
      codFee: 0,
      onlineEnabled: true,
      advancePercent: 50,
    }],

    ["returns", {
      windowDays: 7,
      buyback: "Exchange for any other piece within 7 days",
      nonReturnable: "Made-to-order, custom-size and engraved pieces",
    }],

    ["announcements", [
      "20% off your first order — code WELCOME20",
      "Handmade in Tufanganj since 2018",
      `Order on WhatsApp: ${STORE.phone}`,
    ]],

    ["social", { instagram: "", facebook: "", youtube: "" }],

    // Fixed price per design, and weight is not the selling point here.
    ["catalog", {
      defaultPriceMode: "FIXED",
      lowStockThreshold: 2,
      showWeight: false,
      showPurity: true,
    }],
  ];

  for (const [key, value] of settings) {
    await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  console.log(`  settings: ${settings.length}`);

  // --- users -------------------------------------------------------------
  // The owner's address lives in src/config/admin.ts, not in an environment
  // variable. The password is generated here and printed once, because a
  // committed default like "ChangeMe!123" is a password everybody already knows.
  // Re-seeding never touches an existing password — use `npm run admin` to reset.
  // If an owner already exists, keep its address — re-seeding must never create
  // a second OWNER, and Rahul may have changed his sign-in address since.
  const existingOwner = await db.user.findFirst({
    where: { role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true },
  });

  const adminEmail = existingOwner?.email ?? ADMIN_EMAIL.toLowerCase();
  const freshPassword = existingOwner ? null : newPassword();

  // Not an upsert: `create` is evaluated even when the row already exists, and
  // there is no password to hash on a re-seed.
  const owner = existingOwner
    ? await db.user.update({
        where: { id: existingOwner.id },
        data: { role: "OWNER", name: STORE.owner },
      })
    : await db.user.create({
        data: {
          email: adminEmail,
          name: STORE.owner,
          phone: STORE.whatsapp.slice(-10),
          role: "OWNER",
          passwordHash: await bcrypt.hash(freshPassword!, 12),
          emailVerified: new Date(),
        },
      });

  if (freshPassword) {
    console.log("\n  owner account created");
    console.log(`    email:    ${adminEmail}`);
    console.log(`    password: ${freshPassword}`);
    console.log("    write it down — it is not stored anywhere in plain text\n");
  } else {
    console.log(`  owner account: ${adminEmail} (password unchanged)`);
  }

  const customer = await db.user.upsert({
    where: { email: "demo.customer@example.com" },
    create: {
      email: "demo.customer@example.com",
      name: "Ananya Roy",
      phone: "9876500011",
      role: "CUSTOMER",
      passwordHash: await bcrypt.hash("Demo!2345", 12),
      emailVerified: new Date(),
      addresses: {
        create: {
          label: "Home",
          fullName: "Ananya Roy",
          phone: "9876500011",
          line1: "Netaji Road",
          line2: "Near Post Office",
          city: "Tufanganj",
          state: "West Bengal",
          pincode: "736159",
          isDefault: true,
        },
      },
    },
    update: {},
  });
  console.log(`  users: ${STORE.owner} (owner) + demo customer`);

  // --- categories --------------------------------------------------------
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      create: {
        ...c,
        imagePublicId: `demo/categories/${c.slug}`,
        metaTitle: `Silver ${c.name} — ${STORE.name}`,
        metaDescription: `Handmade 925 silver ${c.name.toLowerCase()} from Tufanganj, Coochbehar. Shipped across India.`,
      },
      update: { name: c.name, nameBn: c.nameBn, sortOrder: c.sortOrder },
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
        slug: c.slug,
        name: c.name,
        subtitle: c.subtitle,
        sortOrder: c.sortOrder,
        kind: c.kind ?? "MANUAL",
        rule: c.rule ?? undefined,
        bannerPublicId: `demo/collections/${c.slug}`,
      },
      update: { name: c.name, subtitle: c.subtitle, sortOrder: c.sortOrder },
    });
    collectionIds.set(c.slug, row.id);
  }
  console.log(`  collections: ${COLLECTIONS.length}`);

  // --- products ----------------------------------------------------------
  let counter = 1000;
  for (const p of PRODUCTS) {
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) continue;

    const sku = `CS-${p.category.slice(0, 3).toUpperCase()}-${++counter}`;

    const product = await db.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        sku,
        title: p.title,
        titleBn: p.titleBn,
        shortDesc: p.shortDesc,
        description: p.description,
        categoryId,
        status: "ACTIVE",
        purity: p.purity ?? "S925",
        priceMode: "FIXED",
        price: paise(p.price),
        compareAtPrice: p.compareAt ? paise(p.compareAt) : null,
        weightG: p.weightG,
        stock: p.sizes ? 0 : (p.stock ?? 4),
        hallmarked: p.hallmarked ?? false,
        huid: p.hallmarked ? `HUID${counter}WB` : null,
        isFeatured: p.featured ?? false,
        isTrending: p.trending ?? false,
        isNewArrival: p.newArrival ?? false,
        tags: p.tags,
        publishedAt: new Date(),
        metaTitle: `${p.title} — 925 Silver | ${STORE.name}`,
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
                  // Made to order: a ring size is available, not stocked deep.
                  stock: 2,
                  sortOrder: i,
                })),
              },
            }
          : {}),
      },
      update: {
        price: paise(p.price),
        status: "ACTIVE",
        titleBn: p.titleBn,
        // Restore stock too — re-seeding is meant to be a clean reset, and
        // testing orders drain it.
        stock: p.sizes ? 0 : (p.stock ?? 4),
      },
    });

    for (const slug of p.collections) {
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
  for (const c of COUPONS) {
    await db.coupon.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        description: c.description,
        type: c.type,
        value: c.type === "FLAT" ? paise(c.value) : c.value,
        minOrder: c.minOrder ? paise(c.minOrder) : null,
        maxDiscount: "maxDiscount" in c && c.maxDiscount ? paise(c.maxDiscount) : null,
        firstOrderOnly: c.firstOrderOnly,
        isActive: !("startsInactive" in c && c.startsInactive),
        endsAt: null,
      },
      update: {},
    });
  }
  console.log(`  coupons: ${COUPONS.length}`);

  // --- policy pages ------------------------------------------------------
  for (const p of PAGES) {
    await db.page.upsert({
      where: { slug: p.slug },
      create: {
        ...p,
        metaTitle: `${p.title} | ${STORE.name}`,
        metaDescription: p.bodyMd.replace(/[#*`]/g, "").slice(0, 150),
      },
      update: { title: p.title, bodyMd: p.bodyMd },
    });
  }
  console.log(`  pages: ${PAGES.length}`);

  // --- one demo order, so the admin is not an empty room -----------------
  const existing = await db.order.findUnique({ where: { orderNumber: "CS-DEMO-0001" } });
  if (!existing) {
    const sample = await db.product.findMany({
      take: 2,
      include: { images: { take: 1 } },
      orderBy: { createdAt: "asc" },
    });

    const [a, b] = sample;
    if (a && b) {
      const subtotal = a.price + b.price;
      const shippingFee = subtotal >= 150000 ? 0 : 6000;

      await db.order.create({
        data: {
          orderNumber: "CS-DEMO-0001",
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
            fullName: "Ananya Roy",
            phone: "9876500011",
            line1: "Netaji Road",
            line2: "Near Post Office",
            city: "Tufanganj",
            state: "West Bengal",
            pincode: "736159",
            country: "India",
          },
          items: {
            create: [a, b].map((p) => ({
              productId: p.id,
              titleSnapshot: p.title,
              slugSnapshot: p.slug,
              imageSnapshot: p.images[0]?.publicId ?? null,
              sku: p.sku,
              unitPrice: p.price,
              qty: 1,
              lineTotal: p.price,
              weightG: p.weightG,
              purity: p.purity,
              taxRate: 0,
            })),
          },
        },
      });
      console.log("  orders: 1 demo order");
    }
  }

  // --- reviews -----------------------------------------------------------
  // Each needs its own customer: one person cannot review the same piece twice,
  // and four reviews all signed "Ananya Roy" would fool nobody.
  for (const r of REVIEWS) {
    const product = await db.product.findUnique({
      where: { slug: r.productSlug },
      select: { id: true },
    });
    if (!product) continue;

    const reviewer = await db.user.upsert({
      where: { email: r.email },
      create: { email: r.email, name: r.name, role: "CUSTOMER", emailVerified: new Date() },
      update: {},
    });

    await db.review.upsert({
      where: { productId_userId: { productId: product.id, userId: reviewer.id } },
      create: {
        productId: product.id,
        userId: reviewer.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        status: "APPROVED",
      },
      update: { status: "APPROVED" },
    });
  }
  console.log(`  reviews: ${REVIEWS.length}`);

  // --- metal rate, for the day he starts pricing by weight ---------------
  const rateCount = await db.metalRate.count();
  if (rateCount === 0) {
    await db.metalRate.create({
      data: { metal: "SILVER", purity: "S999", ratePerGram: paise(96), setById: owner.id },
    });
  }

  // --- one customer message ---------------------------------------------
  if ((await db.contactMessage.count()) === 0) {
    await db.contactMessage.create({
      data: {
        name: "Sourav Das",
        email: "sourav.das@example.com",
        phone: "9832100045",
        subject: "Payel in a smaller size",
        message:
          "Do you make the ghungur payel a little shorter? My wife's ankle is small and the ones we bought last time were loose. Also can we collect from the shop instead of courier?",
      },
    });
    console.log("  contact messages: 1");
  }

  console.log("\nDone.");
  console.log(`  Admin door:     ${await adminDoorUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")}`);
  console.log(`  Admin login:    ${adminEmail}${freshPassword ? ` / ${freshPassword}` : " (password unchanged)"}`);
  console.log(`  Customer login: demo.customer@example.com / Demo!2345`);
  console.log("\n  Run `npm run admin` any time to see this again.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

/**
 * A password Rahul can read off a screen and type on a phone.
 *
 * No 0/O or 1/l/I, and a shape he can copy without squinting: two groups of
 * four, a separator, and one digit block. Generated, never defaulted — a seed
 * with a hardcoded password ships an account everybody can open.
 */
function newPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const caps = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";

  const pick = (set: string, n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)))
      .map((r) => set[r % set.length])
      .join("");

  return `${pick(caps, 1)}${pick(letters, 4)}-${pick(letters, 4)}-${pick(digits, 3)}`;
}
