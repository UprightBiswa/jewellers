# Work tracker

Updated as we go. Tick a box only when the thing actually runs, not when it is written.

## Phase 0 — Groundwork

- [x] Stack and hosting decided ([ARCHITECTURE.md](ARCHITECTURE.md))
- [x] Repo docs, `.gitignore`, `.env.example`
- [x] Client brief built as a public page (`docs/index.html`)
- [ ] GitHub Pages switched on, public link sent to client
- [ ] **Client's answers received** — blocks almost everything below
- [ ] Accounts created: Neon, Cloudinary, Resend, Upstash
- [ ] Domain chosen and bought (in the client's own account)

## Phase 1 — Foundation

- [ ] `create-next-app` scaffold: Next 15, TS, Tailwind v4, App Router
- [ ] shadcn/ui installed, base theme tokens set
- [ ] Prisma schema written (waits on brief answers Q16–Q18: pricing model)
- [ ] First migration applied to Neon
- [ ] Seed script: categories, one admin user, ~10 sample products
- [ ] `lib/images/provider.ts` + Cloudinary implementation
- [ ] Auth.js v5 wired, admin session + role middleware

## Phase 2 — Admin panel (mobile-first)

- [ ] Admin login
- [ ] Product list with cursor pagination and search
- [ ] **Product create/edit form on a phone, under 2 minutes** — the benchmark
- [ ] Multi-image upload: compress, square-crop, signed direct upload, reorder, set primary
- [ ] Variants (ring sizes) and stock
- [ ] Categories and collections
- [ ] Metal rate screen (if pricing is weight-based)
- [ ] Settings: store details, GST %, free-shipping threshold
- [ ] Policy pages editable from admin

## Phase 3 — Storefront

- [ ] Layout: header, mobile nav, footer, offer strip
- [ ] Home: hero, category grid, trending, offers, testimonials
- [ ] Category page with filters and cursor pagination
- [ ] Product page: gallery, zoom, purity/weight, size picker, delivery check
- [ ] Search
- [ ] Static pages: About, Contact, policies
- [ ] Page transitions and scroll animations

## Phase 4 — Money

- [ ] Cart (guest + logged in)
- [ ] Coupon engine: percent, flat, free-ship, first-order-only
- [ ] Checkout: address, shipping, server-side total recalculation
- [ ] Razorpay order + checkout
- [ ] **Webhook with signature verification** — the only thing that confirms an order
- [ ] COD flow
- [ ] Order confirmation page

## Phase 5 — After the sale

- [ ] Order emails (customer + owner) via Resend
- [ ] GST invoice PDF
- [ ] Admin order list, detail, status changes
- [ ] Shipment tracking fields
- [ ] Customer account: orders, addresses
- [ ] Reviews with admin approval

## Phase 6 — Launch

- [ ] SEO: metadata, sitemap, robots, JSON-LD Product schema
- [ ] Analytics: GA4, Meta Pixel
- [ ] Lighthouse pass on mobile
- [ ] Rate limiting on OTP, login, coupon endpoints
- [ ] Error pages, empty states, loading skeletons
- [ ] Owner walkthrough + a short Hindi how-to video
- [ ] Production deploy, domain pointed, test order placed

---

## Open questions

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | Fixed price per design, or weight x rate + making charge? | Prisma schema, cart, invoice | waiting on client |
| 2 | Is he GST registered, and do shown prices include GST? | Checkout totals, invoice format | waiting on client |
| 3 | Mobile-only admin, or does he use a computer? | Admin layout | waiting on client |
| 4 | Vercel Pro (Rs 1,750/mo) or VPS (Rs 600/mo)? | Deploy target | waiting on developer + client |
| 5 | Developer's WhatsApp number for the brief's send button | `docs/index.html` line 326 | waiting on developer |
