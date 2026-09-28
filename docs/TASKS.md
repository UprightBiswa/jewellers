# Task tracker

What is built, what is half-built, and what is not started. Updated by hand as
work lands — `docs/PROGRESS.md` describes the architecture, this file tracks the
work queue.

Status: **done** · **doing** · **next** (agreed, not started) · **later**

Last verified against the codebase: 2026-09-29.

---

## The one thing that blocks everything else

Rahul has **100–300 finished pieces photographed and waiting**. Adding them one
at a time through the admin form is roughly three minutes each — fifteen hours of
typing before the shop has a catalogue. Nothing else on this list matters as
much.

| # | Task | Status |
|---|---|---|
| 1 | **Bulk import from a spreadsheet** — upload a CSV, preview what will change, then commit | **next** |
| 2 | **Bulk image upload** — a folder named by serial number, matched to rows | **next** |
| 3 | **Export to CSV** — edit in Sheets, re-import to update | **next** |
| 4 | Bulk actions on the product list — publish, unpublish, delete, change category | **next** |

See [BULK-IMPORT.md](BULK-IMPORT.md) for the column spec and the sheet template.

---

## Admin panel

### Built and working

| Screen | What it does |
|---|---|
| Dashboard | Today's orders, revenue, low stock, recent messages |
| Products | List, create, edit, multi-image upload, variants, draft/active/archived, delete |
| Orders | List, detail, status changes, shipment with tracking |
| Coupons | Create, edit, activate/deactivate |
| Messages | Contact form submissions, mark handled |
| Metal rate | Set ₹/gram for weight-based pricing |
| Settings | Store details, payments, shipping, tax, social |

### Missing — the model exists, the screen does not

Every row here already has its database table. This is UI work, not schema work.

| # | Screen | Model | Status |
|---|---|---|---|
| 5 | **Categories** — create, rename, Bengali name, image, reorder, delete | `Category` | **next** |
| 6 | **Collections** — same, plus which products belong | `Collection` | **next** |
| 7 | **Reviews** — approve, hide, delete, reply | `Review` (`ReviewStatus` enum unused) | **next** |
| 8 | **Customers** — list, detail, their orders, their addresses | `User` | **next** |
| 9 | **Policy pages** — edit Returns, Shipping, About, Privacy in the admin | `Page` | **next** |
| 10 | **Activity log** — who changed what, errors only | `AuditLog` (written, never read) | later |
| 11 | **Staff accounts** — add a second user, set role, disable | `User.role` | later |

### Missing — needs a new model

| # | Feature | Status |
|---|---|---|
| 12 | **Homepage manager** — hero slides, banners, section order, all editable | **next** |
| 13 | **Size chart** — per category, shown on the product page | later |

> The homepage is the worst offender for "no hardcoded data". `buildSlides()` in
> `src/app/(shop)/page.tsx:66` returns four hand-written slides, and
> `BANNER_SLUGS` on line 137 is a hardcoded array of four collection slugs.
> Rahul cannot change a word of his own front page.

### Admin usability

| # | Task | Status |
|---|---|---|
| 14 | **Mobile drawer navigation** — the sidebar does not collapse on a phone | **next** |
| 15 | Invoice PDF for an order | later |
| 16 | Image-by-URL input, as an alternative to uploading | later |

---

## Storefront

### Built and working

Home, categories, collections, product detail, search, cart, checkout, order
success, account (orders, addresses, wishlist), contact, policy pages, and the
four auth screens. Cart and wishlist persist for signed-out visitors. Guest
checkout works.

### Missing

| # | Feature | Status |
|---|---|---|
| 17 | **Filters** — price, category, purity, in-stock. Sidebar on desktop, bottom sheet on mobile | **next** |
| 18 | **Write a review** — only a customer who bought it, pending approval | **next** |
| 19 | **Two silver qualities per product** — same design, two prices, customer picks | **next** — no schema change needed; `ProductVariant.priceDelta` already does it |
| 20 | Share / deep link button on a product | later |
| 21 | "Home" link in the top navigation | **next** |
| 22 | Footer: related-search block for SEO, like the reference site | **next** |
| 23 | Size guide on the product page | later |

---

## Services and accounts

| # | Service | What is needed | Status |
|---|---|---|---|
| 24 | **Email (Resend)** | Free account, verify charubala.com, `RESEND_API_KEY` | **next** |
| 25 | **Google sign-in** | Google Cloud OAuth client, two variables | later |
| 26 | Razorpay live keys | Only after KYC and a successful test order | later |
| 27 | Upstash Redis | Not needed yet — in-memory limiter is fine at this volume | later |
| 28 | Vercel Analytics | One package, one component | **next** |

Nothing here blocks launch. Every one degrades cleanly — see the service map in
`CLAUDE.md`.

---

## Security and performance

| # | Task | Status | Notes |
|---|---|---|---|
| 29 | Rate limiting | **done** | Per-endpoint buckets, in-memory until Upstash |
| 30 | CSRF on state-changing routes | **done** | `Sec-Fetch-Site` guard |
| 31 | Admin behind a secret path + scoped session | **done** | Two gates, derived door |
| 32 | Passwords bcrypt, 12 rounds | **done** | |
| 33 | Webhook signature verification | **done** | Proven by `npm run webhook:test` |
| 34 | Image CDN + zero Vercel optimisation cost | **done** | Custom loader |
| 35 | **Per-IP API throttle audit** — confirm one IP cannot exhaust the API | **next** | Buckets exist; not load-tested |
| 36 | **Vercel firewall / DDoS** — enable Attack Challenge Mode, rate rules | **next** | Dashboard setting, no code |
| 37 | Cloudflare in front of Vercel | later | Only if abuse actually appears |

---

## SEO

| # | Task | Status |
|---|---|---|
| 38 | Sitemap, robots, canonical, OpenGraph | **done** |
| 39 | Product JSON-LD structured data | **done** |
| 40 | **Google Search Console** — verify domain, submit sitemap | **next** |
| 41 | **Per-product SEO fields** — title, description, editable in admin | **next** |
| 42 | Footer related-search links | **next** (same as #22) |
| 43 | Blog / content pages | later |

---

## Known defects

| # | Defect | Status |
|---|---|---|
| 44 | `notFound()` returns HTTP 200 on Next 16.3.5 | open — framework bug, mitigated with `noindex` |
| 45 | ESLint cannot run — `typescript-eslint` has no TypeScript 7 support | open — `tsc` still type-checks |

---

## Suggested order

1. **Bulk import (#1–#4).** Nothing else changes the shop's value as much.
2. **Categories, collections, reviews, customers (#5–#8).** Straight CRUD, all
   models exist.
3. **Homepage manager (#12) and policy pages (#9).** Kills the last hardcoded
   content.
4. **Filters and reviews on the storefront (#17–#19).**
5. **Email, analytics, Search Console (#24, #28, #40).**
6. Everything marked *later*.
