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

**Domains → Add Domain →** `charubalasilver.in`

Resend gives three DNS records. Add them where the domain is registered — the
same place the Vercel records go:

| Type | Name | Points to | What it does |
|---|---|---|---|
| MX | `send` | `feedback-smtp.*.amazonses.com` | Bounce handling |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF — says Resend may send as you |
| TXT | `resend._domainkey` | a long `p=…` key | DKIM — signs each message |

Verification takes minutes to a few hours. Until it says **Verified**, mail to
customers will not go out.

> **You cannot do this yet.** `charubalasilver.in` is not pointed at anything — the
> site is on `jewellers-one.vercel.app`. Point the domain first (docs/DEPLOY.md),
> then come back. Until then Resend will only let you send to your own account
> address, which is enough to test but not to trade.

### 3. Create the key

**API Keys → Create API Key**

- Name: `charubala-production`
- Permission: **Sending access** only, not Full access
- Domain: `charubalasilver.in`

It is shown **once**. Copy it — it starts `re_`.

### 4. Put it in Vercel

**Vercel → Project → Settings → Environment Variables**

```
RESEND_API_KEY        re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM            orders@charubalasilver.in
EMAIL_ADMIN_NOTIFY    charubalasilver@gmail.com
```

Never in a file. `.env.local` is for your machine only, and this repository is
public.

### The two addresses, and why they differ

| Variable | Example | Needs a real mailbox? |
|---|---|---|
| `EMAIL_FROM` | `orders@charubalasilver.in` | **No** |
| `EMAIL_ADMIN_NOTIFY` | `charubalasilver@gmail.com` | Yes |

`EMAIL_FROM` must be **on a domain verified with Resend**. A Gmail address is
rejected, and rightly so — sending as `gmail.com` would be claiming a domain you
do not own. But **it does not need to exist as a mailbox.** Nothing is ever
delivered to `orders@charubalasilver.in`; it is a label on the envelope.

Customers do reply to order emails, though — to ask where a parcel is, or to
change a size. Every message is sent reply-to `EMAIL_ADMIN_NOTIFY`, so those
answers land in Rahul's ordinary Gmail. One address, no new mailbox: the
from-line is a name, and everything real arrives where he already reads mail.

Until `charubalasilver.in` is verified in Resend, keep
`EMAIL_FROM="onboarding@resend.dev"`. It works today, but only delivers to the
address that owns the Resend account — enough to test, not to trade.

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
| Application home page | `https://charubalasilver.in/` |
| Privacy policy link | `https://charubalasilver.in/pages/privacy-policy` |
| Terms of service link | `https://charubalasilver.in/pages/terms` |
| Authorised domain | `charubalasilver.in` |
| Developer contact | `charubalasilver@gmail.com` |

**Scopes:** add only `userinfo.email` and `userinfo.profile`. Nothing else.
Asking for more triggers a verification review that takes weeks and Charubala
needs none of it.

**Publishing status:** leave it in **Testing** while you try it out, and add
your own address under **Test users**. In Testing only those addresses can sign
in. Press **Publish app** when you are ready for customers — with only those two
scopes it goes live immediately, with no review.

### 1b. Prove the domain is yours — this is the step that fails

Google will refuse the branding with:

> The website of your home page URL "https://charubalasilver.in/" is not
> registered to you. Verify ownership of your home page.

This is not about the site being live. `charubalasilver.in` already answers 200
and serves the privacy and terms pages. Google is saying something narrower: the
Google account filling in the consent screen has never proved it controls that
domain. Until it has, **no amount of editing the consent screen will pass.**

Fix it in Search Console, not in the Cloud Console:

1. [search.google.com/search-console](https://search.google.com/search-console) —
   sign in as `charubalasilver@gmail.com`, **the same account that owns the Cloud
   project**. A different Google account verifying the domain does not count.
2. **Add property → Domain** (the left-hand box, not URL prefix). Enter
   `charubalasilver.in` with no `https://` and no `www`.
3. Google gives one TXT record:

   | Type | Name | Value |
   |---|---|---|
   | TXT | `@` | `google-site-verification=…` |

4. Add it where the domain is registered — the same DNS panel holding the Vercel
   records. Leave the existing records alone; a TXT record does not disturb them.
5. Back in Search Console, press **Verify**. DNS usually takes minutes; it can
   take a few hours.
6. Then Google Auth Platform → Branding → **I have fixed the issues → Request
   re-verification**.

A *Domain* property covers `charubalasilver.in` and every subdomain at once,
which is why it is worth the DNS record over the quicker HTML-file method.

You will want Search Console anyway — it is where the sitemap is submitted and
where you find out what people searched for to reach the shop. That is task #40.

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
https://jewellers-one.vercel.app/api/auth/callback/google
```

Both `localhost` and `127.0.0.1` are there because they are different origins to
a browser, and this project has already been bitten by that once — see the Next
16 dev-origins note in `CLAUDE.md`.

Add `https://charubalasilver.in/...` to both lists the day the domain is pointed. You
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
