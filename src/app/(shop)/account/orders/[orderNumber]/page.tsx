import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, ORDER_LABEL, ORDER_TONE, PAYMENT_LABEL, PAYMENT_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await auth();

  // Scoped by userId, not just order number: an order number is guessable, and
  // someone else's address and phone must not be.
  const order = await db.order.findFirst({
    where: { orderNumber, userId: session!.user.id },
    select: {
      id: true, orderNumber: true, status: true, paymentStatus: true, placedAt: true,
      subtotal: true, discount: true, shippingFee: true, gstAmount: true, total: true,
      couponCode: true, customerNote: true, shippingAddress: true, email: true, phone: true,
      items: {
        select: {
          id: true, titleSnapshot: true, slugSnapshot: true, imageSnapshot: true,
          variantLabel: true, unitPrice: true, qty: true, lineTotal: true,
        },
      },
      shipments: {
        select: { id: true, courier: true, awb: true, trackingUrl: true, shippedAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  const settings = await getSettings();
  const address = order.shippingAddress as {
    fullName?: string; phone?: string; line1?: string; line2?: string;
    landmark?: string; city?: string; state?: string; pincode?: string;
  } | null;

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All orders
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl text-ink tnum">{order.orderNumber}</h2>
          <p className="text-sm text-muted">Placed {formatDate(order.placedAt, true)}</p>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={ORDER_TONE[order.status]}>{ORDER_LABEL[order.status]}</Badge>
          <Badge tone={PAYMENT_TONE[order.paymentStatus]}>
            {PAYMENT_LABEL[order.paymentStatus]}
          </Badge>
          {order.couponCode ? <Badge tone="gold">{order.couponCode}</Badge> : null}
        </div>
      </div>

      {order.shipments.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h3 className="font-display text-lg text-ink">On its way</h3>
          {order.shipments.map((s) => (
            <div key={s.id} className="mt-2 grid gap-1 text-[14.5px]">
              <p className="text-ink">
                {s.courier}
                {s.awb ? <span className="text-muted tnum"> · {s.awb}</span> : null}
              </p>
              {s.shippedAt ? (
                <p className="text-[13px] text-muted">Sent {formatDate(s.shippedAt)}</p>
              ) : null}
              {s.trackingUrl ? (
                <Button asChild size="sm" className="mt-2 justify-self-start">
                  <a href={s.trackingUrl} target="_blank" rel="noopener noreferrer">
                    Track this parcel
                  </a>
                </Button>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card)] border border-line bg-surface">
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 p-4">
              <Link
                href={`/products/${item.slugSnapshot}`}
                className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2"
              >
                <Image
                  src={imageUrl(item.imageSnapshot, "thumb")}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.slugSnapshot}`}
                  className="text-[15px] font-medium text-ink hover:text-brand"
                >
                  {item.titleSnapshot}
                </Link>
                <p className="text-[13px] text-muted">
                  {item.variantLabel ? `${item.variantLabel} · ` : ""}
                  {formatPaise(item.unitPrice)} × {item.qty}
                </p>
              </div>

              <p className="shrink-0 font-semibold text-ink tnum">
                {formatPaise(item.lineTotal)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="grid gap-2 border-t border-line p-4 text-[14.5px] tnum">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-ink">{formatPaise(order.subtotal)}</dd>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Discount</dt>
              <dd className="text-success">−{formatPaise(order.discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-ink">
              {order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)}
            </dd>
          </div>
          {order.gstAmount > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">GST</dt>
              <dd className="text-ink">{formatPaise(order.gstAmount)}</dd>
            </div>
          ) : null}
          <div className="mt-1 flex justify-between border-t border-line pt-3">
            <dt className="font-medium text-ink">
              {order.paymentStatus === "COD_PENDING" ? "To pay on delivery" : "Paid"}
            </dt>
            <dd className="font-display text-xl text-ink">{formatPaise(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h3 className="font-display text-base text-ink">Delivering to</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
            {address?.fullName}
            <br />
            {[address?.line1, address?.line2, address?.landmark, address?.city, address?.state, address?.pincode]
              .filter(Boolean)
              .join(", ")}
            <br />
            <span className="tnum">{address?.phone ?? order.phone}</span>
          </p>
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
          <h3 className="font-display text-base text-ink">Need help?</h3>
          <p className="mt-2 text-[14px] text-ink-2">
            Exchange within {settings.returns.windowDays} days. {settings.returns.buyback}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.store.whatsapp ? (
              <Button asChild size="sm" variant="secondary">
                <a
                  href={`https://wa.me/${settings.store.whatsapp}?text=${encodeURIComponent(
                    `Hello, about my order ${order.orderNumber}: `,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp us
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="ghost">
              <Link href="/contact">Send a message</Link>
            </Button>
          </div>
        </div>
      </section>

      {order.customerNote ? (
        <section className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
          <h3 className="font-display text-base text-ink">Your note</h3>
          <p className="mt-1.5 text-[14px] text-ink-2">{order.customerNote}</p>
        </section>
      ) : null}
    </div>
  );
}
