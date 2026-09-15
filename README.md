# Silver Jewellery Store

A full-stack e-commerce store for a small silver jewellery maker in India: storefront,
admin panel, payments, invoices and order email.

**Status:** planning complete, application scaffold not yet generated.
See [docs/PROGRESS.md](docs/PROGRESS.md) for what is done and what is next.

---

## The client brief — send this link on WhatsApp

`docs/index.html` is a self-contained page the shop owner fills in on his phone. No login,
no account, no server. Answers save in his own browser as he types, and a button copies
them into WhatsApp.

**To publish it free, on a public URL:**

1. Push this repo to GitHub and make it **public**
   (GitHub Pages on a private repo needs a paid plan).
2. On GitHub: **Settings → Pages → Source: Deploy from a branch →
   Branch `main`, folder `/docs` → Save**.
3. Wait about a minute, then send him:
   `https://uprightbiswa.github.io/jewellers/`

**Before you publish**, open [docs/index.html](docs/index.html) and set `DEV_WHATSAPP`
(near line 326) to your own number in international form, digits only — for example
`"919876543210"`. Then his **Open WhatsApp** button sends the answers straight to you
instead of asking him to pick a contact.

If you would rather keep the repo private, drag `docs/index.html` onto
[app.netlify.com/drop](https://app.netlify.com/drop) — it gives you a public URL in
seconds, no account required.

[docs/CLIENT-BRIEF.md](docs/CLIENT-BRIEF.md) holds the same questions as plain Hinglish
text, in case you would rather just paste them into WhatsApp directly.

---

## Documents

| File | What it is |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack choices, hosting, image pipeline, data model, costs |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Live work tracker and open questions |
| [docs/CLIENT-BRIEF.md](docs/CLIENT-BRIEF.md) | The client questions as plain text for WhatsApp |
| [docs/index.html](docs/index.html) | The same questions as a public fill-in page |
| [CLAUDE.md](CLAUDE.md) | Project context for AI coding sessions |

## Planned stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · Motion · Prisma 6 ·
PostgreSQL (Neon) · Cloudinary · Auth.js v5 · Razorpay · Resend · Upstash Redis

## Local setup

Once the app is scaffolded:

```bash
npm install
cp .env.example .env.local     # then fill in real values
npx prisma migrate dev
npm run db:seed
npm run dev
```

The site runs at http://localhost:3000, the admin panel at http://localhost:3000/admin.

## Environment

Every variable is listed in [.env.example](.env.example) with a comment. `.env.local` is
git-ignored and must never be committed.

## Deploying

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) section 2. Short version: Vercel Hobby
for development, Vercel Pro or a VPS for the live shop — Vercel's Hobby plan does not
permit commercial use.
