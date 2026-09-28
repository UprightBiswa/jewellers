/**
 * Bulk product actions, against the real database.
 *
 * Bulk delete is the most destructive button in the panel. The rule that matters
 * is that anything ever ordered is archived rather than deleted — deleting it
 * would orphan a line on a real invoice — and that rule is worth proving rather
 * than trusting.
 *
 * Everything it creates carries a BULKTEST sku and is removed at the end,
 * including on failure.
 *
 *   npm run test:bulk:db
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

// Dynamic, so loadEnv above has run before src/lib/db.ts reads DATABASE_URL.
const { db } = await import("../src/lib/db.ts");
const { bulkSetStatus, bulkDelete } = await import("../src/lib/products/bulk.ts");

let pass = 0;
let fail = 0;
const ok = (name, condition, detail = "") => {
  console.log(`  ${condition ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  condition ? pass++ : fail++;
};

async function cleanup() {
  const made = await db.product.findMany({
    where: { sku: { startsWith: "BULKTEST" } },
    select: { id: true },
  });
  const ids = made.map((p) => p.id);
  if (ids.length) {
    await db.orderItem.deleteMany({ where: { productId: { in: ids } } });
    await db.productImage.deleteMany({ where: { productId: { in: ids } } });
    await db.product.deleteMany({ where: { id: { in: ids } } });
  }
  await db.order.deleteMany({ where: { orderNumber: { startsWith: "BULKTEST" } } });
  await db.category.deleteMany({ where: { slug: "bulktest-cat" } });
  return ids.length;
}

try {
  console.log("\n  Bulk product actions against Neon\n");
  await cleanup();

  const owner = await db.user.findFirst({ where: { role: "OWNER" }, select: { id: true } });
  if (!owner) throw new Error("No owner account — run npm run db:seed.");

  const category = await db.category.create({
    data: { slug: "bulktest-cat", name: "Bulk Test", isActive: true },
    select: { id: true },
  });

  const make = async (n, withPhoto) => {
    const p = await db.product.create({
      data: {
        slug: `bulktest-${n}-${Date.now()}`,
        sku: `BULKTEST-${n}`,
        title: `Bulk Test ${n}`,
        categoryId: category.id,
        price: 100000,
        stock: 5,
        status: "DRAFT",
      },
      select: { id: true },
    });
    if (withPhoto) {
      await db.productImage.create({
        data: { productId: p.id, publicId: `demo/bulk-${n}`, url: "", alt: "", sortOrder: 0, isPrimary: true },
      });
    }
    return p.id;
  };

  const withPhoto1 = await make("A", true);
  const withPhoto2 = await make("B", true);
  const noPhoto = await make("C", false);

  // --- publish ------------------------------------------------------------
  const published = await bulkSetStatus([withPhoto1, withPhoto2, noPhoto], "ACTIVE", owner.id);
  ok("publish succeeds", published.ok, published.message);
  ok("only the two with photos went live", published.ok && published.data.changed === 2,
    published.ok ? String(published.data.changed) : "");
  ok("the one without is named, not silently skipped",
    published.ok && published.data.blocked.includes("Bulk Test C"),
    published.ok ? published.data.blocked.join(",") : "");

  const cStatus = await db.product.findUnique({ where: { id: noPhoto }, select: { status: true } });
  ok("...and it stayed a draft", cStatus?.status === "DRAFT", cStatus?.status);

  const aStatus = await db.product.findUnique({
    where: { id: withPhoto1 },
    select: { status: true, publishedAt: true },
  });
  ok("a published product has a published date", Boolean(aStatus?.publishedAt));

  // --- publish nothing publishable ----------------------------------------
  const none = await bulkSetStatus([noPhoto], "ACTIVE", owner.id);
  ok("publishing only photo-less products fails clearly", !none.ok, none.message);

  // --- archive ------------------------------------------------------------
  const archived = await bulkSetStatus([withPhoto1], "ARCHIVED", owner.id);
  ok("archive succeeds", archived.ok && archived.data.changed === 1);
  const arch = await db.product.findUnique({
    where: { id: withPhoto1 },
    select: { status: true, publishedAt: true },
  });
  ok("archiving clears the published date", arch?.status === "ARCHIVED" && arch.publishedAt === null);

  // --- an order, so one product must survive deletion ---------------------
  const customer = await db.user.findFirst({ where: { role: "CUSTOMER" }, select: { id: true } });
  const order = await db.order.create({
    data: {
      orderNumber: `BULKTEST-${Date.now()}`,
      userId: customer?.id ?? null,
      email: "bulktest@example.invalid",
      phone: "9000000000",
      status: "PENDING",
      subtotal: 100000,
      discount: 0,
      shippingFee: 0,
      gstAmount: 0,
      total: 100000,
      // Orders snapshot the address rather than pointing at one, so a later edit
      // to the customer's address never rewrites an old invoice.
      shippingAddress: {
        fullName: "Bulk Test",
        line1: "Test",
        city: "Tufanganj",
        state: "West Bengal",
        pincode: "736159",
        phone: "9000000000",
      },
      items: {
        create: {
          productId: withPhoto2,
          titleSnapshot: "Bulk Test B",
          slugSnapshot: "bulk-test-b",
          sku: "BULKTEST-B",
          unitPrice: 100000,
          qty: 1,
          lineTotal: 100000,
        },
      },
    },
    select: { id: true },
  });
  ok("an order exists for product B", Boolean(order.id));

  // --- delete -------------------------------------------------------------
  const deleted = await bulkDelete([withPhoto1, withPhoto2, noPhoto], owner.id);
  ok("delete succeeds", deleted.ok, deleted.message);
  ok("two were actually deleted", deleted.ok && deleted.data.deleted === 2,
    deleted.ok ? String(deleted.data.deleted) : "");
  ok("the ordered one was archived instead", deleted.ok && deleted.data.archived === 1,
    deleted.ok ? String(deleted.data.archived) : "");

  const survivor = await db.product.findUnique({
    where: { id: withPhoto2 },
    select: { status: true },
  });
  ok("the ordered product still exists", Boolean(survivor), survivor?.status);
  ok("...and is archived", survivor?.status === "ARCHIVED", survivor?.status);

  const goneA = await db.product.findUnique({ where: { id: withPhoto1 }, select: { id: true } });
  const goneC = await db.product.findUnique({ where: { id: noPhoto }, select: { id: true } });
  ok("the un-ordered ones are gone", !goneA && !goneC);

  const line = await db.orderItem.findFirst({
    where: { orderId: order.id },
    select: { titleSnapshot: true, unitPrice: true, productId: true },
  });
  ok("the invoice line survived intact",
    line?.titleSnapshot === "Bulk Test B" && line.unitPrice === 100000,
    JSON.stringify(line));
  ok("...and still points at the archived product", line?.productId === withPhoto2);

  // --- guards -------------------------------------------------------------
  const empty = await bulkDelete([], owner.id);
  ok("an empty selection is refused", !empty.ok, empty.message);

  const tooMany = await bulkSetStatus(Array.from({ length: 201 }, (_, i) => `x${i}`), "DRAFT", owner.id);
  ok("more than 200 ids is refused", !tooMany.ok, tooMany.message);
  ok("...with a message about the limit, not about selecting nothing",
    /at most 200/.test(tooMany.message), tooMany.message);
} catch (err) {
  console.error("\n  ERROR:", err?.message ?? err);
  fail++;
} finally {
  const removed = await cleanup();
  console.log(`\n  cleaned up ${removed} test product(s)`);
  await db.$disconnect().catch(() => {});
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
