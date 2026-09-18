# Vercel environment variables

Paste these into **Vercel → Project → Settings → Environment Variables**, set to
**Production** (and Preview, if you want previews to work).

Secrets below are freshly generated for production and are **different from the
local ones on purpose** — a leaked development secret should never be a
production problem.

---

## Ready to paste now

```bash
NEXT_PUBLIC_SITE_NAME="Charubala Silver"
NEXT_PUBLIC_SITE_URL="https://charubala.com"
NEXT_PUBLIC_WHATSAPP_NUMBER="918011210884"

# Sessions. Generated for production — do not reuse the local one.
AUTH_SECRET="oIpHq4DOxg1fDUSpa3s+Vtq89CesFyt8GJH3KEAZvpA="

# Secret door to the panel. /admin answers 404 until someone has visited
# https://charubala.com/3efee305ebe18656 once. Give this URL to Rahul only.
ADMIN_PATH_SECRET="3efee305ebe18656"

# Razorpay TEST keys — safe, no real money. Swap for live keys at launch.
RAZORPAY_KEY_ID="rzp_test_TdakE5txomTt5E"
RAZORPAY_KEY_SECRET="Z1zqBDs8o3a2E2C0Dl9gfxP7"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_TdakE5txomTt5E"

# Paste this same value into Razorpay → Settings → Webhooks → Secret
RAZORPAY_WEBHOOK_SECRET="i-qNDnjJWa6e8irA3WZkB6npdu0ACHiE"

# Rahul's first admin account, created by the seed. Change the password after
# his first sign-in.
SEED_ADMIN_EMAIL="charubalasilver@gmail.com"
SEED_ADMIN_PASSWORD="CHOOSE-A-NEW-ONE"

EMAIL_FROM="orders@charubala.com"
EMAIL_ADMIN_NOTIFY="charubalasilver@gmail.com"
```

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

### Resend (order emails)

```bash
RESEND_API_KEY=""
```

`EMAIL_FROM` is already set above, but `charubala.com` must be verified under
Resend → Domains first. Until then emails are logged instead of sent.

### Upstash (rate limiting)

```bash
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### Google sign-in (optional — skip it)

```bash
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```

Redirect URI: `https://charubala.com/api/auth/callback/google`
Leave blank and the Google button simply does not appear.

---

## URLs to register elsewhere

| Where | URL |
|---|---|
| Razorpay → Settings → Webhooks | `https://charubala.com/api/webhooks/razorpay` |
| Razorpay events | `payment.captured`, `payment.failed`, `order.paid` — those three only |
| Google Search Console | `https://charubala.com/sitemap.xml` |
| Uptime monitor | `https://charubala.com/api/v1/health` |
| Google OAuth redirect (if used) | `https://charubala.com/api/auth/callback/google` |
| **Rahul's admin door** | `https://charubala.com/3efee305ebe18656` |

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
2. Visit `https://charubala.com/3efee305ebe18656` once, then sign in at `/admin/login`.
3. **Change the admin password.**
4. Add one real product, with a photo, from a phone.
5. Place one test order end to end.
6. `AUDIT_BASE=https://charubala.com npm run audit` — 87 checks against production.

---

## Going live with real payments

1. Razorpay → complete KYC → switch to Live mode → generate live keys.
2. Replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` **in Vercel only** — never in a file.
3. Create the webhook again in Live mode; it needs its own secret.
4. **Regenerate the test keys** in Razorpay. The ones above were shared in chat,
   so treat them as known.
5. Place one real ₹1 order and refund it.
