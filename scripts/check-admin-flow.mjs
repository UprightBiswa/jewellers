/**
 * Walks the admin the way Rahul does, against a running server.
 *
 * Every check asserts on something the page must contain, not just a 200 —
 * a stale server returning an old build answers 200 for everything, which is
 * exactly how a "fixed" page went on being broken for three rounds of testing.
 *
 *   npm run check:admin                      # against localhost:3005
 *   BASE=http://localhost:3000 npm run check:admin
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { createHash } from "node:crypto";

const BASE = (process.env.BASE ?? "http://127.0.0.1:3005").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL ?? "charubalasilver@gmail.com";
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error("\n  Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) to run this.\n");
  process.exit(1);
}

let pass = 0;
let fail = 0;
const ok = (name, condition, detail = "") => {
  console.log(`  ${condition ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  condition ? pass++ : fail++;
};

/** The secret path, derived exactly as src/config/admin.ts derives it. */
function adminDoor() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return "";
  return createHash("sha256").update(`charubala:admin-door:${secret}`).digest("hex").slice(0, 16);
}

const jar = new Map();

function absorb(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}

const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  absorb(res);
  const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
  return { status: res.status, body, location: res.headers.get("location") };
}

async function post(path, form) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie: cookieHeader(), "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
    redirect: "manual",
  });
  absorb(res);
  return { status: res.status, location: res.headers.get("location") };
}

console.log(`\n  Admin flow against ${BASE}\n`);

try {
  // --- the door ------------------------------------------------------------
  const door = adminDoor();
  const closed = await get("/admin/products");
  ok("/admin is a 404 before the door", closed.status === 404, `status ${closed.status}`);

  await get(`/${door}`);
  const login = await get("/admin/login");
  ok("the door opens the login page", login.status === 200, `status ${login.status}`);

  // --- sign in -------------------------------------------------------------
  const csrfRes = await get("/api/auth/csrf");
  const { csrfToken } = JSON.parse(csrfRes.body);
  await post("/api/auth/callback/credentials", {
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    scope: "admin",
  });

  const dash = await get("/admin");
  ok("the owner reaches the dashboard", dash.status === 200, `status ${dash.status}`);

  // --- listing -------------------------------------------------------------
  const list = await get("/admin/products");
  ok("the product list opens", list.status === 200, `status ${list.status}`);
  ok("...with search", list.body.includes("Search by name"));
  ok("...with status tabs", list.body.includes("Filter by status"));
  ok("...with the category filter", list.body.includes("Filter by category"));
  ok("...with select-all for bulk actions", list.body.includes("Select all on this page"));
  ok("...with the import link", list.body.includes("Import a sheet"));

  const ids = [...list.body.matchAll(/\/admin\/products\/(c[a-z0-9]{20,})/g)].map((m) => m[1]);
  const uniqueIds = [...new Set(ids)];
  ok("...and rows that link to a product", uniqueIds.length > 0, `${uniqueIds.length} rows`);

  // Filters must actually narrow the list, not merely answer 200.
  const all = await get("/admin/products");
  const rings = await get("/admin/products?category=rings");
  const countRows = (b) => [...new Set([...b.matchAll(/\/admin\/products\/(c[a-z0-9]{20,})/g)].map((m) => m[1]))].length;
  ok("the category filter narrows the list",
    countRows(rings.body) > 0 && countRows(rings.body) < countRows(all.body),
    `${countRows(rings.body)} of ${countRows(all.body)}`);

  const drafts = await get("/admin/products?status=DRAFT");
  ok("the status filter answers", drafts.status === 200, `${countRows(drafts.body)} drafts`);

  // --- detail --------------------------------------------------------------
  const detail = await get(`/admin/products/${uniqueIds[0]}`);
  ok("a product opens", detail.status === 200, `status ${detail.status}`);
  ok("...showing the price field", detail.body.includes("Selling price"));
  ok("...the purity field", detail.body.includes("Purity"));
  ok("...the photo uploader", /photo|Photo/.test(detail.body));
  ok("...and a save button", detail.body.includes("Save"));
  ok("...and the delete option", /Delete|delete/.test(detail.body));

  // --- a product that is gone ---------------------------------------------
  const missing = await get("/admin/products/cmissingproduct000000000");
  ok("a deleted product says so", missing.body.includes("is not here any more"),
    `status ${missing.status}`);
  // The symptom that actually stranded the owner: notFound() throwing into a
  // boundary this Next version never renders, leaving the stream unresolved.
  // The skeleton markup itself still appears in the payload as the Suspense
  // fallback definition, which is normal and invisible.
  ok("...and the stream is not left unresolved",
    !missing.body.includes("NEXT_HTTP_ERROR_FALLBACK"),
    missing.body.includes("NEXT_HTTP_ERROR_FALLBACK") ? "notFound() stalled the stream" : "");
  ok("...and offers a way back", missing.body.includes("All products"));

  const missingOrder = await get("/admin/orders/cmissingorder00000000000");
  ok("a missing order says so too", missingOrder.body.includes("is not here any more"));

  // --- import --------------------------------------------------------------
  const imp = await get("/admin/products/import");
  ok("the import page opens", imp.status === 200, `status ${imp.status}`);
  ok("...offering the spreadsheet picker", imp.body.includes("The spreadsheet"));
  ok("...the photograph picker", imp.body.includes("The photographs"));
  ok("...a check button", imp.body.includes("Check the sheet"));
  ok("...an export button", imp.body.includes("Export what is already here"));

  const blank = await get("/templates/products-blank.csv");
  ok("the blank sheet downloads", blank.status === 200, `status ${blank.status}`);
  ok("...and is genuinely blank", blank.status === 200 && blank.body.trim().split("\n").length === 1,
    `${blank.body.trim().split("\n").length} line(s)`);

  const example = await get("/templates/products-template.csv");
  ok("the example sheet downloads", example.status === 200);
  ok("...and has example rows", example.body.trim().split("\n").length > 1,
    `${example.body.trim().split("\n").length} lines`);

  // --- other admin screens -------------------------------------------------
  for (const [path, needle] of [
    ["/admin/orders", "Orders"],
    ["/admin/coupons", "Offers"],
    ["/admin/messages", "Messages"],
    ["/admin/settings", "Settings"],
    ["/admin/rate", "rate"],
    ["/admin/categories", "Add a category"],
    ["/admin/collections", "Add a collection"],
    ["/admin/reviews", "Reviews"],
    ["/admin/customers", "Customers"],
    ["/admin/pages", "Add a page"],
    ["/admin/homepage", "Add a slide"],
  ]) {
    const r = await get(path);
    ok(`${path} opens`, r.status === 200 && r.body.includes(needle), `status ${r.status}`);
  }

  // The five new screens have to be reachable, not merely to exist.
  const nav = await get("/admin");
  for (const href of [
    "/admin/categories", "/admin/collections", "/admin/reviews",
    "/admin/customers", "/admin/pages", "/admin/homepage",
  ]) {
    ok(`${href} is in the sidebar`, nav.body.includes(`href="${href}"`));
  }

  // Real data, not an empty shell.
  const cats = await get("/admin/categories");
  // Interpolated values land in separate text nodes with React's comment
  // markers between them, so the rendered line is never one contiguous string.
  ok("categories list real rows",
    cats.body.includes("Earrings") && /pieces?<!--/.test(cats.body),
    cats.body.includes("Earrings") ? "" : "no category names found");

  const pagesScreen = await get("/admin/pages");
  ok("pages list the real policy pages", /\/pages\/(privacy-policy|terms|returns)/.test(pagesScreen.body));

  const customers = await get("/admin/customers");
  ok("customers list real accounts", /@/.test(customers.body));

  // The front page must be editable, and the shop must be reading those rows
  // rather than the hardcoded function that used to be in the page component.
  const home = await get("/admin/homepage");
  ok("the front page slides are listed", home.body.includes("Silver made by hand"),
    home.body.includes("No slides") ? "none in the database" : "");

  const shop = await get("/");
  ok("the shop renders the slides from the database",
    shop.body.includes("Silver made by hand") && shop.body.includes("not by a catalogue"));
  ok("...and the storefront nav has a Home link", shop.body.includes(">Home<"));
  // The actual script only loads when the app is running on Vercel, so locally
  // all that proves mounting is the components being in the tree.
  ok("...and analytics is mounted",
    shop.body.includes("Analytics") && shop.body.includes("Insights"),
    "the script itself only loads on Vercel");

  // --- the upload signature the pickers depend on --------------------------
  const sign = await fetch(`${BASE}/api/v1/admin/upload-sign`, {
    method: "POST",
    headers: { cookie: cookieHeader(), "content-type": "application/json" },
    body: JSON.stringify({ folder: "products" }),
  });
  const signJson = await sign.json().catch(() => null);
  ok("photo uploads can be signed", sign.ok && signJson?.ok === true,
    signJson?.error?.message ?? `status ${sign.status}`);
  ok("...and the signature is for our cloud",
    Boolean(signJson?.data?.uploadUrl?.includes("api.cloudinary.com")),
    signJson?.data?.uploadUrl);
} catch (err) {
  console.error("\n  ERROR:", err?.message ?? err);
  fail++;
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
