# Architecture & Service Choices

Store: a small silver jewellery maker (925 sterling / 999 fine), India, retail D2C.
The owner is non-technical, works from a phone, and photographs products himself.

That last line drives most of the decisions below: **the admin panel is a mobile-first
product, not a desktop afterthought.**

---

## 1. The stack

| Layer | Choice | Why this one |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Server Components + ISR give real SEO on product pages; one codebase for storefront, admin and API |
| Styling | **Tailwind CSS v4 + shadcn/ui** | shadcn is copy-in source, so admin forms stay editable; no runtime CSS-in-JS cost |
| Animation | **Motion (`motion/react`)** | Layout animations, scroll reveals, page transitions; respects `prefers-reduced-motion` |
| Database | **PostgreSQL on Neon** | Relational is correct here: orders, items, coupons and stock need real constraints and transactions |
| ORM | **Prisma 6** | `prisma migrate` gives versioned, reviewable SQL; generated types flow into the admin forms |
| Images | **Cloudinary**, behind our own provider interface | Generous free tier, and on-the-fly transforms mean a raw phone photo is served cropped, WebP/AVIF and correctly sized |
| Auth | **Auth.js v5 (NextAuth)** | Credentials + role for admin, email OTP for customers. Free, no MAU ceiling |
| Payments | **Razorpay** (plus COD) | UPI is non-negotiable for an Indian jewellery buyer. Standard Checkout + signed webhook |
| Email | **Resend + React Email** | 3,000 emails/month free; templates are JSX, so order mails reuse real components |
| Cache / rate limit | **Upstash Redis** | Serverless-friendly. Cart sessions, OTP throttling, admin list caching |
| Invoices | **@react-pdf/renderer** | GST-format PDF generated server-side, attached to the order email |
| Search | **Postgres full-text**, to start | A 200-product catalogue does not need Algolia or a vector DB |

### Why not the alternatives you asked about

- **MongoDB** — an order is a transaction across products, stock, coupon usage and
  payment. Postgres gives you that with foreign keys and real transactions. Mongo makes
  you hand-roll it.
- **A vector DB** — nothing here is semantic search. Skip it. If "find similar designs"
  ever matters, add pgvector to the same Postgres.
- **Render free tier** — free web services sleep after about 15 minutes idle and
  cold-start in 30 to 60 seconds. On a shop that is a lost sale every time a customer
  arrives first.
- **Railway** — no meaningful free tier any more, only trial credit.

---

## 2. Hosting, honestly

The free path works for **development and demo**: Vercel Hobby + Neon free +
Cloudinary free + Resend free + Upstash free, at no cost.

**Vercel's Hobby plan forbids commercial use.** The moment this is a real shop taking
money, you are on one of these:

| Option | Cost/month | Trade-off |
|---|---|---|
| **Vercel Pro** | about $20 (Rs 1,750) | Zero ops, best Next.js support. Recommended if the client can afford it |
| **Cloudflare Workers** via OpenNext | Rs 0 to 400 | Very cheap, good India latency, but a less-travelled deploy path |
| **VPS (Hetzner / DigitalOcean) + Coolify** | Rs 500 to 900 | Cheapest as the store grows, but you own updates, backups and TLS |

**Recommendation:** build and demo on Vercel Hobby under *your* account. When the client
signs off, move the project to *his* Vercel account on Pro, or to a VPS if Rs 1,750 a
month is too much. Keep the domain in the client's own registrar account from day one,
never in yours.

Neon free tier: 0.5 GB storage, compute auto-suspends but wakes in under a second.
Fine for this store for a long time; paid is $19/month when you outgrow it.

---

## 3. Images, the part that decides whether this works

The owner will photograph rings on his phone. The pipeline must forgive that.

```
Admin phone camera
  -> client-side compress + square crop (browser-image-compression)
  -> signed upload direct to Cloudinary (never through our server)
  -> store public_id in Postgres, not a URL
  -> next/image with a custom Cloudinary loader
  -> f_auto, q_auto, c_fill + responsive widths
```

Four points that matter:

1. **Signed direct upload.** The browser asks our API for a signature, then uploads
   straight to Cloudinary. Our server never handles the file, so a 10 MB photo on a slow
   connection cannot time out a serverless function.
2. **Store the `public_id`, not the URL.** Swapping providers later becomes a change in
   one file rather than a database migration.
3. **One provider interface.** `lib/images/provider.ts` exports `upload`, `remove` and
   `url(publicId, opts)`. Cloudinary is one implementation; ImageKit or Cloudflare R2
   can be another. Never import the Cloudinary SDK from a component.
4. **Blur placeholders.** Generate a tiny base64 at upload time and store it, so the
   product grid never flashes grey boxes.

Free-tier ceilings: Cloudinary gives 25 credits/month, roughly 25 GB of bandwidth, which
is on the order of 150k product-image views. ImageKit is the alternative with better
India POPs (20 GB/month free). Cloudflare Images is $5/month for 100k images and is the
right move at scale.

---

## 4. Pricing model: ask before you build

Both reference sites (Khushbu Jewellers, Palmonas) show **fixed prices per design**. But
many silver makers price as `weight x today's rate + making charges`.

The client brief asks which one, because it changes the schema:

- **Fixed price** — `Product.price`, and you are done.
- **Weight-based** — a `MetalRate` table the owner updates from his phone each morning,
  and `price = weightG x ratePerGram x purityFactor + makingCharge`, computed at render
  time and **frozen into `OrderItem` at checkout** so an order total never moves when the
  rate does.

Build the `MetalRate` table either way. It costs nothing and unblocks the feature.

---

## 5. Data model, first cut

```
AdminUser        id, email, passwordHash, role(OWNER|STAFF), lastLoginAt
Customer         id, email, phone, name, emailVerifiedAt
Address          id, customerId, name, phone, line1, line2, city, state, pincode, isDefault

Category         id, slug, name, parentId, image, sortOrder, isActive
Collection       id, slug, name, kind(MANUAL|AUTO), rule, bannerImage   // "Under 999", "New Arrivals"

Product          id, slug, sku, title, description, categoryId, status(DRAFT|ACTIVE|ARCHIVED),
                 purity(S925|S999|PLATED), priceMode(FIXED|WEIGHT), price, weightG, makingCharge,
                 hallmarked, huid, isFeatured, metaTitle, metaDescription, createdAt
ProductVariant   id, productId, label("Size 16"), sku, stock, priceDelta, weightG
ProductImage     id, productId, publicId, blurData, alt, sortOrder, isPrimary
ProductCollection  productId, collectionId

MetalRate        id, metal(SILVER), purity, ratePerGram, effectiveFrom, setBy

Cart             id, customerId?, sessionId, updatedAt
CartItem         id, cartId, variantId, qty, unitPriceSnapshot

Coupon           id, code, type(PERCENT|FLAT|FREESHIP), value, minOrder, maxDiscount,
                 startsAt, endsAt, usageLimit, perCustomerLimit, firstOrderOnly, isActive
CouponRedemption id, couponId, orderId, customerId

Order            id, orderNumber, customerId, status, paymentStatus, fulfilmentStatus,
                 subtotal, discount, shipping, gstAmount, total, couponCode,
                 shippingAddress(json snapshot), placedAt
OrderItem        id, orderId, productId, variantId, titleSnapshot, imageSnapshot,
                 unitPrice, qty, weightG, taxRate
Payment          id, orderId, provider, providerOrderId, providerPaymentId, signature,
                 amount, status, rawPayload(json)
Shipment         id, orderId, courier, awb, trackingUrl, shippedAt, deliveredAt

Review           id, productId, customerId, rating, title, body, images[], status(PENDING|APPROVED)
Page             id, slug, title, bodyMdx, updatedAt      // policy pages, editable by admin
Setting          key, valueJson                            // store name, GST %, free-ship threshold
AuditLog         id, actorId, action, entity, entityId, diff, createdAt
```

Snapshot rule: `OrderItem` copies title, image and price at checkout. When the owner
renames a product or changes a price, old invoices must not change with it.

---

## 6. Caching strategy

| Surface | Strategy |
|---|---|
| Home, category, product pages | Static + `revalidateTag` on publish. A product edit invalidates its tag and the page rebuilds |
| Product grid pagination | Cursor-based (`?after=<id>`), never `OFFSET` — offset degrades past a few thousand rows |
| Cart and checkout | Always dynamic, never cached |
| Admin lists | Server-side pagination, 25 rows, only the columns the table shows. Never `findMany` with every relation |
| Metal rate | Cached in Redis for 5 minutes, invalidated the moment the owner saves a new rate |
| Images | Cloudinary CDN plus `next/image`, immutable cache headers |

---

## 7. Security baseline

- Admin routes sit behind middleware that checks the session role, not just hidden links.
- Verify the Razorpay webhook signature before touching an order. Orders are confirmed by
  **webhook**, never by the browser's success callback alone.
- Recalculate every price server-side at checkout. Never trust a client-sent amount.
- Rate-limit OTP, login and coupon-apply endpoints (Upstash).
- Zod validation at every route-handler boundary.
- Secrets live only in `.env.local` and host env vars. `.gitignore` already blocks them.
- Never store card details. Razorpay's hosted checkout keeps you out of PCI scope.

---

## 8. Build order

1. Schema, migrations and seed (categories, one admin, sample products)
2. Admin auth, then product CRUD with image upload — the hardest and most valuable part
3. Storefront: home, category, product, search
4. Cart, checkout, Razorpay, webhook, order record
5. Order emails and PDF invoice
6. Admin: orders, status updates, coupons, settings, policy pages
7. Offers, reviews, SEO (sitemap, JSON-LD Product schema), analytics
8. Polish: animations, skeletons, empty states, 404 and 500

---

## 9. What this costs the client, monthly

| Item | Free tier | At scale |
|---|---|---|
| Domain | — | Rs 900/year |
| Hosting | Rs 0 (dev only) | Rs 1,750 (Vercel Pro) or Rs 600 (VPS) |
| Database | Rs 0 (Neon) | Rs 1,650 |
| Images | Rs 0 (Cloudinary) | Rs 450 |
| Email | Rs 0 (Resend) | Rs 1,700 |
| Razorpay | Rs 0 setup | 2% + GST per transaction |

**Realistic first year: Rs 900 for the domain, plus Rs 0 to 1,750 a month.** Quote the
payment-gateway percentage to the client separately. It is the only cost that grows with
his sales, and he needs to understand it before launch.
