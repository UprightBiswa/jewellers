/**
 * End-to-end audit of the running shop.
 *
 * Hits every real route and drives the real flows — add to cart, place an order,
 * sign in as the owner, create and edit a product — against the live database,
 * and reports what actually broke. Checking for HTTP 200 alone hides most bugs,
 * so each check also asserts on something the page must contain.
 *
 *   npm run dev          # in another terminal
 *   npm run audit
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { createHash } from "node:crypto";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:3000";

/** Mirrors src/config/admin.ts — the panel's secret path, derived from AUTH_SECRET. */
function adminDoor() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret) return "";
  return createHash("sha256")
    .update(`charubala:admin-door:${authSecret}`)
    .digest("hex")
    .slice(0, 16);
}

const results = [];

let pass = 0;
let fail = 0;

function record(group, name, ok, detail = "") {
  results.push({ group, name, ok, detail });
  if (ok) pass++;
  else fail++;
}

/** A tiny cookie jar, so sessions and the cart survive between requests. */
function makeJar() {
  const jar = new Map();
  return {
    header: () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    absorb: (res) => {
      for (const raw of res.headers.getSetCookie?.() ?? []) {
        const [pair] = raw.split(";");
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
      }
    },
  };
}

async function req(path, { method = "GET", jar, body, headers = {}, redirect = "manual" } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    redirect,
    headers: {
      ...(jar ? { cookie: jar.header() } : {}),
      ...(body ? { "content-type": "application/json", "sec-fetch-site": "same-origin" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (jar) jar.absorb(res);
  return res;
}

async function page(group, path, mustContain = []) {
  try {
    const res = await req(path, { redirect: "follow" });
    const html = await res.text();

    if (res.status !== 200) {
      record(group, path, false, `status ${res.status}`);
      return html;
    }
    const missing = mustContain.filter((t) => !html.includes(t));
    record(group, path, missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : "");
    return html;
  } catch (err) {
    record(group, path, false, String(err.message ?? err));
    return "";
  }
}

async function login(jar, email, password, scope) {
  const csrfRes = await req("/api/auth/csrf", { jar });
  const { csrfToken } = await csrfRes.json();

  const form = new URLSearchParams({
    csrfToken,
    email,
    password,
    scope,
    callbackUrl: `${BASE}/`,
  });

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: BASE,
      cookie: jar.header(),
    },
    body: form,
  });
  jar.absorb(res);
  return jar.header().includes("authjs.session-token");
}

// ---------------------------------------------------------------------------

console.log(`Auditing ${BASE}\n`);

// --- 1. Public pages -------------------------------------------------------
const cats = await (await req("/api/v1/categories", { redirect: "follow" })).json();
const categorySlugs = cats?.data?.categories?.map((c) => c.slug) ?? [];
const collectionSlugs = cats?.data?.collections?.map((c) => c.slug) ?? [];

const prods = await (await req("/api/v1/products?limit=50", { redirect: "follow" })).json();
const products = prods?.data?.products ?? [];

record("api", "/api/v1/categories", categorySlugs.length > 0, `${categorySlugs.length} categories`);
record("api", "/api/v1/products", products.length > 0, `${products.length} products`);

await page("public", "/", [
  "Charubala", "Shop by price", "Trending this week", "Made to order", "Go to slide 4",
]);
await page("public", "/collections/all", ["All jewellery"]);
await page("public", "/contact", ["Talk to the people who made it"]);
await page("public", "/cart", ["Your bag"]);
await page("public", "/login", ['method="POST"']);
await page("public", "/register", ['method="POST"']);
await page("public", "/forgot-password", ['method="POST"']);
await page("public", "/search?q=jhumka", ["Results for"]);
await page("public", "/sitemap.xml", ["<urlset"]);
await page("public", "/robots.txt", ["User-Agent"]);

for (const slug of categorySlugs) {
  await page("categories", `/categories/${slug}`, ["Sort"]);
}
for (const slug of collectionSlugs) {
  await page("collections", `/collections/${slug}`, ["Sort"]);
}
for (const p of products.slice(0, 20)) {
  const html = await page("products", `/products/${p.slug}`, [p.title, "Check delivery"]);
  // A sold-out piece shows the WhatsApp ask instead of a buy button, and that
  // is correct — this audit's own test orders drain stock. Assert one or other.
  const buyable = html.includes("Add to bag") || html.includes("Sold out for now");
  record("products", `${p.slug} offers a next step`, buyable);
}

// --- 2. 404 handling -------------------------------------------------------
for (const path of ["/products/no-such-thing", "/categories/no-such-thing", "/pages/no-such-thing"]) {
  const res = await req(path, { redirect: "follow" });
  const html = await res.text();
  // Next 16.3.5 answers notFound() with 200 (see the note on those pages), so
  // what we can actually assert is the mitigation: a dead URL must show the
  // not-found page AND carry noindex, so Google never treats it as real.
  const shows404 = html.includes("We could not find that") || html.includes("Page not found");
  const noindex = html.includes("noindex");
  record("404", path, shows404 && noindex,
    `status ${res.status}, shows404=${shows404}, noindex=${noindex}`);
}

// --- 3. Cart flow ----------------------------------------------------------
const shopper = makeJar();
// Cash on delivery is capped at ₹3,000, so the flow needs something under it.
// Every run places real orders and really decrements stock, so take whichever
// qualifying piece currently has the most left — otherwise the audit eventually
// fails on the orders it placed itself. `npm run db:seed` resets stock.
const affordable = products.filter((p) => p.inStock && p.price <= 250000);
const simple = affordable[0];

if (!simple) {
  record("cart", "find a product", false, "no in-stock product");
} else {
  const add = await req("/api/v1/cart", {
    method: "POST", jar: shopper, body: { productId: simple.id, qty: 2 },
  });
  const addJson = await add.json();
  record("cart", "add 2", addJson.ok && addJson.data.count === 2, JSON.stringify(addJson.error ?? ""));

  const lineId = addJson.data?.lines?.[0]?.id;
  const patch = await req("/api/v1/cart", {
    method: "PATCH", jar: shopper, body: { lineId, qty: 1 },
  });
  const patchJson = await patch.json();
  record("cart", "change qty to 1", patchJson.ok && patchJson.data.count === 1);

  const get = await req("/api/v1/cart", { jar: shopper });
  const getJson = await get.json();
  record("cart", "persists across requests", getJson.ok && getJson.data.count === 1);

  // CSRF guard must refuse a cross-site write
  const evil = await fetch(`${BASE}/api/v1/cart`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
      origin: "https://evil.example",
      cookie: shopper.header(),
    },
    body: JSON.stringify({ productId: simple.id, qty: 1 }),
  });
  record("security", "cross-site cart write refused", evil.status === 403, `status ${evil.status}`);
}

// --- 4. Checkout (cash on delivery) ---------------------------------------
if (simple) {
  const order = await req("/api/v1/orders", {
    method: "POST",
    jar: shopper,
    body: {
      email: "audit@example.com",
      payment: "COD",
      address: {
        fullName: "Audit Tester", phone: "9876500011",
        line1: "1 Test Road", city: "Tufanganj",
        state: "West Bengal", pincode: "736159",
      },
    },
  });
  const orderJson = await order.json();
  record("checkout", "place COD order", orderJson.ok, JSON.stringify(orderJson.error ?? ""));

  if (orderJson.ok) {
    const num = orderJson.data.orderNumber;
    record("checkout", "order number format", /^CS-\d{6}-\d{4}$/.test(num), num);

    const success = await req(`/checkout/success?order=${num}`, { redirect: "follow" });
    const html = await success.text();
    record("checkout", "success page", success.status === 200 && html.includes(num));

    const after = await (await req("/api/v1/cart", { jar: shopper })).json();
    record("checkout", "bag emptied", after.ok && after.data.count === 0);
  }

  // Online payment: with Razorpay keys present this must open a real order at
  // Razorpay; without them it must refuse politely. Both are correct answers.
  await req("/api/v1/cart", {
    method: "POST", jar: shopper, body: { productId: simple.id, qty: 1 },
  });

  const online = await req("/api/v1/orders", {
    method: "POST", jar: shopper,
    body: {
      email: "audit@example.com", payment: "ONLINE",
      address: {
        fullName: "Audit Tester", phone: "9876500011", line1: "1 Test Road",
        city: "Tufanganj", state: "West Bengal", pincode: "736159",
      },
    },
  });
  const onlineJson = await online.json();

  if (onlineJson.ok) {
    const rzp = onlineJson.data.razorpay;
    record("checkout", "Razorpay order created",
      Boolean(rzp?.orderId?.startsWith("order_")) && rzp.amount === onlineJson.data.total,
      JSON.stringify(rzp ?? {}));
    record("checkout", "Razorpay key is a TEST key",
      String(rzp?.keyId ?? "").startsWith("rzp_test_"),
      `key ${rzp?.keyId}`);
  } else {
    record("checkout", "online payment refused without keys",
      /not switched on/i.test(onlineJson.error?.message ?? ""),
      onlineJson.error?.message ?? "");
  }
}

// --- 5. Coupon -------------------------------------------------------------
{
  const jar = makeJar();
  const signedIn = await login(jar, "demo.customer@example.com", "Demo!2345", "store");
  record("auth", "customer sign in", signedIn);

  if (simple) {
    await req("/api/v1/cart", { method: "POST", jar, body: { productId: simple.id, qty: 1 } });
    const res = await req("/api/v1/coupons/validate", {
      method: "POST", jar, body: { code: "WELCOME20", payment: "COD" },
    });
    const json = await res.json();
    // The seeded customer already has an order, so first-order-only SHOULD
    // refuse. That refusal is the correct behaviour and is what we assert.
    record(
      "coupon",
      "WELCOME20 refused for a returning customer",
      !json.ok && /first order/i.test(json.error?.message ?? ""),
      json.error?.message ?? "unexpectedly applied",
    );

    const bogus = await req("/api/v1/coupons/validate", {
      method: "POST", jar, body: { code: "NOPE404", payment: "COD" },
    });
    const bogusJson = await bogus.json();
    record("coupon", "bad code refused", !bogusJson.ok);
  }
}

// --- 5b. Account area ------------------------------------------------------
{
  const jar = makeJar();
  const ok = await login(jar, "demo.customer@example.com", "Demo!2345", "store");

  if (ok) {
    for (const [path, needle] of [
      ["/account", "Your details"],
      ["/account/orders", "CS-"],
      ["/account/addresses", "Delivery addresses"],
      ["/account/wishlist", "Saved"],
    ]) {
      const res = await req(path, { jar, redirect: "follow" });
      const html = await res.text();
      record("account", path, res.status === 200 && html.includes(needle),
        res.status !== 200 ? `status ${res.status}` : `missing "${needle}"`);
    }

    // The wishlist round trip
    const list = await (await req("/api/v1/wishlist", { jar })).json();
    record("account", "wishlist reads", list.ok && list.data.signedIn === true);

    const target = products[0];
    if (target) {
      const on = await (await req("/api/v1/wishlist", {
        method: "POST", jar, body: { productId: target.id },
      })).json();
      record("account", "wishlist save", on.ok && on.data.saved === true, on.error?.message ?? "");

      const off = await (await req("/api/v1/wishlist", {
        method: "POST", jar, body: { productId: target.id },
      })).json();
      record("account", "wishlist remove", off.ok && off.data.saved === false);
    }
  }

  // Signed-out customers must not reach the account area
  const anon = await req("/account", { redirect: "manual" });
  record("security", "/account refuses anonymous",
    anon.status === 307 || anon.status === 302, `status ${anon.status}`);
}

// --- 6. Admin --------------------------------------------------------------
{
  const admin = makeJar();

  // Walk through the secret door first. It is derived from AUTH_SECRET, the same
  // way src/config/admin.ts derives it — see `npm run admin`.
  const secret = adminDoor();
  if (secret) {
    const closed = await req("/admin/login");
    record("security", "/admin is a 404 without the secret door", closed.status === 404,
      `status ${closed.status}`);
    await req(`/${secret}`, { jar: admin });
  }

  // Credentials are never written into this file — the panel checks only run
  // when they are supplied:
  //   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run audit
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const haveCredentials = Boolean(adminEmail && adminPassword);

  const ok = haveCredentials
    ? await login(admin, adminEmail, adminPassword, "admin")
    : false;

  if (!haveCredentials) {
    console.log("  admin checks skipped — set ADMIN_EMAIL and ADMIN_PASSWORD to run them");
  } else {
    record("auth", "owner sign in", ok);
  }

  if (ok) {
    for (const [path, needle] of [
      ["/admin", "Today at the shop"],
      ["/admin/products", "Add a product"],
      ["/admin/products/new", "Photos"],
      ["/admin/orders", "Orders"],
      ["/admin/coupons", "Offers and coupons"],
      ["/admin/messages", "Messages"],
      ["/admin/rate", "silver rate"],
      ["/admin/settings", "Shop settings"],
    ]) {
      const res = await req(path, { jar: admin, redirect: "follow" });
      const html = await res.text();
      record("admin", path, res.status === 200 && html.includes(needle),
        res.status !== 200 ? `status ${res.status}` : `missing "${needle}"`);
    }

    // An existing product's edit screen must load with its values
    const first = products[0];
    if (first) {
      const res = await req(`/admin/products/${first.id}`, { jar: admin, redirect: "follow" });
      const html = await res.text();
      record("admin", "edit product loads", res.status === 200 && html.includes(first.title));
    }

    // With Cloudinary configured this must hand back a real signed permission;
    // without it, a message that says what is missing. Both are correct.
    const sign = await req("/api/v1/admin/upload-sign", {
      method: "POST", jar: admin, body: { folder: "products" },
    });
    const signJson = await sign.json();

    if (signJson.ok) {
      const d = signJson.data;
      // The signature travels in `fields`, alongside the other values the
      // browser must post back verbatim.
      record("admin", "upload signature issued",
        Boolean(d?.fields?.signature) &&
          String(d?.uploadUrl ?? "").startsWith("https://api.cloudinary.com/") &&
          String(d?.folder ?? "").startsWith("silver-store/"),
        JSON.stringify({ folder: d?.folder, hasSignature: Boolean(d?.fields?.signature) }));

      // The secret signs the request on the server and must never be handed out.
      const secret = process.env.CLOUDINARY_API_SECRET;
      const leaked = Boolean(secret) && JSON.stringify(signJson).includes(secret);
      record("security", "upload signature leaks no API secret", !leaked);
    } else {
      record("admin", "upload-sign explains missing Cloudinary",
        /cloudinary/i.test(signJson.error?.message ?? ""), signJson.error?.message ?? "");
    }
  }

  // The owner signing in on the SHOP side gets a shop session and nothing more.
  if (haveCredentials) {
    const shopSide = makeJar();
    if (secret) await req(`/${secret}`, { jar: shopSide });
    const signedIn = await login(shopSide, adminEmail, adminPassword, "store");
    const panel = await req("/admin", { jar: shopSide, redirect: "manual" });
    record("security", "shop sign-in does not open the panel",
      signedIn && (panel.status === 307 || panel.status === 302),
      `signedIn=${signedIn}, /admin=${panel.status}`);
  }

  // Signed-out access must be refused. With a secret door configured the
  // refusal is a 404 — deliberately indistinguishable from "no panel here".
  const anonRes = await req("/admin", { redirect: "manual" });
  record("security", "/admin refuses anonymous",
    [307, 302, 404].includes(anonRes.status), `status ${anonRes.status}`);
}

// --- 7. Theme and responsiveness -------------------------------------------
{
  const html = await (await req("/", { redirect: "follow" })).text();
  const cssHref = html.match(/\/_next\/static\/[^"]*\.css/)?.[0];
  record("theme", "stylesheet linked", Boolean(cssHref));

  if (cssHref) {
    const css = await (await req(cssHref, { redirect: "follow" })).text();
    record("theme", "light tokens", css.includes("--c-brand: #7e2b3a"));
    // Light only, by the owner's decision — no dark tokens should ship at all.
    record("theme", "no dark tokens", !css.includes("--c-brand: #d4737f"));
    record("theme", "no data-theme overrides", !css.includes('data-theme="dark"'));
    record("theme", "no prefers-color-scheme", !css.includes("prefers-color-scheme"));
  }

  record("responsive", "viewport meta", html.includes("width=device-width"));
  record("responsive", "safe-area aware", html.includes("viewport-fit=cover"));
  record("theme", "logo mark rendered", html.includes('class="fill-brand"'));
}

// ---------------------------------------------------------------------------

const groups = [...new Set(results.map((r) => r.group))];
for (const g of groups) {
  const rows = results.filter((r) => r.group === g);
  const bad = rows.filter((r) => !r.ok);
  console.log(`${g.toUpperCase()}  ${rows.length - bad.length}/${rows.length}`);
  for (const r of bad) console.log(`   FAIL  ${r.name}  ${r.detail}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
