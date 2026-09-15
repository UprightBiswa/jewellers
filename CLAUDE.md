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

Next.js 15 App Router · TypeScript · Tailwind v4 · shadcn/ui · Motion · Prisma 6 ·
PostgreSQL (Neon) · Auth.js v5 · Cloudinary · Razorpay · Resend · Upstash Redis · Zod

Full reasoning in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Conventions

- Route handlers validate input with Zod at the boundary. No exceptions.
- All money is stored in **paise as integers**. Never floats.
- `OrderItem` snapshots title, image and price at checkout; orders never change when a
  product is later edited.
- Prices are always recalculated server-side. A client-sent amount is never trusted.
- Cloudinary is reached only through `lib/images/provider.ts`. Components import the
  provider, never the SDK.
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
