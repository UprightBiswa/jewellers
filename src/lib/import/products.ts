import { parseCsvRecords } from "./csv";

/**
 * Turning a spreadsheet row into a product.
 *
 * Every rule here is documented in docs/BULK-IMPORT.md, and the two must agree —
 * the sheet is filled in by someone who read the document, not the code.
 *
 * The guiding decision: a bad row is reported, never guessed at and never
 * silently dropped. Importing 300 products where four quietly became zero rupees
 * is worse than importing 296 and being told about the other four.
 */

export const REQUIRED_COLUMNS = ["serial", "title", "category", "price_rupees", "stock"] as const;

export const KNOWN_COLUMNS = [
  "serial", "sku", "title", "title_bn", "category", "short_desc", "description",
  "price_mode", "price_rupees", "compare_at_rupees", "weight_g", "purity",
  "hallmarked", "huid", "sizes", "stock", "collections", "homepage", "tags",
  "status", "meta_title", "meta_description", "images",
] as const;

export type Purity = "S925" | "S999" | "PLATED" | "GOLD_PLATED" | "OXIDISED";
export type Status = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type DraftVariant = { label: string; priceDeltaRupees: number; stock: number };

export type ProductDraft = {
  serial: string;
  sku: string | null;
  title: string;
  titleBn: string | null;
  categoryName: string;
  shortDesc: string | null;
  description: string | null;
  priceMode: "FIXED" | "WEIGHT";
  priceRupees: number;
  compareAtRupees: number | null;
  weightG: number | null;
  purity: Purity;
  hallmarked: boolean;
  huid: string | null;
  variants: DraftVariant[];
  stock: number;
  collections: string[];
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  tags: string[];
  status: Status;
  metaTitle: string | null;
  metaDescription: string | null;
  imageNames: string[];
};

export type RowIssue = { column?: string; message: string };

export type ParsedRow = {
  /** Line number in the file, so the owner can find the row in his sheet. */
  line: number;
  serial: string;
  title: string;
  issues: RowIssue[];
  draft: ProductDraft | null;
};

export type ParseResult = {
  headers: string[];
  unknownColumns: string[];
  missingColumns: string[];
  rows: ParsedRow[];
};

/* -------------------------------------------------------------------------- */
/* Cell readers                                                               */
/* -------------------------------------------------------------------------- */

const text = (v?: string) => (v ?? "").trim() || null;

/** Splits "a, b ,c" into ["a","b","c"], dropping the empties. */
function list(v?: string): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Rupees as typed. Accepts "1,299", "Rs 1299" and "1299.00" — all of which a
 * spreadsheet produces depending on how the cell happened to be formatted.
 */
function money(v?: string): number | null {
  const cleaned = (v ?? "").replace(/[^0-9.+-]/g, "");
  if (!cleaned || cleaned === "+" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function bool(v?: string): boolean {
  return ["yes", "y", "true", "1"].includes((v ?? "").trim().toLowerCase());
}

const PURITY: Record<string, Purity> = {
  "925": "S925",
  s925: "S925",
  "925 sterling silver": "S925",
  sterling: "S925",
  "999": "S999",
  s999: "S999",
  fine: "S999",
  plated: "PLATED",
  "silver plated": "PLATED",
  "gold-plated": "GOLD_PLATED",
  "gold plated": "GOLD_PLATED",
  oxidised: "OXIDISED",
  oxidized: "OXIDISED",
};

/**
 * The sizes cell, which does double duty.
 *
 *   8,10,12                          three sizes at one price
 *   925 Sterling|0,999 Fine|+400     two options at different prices
 *   Small|0|3,Large|+200|5           ...and their own stock counts
 *
 * The second form is how one design is sold in two silver qualities without
 * becoming two products — one page, one set of photographs, one review thread.
 *
 * The third exists because the export writes it. Without a per-option stock the
 * round trip loses inventory: export a ring with 5 small and 1 large, change its
 * price in Sheets, import again, and the counts come back evenly split. Nobody
 * would notice until a customer bought a size that was not there.
 */
function parseVariants(
  cell: string | undefined,
  totalStock: number,
): { variants: DraftVariant[]; issues: RowIssue[] } {
  const parts = list(cell);
  if (parts.length === 0) return { variants: [], issues: [] };

  const issues: RowIssue[] = [];
  const variants: DraftVariant[] = [];

  // Stock is given for the product as a whole, so it is spread across the
  // options rather than multiplied by them. The remainder goes to the first few.
  const each = Math.floor(totalStock / parts.length);
  const remainder = totalStock % parts.length;

  parts.forEach((part, i) => {
    const [rawLabel, rawDelta, rawStock] = part.split("|");
    const label = rawLabel?.trim();

    if (!label) {
      issues.push({ column: "sizes", message: `Option ${i + 1} has no name.` });
      return;
    }

    let delta = 0;
    if (rawDelta != null && rawDelta.trim() !== "") {
      const parsed = money(rawDelta);
      if (parsed == null) {
        issues.push({
          column: "sizes",
          message: `"${rawDelta.trim()}" is not a price difference for "${label}". Use a number such as +400 or -100.`,
        });
        return;
      }
      delta = parsed;
    }

    let optionStock = each + (i < remainder ? 1 : 0);
    if (rawStock != null && rawStock.trim() !== "") {
      const given = Number(rawStock.trim());
      if (!Number.isInteger(given) || given < 0) {
        issues.push({
          column: "sizes",
          message: `"${rawStock.trim()}" is not a stock count for "${label}". Use a whole number.`,
        });
        return;
      }
      optionStock = given;
    }

    variants.push({ label, priceDeltaRupees: delta, stock: optionStock });
  });

  return { variants, issues };
}

/* -------------------------------------------------------------------------- */
/* Row to draft                                                               */
/* -------------------------------------------------------------------------- */

function parseRow(line: number, v: Record<string, string>): ParsedRow {
  const issues: RowIssue[] = [];
  const serial = (v.serial ?? "").trim();
  const title = (v.title ?? "").trim();

  const fail = (column: string, message: string) => issues.push({ column, message });

  if (!serial) fail("serial", "Every row needs a serial — it is what links the photographs.");
  if (!title) fail("title", "A product needs a name.");

  const category = (v.category ?? "").trim();
  if (!category) fail("category", "Which category? Chains, Rings, Earrings, and so on.");

  const priceRupees = money(v.price_rupees);
  if (priceRupees == null) fail("price_rupees", "Enter a price in rupees, such as 1200.");
  else if (priceRupees < 0) fail("price_rupees", "A price cannot be negative.");

  const compareAtRupees = money(v.compare_at_rupees);
  if (compareAtRupees != null && priceRupees != null && compareAtRupees <= priceRupees) {
    fail(
      "compare_at_rupees",
      `The struck-through price (${compareAtRupees}) has to be more than the selling price (${priceRupees}), or left blank.`,
    );
  }

  const stockRaw = (v.stock ?? "").trim();
  const stock = stockRaw === "" ? 0 : Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    fail("stock", `"${stockRaw}" is not a whole number of pieces.`);
  }

  const purityRaw = (v.purity ?? "").trim().toLowerCase();
  const purity = purityRaw ? PURITY[purityRaw] : "S925";
  if (purityRaw && !purity) {
    fail("purity", `"${v.purity}" is not a purity. Use 925, 999, plated, gold-plated or oxidised.`);
  }

  const priceModeRaw = (v.price_mode ?? "").trim().toLowerCase();
  const priceMode = priceModeRaw === "weight" ? "WEIGHT" : "FIXED";
  const weightG = money(v.weight_g);
  if (priceMode === "WEIGHT" && !weightG) {
    fail("weight_g", "Weight-priced pieces need a weight in grams.");
  }

  const statusRaw = (v.status ?? "").trim().toLowerCase();
  if (statusRaw && !["active", "draft", "archived"].includes(statusRaw)) {
    fail("status", `"${v.status}" is not a status. Use active or draft.`);
  }
  const status: Status =
    statusRaw === "active" ? "ACTIVE" : statusRaw === "archived" ? "ARCHIVED" : "DRAFT";

  const { variants, issues: variantIssues } = parseVariants(v.sizes, Math.max(0, stock || 0));
  issues.push(...variantIssues);

  const homepage = list(v.homepage).map((s) => s.toLowerCase());
  const imageNames = list(v.images);

  // A product with no photograph may exist, but it cannot be on sale — the same
  // rule the admin form enforces, applied here so a sheet cannot go round it.
  if (status === "ACTIVE" && imageNames.length === 0) {
    fail(
      "images",
      "A live product needs at least one photo. Name the files 001-1.jpg, or set status to draft.",
    );
  }

  if (issues.length > 0) return { line, serial, title, issues, draft: null };

  return {
    line,
    serial,
    title,
    issues: [],
    draft: {
      serial,
      sku: text(v.sku),
      title,
      titleBn: text(v.title_bn),
      categoryName: category,
      shortDesc: text(v.short_desc),
      description: text(v.description),
      priceMode,
      priceRupees: priceRupees!,
      compareAtRupees,
      weightG,
      purity: purity ?? "S925",
      hallmarked: bool(v.hallmarked),
      huid: text(v.huid),
      variants,
      stock: variants.length > 0 ? 0 : stock,
      collections: list(v.collections),
      isFeatured: homepage.includes("featured"),
      isTrending: homepage.includes("trending"),
      isNewArrival: homepage.includes("new") || homepage.includes("new arrival"),
      tags: list(v.tags).map((t) => t.toLowerCase()),
      status,
      metaTitle: text(v.meta_title),
      metaDescription: text(v.meta_description),
      imageNames,
    },
  };
}

/* -------------------------------------------------------------------------- */

export function parseProductCsv(csv: string): ParseResult {
  const { headers, records } = parseCsvRecords(csv);

  const known = new Set<string>(KNOWN_COLUMNS);
  const unknownColumns = headers.filter((h) => h && !known.has(h));
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));

  const rows = records.map((r) => parseRow(r.line, r.values));

  // A serial used twice means two rows would fight over the same photographs, so
  // both are refused rather than one silently winning.
  const bySerial = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.serial) continue;
    bySerial.set(row.serial, [...(bySerial.get(row.serial) ?? []), row.line]);
  }
  for (const row of rows) {
    const lines = bySerial.get(row.serial);
    if (lines && lines.length > 1) {
      row.issues.push({
        column: "serial",
        message: `Serial "${row.serial}" is used on lines ${lines.join(", ")}. Each row needs its own.`,
      });
      row.draft = null;
    }
  }

  return { headers, unknownColumns, missingColumns, rows };
}
