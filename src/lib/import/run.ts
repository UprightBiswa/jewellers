import { db } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";
import { makeSku, slugify } from "@/lib/utils";
import { toCsv } from "./csv";
import { parseProductCsv, type ProductDraft } from "./products";

/**
 * The catalogue importer, without the session.
 *
 * Kept apart from the server actions in src/app/admin/import-actions.ts so it can
 * be run against a real database from a script — see scripts/test-import-db.mjs.
 * An importer that can only be exercised by clicking through a browser is an
 * importer nobody checks before pointing it at three hundred live prices.
 */

export type ImportResult<T> = { ok: true; data: T } | { ok: false; message: string };

/**
 * The sku a row maps to.
 *
 * A re-import has to find the product it created last time, and `serial` is not
 * stored on the product. Deriving a stable sku from the serial makes the whole
 * operation repeatable: export, edit in Sheets, import again, and only the rows
 * that changed change.
 */
function skuFor(draft: ProductDraft): string {
  const given = draft.sku?.trim().toUpperCase();
  if (given) return given;
  const cleaned = draft.serial.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `CS-${cleaned || makeSku("IMP").slice(-5)}`;
}

/**
 * Which uploaded files belong to this row.
 *
 * Either the row names them, or — the common case, because typing 900 filenames
 * into a spreadsheet is its own afternoon — every file whose name starts with
 * the serial is taken, in name order.
 */
function resolveImages(draft: ProductDraft, available: string[]): {
  found: string[];
  missing: string[];
} {
  const lookup = new Map(available.map((n) => [n.toLowerCase(), n]));

  if (draft.imageNames.length > 0) {
    const found: string[] = [];
    const missing: string[] = [];
    for (const name of draft.imageNames) {
      // A full URL is already an image; it needs no upload and cannot be missing.
      if (/^https?:\/\//i.test(name)) {
        found.push(name);
        continue;
      }
      const hit = lookup.get(name.toLowerCase());
      if (hit) found.push(hit);
      else missing.push(name);
    }
    return { found, missing };
  }

  const prefix = `${draft.serial.toLowerCase()}-`;
  const found = available
    .filter((n) => n.toLowerCase().startsWith(prefix))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return { found, missing: [] };
}

export type PlannedRow = {
  line: number;
  serial: string;
  title: string;
  sku: string;
  action: "create" | "update" | "reject";
  issues: { column?: string; message: string }[];
  imagesFound: string[];
  imagesMissing: string[];
  newCategory: string | null;
  newCollections: string[];
};

export type ImportPlan = {
  unknownColumns: string[];
  missingColumns: string[];
  totals: { create: number; update: number; reject: number };
  rows: PlannedRow[];
};

/** Reads the file and reports what would happen. Writes nothing. */
export async function planImport(
  csvText: string,
  imageFileNames: string[],
): Promise<ImportResult<ImportPlan>> {
  const parsed = parseProductCsv(csvText);

  if (parsed.missingColumns.length > 0) {
    return {
      ok: false,
      message: `The sheet is missing these columns: ${parsed.missingColumns.join(", ")}. Download the blank sheet and start from that.`,
    };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, message: "That file has a header but no product rows." };
  }

  const drafts = parsed.rows.map((r) => r.draft).filter(Boolean) as ProductDraft[];

  // One query each rather than one per row — three hundred rows would otherwise
  // be nine hundred round trips to Neon.
  const [existing, categories, collections] = await Promise.all([
    db.product.findMany({
      where: { sku: { in: drafts.map(skuFor) } },
      select: { id: true, sku: true },
    }),
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.collection.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const bySku = new Map(existing.map((p) => [p.sku, p.id]));
  const catSlugs = new Set(categories.map((c) => c.slug));
  const colSlugs = new Set(collections.map((c) => c.slug));

  const rows: PlannedRow[] = parsed.rows.map((row) => {
    const base = {
      line: row.line,
      serial: row.serial,
      title: row.title,
      issues: row.issues,
    };

    if (!row.draft) {
      return {
        ...base,
        sku: "",
        action: "reject" as const,
        imagesFound: [],
        imagesMissing: [],
        newCategory: null,
        newCollections: [],
      };
    }

    const draft = row.draft;
    const sku = skuFor(draft);
    const { found, missing } = resolveImages(draft, imageFileNames);
    const issues = [...row.issues];

    if (missing.length > 0) {
      issues.push({
        column: "images",
        message: `These photos were not in the folder: ${missing.join(", ")}`,
      });
    }
    if (draft.status === "ACTIVE" && found.length === 0) {
      issues.push({
        column: "images",
        message: "No photo found for this serial, so it cannot go on sale.",
      });
    }

    const categorySlug = slugify(draft.categoryName);
    const newCollections = draft.collections.filter((c) => !colSlugs.has(slugify(c)));

    return {
      ...base,
      issues,
      sku,
      action: issues.length > 0 ? "reject" : bySku.has(sku) ? "update" : "create",
      imagesFound: found,
      imagesMissing: missing,
      newCategory: catSlugs.has(categorySlug) ? null : draft.categoryName,
      newCollections,
    };
  });

  return {
    ok: true,
    data: {
      unknownColumns: parsed.unknownColumns,
      missingColumns: parsed.missingColumns,
      totals: {
        create: rows.filter((r) => r.action === "create").length,
        update: rows.filter((r) => r.action === "update").length,
        reject: rows.filter((r) => r.action === "reject").length,
      },
      rows,
    },
  };
}

export type UploadedImage = {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
};

export type CommitResult = {
  created: number;
  updated: number;
  failed: { line: number; serial: string; title: string; message: string }[];
};

/**
 * Writes the rows.
 *
 * Each product is its own small transaction rather than all three hundred in
 * one. A single transaction that large will hit Neon's statement timeout, and
 * when it does the whole afternoon's work rolls back. Per-product means a
 * failure costs one row, and the row is reported by line number so it can be
 * fixed and re-uploaded on its own.
 */
export async function runImport(
  csvText: string,
  images: Record<string, UploadedImage>,
  actorId: string,
): Promise<ImportResult<CommitResult>> {
  const parsed = parseProductCsv(csvText);
  if (parsed.missingColumns.length > 0) {
    return { ok: false, message: `The sheet is missing: ${parsed.missingColumns.join(", ")}.` };
  }

  const available = Object.keys(images);
  const result: CommitResult = { created: 0, updated: 0, failed: [] };

  // Categories and collections are resolved once and cached, so a sheet of 300
  // chains does not ask for the Chains category 300 times.
  const categoryCache = new Map<string, string>();
  const collectionCache = new Map<string, string>();

  async function categoryId(name: string): Promise<string> {
    const slug = slugify(name);
    const cached = categoryCache.get(slug);
    if (cached) return cached;

    const found =
      (await db.category.findUnique({ where: { slug }, select: { id: true } })) ??
      (await db.category.create({
        data: { slug, name: name.trim(), isActive: true },
        select: { id: true },
      }));

    categoryCache.set(slug, found.id);
    return found.id;
  }

  async function collectionId(name: string): Promise<string> {
    const slug = slugify(name);
    const cached = collectionCache.get(slug);
    if (cached) return cached;

    const found =
      (await db.collection.findUnique({ where: { slug }, select: { id: true } })) ??
      (await db.collection.create({
        data: { slug, name: name.trim(), isActive: true },
        select: { id: true },
      }));

    collectionCache.set(slug, found.id);
    return found.id;
  }

  for (const row of parsed.rows) {
    if (!row.draft) {
      result.failed.push({
        line: row.line,
        serial: row.serial,
        title: row.title,
        message: row.issues.map((i) => i.message).join(" "),
      });
      continue;
    }

    const draft = row.draft;
    const sku = skuFor(draft);

    try {
      const { found, missing } = resolveImages(draft, available);

      if (missing.length > 0) {
        throw new Error(`Photos not found: ${missing.join(", ")}`);
      }
      if (draft.status === "ACTIVE" && found.length === 0) {
        throw new Error("No photo for this serial, so it cannot go on sale.");
      }

      const catId = await categoryId(draft.categoryName);
      const colIds = await Promise.all(draft.collections.map(collectionId));

      const data = {
        title: draft.title,
        titleBn: draft.titleBn,
        shortDesc: draft.shortDesc,
        description: draft.description,
        categoryId: catId,
        status: draft.status,
        purity: draft.purity,
        priceMode: draft.priceMode,
        price: rupeesToPaise(draft.priceRupees),
        compareAtPrice: draft.compareAtRupees ? rupeesToPaise(draft.compareAtRupees) : null,
        weightG: draft.weightG ?? null,
        stock: draft.stock,
        hallmarked: draft.hallmarked,
        huid: draft.huid,
        isFeatured: draft.isFeatured,
        isTrending: draft.isTrending,
        isNewArrival: draft.isNewArrival,
        tags: draft.tags,
        metaTitle: draft.metaTitle,
        metaDescription: draft.metaDescription,
        publishedAt: draft.status === "ACTIVE" ? new Date() : null,
      };

      const existing = await db.product.findUnique({ where: { sku }, select: { id: true } });

      await db.$transaction(async (tx) => {
        let productId: string;

        if (existing) {
          await tx.product.update({ where: { id: existing.id }, data });
          productId = existing.id;
        } else {
          let slug = slugify(draft.title);
          for (let n = 2; await tx.product.findUnique({ where: { slug } }); n++) {
            slug = `${slugify(draft.title)}-${n}`;
          }
          const created = await tx.product.create({
            data: { ...data, slug, sku },
            select: { id: true },
          });
          productId = created.id;
        }

        // Photographs are replaced wholesale. The sheet is the source of truth
        // for an imported product; a merge would leave orphans from a previous
        // run that nobody can see to remove.
        if (found.length > 0) {
          await tx.productImage.deleteMany({ where: { productId } });
          await tx.productImage.createMany({
            data: found.map((name, i) => {
              const img = /^https?:\/\//i.test(name)
                ? { publicId: name, url: name, width: undefined, height: undefined }
                : images[name];
              return {
                productId,
                publicId: img.publicId,
                url: img.url,
                alt: draft.title,
                width: img.width,
                height: img.height,
                sortOrder: i,
                isPrimary: i === 0,
              };
            }),
          });
        }

        // Variants are replaced by label. Keeping the ids of options that still
        // exist matters: a variant id sits in live carts and in past orders.
        const existingVariants = await tx.productVariant.findMany({
          where: { productId },
          select: { id: true, label: true },
        });
        const byLabel = new Map(existingVariants.map((v) => [v.label, v.id]));
        const keep: string[] = [];

        for (const [i, v] of draft.variants.entries()) {
          const id = byLabel.get(v.label);
          const fields = {
            label: v.label,
            stock: v.stock,
            priceDelta: rupeesToPaise(v.priceDeltaRupees),
            sortOrder: i,
          };
          if (id) {
            await tx.productVariant.update({ where: { id }, data: fields });
            keep.push(id);
          } else {
            const made = await tx.productVariant.create({
              data: { ...fields, productId, sku: makeSku(v.label) },
              select: { id: true },
            });
            keep.push(made.id);
          }
        }

        await tx.productVariant.deleteMany({
          where: { productId, ...(keep.length ? { id: { notIn: keep } } : {}) },
        });

        await tx.productCollection.deleteMany({ where: { productId } });
        if (colIds.length > 0) {
          await tx.productCollection.createMany({
            data: colIds.map((collectionId) => ({ productId, collectionId })),
          });
        }
      });

      existing ? result.updated++ : result.created++;
    } catch (err) {
      result.failed.push({
        line: row.line,
        serial: row.serial,
        title: row.title,
        message: err instanceof Error ? err.message : "Something went wrong on this row.",
      });
    }
  }

  await db.auditLog
    .create({
      data: {
        actorId,
        action: "import",
        entity: "Product",
        diff: {
          created: result.created,
          updated: result.updated,
          failed: result.failed.length,
        },
      },
    })
    .catch(() => undefined);


  return { ok: true, data: result };
}

/**
 * The catalogue as a sheet, in exactly the columns the importer reads.
 *
 * This is what makes the whole thing a loop rather than a one-way door: export,
 * change forty prices in Sheets, import again.
 */
export async function exportProducts(): Promise<ImportResult<string>> {
  const products = await db.product.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      sku: true,
      title: true,
      titleBn: true,
      shortDesc: true,
      description: true,
      priceMode: true,
      price: true,
      compareAtPrice: true,
      weightG: true,
      purity: true,
      hallmarked: true,
      huid: true,
      stock: true,
      isFeatured: true,
      isTrending: true,
      isNewArrival: true,
      tags: true,
      status: true,
      metaTitle: true,
      metaDescription: true,
      category: { select: { name: true } },
      variants: { orderBy: { sortOrder: "asc" }, select: { label: true, priceDelta: true, stock: true } },
      collections: { select: { collection: { select: { name: true } } } },
      images: { orderBy: { sortOrder: "asc" }, select: { publicId: true } },
    },
  });

  const PURITY_OUT: Record<string, string> = {
    S925: "925",
    S999: "999",
    PLATED: "plated",
    GOLD_PLATED: "gold-plated",
    OXIDISED: "oxidised",
  };

  const headers = [
    "serial", "sku", "title", "title_bn", "category", "short_desc", "description",
    "price_mode", "price_rupees", "compare_at_rupees", "weight_g", "purity",
    "hallmarked", "huid", "sizes", "stock", "collections", "homepage", "tags",
    "status", "meta_title", "meta_description", "images",
  ];

  const rows = products.map((p) => {
    const homepage = [
      p.isFeatured && "featured",
      p.isTrending && "trending",
      p.isNewArrival && "new",
    ].filter(Boolean);

    // Always label|delta|stock when there are options. Dropping the stock here
    // is how a round trip silently zeroes inventory.
    const sizes = p.variants
      .map((v) => `${v.label}|${v.priceDelta / 100}|${v.stock}`)
      .join(",");

    return [
      // The serial is recovered from the sku, so a re-import matches the same row.
      p.sku.startsWith("CS-") ? p.sku.slice(3) : p.sku,
      p.sku,
      p.title,
      p.titleBn ?? "",
      p.category.name,
      p.shortDesc ?? "",
      p.description ?? "",
      p.priceMode.toLowerCase(),
      p.price / 100,
      p.compareAtPrice ? p.compareAtPrice / 100 : "",
      p.weightG ? String(p.weightG) : "",
      PURITY_OUT[p.purity] ?? "925",
      p.hallmarked ? "yes" : "no",
      p.huid ?? "",
      sizes,
      // With options, stock lives in the sizes cell above; this stays the total
      // so the sheet still reads sensibly to a human.
      p.variants.length > 0 ? p.variants.reduce((n, v) => n + v.stock, 0) : p.stock,
      p.collections.map((c) => c.collection.name).join(","),
      homepage.join(","),
      p.tags.join(","),
      p.status.toLowerCase(),
      p.metaTitle ?? "",
      p.metaDescription ?? "",
      p.images.map((i) => i.publicId).join(","),
    ];
  });

  return { ok: true, data: toCsv(headers, rows) };
}
