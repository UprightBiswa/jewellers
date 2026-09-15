# Setup

## What you need before you start

| # | Service | Free tier | What it does here | Required? |
|---|---|---|---|---|
| 1 | **[Neon](https://neon.tech)** | 0.5 GB Postgres | The database | **Yes** |
| 2 | **[Cloudinary](https://cloudinary.com)** | 25 credits/mo | Product photos | Before real photos |
| 3 | **[Resend](https://resend.com)** | 3,000 emails/mo | Order and password emails | Before launch |
| 4 | **[Upstash](https://upstash.com)** | 10k commands/day | Rate limiting | Before launch |
| 5 | **[Razorpay](https://razorpay.com)** | free, 2% per txn | UPI, cards, netbanking | Before taking money |
| 6 | **[Google Cloud](https://console.cloud.google.com)** | free | "Sign in with Google" | Optional |

Sign up, copy the keys into `.env.local`. Nothing but Neon blocks the first run:
every other integration is checked at runtime and the feature degrades rather
than crashing — no Cloudinary means grey placeholder images, no Resend means
emails are printed to the console.

---

## Looking at the UI before you have a database

```bash
npm install
npm run dev
```

The storefront runs on **preview data** — the same catalogue the seed writes,
served from memory — with an amber "Preview data" banner across the top so it can
never be mistaken for the real shop. Good for reviewing the design and for
showing a client before any account exists.

What does not work in preview mode, by design: the bag, checkout, and the whole
admin panel. Those are database state, and faking them would only mislead.
`/admin` shows a short note explaining what to connect.

Preview mode is **development only**. In production an unreachable database
fails loudly, as it should.

## First run

```bash
npm install
cp .env.example .env.local     # fill in DATABASE_URL, DIRECT_URL, AUTH_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Then:

- Shop — http://localhost:3000
- Admin — http://localhost:3000/admin (sign in at `/admin/login`)
- Owner login — whatever you set as `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- Demo customer — `demo.customer@example.com` / `Demo!2345`

`AUTH_SECRET` is generated with `openssl rand -base64 32`.

### A note on `.env` vs `.env.local`

`.env` holds placeholders so `prisma generate` and `next build` run before any
real service exists. `.env.local` overrides it and holds the real values. Both
are git-ignored; neither should ever be committed.

---

## Ports

| Port | What | Command |
|---|---|---|
| 3000 | Storefront **and** admin — one Next.js app | `npm run dev` |
| 5555 | Prisma Studio, a spreadsheet view of the database | `npm run db:studio` |
| 3002 | React Email preview, for editing order emails | `npm run email:dev` |

The admin is not a separate server. It is `/admin` in the same app, gated by
`src/proxy.ts` and again by the panel layout.

To run on another port: `PORT=4000 npm run dev`.

---

## Neon specifics

Neon gives you two connection strings, and this project needs both:

```
DATABASE_URL   ...ep-xxx-pooler.region.aws.neon.tech...   ← pooled, used at runtime
DIRECT_URL     ...ep-xxx.region.aws.neon.tech...          ← direct, used by migrations
```

The pooler cannot run DDL, so migrations go through `DIRECT_URL`
(wired up in `prisma.config.ts`). Getting these the wrong way round shows up as
a migration that hangs.

Pick the region closest to your customers — `ap-southeast-1` (Singapore) is the
nearest Neon region to India.

---

## Prisma 7 notes

Two things changed in Prisma 7 that break every older tutorial you will find:

1. **Connection URLs are no longer in `schema.prisma`.** They live in
   `prisma.config.ts`. The `datasource` block only names the provider.
2. **The client needs a driver adapter.** `datasourceUrl` is gone;
   `src/lib/db.ts` constructs `PrismaClient` with `PrismaPg`.

Everyday commands:

```bash
npm run db:migrate      # create and apply a migration in development
npm run db:deploy       # apply existing migrations in production
npm run db:studio       # browse and edit rows
npm run db:seed         # demo data (safe to re-run — everything upserts)
npm run db:reset        # wipe, re-migrate, re-seed. Destroys all data
```

---

## Building

```bash
npm run build
```

The build prerenders the home page, category pages and product pages, so
**`DATABASE_URL` must point at a reachable database when you build**. That is
normal for a Next.js + Prisma shop and it is what makes those pages fast and
indexable. CI needs the same environment variables as production.

---

## Deploying

See [ARCHITECTURE.md](ARCHITECTURE.md) section 2 for the hosting comparison.
Whichever you pick:

1. Set every variable from `.env.example` in the host's dashboard.
2. Set `NEXT_PUBLIC_SITE_URL` to the real domain — order emails, canonical URLs
   and the Google OAuth callback all read it.
3. Add `{SITE_URL}/api/auth/callback/google` to the Google OAuth client.
4. Point the Razorpay webhook at `{SITE_URL}/api/webhooks/razorpay` and put the
   signing secret in `RAZORPAY_WEBHOOK_SECRET`.
5. Run `npm run db:deploy` against production before the first deploy.
6. Point an uptime monitor at `/api/v1/health` — it returns 503 only when the
   database is unreachable.

---

## Troubleshooting

**`Invalid environment variables. AUTH_SECRET: expected string`**
`.env.local` is missing or `AUTH_SECRET` is blank.

**Migration hangs forever**
`DIRECT_URL` is pointing at the pooled host. It must be the one *without*
`-pooler`.

**`Module not found: Can't resolve 'fs'`**
Something in a client component imported `@/lib/images/cloudinary`. Image URLs
come from `@/lib/images/url`; only server code touches the Cloudinary SDK.

**Product images are grey boxes with text**
Cloudinary keys are not set. Expected until you add them — the placeholder is
deliberate, not a broken image.

**`npm run dev` fails with `'${PORT:-3000}' is not a non-negative number`**
An old checkout. The script is now plain `next dev`; that shell syntax only
works in bash and breaks in PowerShell and cmd. Use `PORT=4000 npm run dev` to
change the port.

**Emails never arrive**
Without `RESEND_API_KEY` they are logged to the console instead. With one, check
that `EMAIL_FROM` is on a domain verified in Resend.
