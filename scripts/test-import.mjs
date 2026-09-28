/**
 * Tests for the catalogue importer's parsing.
 *
 * These are the cases a sheet from a real shop actually contains: commas inside
 * descriptions, quotes inside Bengali names, CRLF from Excel, a byte-order mark,
 * blank trailing rows, and prices typed as "1,299". Every one of them silently
 * corrupts a naive split(",").
 *
 *   npm run test:import
 */

import { parseCsv, parseCsvRecords, toCsv } from "../src/lib/import/csv.ts";
import { parseProductCsv } from "../src/lib/import/products.ts";

let pass = 0;
let fail = 0;

function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}`);
  if (!ok) {
    console.log(`          got  ${JSON.stringify(got)}`);
    console.log(`          want ${JSON.stringify(want)}`);
    fail++;
  } else pass++;
}

function ok(name, condition, detail = "") {
  console.log(`  ${condition ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  condition ? pass++ : fail++;
}

console.log("\n  CSV parsing\n");

check("plain row", parseCsv("a,b,c"), [["a", "b", "c"]]);

check(
  "comma inside a quoted field",
  parseCsv('a,"one, two",c'),
  [["a", "one, two", "c"]],
);

check(
  "escaped quote inside a field",
  parseCsv('a,"she said ""yes""",c'),
  [["a", 'she said "yes"', "c"]],
);

check(
  "newline inside a quoted field",
  parseCsv('a,"line one\nline two",c'),
  [["a", "line one\nline two", "c"]],
);

check("CRLF line endings", parseCsv("a,b\r\nc,d"), [["a", "b"], ["c", "d"]]);

check("byte-order mark is stripped", parseCsv("﻿serial,title")[0], ["serial", "title"]);

check("empty trailing field", parseCsv("a,b,"), [["a", "b", ""]]);

check("no trailing newline still yields the last row", parseCsv("a\nb"), [["a"], ["b"]]);

// Round trip: what we write, we can read back.
{
  const written = toCsv(["a", "b"], [["one, two", 'say "hi"'], ["line\nbreak", ""]]);
  const read = parseCsv(written);
  check("round trip through toCsv", read, [
    ["a", "b"],
    ["one, two", 'say "hi"'],
    ["line\nbreak", ""],
  ]);
}

console.log("\n  Records\n");
{
  const { headers, records } = parseCsvRecords("Serial No,Title\r\n001,Chain\r\n\r\n");
  check("headers are normalised", headers, ["serial_no", "title"]);
  ok("blank trailing rows are dropped", records.length === 1, `${records.length} record(s)`);
}

console.log("\n  Product rows\n");

const HEAD =
  "serial,title,category,price_rupees,stock,status,images,sizes,compare_at_rupees,purity,homepage,tags";

{
  const r = parseProductCsv(`${HEAD}\n001,Silver Chain,Chains,1000,2,draft,,,,925,new,"chain,silver"`);
  const row = r.rows[0];
  ok("a good row parses", row.draft !== null, row.issues.map((i) => i.message).join("; "));
  ok("price is kept in rupees", row.draft?.priceRupees === 1000, String(row.draft?.priceRupees));
  ok("purity maps to the enum", row.draft?.purity === "S925", row.draft?.purity);
  ok("homepage flag is read", row.draft?.isNewArrival === true);
  check("tags are split and lowercased", row.draft?.tags, ["chain", "silver"]);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,"1,299",2,draft,,,,,,`);
  ok("a price typed as 1,299 is read as 1299", r.rows[0].draft?.priceRupees === 1299,
    String(r.rows[0].draft?.priceRupees));
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,,2,draft,,,,,,`);
  ok("a missing price is refused", r.rows[0].draft === null);
  ok("...and says which column", r.rows[0].issues[0]?.column === "price_rupees",
    r.rows[0].issues[0]?.message);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,1000,2,draft,,,900,,,`);
  ok("a struck-through price below the selling price is refused", r.rows[0].draft === null,
    r.rows[0].issues[0]?.message);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,1000,2,active,,,,,,`);
  ok("an active product with no photo is refused", r.rows[0].draft === null,
    r.rows[0].issues[0]?.message);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,1000,2,active,001-1.jpg,,,,,`);
  ok("...but is fine once it has one", r.rows[0].draft !== null);
  check("image names are listed", r.rows[0].draft?.imageNames, ["001-1.jpg"]);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,1000,7,draft,,"8,10,12",,,,`);
  const v = r.rows[0].draft?.variants;
  ok("plain sizes become variants", v?.length === 3, `${v?.length}`);
  check("stock is spread, not multiplied", v?.map((x) => x.stock), [3, 2, 2]);
  ok("product stock moves to the variants", r.rows[0].draft?.stock === 0);
}

{
  const r = parseProductCsv(
    `${HEAD}\n001,Ring,Rings,1600,4,draft,,"925 Sterling|0,999 Fine|+400",,,,`,
  );
  const v = r.rows[0].draft?.variants;
  check("two silver qualities at two prices", v, [
    { label: "925 Sterling", priceDeltaRupees: 0, stock: 2 },
    { label: "999 Fine", priceDeltaRupees: 400, stock: 2 },
  ]);
}

{
  const r = parseProductCsv(`${HEAD}
001,Ring,Rings,1600,6,draft,,"Small|0|5,Large|+200|1",,,,`);
  check("per-option stock overrides the even split", r.rows[0].draft?.variants, [
    { label: "Small", priceDeltaRupees: 0, stock: 5 },
    { label: "Large", priceDeltaRupees: 200, stock: 1 },
  ]);
}

{
  const r = parseProductCsv(`${HEAD}
001,Ring,Rings,1600,4,draft,,"Small|0|two",,,,`);
  ok("a nonsense stock count is refused", r.rows[0].draft === null, r.rows[0].issues[0]?.message);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Ring,Rings,1600,4,draft,,"Small|abc",,,,`);
  ok("a nonsense price difference is refused", r.rows[0].draft === null,
    r.rows[0].issues[0]?.message);
}

{
  const r = parseProductCsv(`${HEAD}\n001,A,Chains,100,1,draft,,,,,,\n001,B,Chains,100,1,draft,,,,,,`);
  ok("a repeated serial refuses both rows",
    r.rows[0].draft === null && r.rows[1].draft === null);
  ok("...and names the lines", /lines 2, 3/.test(r.rows[0].issues.at(-1)?.message ?? ""),
    r.rows[0].issues.at(-1)?.message);
}

{
  const r = parseProductCsv("serial,title\n001,Chain");
  check("missing required columns are reported", r.missingColumns, [
    "category", "price_rupees", "stock",
  ]);
}

{
  const r = parseProductCsv(`${HEAD},colour\n001,Chain,Chains,100,1,draft,,,,,,,red`);
  check("an unknown column is reported, not fatal", r.unknownColumns, ["colour"]);
  ok("...and the row still imports", r.rows[0].draft !== null);
}

{
  const r = parseProductCsv(`${HEAD}\n001,Chain,Chains,1000,2,sold,,,,,,`);
  ok("an unknown status is refused", r.rows[0].draft === null, r.rows[0].issues[0]?.message);
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
