# Email, and Google sign-in

Two accounts to create. Neither blocks launch — without email the messages are
written to the Vercel log and every order still completes; without Google the
button simply does not appear and email-and-password sign-in is unaffected.

Do email first. It is the one customers notice.

---

# Part 1 — Email (Resend)

## What it sends

| When | To | Why it matters |
|---|---|---|
| An order is placed | the customer | Their only receipt. COD buyers especially expect it |
| An order is placed | Rahul | So he knows without opening the panel |
| Payment confirmed | the customer | |
| Order shipped, with tracking | the customer | The question that otherwise arrives on WhatsApp |
| Password reset | the customer | Sign-in is broken without it |

Right now every one of those is written to the Vercel log instead of sent.

## Why Resend

Free tier is 3,000 emails a month and 100 a day — a shop taking ten orders a day
sends perhaps forty. No credit card. The alternative, Gmail SMTP, is against
Google's terms for application mail and gets throttled without warning.

## The steps

### 1. Create the account

[resend.com](https://resend.com) → **Sign up**. Use `charubalasilver@gmail.com`,
the same address as the admin, so there is one login to remember.

### 2. Add the domain

**Domains → Add Domain →** `charubala.com`

Resend gives three DNS records. Add them where the domain is registered — the
same place the Vercel records go:

| Type | Name | Points to | What it does |
|---|---|---|---|
| MX | `send` | `feedback-smtp.*.amazonses.com` | Bounce handling |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF — says Resend may send as you |
| TXT | `resend._domainkey` | a long `p=…` key | DKIM — signs each message |

Verification takes minutes to a few hours. Until it says **Verified**, mail to
customers will not go out.

> **You cannot do this yet.** `charubala.com` is not pointed at anything — the
> site is on `jewellers-one.vercel.app`. Point the domain first (docs/DEPLOY.md),
> then come back. Until then Resend will only let you send to your own account
> address, which is enough to test but not to trade.

### 3. Create the key

**API Keys → Create API Key**

- Name: `charubala-production`
- Permission: **Sending access** only, not Full access
- Domain: `charubala.com`

It is shown **once**. Copy it — it starts `re_`.

### 4. Put it in Vercel

**Vercel → Project → Settings → Environment Variables**

```
RESEND_API_KEY        re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM            orders@charubala.com
EMAIL_ADMIN_NOTIFY    charubalasilver@gmail.com
```

Never in a file. `.env.local` is for your machine only, and this repository is
public.

`EMAIL_FROM` must be **on the verified domain**. `orders@gmail.com` is rejected;
`orders@charubala.com` is accepted once the domain verifies. The inbox does not
have to exist — nobody replies to it — but the domain must.

Redeploy after adding them. Environment variables are read at build time.

### 5. Check it

```
https://jewellers-one.vercel.app/api/v1/health
```

`"email": true` means the key is a real Resend key and sending is live. It reads
`false` for a missing key *and* for a placeholder — a value like `1` is treated
as absent on purpose, so a half-filled box can never claim to be working.

Then place one test order and watch for the mail.

---

# Part 2 — Google sign-in

You already have the project: **charubalasilver**, number `477844858067`.

## What it is and is not

A Google button on the **shop** login page, so a customer can sign in without
inventing another password. Perhaps a third of Indian shoppers prefer it.

It is **not** a way into the admin. A Google sign-in always produces a shop
session, so even Rahul signing in with Google gets the shop and nothing more —
the panel needs the staff form and the secret path. That is deliberate and
enforced in code (`src/auth.config.ts`), not by configuration you could get
wrong.

Skip it if you like. Nothing else depends on it.

## The steps

Everything below is in [console.cloud.google.com](https://console.cloud.google.com)
with **charubalasilver** selected in the project picker at the top.

### 1. The consent screen — do this first

**APIs & Services → OAuth consent screen**

Google will not issue credentials until this exists.

| Field | Value |
|---|---|
| User type | **External** |
| App name | `Charubala Silver` |
| User support email | `charubalasilver@gmail.com` |
| App logo | optional, skip for now |
| Application home page | `https://jewellers-one.vercel.app` |
| Privacy policy link | `https://jewellers-one.vercel.app/pages/privacy-policy` |
| Terms of service link | `https://jewellers-one.vercel.app/pages/terms` |
| Authorised domain | `vercel.app` now, `charubala.com` once it is pointed |
| Developer contact | `charubalasilver@gmail.com` |

**Scopes:** add only `userinfo.email` and `userinfo.profile`. Nothing else.
Asking for more triggers a verification review that takes weeks and Charubala
needs none of it.

**Publishing status:** leave it in **Testing** while you try it out, and add
your own address under **Test users**. In Testing only those addresses can sign
in. Press **Publish app** when you are ready for customers — with only those two
scopes it goes live immediately, with no review.

### 2. The credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Charubala Silver web`

**Authorised JavaScript origins** — one line each:

```
http://localhost:3000
http://127.0.0.1:3000
https://jewellers-one.vercel.app
```

**Authorised redirect URIs** — the exact paths, and they must match to the
character:

```
http://localhost:3000/api/auth/callback/google
http://127.0.0.1:3000/api/auth/callback/google
https://jewellers-one.vercel.app/api/auth/callback/google
```

Both `localhost` and `127.0.0.1` are there because they are different origins to
a browser, and this project has already been bitten by that once — see the Next
16 dev-origins note in `CLAUDE.md`.

Add `https://charubala.com/...` to both lists the day the domain is pointed. You
can edit these later; changes take a few minutes to take effect.

**Create.** Google shows a **Client ID** ending `.apps.googleusercontent.com`
and a **Client secret** starting `GOCSPX-`.

### 3. Where the values go

For your machine, in `.env.local` — git-ignored, never committed:

```
AUTH_GOOGLE_ID="477844858067-xxxxxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"
```

For the live site, in **Vercel → Settings → Environment Variables** — the same
two names. Then redeploy.

The client id must end `.apps.googleusercontent.com` or the button stays hidden
on purpose: a placeholder that merely looks set would put a button on the login
form that fails the moment anyone pressed it.

### 4. Check it

`https://jewellers-one.vercel.app/api/v1/health` → `"googleAuth": true`, and a
**Continue with Google** button appears at `/login`.

## When it will not work

| What you see | Almost always |
|---|---|
| `redirect_uri_mismatch` | The redirect URI does not match to the character. Check `http` vs `https`, the port, and a trailing slash |
| `Access blocked: … has not completed verification` | Still in Testing, and that address is not a test user |
| The button never appears | `AUTH_GOOGLE_ID` missing, or not ending `.apps.googleusercontent.com` |
| Signs in, comes back signed out | `AUTH_SECRET` differs between builds, or is missing in Vercel |

## One thing to know about linking

`allowDangerousEmailAccountLinking` is on. If someone registered with
`x@gmail.com` and a password, then later signs in with Google using the same
address, the two become one account rather than two.

The name sounds alarming and the reasoning is worth keeping: it is only unsafe
where an identity provider does not verify email addresses. Google does. The
alternative — a customer who cannot reach their own order history because they
pressed a different button this time — is a real problem that would arrive by
WhatsApp, and a shop this size has no support desk to resolve it.

---

## What the health endpoint tells you

```
https://jewellers-one.vercel.app/api/v1/health
```

```json
"integrations": {
  "googleAuth": false,
  "cloudinary": true,
  "razorpay": true,
  "email": false,
  "redis": false
}
```

Each one is `true` only when its credentials are both present **and** the right
shape. `redis: false` is correct and wants no action — rate limiting runs in
memory, which is right for this volume.
