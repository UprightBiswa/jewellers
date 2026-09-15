"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { cart, useCart } from "@/lib/cart/store";
import { formatPaise } from "@/lib/money";
import { imageUrl } from "@/lib/images/cloudinary";
import { shippingFee } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export function CartView({
  flatFee,
  freeAbove,
  deliveryDays,
}: {
  flatFee: number;
  freeAbove: number | null;
  deliveryDays: string;
}) {
  const { lines, subtotal, count, status } = useCart();

  if (status === "loading" && lines.length === 0) {
    return (
      <div className="mt-8 grid gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-28 rounded-[var(--radius-card)]" />
        ))}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-xl text-ink">Your bag is empty</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Nothing in here yet. Have a look at what came off the bench this week.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/collections/new-arrivals">New arrivals</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/collections/under-999">Under ₹999</Link>
          </Button>
        </div>
      </div>
    );
  }

  const delivery = shippingFee(subtotal, { flatFee, freeAbove });
  const awayFromFree = freeAbove !== null && subtotal < freeAbove ? freeAbove - subtotal : 0;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li key={line.id} className="flex gap-4 py-5">
            <Link
              href={`/products/${line.slug}`}
              className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-surface-2"
            >
              <Image
                src={imageUrl(line.image, "thumb")}
                alt={line.title}
                fill
                sizes="96px"
                className="object-cover"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/products/${line.slug}`}
                    className="font-display text-[17px] text-ink hover:text-brand"
                  >
                    {line.title}
                  </Link>
                  {line.variantLabel ? (
                    <p className="text-[13px] text-muted">{line.variantLabel}</p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => cart.remove(line.id)}
                  aria-label={`Remove ${line.title}`}
                  className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="flex items-center rounded-lg border border-line-strong">
                  <button
                    type="button"
                    onClick={() => cart.setQty(line.id, line.qty - 1)}
                    aria-label="Reduce quantity"
                    className="grid size-9 place-items-center text-ink-2"
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="w-9 text-center text-sm font-medium tnum">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => cart.setQty(line.id, line.qty + 1)}
                    disabled={line.qty >= line.maxQty}
                    aria-label="Increase quantity"
                    className="grid size-9 place-items-center text-ink-2 disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>

                <p className="text-[15px] font-semibold text-ink tnum">
                  {formatPaise(line.unitPrice * line.qty)}
                </p>
              </div>

              {line.qty >= line.maxQty ? (
                <p className="mt-1.5 text-[13px] text-warn">
                  That is all we have of this one.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-display text-lg text-ink">Order summary</h2>

          <dl className="mt-4 grid gap-2.5 text-[14.5px] tnum">
            <div className="flex justify-between">
              <dt className="text-muted">
                Subtotal ({count} {count === 1 ? "item" : "items"})
              </dt>
              <dd className="text-ink">{formatPaise(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className={delivery === 0 ? "text-success" : "text-ink"}>
                {delivery === 0 ? "Free" : formatPaise(delivery)}
              </dd>
            </div>
          </dl>

          {awayFromFree > 0 ? (
            <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand">
              Add {formatPaise(awayFromFree)} more for free delivery.
            </p>
          ) : null}

          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="font-medium text-ink">Total</span>
            <span className="font-display text-xl text-ink tnum">
              {formatPaise(subtotal + delivery)}
            </span>
          </div>

          <p className="mt-1 text-[13px] text-muted">
            Coupons are applied at checkout.
          </p>

          <Button asChild size="lg" block className="mt-5">
            <Link href="/checkout">Checkout</Link>
          </Button>

          <p className="mt-3 text-center text-[13px] text-muted">
            Delivered in about {deliveryDays}
          </p>
        </div>

        <Link
          href="/collections/all"
          className="mt-4 block text-center text-sm text-brand underline-offset-4 hover:underline"
        >
          Keep shopping
        </Link>
      </aside>
    </div>
  );
}
