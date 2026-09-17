"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Check, Lock, Truck, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { shippingFee } from "@/lib/pricing";
import { INDIAN_STATES, cn } from "@/lib/utils";
import type { CartLine } from "@/lib/cart/store";

type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type CheckoutSettings = {
  flatFee: number;
  freeAbove: number | null;
  deliveryDays: string;
  codEnabled: boolean;
  codMaxOrder: number;
  codFee: number;
  storeName: string;
  whatsapp: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Checkout.
 *
 * Every rupee shown here is recomputed on the server before the order is
 * placed — this component's arithmetic is for the customer's eyes only. If the
 * two ever disagree, the server wins and the customer is told why.
 */
export function CheckoutForm({
  lines,
  addresses,
  signedIn,
  defaultEmail,
  settings,
  razorpay,
}: {
  lines: CartLine[];
  addresses: SavedAddress[];
  signedIn: boolean;
  defaultEmail: string;
  settings: CheckoutSettings;
  razorpay: { enabled: boolean; keyId: string };
}) {
  const router = useRouter();

  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [email, setEmail] = useState(defaultEmail);
  const [payment, setPayment] = useState<"ONLINE" | "COD">(
    razorpay.enabled ? "ONLINE" : "COD",
  );
  const [saveAddress, setSaveAddress] = useState(signedIn);
  const [note, setNote] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponPending, setCouponPending] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [stage, setStage] = useState<"idle" | "placing" | "paying" | "confirming">("idle");

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const discount = coupon?.discount ?? 0;
  const goods = Math.max(0, subtotal - discount);
  const delivery = shippingFee(goods, {
    flatFee: settings.flatFee,
    freeAbove: settings.freeAbove,
  });
  const codFee = payment === "COD" ? settings.codFee : 0;
  const total = goods + delivery + codFee;

  const codTooBig = goods > settings.codMaxOrder;
  const usingSaved = addressId !== null;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code || couponPending) return;

    setCouponPending(true);
    try {
      const res = await fetch("/api/v1/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, payment }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        toast.error(json?.error?.message ?? "That code did not work.");
        setCoupon(null);
        return;
      }

      setCoupon({ code: json.data.code, discount: json.data.totals.discount });
      toast.success(
        json.data.totals.discount > 0
          ? `${json.data.code} applied — ${formatPaise(json.data.totals.discount)} off.`
          : `${json.data.code} applied — free delivery.`,
      );
    } catch {
      toast.error("No connection. Check your internet and try again.");
    } finally {
      setCouponPending(false);
    }
  }

  function collectAddress(form: FormData) {
    if (usingSaved) {
      const saved = addresses.find((a) => a.id === addressId);
      if (!saved) return null;
      return {
        fullName: saved.fullName,
        phone: saved.phone,
        line1: saved.line1,
        line2: saved.line2,
        landmark: saved.landmark,
        city: saved.city,
        state: saved.state,
        pincode: saved.pincode,
      };
    }

    return {
      fullName: String(form.get("fullName") ?? "").trim(),
      phone: String(form.get("phone") ?? "").replace(/\D/g, "").slice(-10),
      line1: String(form.get("line1") ?? "").trim(),
      line2: String(form.get("line2") ?? "").trim() || null,
      landmark: String(form.get("landmark") ?? "").trim() || null,
      city: String(form.get("city") ?? "").trim(),
      state: String(form.get("state") ?? ""),
      pincode: String(form.get("pincode") ?? "").trim(),
    };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (placing) return;

    const form = new FormData(e.currentTarget);
    const address = collectAddress(form);
    if (!address) {
      toast.error("Choose a delivery address.");
      return;
    }

    setPlacing(true);
    setStage("placing");
    setErrors({});

    try {
      const res = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          address,
          addressId: usingSaved ? addressId : undefined,
          payment,
          couponCode: coupon?.code ?? null,
          customerNote: note || null,
          saveAddress: !usingSaved && saveAddress,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        if (Array.isArray(json?.error?.details)) {
          const next: Record<string, string> = {};
          for (const d of json.error.details as { field: string; message: string }[]) {
            next[d.field.replace("address.", "")] = d.message;
          }
          setErrors(next);
          toast.error("Please check the highlighted fields.");
        } else {
          toast.error(json?.error?.message ?? "Could not place the order.");
        }
        setPlacing(false);
        setStage("idle");
        return;
      }

      const data = json.data;

      if (data.payment === "COD") {
        toast.success("Order placed.");
        router.push(`/checkout/success?order=${data.orderNumber}`);
        return;
      }

      setStage("paying");
      await openRazorpay(data);
    } catch {
      toast.error("No connection. Your bag is safe — try again in a moment.");
      setPlacing(false);
      setStage("idle");
    }
  }

  async function openRazorpay(data: {
    orderNumber: string;
    razorpay: { orderId: string; amount: number; currency: string; keyId: string };
  }) {
    if (!window.Razorpay) {
      toast.error("The payment window could not load. Please check your connection.");
      setPlacing(false);
      setStage("idle");
      return;
    }

    const checkout = new window.Razorpay({
      key: data.razorpay.keyId,
      amount: data.razorpay.amount,
      currency: data.razorpay.currency,
      order_id: data.razorpay.orderId,
      name: settings.storeName,
      description: `Order ${data.orderNumber}`,
      prefill: { email },
      theme: { color: "#7E2B3A" },

      handler: async (response: Record<string, string>) => {
        setStage("confirming");
        try {
          // The signature is checked on the server. This call only tells us
          // sooner than the webhook would; it is not what makes the order real.
          await fetch("/api/v1/orders/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
        } catch {
          // The webhook will still confirm it. Do not alarm the customer.
        }
        router.push(`/checkout/success?order=${data.orderNumber}`);
      },

      modal: {
        ondismiss: () => {
          setPlacing(false);
          setStage("idle");
          toast.warning(
            "Payment was not completed. Your order is saved — you can pay from your orders page.",
          );
        },
      },
    });

    checkout.open();
  }

  const stageLabel =
    stage === "placing"
      ? "Placing your order…"
      : stage === "paying"
        ? "Opening payment…"
        : stage === "confirming"
          ? "Confirming payment…"
          : "";

  return (
    <>
      {razorpay.enabled ? (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      ) : null}

      <form onSubmit={onSubmit} method="post" className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]" noValidate>
        <div className="grid gap-8">
          {!signedIn ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[14.5px] text-ink-2">
              Checking out as a guest is fine.{" "}
              <Link href="/login?next=/checkout" className="text-brand underline underline-offset-4">
                Sign in
              </Link>{" "}
              to use your first-order discount and keep your orders in one place.
            </p>
          ) : null}

          <section className="grid gap-4">
            <h2 className="font-display text-lg text-ink">Where should it go?</h2>

            {addresses.length > 0 ? (
              <div className="grid gap-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors",
                      addressId === a.id
                        ? "border-brand bg-brand-soft"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={addressId === a.id}
                      onChange={() => setAddressId(a.id)}
                      className="mt-1 size-4 accent-[var(--color-brand)]"
                    />
                    <span className="text-[14.5px]">
                      <span className="font-medium text-ink">
                        {a.fullName} · {a.label}
                      </span>
                      <span className="mt-0.5 block text-muted">
                        {[a.line1, a.line2, a.city, a.state, a.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                      <span className="block text-muted tnum">{a.phone}</span>
                    </span>
                  </label>
                ))}

                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-[14.5px] transition-colors",
                    addressId === null
                      ? "border-brand bg-brand-soft"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={addressId === null}
                    onChange={() => setAddressId(null)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  Deliver somewhere else
                </label>
              </div>
            ) : null}

            {!usingSaved ? (
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="fullName" required error={errors.fullName}>
                    <Input id="fullName" name="fullName" autoComplete="name" required />
                  </Field>
                  <Field label="Mobile number" htmlFor="phone" required error={errors.phone}>
                    <Input
                      id="phone" name="phone" type="tel" inputMode="numeric"
                      autoComplete="tel" placeholder="98765 43210" className="tnum" required
                    />
                  </Field>
                </div>

                <Field label="Email" htmlFor="email" required error={errors.email}
                  hint="Your order confirmation goes here">
                  <Input
                    id="email" type="email" autoComplete="email" required
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field label="House number and street" htmlFor="line1" required error={errors.line1}>
                  <Input id="line1" name="line1" autoComplete="address-line1" required />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Area or village" htmlFor="line2" error={errors.line2}>
                    <Input id="line2" name="line2" autoComplete="address-line2" />
                  </Field>
                  <Field label="Landmark" htmlFor="landmark" hint="Helps the delivery boy find you">
                    <Input id="landmark" name="landmark" />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Town or city" htmlFor="city" required error={errors.city}>
                    <Input id="city" name="city" autoComplete="address-level2" required />
                  </Field>
                  <Field label="State" htmlFor="state" required error={errors.state}>
                    <Select id="state" name="state" defaultValue="West Bengal" required>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Pincode" htmlFor="pincode" required error={errors.pincode}>
                    <Input
                      id="pincode" name="pincode" inputMode="numeric" maxLength={6}
                      autoComplete="postal-code" className="tnum" required
                    />
                  </Field>
                </div>

                {signedIn ? (
                  <label className="flex items-center gap-3 text-[14.5px] text-ink">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    Save this address for next time
                  </label>
                ) : null}
              </div>
            ) : (
              <Field label="Email" htmlFor="email-saved" required error={errors.email}
                hint="Your order confirmation goes here">
                <Input
                  id="email-saved" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            )}
          </section>

          <section className="grid gap-4">
            <h2 className="font-display text-lg text-ink">How would you like to pay?</h2>

            <div className="grid gap-2">
              <label
                className={cn(
                  "flex gap-3 rounded-lg border p-4 transition-colors",
                  !razorpay.enabled && "cursor-not-allowed opacity-55",
                  razorpay.enabled && payment === "ONLINE"
                    ? "cursor-pointer border-brand bg-brand-soft"
                    : "cursor-pointer border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio" name="payment" checked={payment === "ONLINE"}
                  disabled={!razorpay.enabled}
                  onChange={() => setPayment("ONLINE")}
                  className="mt-1 size-4 accent-[var(--color-brand)]"
                />
                <span className="text-[14.5px]">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <Lock className="size-4" aria-hidden />
                    Pay online — UPI, card, net banking
                  </span>
                  <span className="mt-0.5 block text-muted">
                    {razorpay.enabled
                      ? "GPay, PhonePe, Paytm, any UPI app, or a debit or credit card."
                      : "Not switched on yet — the shop is still setting up its payment account."}
                  </span>
                </span>
              </label>

              <label
                className={cn(
                  "flex gap-3 rounded-lg border p-4 transition-colors",
                  (!settings.codEnabled || codTooBig) && "cursor-not-allowed opacity-55",
                  settings.codEnabled && !codTooBig && payment === "COD"
                    ? "cursor-pointer border-brand bg-brand-soft"
                    : "cursor-pointer border-line hover:border-line-strong",
                )}
              >
                <input
                  type="radio" name="payment" checked={payment === "COD"}
                  disabled={!settings.codEnabled || codTooBig}
                  onChange={() => setPayment("COD")}
                  className="mt-1 size-4 accent-[var(--color-brand)]"
                />
                <span className="text-[14.5px]">
                  <span className="flex items-center gap-2 font-medium text-ink">
                    <Wallet className="size-4" aria-hidden />
                    Cash on delivery
                  </span>
                  <span className="mt-0.5 block text-muted">
                    {codTooBig
                      ? `Only for orders up to ${formatPaise(settings.codMaxOrder)}.`
                      : settings.codFee > 0
                        ? `Pay when it arrives. ${formatPaise(settings.codFee)} extra.`
                        : "Pay when it arrives."}
                  </span>
                </span>
              </label>
            </div>

            {!razorpay.enabled && settings.whatsapp ? (
              <p className="text-[13.5px] text-muted">
                Prefer UPI?{" "}
                <a
                  href={`https://wa.me/${settings.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline underline-offset-4"
                >
                  Message us on WhatsApp
                </a>{" "}
                and we will send you a payment link.
              </p>
            ) : null}
          </section>

          <section>
            <Field label="Anything we should know?" htmlFor="note"
              hint="Gift wrap, a size change, a delivery instruction">
              <Textarea
                id="note" rows={3} value={note} maxLength={500}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-ink">Your order</h2>

            <ul className="mt-4 grid gap-3">
              {lines.map((line) => (
                <li key={line.id} className="flex gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={imageUrl(line.image, "thumb")}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-[14px]">
                    <p className="truncate text-ink">{line.title}</p>
                    <p className="text-muted">
                      {line.variantLabel ? `${line.variantLabel} · ` : ""}Qty {line.qty}
                    </p>
                  </div>
                  <p className="shrink-0 text-[14px] font-medium text-ink tnum">
                    {formatPaise(line.unitPrice * line.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-line pt-4">
              {coupon ? (
                <p className="flex items-center justify-between gap-2 rounded-lg bg-success-soft px-3 py-2 text-[13.5px] text-success">
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5" aria-hidden />
                    {coupon.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon(null);
                      setCouponInput("");
                    }}
                    className="text-muted underline underline-offset-2 hover:text-ink"
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Discount code"
                    aria-label="Discount code"
                    className="h-10 uppercase tracking-wider"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 shrink-0"
                    disabled={couponPending || !couponInput.trim()}
                    onClick={applyCoupon}
                  >
                    {couponPending ? <Spinner label="Checking code" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <dl className="mt-4 grid gap-2.5 text-[14.5px] tnum">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-ink">{formatPaise(subtotal)}</dd>
              </div>
              {discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd className="text-success">−{formatPaise(discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className={delivery === 0 ? "text-success" : "text-ink"}>
                  {delivery === 0 ? "Free" : formatPaise(delivery)}
                </dd>
              </div>
              {codFee > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-muted">Cash on delivery</dt>
                  <dd className="text-ink">{formatPaise(codFee)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-medium text-ink">To pay</span>
              <span className="font-display text-2xl text-ink tnum">{formatPaise(total)}</span>
            </div>

            <Button type="submit" size="lg" block className="mt-5" disabled={placing}>
              {placing ? (
                <>
                  <Spinner label={stageLabel} />
                  {stageLabel}
                </>
              ) : payment === "COD" ? (
                "Place order"
              ) : (
                `Pay ${formatPaise(total)}`
              )}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] text-muted">
              <Truck className="size-3.5" aria-hidden />
              Delivered in about {settings.deliveryDays}
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
