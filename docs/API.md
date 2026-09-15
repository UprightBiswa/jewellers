# API reference

Base URL: `{SITE_URL}/api/v1`

Every route lives under `/api/v1`, so a breaking change ships as `/api/v2`
alongside it rather than on top of it.

---

## Conventions

### Money is paise

`price: 84900` is ₹849.00. Never send or expect rupees, and never use a float
for money. Divide by 100 only when you print it.

### Response envelope

Success and failure use the same shape, so a client branches on one field:

```jsonc
// 200
{
  "ok": true,
  "data": { "products": [] },
  "meta": { "requestId": "…", "version": "1.0.0", "nextCursor": "clx…", "hasMore": true }
}

// 4xx / 5xx
{
  "ok": false,
  "error": { "code": "validation_failed", "message": "Some fields were not filled in correctly.",
             "details": [{ "field": "email", "message": "…" }] }
}
```

`error.message` is written for a person and is safe to show a customer as-is.
`error.code` is what you branch on.

| code | status | meaning |
|---|---|---|
| `bad_request` | 400 | Malformed request |
| `unauthorized` | 401 | Sign in required |
| `payment_failed` | 402 | Gateway declined |
| `forbidden` | 403 | Signed in, not allowed |
| `not_found` | 404 | No such resource |
| `conflict` / `out_of_stock` | 409 | State conflict; stock ran out |
| `validation_failed` | 422 | Fields failed validation, see `details` |
| `rate_limited` | 429 | Back off; honour `retry-after` |
| `internal_error` | 500 | Our fault |

### Headers

**Sent on every response**

| Header | Meaning |
|---|---|
| `x-request-id` | Quote this when reporting a problem |
| `x-api-version` | API version that answered |
| `x-ratelimit-remaining` | Calls left in the current window |

**Accepted on a request**

| Header | Meaning |
|---|---|
| `Content-Type: application/json` | Required on POST / PATCH / DELETE |
| `x-api-key` | Server-to-server key. Not needed for public reads |
| `Cookie` | Carries the cart session and the signed-in user |

### Pagination

Cursor, never offset:

```
GET /api/v1/products?limit=24
    -> meta.nextCursor = "clx123"
GET /api/v1/products?limit=24&cursor=clx123
```

`meta.hasMore` is false and `meta.nextCursor` is null on the last page.

### CORS

The storefront calls this same-origin and needs no CORS. For a different origin,
add it to `API_CORS_ORIGINS` (comma separated). Unlisted origins get a 403 on
preflight — the wildcard is never returned.

### Rate limits

Per IP, or per API key when one is sent.

| Bucket | Limit | Applies to |
|---|---|---|
| `api` | 120 / min | Catalogue reads, cart writes |
| `auth` | 8 / 5 min | Sign in, register, reset submit |
| `email` | 4 / 15 min | Password reset request, newsletter |
| `coupon` | 15 / 10 min | Coupon validation |
| `contact` | 3 / 30 min | Contact form |
| `upload` | 40 / 5 min | Upload signatures |
| `checkout` | 10 / 10 min | Placing an order |

Without Upstash keys the limiter falls back to per-instance memory, which is a
speed bump rather than a real limit. Fine locally, not in production.

---

## Public catalogue

### `GET /products`

| Query | Type | Default |
|---|---|---|
| `category` | category slug | — |
| `collection` | collection slug | — |
| `q` | search text, ≤ 80 chars | — |
| `purity` | `S925,S999,OXIDISED,GOLD_PLATED,PLATED` (comma separated) | — |
| `minPrice` / `maxPrice` | paise | — |
| `sort` | `newest` · `price-asc` · `price-desc` · `popular` | `newest` |
| `cursor` | from `meta.nextCursor` | — |
| `limit` | 1–60 | 24 |

```jsonc
{
  "ok": true,
  "data": { "products": [{
    "id": "clx…", "slug": "oxidised-peacock-ring", "title": "Oxidised Peacock Ring",
    "titleHi": "ऑक्सीडाइज़्ड मोर अंगूठी", "price": 84900, "compareAtPrice": 129900,
    "purity": "OXIDISED", "weightG": 4.2, "hallmarked": false,
    "isLivePrice": false, "image": "silver-store/products/abc", "inStock": true,
    "categorySlug": "rings", "categoryName": "Rings", "tags": ["oxidised"]
  }]},
  "meta": { "nextCursor": "clx…", "hasMore": true, "count": 24 }
}
```

`isLivePrice: true` means the price came from today's silver rate rather than a
fixed tag, and can change before checkout. The price is frozen when the order is
placed.

### `GET /products/:slug`

Returns the product with `images`, `variants`, `priceBreakdown`
(`metalValue` + `makingValue`), `rating`, and four `related` products.
404 for a draft or archived product — it does not exist as far as the API is
concerned.

### `GET /categories`

Both the category tree (with live `productCount`) and the collections, in one
call — a nav menu needs both and should not make two round trips.

---

## Cart

Identified by the `cart_session` cookie, which the server sets on first write.
Send credentials (`credentials: "same-origin"`).

| Method | Body | Notes |
|---|---|---|
| `GET /cart` | — | Never creates a cart row |
| `POST /cart` | `{ productId, variantId?, qty }` | `out_of_stock` if it cannot be satisfied |
| `PATCH /cart` | `{ lineId, qty }` | `qty: 0` removes the line |
| `DELETE /cart` | `{ lineId }` | |

All four return the whole cart:

```jsonc
{ "ok": true, "data": { "lines": [], "subtotal": 84900, "count": 1 } }
```

Every line is re-priced against the current rate on read. A weight-priced piece
left in a bag overnight is not held at yesterday's silver price.

---

## Forms

### `POST /contact`

`{ name, email, phone?, subject?, message, orderRef? }`

The message is saved first and the owner is emailed afterwards, so a mail
failure never loses it. A hidden `website` field is a honeypot: a filled one is
accepted with a 200 and silently dropped.

### `POST /newsletter`

`{ email, source? }`. Re-subscribing someone who opted out is a deliberate
no-op — only an explicit resubscribe flips them back.

---

## Admin

Requires a signed-in `OWNER` or `STAFF` session. A customer session gets 403.

### `POST /admin/upload-sign`

`{ folder: "products" | "categories" | "collections" | "reviews" | "banners" }`

Returns a short-lived Cloudinary signature:

```jsonc
{ "ok": true, "data": { "uploadUrl": "https://api.cloudinary.com/…",
    "fields": { "api_key": "…", "timestamp": "…", "signature": "…", "folder": "…" },
    "folder": "silver-store/products", "expiresAt": 1789000000000 } }
```

The browser POSTs the file directly to `uploadUrl` with those fields. Nothing
large passes through the app, so a 12 MP camera photo on shop wifi cannot time
out a serverless function. Only the signed parameters are accepted by
Cloudinary, so a leaked signature cannot be reused to write elsewhere in the
account.

---

## Operations

### `GET /health`

For an uptime monitor. 200 with database latency and which integrations are
configured; **503 when the database is unreachable**, which is the only failure
that takes the shop down. It never reports a key's value.

```jsonc
{ "ok": true, "data": { "status": "ok", "databaseLatencyMs": 12,
  "integrations": { "googleAuth": false, "cloudinary": true, "razorpay": false,
                    "email": true, "redis": false } } }
```

---

## Server-to-server keys

Create a key in the admin. It is shown once; only a SHA-256 digest is stored,
with the first 16 characters kept in the clear so two keys can be told apart.

```
x-api-key: sk_live_…
```

Scopes are `read`, `write` and `admin`. Public catalogue reads need no key.
