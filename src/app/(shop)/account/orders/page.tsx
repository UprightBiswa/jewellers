import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images/url";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, ORDER_LABEL, ORDER_TONE, PAYMENT_LABEL, PAYMENT_TONE } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your orders",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const session = await auth();

  const orders = await db.order.findMany({
    where: { userId: session!.user.id },
    select: {
      id: true, orderNumber: true, total: true, status: true, paymentStatus: true,
      placedAt: true,
      items: {
        select: { id: true, titleSnapshot: true, imageSnapshot: true, qty: true, variantLabel: true },
        take: 4,
      },
      _count: { select: { items: true } },
      shipments: {
        select: { courier: true, awb: true, trackingUrl: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { placedAt: "desc" },
    take: 25,
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center">
        <p className="font-display text-xl text-ink">No orders yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          When you buy something it will show here, with its tracking number.
        </p>
        <Button asChild className="mt-5">
          <Link href="/collections/all">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {orders.map((order) => {
        const shipment = order.shipments[0];

        return (
          <article
            key={order.id}
            className="rounded-[var(--radius-card)] border border-line bg-surface"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
              <div>
                <p className="font-medium text-ink tnum">{order.orderNumber}</p>
                <p className="text-[13px] text-muted">{formatDate(order.placedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={ORDER_TONE[order.status]} size="xs">
                  {ORDER_LABEL[order.status]}
                </Badge>
                <Badge tone={PAYMENT_TONE[order.paymentStatus]} size="xs">
                  {PAYMENT_LABEL[order.paymentStatus]}
                </Badge>
              </div>
            </header>

            <div className="flex gap-3 overflow-x-auto p-4 no-scrollbar">
              {order.items.map((item) => (
                <div key={item.id} className="flex w-40 shrink-0 gap-2.5">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <Image
                      src={imageUrl(item.imageSnapshot, "thumb")}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 text-[13px]">
                    <p className="truncate text-ink">{item.titleSnapshot}</p>
                    <p className="text-muted">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}× {item.qty}
                    </p>
                  </div>
                </div>
              ))}

              {order._count.items > order.items.length ? (
                <p className="self-center whitespace-nowrap text-[13px] text-muted">
                  +{order._count.items - order.items.length} more
                </p>
              ) : null}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
              <p className="text-[15px] font-semibold text-ink tnum">
                {formatPaise(order.total)}
              </p>

              <div className="flex flex-wrap gap-2">
                {shipment?.trackingUrl ? (
                  <Button asChild size="sm" variant="secondary">
                    <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                      Track with {shipment.courier}
                    </a>
                  </Button>
                ) : shipment?.awb ? (
                  <p className="self-center text-[13px] text-muted tnum">
                    {shipment.courier} · {shipment.awb}
                  </p>
                ) : null}

                <Button asChild size="sm" variant="ghost">
                  <Link href={`/account/orders/${order.orderNumber}`}>View details</Link>
                </Button>
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
