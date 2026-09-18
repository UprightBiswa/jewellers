# Razorpay in test mode

Test mode is a complete, separate Razorpay account: its own keys, its own
webhook, its own dashboard. No real money moves, and nothing you do here can
touch a live payment. The keys already in `.env.local` are test keys — they
start `rzp_test_`.

Online payment is **not switched on for customers yet**. Charubala takes cash on
delivery. This is how to prove the payment path works before it is.

---

## 1. The problem with webhooks on a laptop

Razorpay calls your server. It cannot call `localhost` — there is no route from
their machines to yours. So the "Test webhook" button in their dashboard is no
use until the site is deployed.

There are two honest ways round it, and one shortcut.

| | Works for | Effort |
|---|---|---|
| **A. `npm run webhook:test`** | the handler, signature check, idempotency | none |
| **B. A Vercel preview URL** | the whole real path, Razorpay included | a deploy |
| **C. A tunnel (ngrok, cloudflared)** | the whole real path, on your machine | a second tool |

Do **A** now, **B** before launch. **C** only if you enjoy it.

---

## 2. A — test the handler directly

```bash
npm run dev          # in one terminal
npm run webhook:test # in another
```

It builds the exact JSON Razorpay sends, signs it with
`RAZORPAY_WEBHOOK_SECRET` the same way Razorpay does, and posts it three times:

```
  bad signature    → 401 rejected (correct)
  payment.captured → 200 {"ok":true}
  same again       → 200 {"ok":true,"skipped":"already_paid"}
```

Those three lines are the whole contract:

1. **An unsigned or wrongly signed call is refused.** Anyone can POST to that
   URL; only Razorpay can sign for it.
2. **A valid call confirms the payment.**
3. **A repeat changes nothing.** Razorpay retries when it does not hear back
   quickly, and a retry must not send a second email or count the sale twice.

Other things it can do:

```bash
npm run webhook:test -- --event payment.failed    # stock goes back on the shelf
npm run webhook:test -- --event order.paid
npm run webhook:test -- --order order_Tdc2w3MV3Dk # a specific Razorpay order
npm run webhook:test -- --base https://charubala.com
```

It picks the most recent order with a Razorpay id. If there is none, place one
first — see step 4.

---

## 3. B — the real thing, on a preview URL

Once the site is on Vercel you have a public HTTPS address, and Razorpay can
reach it.

**Razorpay Dashboard → make sure the toggle says `Test Mode` → Settings →
Webhooks → Add New Webhook**

| Field | Value |
|---|---|
| Webhook URL | `https://<your-app>.vercel.app/api/webhooks/razorpay` |
| Secret | the value of `RAZORPAY_WEBHOOK_SECRET` in Vercel |
| Alert Email | Rahul's address |

**Active Events — tick these three and nothing else:**

- `payment.captured` — the money arrived. This is the one that matters.
- `payment.failed` — it did not. The order is released and the stock returns.
- `order.paid` — the whole order is settled. A belt-and-braces duplicate of the
  first, and harmless because confirmation is idempotent.

Everything else on that list is noise this shop does not act on.

The secret is not a password you look up later — Razorpay shows it to you once,
and it must match `RAZORPAY_WEBHOOK_SECRET` exactly. If they differ, every
webhook arrives and every one is refused with a 401, and the symptom is orders
that stay "pending" after a successful payment.

---

## 4. Placing a test order

With test keys, Razorpay's checkout accepts fake instruments only:

| Method | What to enter |
|---|---|
| **UPI** | `success@razorpay` — pays. `failure@razorpay` — fails. |
| **Card** | `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234` |
| **Netbanking** | pick any bank, then the green **Success** button |

Then, in order:

1. Add a piece to the cart, check out, choose online payment.
2. Pay with `success@razorpay`.
3. The browser comes back to `/checkout/success`.
4. The admin panel shows the order as **Paid**.
5. Razorpay → Test Mode → Transactions shows the same payment.

Step 4 has two independent routes to it — the webhook and the browser callback
at `/api/v1/orders/verify`, whose signature is verified server-side. Whichever
arrives first confirms; the other is a no-op. To prove it, put your phone in
flight mode on the bank screen: the browser never returns, and the order still
goes to Paid because the webhook did it.

---

## 5. What to check when it does not work

| Symptom | Almost always |
|---|---|
| Webhook 401 in Razorpay's log | The secret in Vercel and the secret in Razorpay differ |
| Order stays pending, no webhook at all | Webhook added in **Live** mode while you are testing, or the URL has a typo |
| Payment succeeds, no email | Resend not configured — that is expected, and the order is fine. Check the Vercel log |
| Checkout does not offer online payment | `RAZORPAY_KEY_ID` missing or not starting `rzp_` — the shop falls back to COD by design |

Razorpay → Settings → Webhooks → your webhook → **Logs** shows every delivery
attempt with the response it got. That page answers most of these on its own.

---

## 6. Going live

Not before a real order has gone end to end in test mode.

1. Complete KYC in Razorpay. Until then Live mode does not exist.
2. Live mode → generate keys. They start `rzp_live_`.
3. Replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and
   `NEXT_PUBLIC_RAZORPAY_KEY_ID` **in Vercel only**. Never in a file.
4. Create the webhook again in Live mode — it is a separate webhook with its own
   secret. Update `RAZORPAY_WEBHOOK_SECRET` to match.
5. Regenerate the test keys, because the current ones were shared in chat.
6. Place one real ₹1 order, then refund it from the Razorpay dashboard.

Keep the test keys somewhere. Every later change to checkout should be tried in
test mode first.
