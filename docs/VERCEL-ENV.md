# Vercel environment variables

Paste these into **Vercel → Project → Settings → Environment Variables**, set to
**Production** (and Preview, if you want previews to work).

Secrets below are freshly generated for production and are **different from the
local ones on purpose** — a leaked development secret should never be a
production problem.

> **Leave a box out rather than filling it with anything.**
> Every optional service degrades when its variable is missing. It cannot
> degrade when the variable holds a placeholder — a `1` or an `xxx` looks set,
> and the service reads it as a real setting. A deploy with
> `UPSTASH_REDIS_REST_URL="1"` failed the whole build for exactly that reason.
> The code now checks the *shape* of each value and falls back with a warning,
> but the rule still stands: **if you do not have the real value yet, do not add
> the variable.** Delete the row; do not blank it, do not type a placeholder.

---

## Ready to paste now

```bash
NEXT_PUBLIC_SITE_NAME="Charubala Silver"
NEXT_PUBLIC_SITE_URL="https://charubala.com"
NEXT_PUBLIC_WHATSAPP_NUMBER="918011210884"

# Sessions. Generated for production — do not reuse the local one.
AUTH_SECRET="oIpHq4DOxg1fDUSpa3s+Vtq89CesFyt8GJH3KEAZvpA="

# Razorpay TEST keys — safe, no real money. Swap for live keys at launch.
RAZORPAY_KEY_ID="rzp_test_TdakE5txomTt5E"
RAZORPAY_KEY_SECRET="Z1zqBDs8o3a2E2C0Dl9gfxP7"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_TdakE5txomTt5E"

# Paste this same value into Razorpay → Settings → Webhooks → Secret
RAZORPAY_WEBHOOK_SECRET="i-qNDnjJWa6e8irA3WZkB6npdu0ACHiE"

EMAIL_FROM="orders@charubala.com"
EMAIL_ADMIN_NOTIFY="charubalasilver@gmail.com"
```

### There is no admin variable any more

The panel's secret URL and Rahul's password used to be four variables here. They
are gone. The URL is derived from `AUTH_SECRET`, and the password lives in the
database as a hash.

With the `AUTH_SECRET` above, the production door is:

```
https://charubala.com/9de35626f26acf93
```

Visiting it once drops a cookie and forwards to `/admin/login`. Without that
visit `/admin` answers **404** — not 403, so nobody learns a panel is there.

Change `AUTH_SECRET` and the door moves, which is the point: rotating the
session secret should invalidate the old URL too.

To see the door and the accounts on any machine, or to set a password:

```bash
npm run admin                                  # door URL + who can sign in
npm run admin -- --reset                       # a generated password, shown once
npm run admin -- --password "…"                # one you choose
npm run admin -- --email rahul@example.com     # change the sign-in address
```

The summary is written to `ADMIN-ACCESS.local.txt`, which `.gitignore` keeps out
of every commit.

---

## Still needed — one line each, from the account you create

### Neon (required — nothing runs without it)

```bash
DATABASE_URL="postgresql://...@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://...@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

The difference is **`-pooler`**. `DATABASE_URL` has it, `DIRECT_URL` does not.
The wrong way round shows up as a migration that hangs.

### Cloudinary — done, paste as-is

```bash
CLOUDINARY_CLOUD_NAME="tpfcmu4r"
CLOUDINARY_API_KEY="234867866922274"
CLOUDINARY_API_SECRET="ZclzDvwOD6PO-kFrJvPp2J_YQKE"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="tpfcmu4r"
```

The cloud name appears twice on purpose — the browser needs its own copy to
build image URLs, and that is safe: the cloud name is in every image address.
The **secret is not**, and never reaches the browser; it only signs upload
permissions on the server.

Ignore the `CLOUDINARY_URL=cloudinary://...` line Cloudinary shows. It packs all
three values into one string, and this app reads them separately.

### Resend — order emails · **no account needed to launch**

Do not add `RESEND_API_KEY` yet. Without it every order email is written to the
Vercel logs instead of sent, and the order itself completes normally. Rahul
still learns about the order from the admin panel and the WhatsApp button.

Add it when you want customers to get an emailed confirmation:
resend.com → free tier → API Keys → a key starting `re_…`. `charubala.com` must
also be verified under Resend → Domains, or `EMAIL_FROM` is rejected.

The key must begin with `re_`. Anything else is ignored with a warning in the
log, and mail goes back to being logged.

### Upstash — rate limiting · **no account needed to launch**

Do not add `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`. Without them
the limiter runs in each server instance's own memory. That is a real limit, it
just is not shared between instances — a determined attacker gets a few more
attempts. For a shop taking a handful of orders a day that is fine.

Add it when traffic justifies it: upstash.com → free tier → Create Database →
**Singapore (ap-southeast-1)**, the same region as Neon → the REST section gives
a URL and a token.

The URL must begin with `https://`. A value like `1` is now ignored with a
warning instead of failing the build.

### Google sign-in — **skip it**

Do not add `AUTH_GOOGLE_ID` or `AUTH_GOOGLE_SECRET`. The Google button does not
appear, and email-and-password sign-in is unaffected. Customers can also check
out with no account at all.

If you add it later, the redirect URI is
`https://charubala.com/api/auth/callback/google`.

---

## What should NOT be in Vercel

If any of these rows exists in Settings → Environment Variables, **delete the
row** — empty or filled with a placeholder, both are wrong:

| Variable | Why it should be absent |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | No Upstash account. In-memory limiting is fine. |
| `RESEND_API_KEY` | No Resend account. Emails go to the logs. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | No Google OAuth app. The button hides itself. |
| `ADMIN_PATH_SECRET`, `SEED_ADMIN_*`, `ADMIN_IP_ALLOWLIST` | Not variables any more — see above. Delete them. |
| `CLOUDINARY_URL` | Cloudinary's combined string. This app reads the three parts separately. |
| `NODE_ENV`, `VERCEL_*`, `PORT` | Vercel sets these itself; overriding them breaks the build. |

Everything in the list above is optional by design. `DATABASE_URL`,
`DIRECT_URL`, `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL` are the only variables
the site genuinely cannot start without.

---

## URLs to register elsewhere

| Where | URL |
|---|---|
| Razorpay → Settings → Webhooks | `https://charubala.com/api/webhooks/razorpay` |
| Razorpay events | `payment.captured`, `payment.failed`, `order.paid` — those three only |
| Google Search Console | `https://charubala.com/sitemap.xml` |
| Uptime monitor | `https://charubala.com/api/v1/health` |
| Google OAuth redirect (if used) | `https://charubala.com/api/auth/callback/google` |
| **Rahul's admin door** | `https://charubala.com/9de35626f26acf93` |

---

## Before the domain is pointed

Vercel gives you something like `jewellers-xyz.vercel.app` immediately. To test
on that first, set `NEXT_PUBLIC_SITE_URL` to it, then change it to
`https://charubala.com` once DNS is done and redeploy. Order emails, canonical
URLs, the sitemap and the OAuth callback all read that one variable.

---

## After the first successful deploy

```bash
npx prisma migrate deploy     # create the tables
npm run db:seed               # categories, products, policies, Rahul's account
```

Then, in order:

1. `https://charubala.com/api/v1/health` → `"status": "ok"`, and check the
   `integrations` block shows what you expect to be live.
2. Visit `https://charubala.com/9de35626f26acf93` once, then sign in at `/admin/login`.
3. Set the password: `npm run admin -- --password "…"` (it writes to the same
   Neon database Vercel uses, so it works from your machine).
4. Add one real product, with a photo, from a phone.
5. Place one test order end to end.
6. `ADMIN_EMAIL=… ADMIN_PASSWORD=… AUDIT_BASE=https://charubala.com npm run audit`
   — 103 checks against production.

---

## Going live with real payments

1. Razorpay → complete KYC → switch to Live mode → generate live keys.
2. Replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` **in Vercel only** — never in a file.
3. Create the webhook again in Live mode; it needs its own secret.
4. **Regenerate the test keys** in Razorpay. The ones above were shared in chat,
   so treat them as known.
5. Place one real ₹1 order and refund it.
