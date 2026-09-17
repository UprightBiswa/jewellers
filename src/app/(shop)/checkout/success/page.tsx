import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Package } from "lucide-react";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RefreshCart } from "@/components/storefront/refresh-cart";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true, email: true, total: true, status: true, paymentStatus: true,
        placedAt: true, shippingAddress: true,
        items: { select: { id: true, titleSnapshot: true, variantLabel: true, qty: true, lineTotal: true } },
      },
    }),
    getSettings(),
  ]);

  if (!order) notFound();

  const address = order.shippingAddress as {
    fullName?: string; line1?: string; line2?: string;
    city?: string; state?: string; pincode?: string; phone?: string;
  } | null;

  const isCod = order.paymentStatus === "COD_PENDING";
  const isPaid = order.paymentStatus === "PAID";
  // Online payment whose confirmation has not landed yet. Usually seconds.
  const isPending = order.paymentStatus === "PENDING";

  return (
    <div className="container-page py-12">
      {/* The bag was emptied on the server; tell the header's badge about it. */}
      <RefreshCart />

      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <span
            className={
              isPending
                ? "mx-auto grid size-14 place-items-center rounded-full bg-warn-soft text-warn"
                : "mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"
            }
          >
            {isPending ? (
              <Clock className="size-7" aria-hidden />
            ) : (
              <CheckCircle2 className="size-7" aria-hidden />
            )}
          </span>

          <h1 className="mt-5 font-display text-[clamp(1.8rem,5vw,2.4rem)] text-ink">
            {isPending ? "Confirming your payment" : "Thank you — order placed"}
          </h1>

          <p className="mx-auto mt-3 max-w-prose text-[15px] leading-relaxed text-ink-2">
            {isPaid ? (
              <>
                We have your payment and your order. A confirmation is on its way to{" "}
                <span className="text-ink">{order.email}</span>.
              </>
            ) : isCod ? (
              <>
                We have your order. Please keep {formatPaise(order.total)} ready for the
                delivery boy. A confirmation is on its way to{" "}
                <span className="text-ink">{order.email}</span>.
              </>
            ) : (
              <>
                Your bank is still confirming the payment. This usually takes a few seconds —
                refresh this page in a moment. We will email you either way, so you can safely
                close this window.
              </>
            )}
          </p>
        </div>

        <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-4">
            <div>
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Order number</p>
              <p className="font-display text-xl text-ink tnum">{order.orderNumber}</p>
            </div>
            <p className="text-[13px] text-muted">{formatDate(order.placedAt, true)}</p>
          </div>

          <ul className="grid gap-3 py-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-[14.5px]">
                <span className="text-ink">
                  {item.titleSnapshot}
                  {item.variantLabel ? (
                    <span className="text-muted"> · {item.variantLabel}</span>
                  ) : null}
                  <span className="text-muted"> × {item.qty}</span>
                </span>
                <span className="shrink-0 text-ink tnum">{formatPaise(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between border-t border-line pt-4">
            <span className="font-medium text-ink">{isCod ? "To pay on delivery" : "Paid"}</span>
            <span className="font-display text-xl text-ink tnum">{formatPaise(order.total)}</span>
          </div>

          {address ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[12px] uppercase tracking-[0.12em] text-muted">Delivering to</p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">
                {address.fullName}
                <br />
                {[address.line1, address.line2, address.city, address.state, address.pincode]
                  .filter(Boolean)
                  .join(", ")}
                {address.phone ? (
                  <>
                    <br />
                    <span className="tnum">{address.phone}</span>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
          <p className="flex items-center gap-2 font-display text-lg text-ink">
            <Package className="size-4 text-muted" aria-hidden />
            What happens next
          </p>
          <ol className="mt-3 grid gap-2 text-[14.5px] text-ink-2">
            <li>We pack your order within {settings.shipping.dispatchDays}.</li>
            <li>
              You get a tracking number by email and on WhatsApp the moment it leaves the shop.
            </li>
            <li>Delivery takes about {settings.shipping.deliveryDays}.</li>
            <li>
              Please record a short video while opening the parcel — that is all we need to
              replace anything damaged in transit.
            </li>
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/collections/all">Keep shopping</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/account/orders">My orders</Link>
          </Button>
          {settings.store.whatsapp ? (
            <Button asChild variant="ghost">
              <a
                href={`https://wa.me/${settings.store.whatsapp}?text=${encodeURIComponent(
                  `Hello, I just placed order ${order.orderNumber}.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Message us on WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
