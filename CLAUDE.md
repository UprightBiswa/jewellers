# Project context

Online shop for **Charubala Silver** — Rahul Sarkar's silver workshop at Gourmohan Bazar,
Jhaljhali, Tufanganj, Coochbehar, West Bengal 736159. Trading since 2018.

Sells online: earrings, rings, women's chains, bracelets, payel, toe rings, baby sets.
Fixed prices, ₹800–5,000. Both ready stock and made to order. Not registered for GST.
Languages: English and Bengali. Domain: charubala.com (a previous site is closed).

## Who uses this

- **Customers** — mostly mobile, mostly West Bengal, price-sensitive, pay by UPI.
- **Rahul, the owner** — non-technical. He photographs pieces on his phone and uploads
  them himself. No design skills, no laptop habit.

That second user is the constraint that shapes the whole project.

## Rules that follow from it

1. **The admin panel is mobile-first.** Adding a product from a phone, standing at the
   bench, in under two minutes, is the benchmark. If a flow needs a desktop, it is wrong.
2. **Never require the owner to edit an image.** Cropping, compression, format conversion
   happen in code, not in his hands.
3. **No jargon in admin copy.** "Out of stock", not "inventory_status: 0". Errors say what
   broke and what to do next.
4. **Every policy page and setting is his to edit** from the admin, not hardcoded in JSX.

## Never commit

- Anything from `.env*` (`.env`, `.env.local` are git-ignored — keep it that way).
- The owner's **PAN** or **Aadhaar**. The shop does not need them and this repo is public
  so GitHub Pages can serve the client brief.

---

## Stack

Next 16 (App Router) · TypeScript 7 · Tailwind 4 · Motion · Prisma 7 · PostgreSQL (Neon) ·
Auth.js v5 · Cloudinary · Razorpay · Resend · Upstash · Zod 4

Reasoning in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · setup in
[docs/SETUP.md](docs/SETUP.md) · API in [docs/API.md](docs/API.md) · status in
[docs/PROGRESS.md](docs/PROGRESS.md).

### Version traps

Most tutorials online are a major behind. These are the ones that bite:

- **Prisma 7** — connection URLs live in `prisma.config.ts`, not `schema.prisma`. The
  client needs a driver adapter: `new PrismaClient({ adapter: new PrismaPg(...) })`.
  `datasourceUrl` is gone.
- **Prisma 7 + pg adapter** — when the pool cannot connect it throws
  `TypeError: object null is not iterable` **asynchronously**, outside the promise chain.
  No `try/catch` around the `await` sees it; it arrives as an uncaughtException and kills
  the dev server. `lib/demo/fallback.ts` probes the TCP socket first for that reason.
- **TypeScript 7** — `baseUrl` was removed from `tsconfig.json`.
- **Next 16** — the file is `src/proxy.ts`, not `src/middleware.ts`.
- **zod 4** — for an object whose every field has a default, use `.prefault({})`;
  `.default({})` is a type error.
- **lucide-react v1** — no brand icons. Social marks are local SVGs.

---

## Where things are

```
src/app/(shop)/          storefront pages       src/app/admin/(panel)/   the admin panel
src/app/(auth)/          customer auth + actions src/app/admin/(auth)/   staff sign-in
src/app/api/v1/          public REST API        src/app/admin/actions.ts admin server actions
src/app/api/webhooks/    Razorpay webhook       src/app/sitemap.ts       SEO
src/lib/queries/         read models            src/lib/orders/          totals, create, confirm
src/lib/cart/            cart: client + server  src/lib/payments/        Razorpay
src/lib/images/          url.ts (client-safe), cloudinary.ts (server-only), placeholders.ts
src/lib/demo/            catalogue.ts (seed + preview data), fallback.ts (preview mode)
src/components/storefront/  src/components/admin/  src/components/ui/  src/components/brand/
prisma/schema.prisma     prisma/seed.ts         docs/
```

### Service map — where each thing is managed

| Service | Configured by | Code | Degrades to |
|---|---|---|---|
| Database | `DATABASE_URL` + `DIRECT_URL` | `src/lib/db.ts`, `prisma.config.ts` | Preview data in dev |
| Images | `CLOUDINARY_*` | `src/lib/images/` | Unsplash placeholders |
| Auth | `AUTH_SECRET`, `AUTH_GOOGLE_*` | `src/auth.ts`, `src/auth.config.ts` | Google button hidden |
| Payments | `RAZORPAY_*` | `src/lib/payments/razorpay.ts` | COD only + WhatsApp |
| Email | `RESEND_API_KEY` | `src/lib/email/send.ts`, `src/emails/` | Logged to console |
| Rate limits | `UPSTASH_*` | `src/lib/api/ratelimit.ts` | In-process memory |
| Shop settings | The admin UI | `src/lib/settings.ts` (DB-backed) | Typed defaults |

Every integration is checked at runtime and degrades. Nothing but the database blocks a
first run, and even that only blocks the admin.

---

## Conventions

- Route handlers validate input with Zod at the boundary. No exceptions.
- All money is **integer paise**. Rupees exist only in the admin's inputs and on screen.
- `OrderItem` snapshots title, image and price at checkout; orders never change when a
  product is later edited.
- Prices are always recalculated server-side. A client-sent amount is never trusted.
- Image URLs come from `lib/images/url.ts` (client-safe). The Cloudinary SDK lives in
  `lib/images/cloudinary.ts` behind `server-only` — importing it from a client component
  pulls `fs` into the browser bundle and the build fails.
- Pagination is cursor-based, never `OFFSET`.
- Admin list queries `select` only the columns the table renders.
- Server Components by default. `"use client"` only where interaction requires it.
- Every read that can run before the database exists goes through `devFallback`.

### Forms and security

- **Every form either uses a server action (`action={...}`) or sets `method="post"`.**
  A form with only an `onSubmit` handler and no method falls back to a NATIVE GET when
  submitted before React hydrates — that is how an email and password once ended up in
  the URL, the browser history and the access logs. Auth forms use server actions so they
  also work with JavaScript off.
- State-changing `/api/v1` routes call `isCrossSiteRequest` (`src/lib/api/csrf.ts`).
  Server actions carry Next's own origin check already.
- Login failures return one message for every cause. Registration is the deliberate
  exception — it has to say an address is taken.

### Payments

Payment confirms through whichever signed path arrives first: the **webhook**
(`api/webhooks/razorpay`) or the **browser callback** (`api/v1/orders/verify`), whose
signature is verified server-side with the key secret. Both call the idempotent
`confirmPayment` in `src/lib/orders/confirm.ts`, so a double delivery cannot send two
emails or count a sale twice. Never confirm from an *unverified* callback.

Stock comes down when the order is placed, not when it is paid — with two of most designs
in the shop, selling the same ring twice during a pending payment is worse than briefly
holding it. `releaseOrder` puts it back.

---

## Domain specifics

- **Purity** is 925 sterling. Some pieces are BIS hallmarked with a HUID, most are not —
  it is a per-product field and the page says which.
- **Fixed pricing.** Weight-based pricing (`weightG × ratePerGram + makingCharge`) is
  built and available in the admin, but Charubala prices by the tag.
- **No GST.** `Setting.tax.gstEnabled` is false. Never hardcode a rate — read the setting.
- **Indian ring sizes 8–24**, as `ProductVariant`, not free text.
- **50% advance** on made-to-order pieces (`Setting.payments.advancePercent`).
- **Exchange, not refund** — 7 days, for another piece of equal or greater value.
- **COD matters.** Online payment is not switched on yet, so COD is the only route.

## Do not

- Do not add a vector database, a search service or a headless CMS. Postgres handles it.
- Do not introduce a second styling system alongside Tailwind.
- Do not use Hindi. The second language is **Bengali** (`titleBn`, `nameBn`).
- Do not put a `.env` value, a PAN or an Aadhaar number in a committed file.

## Two gates guard the admin

`src/proxy.ts` redirects a non-staff request, and `src/app/admin/(panel)/layout.tsx`
checks the role again. Keep both — a missed matcher pattern should not leak a page.
Checkout is deliberately **not** gated: guest checkout is allowed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
