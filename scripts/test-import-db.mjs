/**
 * The catalogue importer, against the real database.
 *
 * Parsing is covered by scripts/test-import.mjs. This proves the half that
 * actually writes: categories created on demand, variants with their own prices,
 * a re-import updating rather than duplicating, and the export round-tripping
 * back through the parser.
 *
 * It creates products with a TEST- serial and deletes them at the end, including
 * when it fails part way.
 *
 *   npm run test:import:db
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

// Imported dynamically, and deliberately. A static `import` is hoisted above the
// loadEnv() call above, so src/lib/db.ts would read an empty DATABASE_URL and
// quietly fall back to preview data — the tests would then pass against nothing.
const { db } = await import("../src/lib/db.ts");
const { planImport, runImport, exportProducts } = await import("../src/lib/import/run.ts");
const { parseProductCsv } = await import("../src/lib/import/products.ts");

let pass = 0;
let fail = 0;

const ok = (name, condition, detail = "") => {
  console.log(`  ${condition ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  condition ? pass++ : fail++;
};

const HEAD =
  "serial,title,category,price_rupees,compare_at_rupees,stock,status,images,sizes,collections,homepage,tags,purity";

const SHEET = [
  HEAD,
  `TEST-A,Test Chain A,Test Chains,1200,1600,3,active,TEST-A-1.jpg,,Test Collection,new,"chain,test",925`,
  `TEST-B,Test Ring B,Test Rings,1600,,6,draft,,"925 Sterling|0|5,999 Fine|+400|1",,,"ring,test",925`,
  `TEST-C,Test Bad C,Test Chains,,2,draft,,,,,,`,
  // No photo in the folder: the image column carries a URL instead, which is how
  // a shop whose pictures are already online loads a catalogue from one sheet.
  `TEST-D,Test Url D,Test Chains,900,,2,active,"https://images.example.com/d-1.jpg,https://images.example.com/d-2.jpg",,,,,925`,
].join("\n");

const IMAGES = {
  "TEST-A-1.jpg": {
    publicId: "demo/products/test-a-1",
    url: "https://example.invalid/test-a-1.jpg",
    width: 800,
    height: 800,
  },
};

async function cleanup() {
  const products = await db.product.findMany({
    where: { sku: { startsWith: "CS-TEST" } },
    select: { id: true },
  });
  const ids = products.map((p) => p.id);
  if (ids.length) {
    await db.productImage.deleteMany({ where: { productId: { in: ids } } });
    await db.productVariant.deleteMany({ where: { productId: { in: ids } } });
    await db.productCollection.deleteMany({ where: { productId: { in: ids } } });
    await db.product.deleteMany({ where: { id: { in: ids } } });
  }
  await db.category.deleteMany({ where: { slug: { in: ["test-chains", "test-rings"] } } });
  await db.collection.deleteMany({ where: { slug: "test-collection" } });
  return ids.length;
}

try {
  console.log("\n  Importer against Neon\n");

  await cleanup();

  const owner = await db.user.findFirst({ where: { role: "OWNER" }, select: { id: true } });
  if (!owner) throw new Error("No owner account — run npm run db:seed first.");

  // --- plan ---------------------------------------------------------------
  const plan = await planImport(SHEET, Object.keys(IMAGES));
  ok("plan succeeds", plan.ok, plan.ok ? "" : plan.message);

  if (plan.ok) {
    ok("three rows would be created", plan.data.totals.create === 3, `${plan.data.totals.create}`);
    ok("the bad row is rejected", plan.data.totals.reject === 1, `${plan.data.totals.reject}`);
    ok("nothing would be updated yet", plan.data.totals.update === 0);
    ok(
      "the new category is flagged",
      plan.data.rows.some((r) => r.newCategory === "Test Chains"),
    );
    ok(
      "the rejection says why",
      /price/i.test(plan.data.rows.find((r) => r.action === "reject")?.issues[0]?.message ?? ""),
      plan.data.rows.find((r) => r.action === "reject")?.issues[0]?.message,
    );
  }

  const before = await db.product.count({ where: { sku: { startsWith: "CS-TEST" } } });
  ok("plan wrote nothing", before === 0, `${before} products exist`);

  // --- first run ----------------------------------------------------------
  const first = await runImport(SHEET, IMAGES, owner.id);
  ok("import succeeds", first.ok, first.ok ? "" : first.message);

  if (first.ok) {
    ok("three created", first.data.created === 3, `${first.data.created}`);
    ok("one failed", first.data.failed.length === 1, `${first.data.failed.length}`);
    ok(
      "the failure names its line",
      first.data.failed[0]?.line === 4,
      `line ${first.data.failed[0]?.line}`,
    );
  }

  const chain = await db.product.findUnique({
    where: { sku: "CS-TESTA" },
    select: {
      title: true, price: true, compareAtPrice: true, status: true, isNewArrival: true,
      tags: true,
      category: { select: { name: true, slug: true } },
      images: { select: { publicId: true, isPrimary: true } },
      collections: { select: { collection: { select: { name: true } } } },
    },
  });

  ok("the chain exists", Boolean(chain), chain?.title);
  ok("rupees became paise", chain?.price === 120000, `${chain?.price}`);
  ok("the struck-through price stored", chain?.compareAtPrice === 160000, `${chain?.compareAtPrice}`);
  ok("it is on sale", chain?.status === "ACTIVE", chain?.status);
  ok("the homepage flag stuck", chain?.isNewArrival === true);
  ok("the category was created", chain?.category.slug === "test-chains", chain?.category.name);
  ok("the collection was created", chain?.collections[0]?.collection.name === "Test Collection");
  ok("the photo is attached and primary", chain?.images[0]?.isPrimary === true, chain?.images[0]?.publicId);
  ok("tags stored lowercase", JSON.stringify(chain?.tags) === '["chain","test"]', String(chain?.tags));

  const ring = await db.product.findUnique({
    where: { sku: "CS-TESTB" },
    select: {
      stock: true,
      variants: { orderBy: { sortOrder: "asc" }, select: { label: true, priceDelta: true, stock: true } },
    },
  });

  ok("the ring has two options", ring?.variants.length === 2, `${ring?.variants.length}`);
  ok("the second costs 400 more", ring?.variants[1]?.priceDelta === 40000, `${ring?.variants[1]?.priceDelta}`);
  ok("per-option stock is taken as written", ring?.variants.map((v) => v.stock).join(",") === "5,1",
    ring?.variants.map((v) => v.stock).join(","));
  ok("product-level stock moved to the options", ring?.stock === 0, `${ring?.stock}`);

  // --- second run, a price change ----------------------------------------
  const changed = SHEET.replace("Test Chain A,Test Chains,1200,1600", "Test Chain A,Test Chains,1350,1600");
  const second = await runImport(changed, IMAGES, owner.id);

  ok("re-import succeeds", second.ok);
  if (second.ok) {
    ok("nothing duplicated", second.data.created === 0, `${second.data.created} created`);
    ok("three updated", second.data.updated === 3, `${second.data.updated}`);
  }

  const after = await db.product.findUnique({
    where: { sku: "CS-TESTA" },
    select: { price: true },
  });
  ok("the new price took", after?.price === 135000, `${after?.price}`);

  const total = await db.product.count({ where: { sku: { startsWith: "CS-TEST" } } });
  ok("still only three test products", total === 3, `${total}`);

  // --- images given as URLs ----------------------------------------------
  const byUrl = await db.product.findUnique({
    where: { sku: "CS-TESTD" },
    select: {
      status: true,
      images: { orderBy: { sortOrder: "asc" }, select: { publicId: true, isPrimary: true } },
    },
  });
  ok("a product whose photos are URLs imports", Boolean(byUrl), byUrl?.status);
  ok("...with both URLs attached", byUrl?.images.length === 2, `${byUrl?.images.length}`);
  ok("...the first marked primary", byUrl?.images[0]?.isPrimary === true);
  ok("...and it went on sale with no upload at all", byUrl?.status === "ACTIVE", byUrl?.status);

  const { cdnUrl } = await import("../src/lib/images/url.ts");
  const src = cdnUrl(byUrl.images[0].publicId);
  ok("...and the shop serves that URL unchanged",
    src === "https://images.example.com/d-1.jpg", src);


  // --- export round trip --------------------------------------------------
  const exported = await exportProducts();
  ok("export succeeds", exported.ok);

  if (exported.ok) {
    const reparsed = parseProductCsv(exported.data);
    ok("the export has no missing columns", reparsed.missingColumns.length === 0,
      reparsed.missingColumns.join(","));
    ok("the export has no unknown columns", reparsed.unknownColumns.length === 0,
      reparsed.unknownColumns.join(","));

    const row = reparsed.rows.find((r) => r.serial === "TESTA");
    ok("the exported chain parses back", Boolean(row?.draft), row?.issues.map((i) => i.message).join("; "));
    ok("...at the same price", row?.draft?.priceRupees === 1350, String(row?.draft?.priceRupees));

    const ringRow = reparsed.rows.find((r) => r.serial === "TESTB");
    ok("...and the two options survive the round trip",
      ringRow?.draft?.variants.length === 2 && ringRow.draft.variants[1].priceDeltaRupees === 400,
      JSON.stringify(ringRow?.draft?.variants));
    ok("...with their stock intact, not evenly split",
      ringRow?.draft?.variants.map((v) => v.stock).join(",") === "5,1",
      ringRow?.draft?.variants.map((v) => v.stock).join(","));
  }
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
