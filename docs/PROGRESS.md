# Work tracker

Ticked only when the thing actually runs, not when it is written.

## Phase 0 — Groundwork

- [x] Stack and hosting decided ([ARCHITECTURE.md](ARCHITECTURE.md))
- [x] Repo docs, `.gitignore`, `.env.example`
- [x] Client brief built as a public page (`docs/index.html`)
- [ ] GitHub Pages switched on, public link sent to client
- [ ] **Client's answers received**
- [ ] Accounts created: Neon, Cloudinary, Resend, Upstash
- [ ] Domain chosen and bought (in the client's own account)

## Phase 1 — Foundation

- [x] Next 16 + TypeScript 7 + Tailwind 4 + App Router scaffold
- [x] Prisma 7 schema: 25 models, integer paise, weight-based pricing supported
- [x] `prisma.config.ts` + pg driver adapter (Prisma 7 moved both)
- [x] Seed: 17 categories, 28 products, 7 collections, coupons, policy pages, demo order
- [x] Image provider seam — `lib/images/url.ts` (client-safe) and `cloudinary.ts` (server)
- [x] Auth.js v5: credentials + Google, JWT sessions, role on the token
- [x] API layer: envelope, error codes, CORS allow-list, rate limits, API keys
- [x] Design system: tokens, Marcellus + Manrope + Noto Devanagari, light/dark/system
- [ ] **Migration applied to a real database** — blocked on the Neon URL
- [ ] Seed run against that database

## Phase 2 — Admin panel (mobile-first)

- [x] Separate `/admin/login`, refused to customer accounts, optional IP allow-list
- [x] Panel shell: bottom tabs on a phone, sidebar on a desktop
- [x] Dashboard: what needs doing first, then today's numbers
- [x] Product list with search, status tabs, cursor pagination
- [x] **Product form** — photos first, rupees in, one column, sticky save bar
- [x] Image upload: browser-side compression, signed direct-to-Cloudinary
- [x] Variants (ring sizes), stock, hide/delete with archive protection
- [x] Orders list and detail, next-step action, tracking entry
- [x] Coupons, messages, silver rate, settings (7 groups, each saving alone)
- [ ] Staff accounts screen (owner adds and resets staff)
- [ ] Categories and collections editing (seeded for now)

## Phase 3 — Storefront

- [x] Header, mobile drawer, offer strip, footer, theme toggle
- [x] Home: hero, categories, trending, collections, story, new arrivals, reviews
- [x] Category, collection and search listings with sort and load-more
- [x] Product page: gallery, sizes, pincode check, specs, JSON-LD
- [x] Cart
- [x] Contact page and form
- [x] CMS-backed policy pages (owner-editable Markdown)
- [ ] Account area: orders, addresses, profile
- [ ] Wishlist

## Phase 4 — Money

- [ ] Coupon validation endpoint
- [ ] Checkout: address, shipping, server-side totals
- [ ] Razorpay order + checkout
- [ ] **Webhook with signature verification** — the only thing that confirms an order
- [ ] COD flow with the settings limit
- [ ] Order confirmation page
- [ ] Stock decrement in the same transaction as the order

## Phase 5 — After the sale

- [x] Email templates: welcome, password reset, order confirmation, shipped, contact
- [ ] Wire order emails to the checkout and shipping actions
- [ ] GST invoice PDF
- [ ] Customer account order history
- [ ] Reviews with admin approval

## Phase 6 — Launch

- [x] API reference ([API.md](API.md)) and setup guide ([SETUP.md](SETUP.md))
- [ ] sitemap.xml, robots.txt, per-page canonical URLs
- [ ] Analytics: GA4, Meta Pixel
- [ ] Lighthouse pass on mobile
- [ ] Error pages and loading skeletons for every route
- [ ] Owner walkthrough + a short Hindi how-to video
- [ ] Production deploy, domain pointed, test order placed

---

## Open questions

| # | Question | Blocks | Status |
|---|---|---|---|
| 1 | Fixed price per design, or weight × rate + making charge? | Which pricing path we default to | waiting on client — both are built |
| 2 | Is he GST registered, and do shown prices include GST? | Checkout totals, invoice format | waiting on client |
| 3 | Mobile-only admin, or does he use a computer? | Already built mobile-first; answer only confirms | waiting on client |
| 4 | Vercel Pro (₹1,750/mo) or VPS (₹600/mo)? | Deploy target | waiting on developer + client |
| 5 | Developer's WhatsApp number for the brief's send button | `docs/index.html` line 326 | waiting on developer |
| 6 | **Neon connection strings** | Migration, seed, and every page that reads data | **waiting on developer** |

---

## Version notes

Worth knowing, because most tutorials online are still on the previous major:

- **Prisma 7** — connection URLs moved out of `schema.prisma` into
  `prisma.config.ts`; the client requires a driver adapter (`PrismaPg`).
- **TypeScript 7** — `baseUrl` was removed from `tsconfig.json`; `paths` alone.
- **Next 16** — `middleware.ts` is deprecated in favour of `proxy.ts`.
- **zod 4** — `.default({})` fails on an object whose fields all have defaults;
  `.prefault({})` is the replacement.
- **lucide-react v1** — brand marks were dropped; the three social icons are
  drawn locally in `components/storefront/social-icons.tsx`.
