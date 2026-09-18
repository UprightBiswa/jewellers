# Going live: accounts, in order

Everything — storefront, admin panel, REST API and the Razorpay webhook — is one
Next.js app. Vercel runs the whole thing. There is no second server to manage.

Create the accounts in this order. Each step says what to copy and where it goes.
Nothing but the database blocks you from deploying.

---

## The short version

| # | Service | Free tier | What it does here | When |
|---|---|---|---|---|
| 1 | **Neon** | 0.5 GB Postgres, forever | The database | **Now** |
| 2 | **Vercel** | Hobby: free, non-commercial | Hosting: site + admin + API | **Now** |
| 3 | **Cloudinary** | 25 credits/month | Product photos | Before real photos |
| 4 | **Resend** | 3,000 emails/month | Order and password emails | Before launch |
| 5 | **Upstash** | 10,000 commands/day | Rate limiting | Before launch |
| 6 | **Razorpay** | free, 2% per order | UPI, cards, net banking | Before taking money |
| 7 | Google Cloud | free | "Sign in with Google" | Optional, any time |

**Create each account in Rahul's name, with his email.** They hold his shop's
data and his money. A developer's account is a problem the day you hand over.

---

## 1. Neon — the database

[neon.tech](https://neon.tech) → sign up → New Project.

- **Region: Singapore (`ap-southeast-1`).** Closest to West Bengal. Mumbai is
  not offered on the free tier; Singapore adds roughly 60ms, which nobody notices.
- Project name: `charubala-silver`

From the dashboard, copy **two** connection strings:

```
DATABASE_URL   postgresql://…@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
DIRECT_URL     postgresql://…@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

They differ by one word. `DATABASE_URL` has **`-pooler`** in the host and is what
the app uses. `DIRECT_URL` does not, and is what migrations use — Neon's pooler
cannot run them. Getting these the wrong way round shows up as a migration that
hangs forever.

**Free tier reality:** 0.5 GB is enormous here. Fifteen products with orders and
customers will use a few megabytes. Compute sleeps after five minutes idle and
wakes in well under a second — and because the shop pages are cached, most
visitors never touch the database at all.

Then, once the URLs are in place:

```bash
npx prisma migrate deploy
npm run db:seed
```

---

## 2. Vercel — hosting

[vercel.com](https://vercel.com) → sign up **with GitHub** → Add New Project →
import `UprightBiswa/jewellers`.

Vercel detects Next.js. Do not change the build settings.

**Before clicking Deploy**, add the environment variables. Copy them from
`.env.example` — at minimum:

```
DATABASE_URL          the pooled Neon string
DIRECT_URL            the direct Neon string
AUTH_SECRET           openssl rand -base64 32   (a NEW one, not your local one)
NEXT_PUBLIC_SITE_URL  https://charubala.com
NEXT_PUBLIC_SITE_NAME Charubala Silver
SEED_ADMIN_EMAIL      Rahul's email
SEED_ADMIN_PASSWORD   a new password, not the local one
```

### What Vercel handles for you

- The storefront, the admin panel at `/admin`, and every `/api/v1` route — all
  one deployment, one domain.
- The Razorpay webhook at `/api/webhooks/razorpay`.
- HTTPS and the certificate, automatically.
- A preview URL for every push, so you can check a change before it is live.

### The one thing to know about the free plan

**Vercel's Hobby plan is for non-commercial use.** A shop taking money is
commercial. Check Vercel's current terms before launch and budget for Pro
(about ₹1,750/month) — or use one of the alternatives below.

### Analytics

Vercel → your project → Analytics → Enable. The code is already in place
(`src/components/analytics.tsx`) and only runs in production. Speed Insights is
the same switch. Nothing to install.

---

## 3. Cloudinary — product photos

[cloudinary.com](https://cloudinary.com) → sign up → Dashboard.

Copy from "Product Environment Credentials":

```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   (the cloud name again — the browser needs it)
```

### How uploading actually works

1. Rahul taps "Take a photo" in the admin, on his phone.
2. The browser shrinks it before anything leaves the device — a 12 MP camera
   photo becomes about 500 KB, which is the difference between an upload that
   finishes on shop wifi and one that does not.
3. The app asks our server for a **signed, scoped** upload permission.
4. The browser sends the photo **straight to Cloudinary**. It never passes
   through Vercel, so no function ever handles a large file.
5. Cloudinary crops it square, converts it to WebP or AVIF per browser, and
   serves it from its own edge.

**Vercel does zero image work.** `next/image` uses a custom loader
(`src/lib/images/loader.ts`) that points at Cloudinary directly, so Vercel's
image-transformation quota — the line item most likely to push a small shop off
a cheap plan — stays at zero.

**Free tier reality:** 25 credits/month, roughly 25 GB of storage plus delivery
combined. For a 100-product shop that is on the order of 150,000 image views a
month. Charubala will not come close for a long time.

**Alternative:** [ImageKit](https://imagekit.io) — 20 GB/month free and better
points of presence inside India. Swapping is one file
(`src/lib/images/cloudinary.ts`); nothing else in the app touches the SDK.

---

## 4. Resend — email

[resend.com](https://resend.com) → sign up → API Keys → Create.

```
RESEND_API_KEY
EMAIL_FROM            orders@charubala.com
EMAIL_ADMIN_NOTIFY    Rahul's email
```

`EMAIL_FROM` must be on a domain verified in Resend — add `charubala.com` under
Domains and put the DNS records at your registrar. Until then, email is written
to the server log instead of sent, and nothing breaks.

Free tier: 3,000/month, 100/day. An order sends two (customer and owner), so
that is roughly 1,500 orders a month.

---

## 5. Upstash — rate limiting

[upstash.com](https://upstash.com) → Create Database → Redis → region Singapore.

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Without these the limiter falls back to in-process memory, which resets on every
deployment and is not shared between servers. Fine locally, not a real limit in
production — and the login and coupon endpoints are exactly what wants one.

Free tier: 10,000 commands/day. Nowhere near it.

---

## 6. Razorpay — payments

[razorpay.com](https://razorpay.com) → sign up → complete KYC.

Rahul needs: **PAN**, a **current bank account**, a **cancelled cheque**, and
**Aadhaar**. He has all of these. Approval usually takes 2–4 working days.
GST is **not** required — he is not registered, and Razorpay does not need it.

Start with the **test** keys (`rzp_test_…`) and place one real end-to-end order
before switching to live.

```
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID   (the key id again — the browser needs it)
```

### The webhook — do not skip this

Razorpay Dashboard → Settings → Webhooks → Add:

- URL: `https://charubala.com/api/webhooks/razorpay`
- Events: `payment.captured`, `payment.failed`, `order.paid`
- Copy the signing secret into `RAZORPAY_WEBHOOK_SECRET`

The webhook is what confirms an order when a customer loses signal on the bank
page. Without it, a payment that succeeded can leave an order sitting unpaid.

Until the keys exist, checkout shows cash on delivery only and points at
WhatsApp for UPI. Nothing is broken; the option simply is not offered.

---

## 7. Google sign-in (optional)

[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services →
Credentials → OAuth client ID → Web application.

Authorised redirect URI: `https://charubala.com/api/auth/callback/google`

```
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
```

Leave them blank and the Google button simply does not appear.

---

## The domain

Buy **charubala.com** in **Rahul's own registrar account** — GoDaddy, Namecheap,
Hostinger, any of them, about ₹900/year. Not in yours. The day he wants to move
to another developer, the domain has to be his or it becomes an argument.

Vercel → Project → Settings → Domains → add `charubala.com`. Vercel shows the
two DNS records to paste at the registrar. It issues the certificate itself.

Then set `NEXT_PUBLIC_SITE_URL=https://charubala.com` and redeploy — order
emails, canonical URLs, the sitemap and the Google callback all read it.

---

## What it costs

**Everything free, while testing:** ₹0. Neon, Cloudinary, Resend, Upstash and
Vercel Hobby all have real free tiers, and this app is built to stay inside them.

**Once it is a real shop taking money:**

| | Monthly | Notes |
|---|---|---|
| Domain | ₹75 | ₹900/year |
| Database (Neon free) | ₹0 | Paid is ~₹1,650 when outgrown — not soon |
| Images (Cloudinary free) | ₹0 | Vercel does no image work, so no quota there |
| Email (Resend free) | ₹0 | ~1,500 orders/month before paying |
| Rate limiting (Upstash free) | ₹0 | |
| **Hosting** | **₹0 – ₹1,750** | See below |
| Razorpay | 2% + GST per order | Only cost that grows with sales |

### Hosting is the one real decision

| Option | Monthly | Trade-off |
|---|---|---|
| **Vercel Pro** | ~₹1,750 | Zero ops, best Next.js support. Simplest. |
| **Cloudflare Workers** (OpenNext) | ₹0 – ₹400 | Very cheap, good India latency, less-travelled path |
| **VPS + Coolify** (Hetzner/DigitalOcean) | ₹500 – ₹900 | Cheapest at scale, but you own updates, backups and TLS |

For a shop doing a few orders a week, ₹1,750/month is a lot against revenue.
**Deploy on Vercel Hobby to demo it to Rahul**, then decide with him: Pro if he
wants it to be someone else's problem, a VPS if he would rather keep the money.

---

## After the first deploy

```bash
npx prisma migrate deploy      # create the tables
npm run db:seed                # categories, products, policies, his admin account
```

Then check, in this order:

1. `https://charubala.com/api/v1/health` returns `"status": "ok"` and shows which
   integrations are live.
2. Sign in at `/admin/login` with `SEED_ADMIN_EMAIL`, and **change the password**.
3. Add one real product with a real photo, from a phone.
4. Place one test order end to end.
5. `AUDIT_BASE=https://charubala.com npm run audit` — 85 checks against the live
   site.
6. Submit `https://charubala.com/sitemap.xml` in Google Search Console.
