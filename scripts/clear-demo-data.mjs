/**
 * Empties the shop of everything invented, ready for the real catalogue.
 *
 *   npm run clear:demo -- --dry     show what would go, change nothing
 *   npm run clear:demo -- --yes     do it
 *
 * GOES: orders, their items, payments and shipments; reviews; carts; wishlists;
 * the seeded demo customers; and every product with its images, variants and
 * collection links.
 *
 * STAYS: contact messages, coupons, settings, categories, collections, policy
 * pages, and the owner's own account. Those are either real or are the shape of
 * the shop rather than its contents.
 *
 * Orders go first and products last, because an OrderItem points at a product
 * and the snapshot on it is what makes an old invoice readable. Deleting the
 * product first would leave rows pointing at nothing — survivable, since
 * productId is nullable, but it would also mean a half-finished run leaves
 * orders referring to pieces that no longer exist.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import pg from "pg";

const DRY = process.argv.includes("--dry") || !process.argv.includes("--yes");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("\n  No DATABASE_URL.\n");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const count = async (table, where = "") => {
  const r = await client.query(`select count(*)::int n from "${table}" ${where}`);
  return r.rows[0].n;
};

console.log(`\n  ${DRY ? "DRY RUN — nothing will be changed" : "Clearing demo data"}\n`);

const before = {
  orders: await count("Order"),
  orderItems: await count("OrderItem"),
  payments: await count("Payment"),
  shipments: await count("Shipment"),
  reviews: await count("Review"),
  carts: await count("Cart"),
  wishlist: await count("WishlistItem"),
  products: await count("Product"),
  images: await count("ProductImage"),
  variants: await count("ProductVariant"),
  demoUsers: await count("User", `where email like '%@example.com' or email like '%@example.invalid'`),
};

console.log("  will be removed:");
for (const [k, v] of Object.entries(before)) {
  if (v > 0) console.log(`    ${String(v).padStart(4)}  ${k}`);
}

const kept = {
  messages: await count("ContactMessage"),
  coupons: await count("Coupon"),
  settings: await count("Setting"),
  categories: await count("Category"),
  collections: await count("Collection"),
  pages: await count("Page"),
  staff: await count("User", `where role in ('OWNER','STAFF')`),
};
console.log("\n  will be kept:");
for (const [k, v] of Object.entries(kept)) console.log(`    ${String(v).padStart(4)}  ${k}`);

const hidden = await count("Category", "where not \"isActive\"");
if (hidden > 0) {
  console.log(`\n  ${hidden} categories are hidden and will be shown again.`);
}

if (DRY) {
  console.log("\n  Nothing changed. Run with --yes to do it.\n");
  await client.end();
  process.exit(0);
}

await client.query("BEGIN");
try {
  // Orders and everything hanging off them.
  await client.query('DELETE FROM "Shipment"');
  await client.query('DELETE FROM "Payment"');
  await client.query('DELETE FROM "CouponRedemption"');
  await client.query('DELETE FROM "OrderItem"');
  await client.query('DELETE FROM "Order"');

  // What customers left behind.
  await client.query('DELETE FROM "Review"');
  await client.query('DELETE FROM "CartItem"');
  await client.query('DELETE FROM "Cart"');
  await client.query('DELETE FROM "WishlistItem"');

  // The catalogue.
  await client.query('DELETE FROM "ProductCollection"');
  await client.query('DELETE FROM "ProductImage"');
  await client.query('DELETE FROM "ProductVariant"');
  await client.query('DELETE FROM "Product"');

  // Invented people. Addresses go with them.
  await client.query(
    `DELETE FROM "Address" WHERE "userId" IN
       (SELECT id FROM "User" WHERE email LIKE '%@example.com' OR email LIKE '%@example.invalid')`,
  );
  await client.query(
    `DELETE FROM "User"
      WHERE (email LIKE '%@example.com' OR email LIKE '%@example.invalid')
        AND role = 'CUSTOMER'`,
  );

  // Categories hidden while testing the bulk buttons. An empty shop with five
  // of its seven categories switched off looks broken in a way nobody would
  // connect back to a click.
  await client.query('UPDATE "Category" SET "isActive" = true WHERE NOT "isActive"');

  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("\n  FAILED, nothing was changed:", err.message, "\n");
  await client.end();
  process.exit(1);
}

console.log("\n  done. what is left:");
for (const t of ["Product", "Order", "Review", "ContactMessage", "Coupon", "Category", "Collection", "Page"]) {
  console.log(`    ${String(await count(t)).padStart(4)}  ${t}`);
}
console.log("\n  The shop has no products now. Load the real ones at");
console.log("  /admin/products/import, or add the first one by hand.\n");

await client.end();
