import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  ORDER_LABEL,
  ORDER_TONE,
  PAYMENT_LABEL,
  PAYMENT_TONE,
} from "@/components/ui/badge";
import { OrderActions } from "@/components/admin/order-actions";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

type ShippingAddress = {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    select: {
      id: true, orderNumber: true, email: true, phone: true,
      status: true, paymentStatus: true, placedAt: true,
      subtotal: true, discount: true, shippingFee: true, gstAmount: true, total: true,
      couponCode: true, customerNote: true, internalNote: true, shippingAddress: true,
      items: {
        select: {
          id: true, titleSnapshot: true, slugSnapshot: true, imageSnapshot: true,
          variantLabel: true, sku: true, unitPrice: true, qty: true, lineTotal: true,
          weightG: true,
        },
      },
      payments: {
        select: {
          id: true, provider: true, status: true, amount: true, method: true,
          providerPaymentId: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      shipments: {
        select: { id: true, courier: true, awb: true, trackingUrl: true, shippedAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) notFound();

  const address = (order.shippingAddress ?? {}) as ShippingAddress;
  const addressText = [
    address.fullName,
    address.phone,
    address.line1,
    address.line2,
    address.landmark,
    [address.city, address.state].filter(Boolean).join(", "),
    address.pincode,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All orders
        </Link>

        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl text-ink tnum">{order.orderNumber}</h1>
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

      <OrderActions
        orderId={order.id}
        status={order.status}
        hasShipment={order.shipments.length > 0}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 font-display text-lg text-ink">
            What to pack
          </h2>

          <ul className="divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-3 p-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  <Image
                    src={imageUrl(item.imageSnapshot, "thumb")}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-ink">{item.titleSnapshot}</p>
                  <p className="text-[13px] text-muted tnum">
                    {item.sku}
                    {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    {item.weightG ? ` · ${Number(item.weightG)} g` : ""}
                  </p>
                  <p className="mt-1 text-[13px] text-muted tnum">
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
              <dt className="font-medium text-ink">Total</dt>
              <dd className="font-display text-xl text-ink">{formatPaise(order.total)}</dd>
            </div>
          </dl>
        </section>

        <aside className="grid gap-4">
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <h2 className="font-display text-lg text-ink">Deliver to</h2>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-2">
              {addressText || "No address on this order."}
            </p>
            <div className="mt-3 grid gap-1 text-[13px]">
              <a href={`mailto:${order.email}`} className="text-brand hover:underline">
                {order.email}
              </a>
              <a href={`tel:${order.phone}`} className="text-brand hover:underline tnum">
                {order.phone}
              </a>
            </div>
          </section>

          {order.customerNote ? (
            <section className="rounded-[var(--radius-card)] border border-warn/30 bg-warn-soft p-4">
              <h2 className="font-display text-base text-ink">Note from the customer</h2>
              <p className="mt-1.5 text-[14px] text-ink-2">{order.customerNote}</p>
            </section>
          ) : null}

          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <h2 className="font-display text-lg text-ink">Payment</h2>
            {order.payments.length === 0 ? (
              <p className="mt-2 text-[14px] text-muted">Nothing recorded yet.</p>
            ) : (
              <ul className="mt-2 grid gap-3 text-[13.5px]">
                {order.payments.map((p) => (
                  <li key={p.id} className="grid gap-0.5">
                    <span className="font-medium text-ink tnum">
                      {formatPaise(p.amount)} · {p.provider}
                      {p.method ? ` (${p.method})` : ""}
                    </span>
                    <span className="text-muted">
                      {PAYMENT_LABEL[p.status]} · {formatDate(p.createdAt, true)}
                    </span>
                    {p.providerPaymentId ? (
                      <span className="break-all text-[12px] text-muted tnum">
                        {p.providerPaymentId}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {order.shipments.length > 0 ? (
            <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <h2 className="font-display text-lg text-ink">Shipment</h2>
              <ul className="mt-2 grid gap-3 text-[13.5px]">
                {order.shipments.map((s) => (
                  <li key={s.id} className="grid gap-0.5">
                    <span className="font-medium text-ink">{s.courier}</span>
                    {s.awb ? <span className="text-muted tnum">AWB {s.awb}</span> : null}
                    {s.shippedAt ? (
                      <span className="text-muted">Sent {formatDate(s.shippedAt)}</span>
                    ) : null}
                    {s.trackingUrl ? (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:underline"
                      >
                        Track it
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
