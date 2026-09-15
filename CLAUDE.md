# Project context

E-commerce store for a small silver jewellery maker in India. Retail D2C, 925 sterling
and 999 fine silver: rings, anklets, toe rings, bangles, chains, pendants, nose pins,
mangalsutra, puja items.

## Who uses this

- **Customers** — mostly mobile, mostly India, price-sensitive, pay by UPI.
- **The shop owner** — non-technical. He photographs products on his phone and uploads
  them himself. He has no design skills and no laptop habit.

That second user is the constraint that shapes the whole project.

## Rules that follow from it

1. **The admin panel is mobile-first.** Adding a product from a phone, in the shop, in
   under two minutes, is the benchmark. If a flow needs a desktop, it is wrong.
2. **Never require the owner to edit an image.** Cropping, compression, background
   handling and format conversion happen in code, not in his hands.
3. **No jargon in admin copy.** "Out of stock", not "inventory_status: 0". Errors say
   what broke and what to do next.
4. **Every policy page is editable by the owner** from the admin, not hardcoded in JSX.

## Stack

Next 16 (App Router) · TypeScript 7 · Tailwind 4 · Motion · Prisma 7 ·
PostgreSQL (Neon) · Auth.js v5 · Cloudinary · Razorpay · Resend · Upstash · Zod 4

Full reasoning in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), setup in
[docs/SETUP.md](docs/SETUP.md), API in [docs/API.md](docs/API.md).

### Version traps

Most tutorials online are a major behind. These are the ones that bite:

- **Prisma 7** — connection URLs live in `prisma.config.ts`, not `schema.prisma`.
  The client needs a driver adapter: `new PrismaClient({ adapter: new PrismaPg(...) })`.
  `datasourceUrl` no longer exists.
- **TypeScript 7** — `baseUrl` was removed from `tsconfig.json`.
- **Next 16** — the file is `src/proxy.ts`, not `src/middleware.ts`.
- **zod 4** — for an object whose every field has a default, use `.prefault({})`;
  `.default({})` is a type error.
- **lucide-react v1** — no brand icons. Social marks are local SVGs.

## Conventions

- Route handlers validate input with Zod at the boundary. No exceptions.
- All money is stored in **paise as integers**. Never floats.
- `OrderItem` snapshots title, image and price at checkout; orders never change when a
  product is later edited.
- Prices are always recalculated server-side. A client-sent amount is never trusted.
- Image URLs come from `lib/images/url.ts`, which is client-safe. The Cloudinary
  SDK lives in `lib/images/cloudinary.ts` behind `server-only` — importing it
  from a client component pulls `fs` into the browser bundle and the build fails.
- Pagination is cursor-based, never `OFFSET`.
- Admin list queries `select` only the columns the table renders.
- Server Components by default. `"use client"` only where interaction requires it.

## Domain specifics worth knowing

- **Purity** is 925 (sterling) or 999 (fine). It appears on the product page and the
  invoice.
- **BIS hallmark / HUID** is a per-product field; the owner may only hallmark some items.
- **Pricing may be weight-based**: `weightG x ratePerGram x purityFactor + makingCharge`,
  with a `MetalRate` the owner updates daily. Support both this and fixed pricing.
- **GST on jewellery is 3%**, with 5% on making charges when billed separately. Whether
  it applies at all depends on the client's registration — read `Setting`, do not hardcode.
- **Indian ring sizes** run roughly 6 to 26 and are a `ProductVariant`, not free text.
- **COD matters.** A meaningful share of orders will be cash on delivery.

## Do not

- Do not add a vector database, a search service or a headless CMS. The catalogue is
  small and Postgres handles it.
- Do not commit anything from `.env*`.
- Do not introduce a second styling system alongside Tailwind.
- Do not confirm an order from the browser callback. Only the verified Razorpay webhook
  marks a payment as captured.

## Where things are

```
src/app/(shop)/      storefront       src/app/admin/(panel)/  the panel
src/app/(auth)/      customer auth    src/app/admin/(auth)/   staff sign-in
src/app/api/v1/      public REST API  src/app/admin/actions.ts admin server actions
src/lib/queries/     read models      src/lib/cart/           cart, client + server
src/components/storefront/            src/components/admin/
prisma/schema.prisma  prisma/seed.ts  docs/
```

Two gates gu­ard the admin: `src/proxy.ts` redirects a non-staff request, and
`src/app/admin/(panel)/layout.tsx` checks the role again. Keep both — a missed
matcher pattern should not leak a page.
