import Link from "next/link";
import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  ORDER_LABEL,
  ORDER_TONE,
  PAYMENT_LABEL,
  PAYMENT_TONE,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderStatus, Prisma } from "@/generated/prisma";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string; q?: string; cursor?: string }>;

const TABS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "CONFIRMED", label: "To pack" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "PENDING", label: "Unpaid" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAGE_SIZE = 25;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Search }) {
  const { status, q, cursor } = await searchParams;

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as OrderStatus } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const rows = await db.order.findMany({
    where,
    select: {
      id: true, orderNumber: true, email: true, phone: true, total: true,
      status: true, paymentStatus: true, placedAt: true,
      _count: { select: { items: true } },
    },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > PAGE_SIZE;
  const orders = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? orders[orders.length - 1]?.id : null;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Orders</h1>
        <p className="text-sm text-muted">Newest first. Tap one to pack it or mark it shipped.</p>
      </header>

      <form className="flex gap-2" action="/admin/orders">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Order number, email or phone"
          aria-label="Search orders"
          className="h-10 flex-1 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
        />
        <Button type="submit" variant="secondary" className="h-10">Search</Button>
      </form>

      <nav className="flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Filter orders">
        {TABS.map((tab) => {
          const active = (status ?? "") === tab.value;
          const href = tab.value ? `/admin/orders?status=${tab.value}` : "/admin/orders";
          return (
            <Link
              key={tab.label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "shrink-0 rounded-full bg-brand px-3.5 py-1.5 text-sm font-medium text-on-brand"
                  : "shrink-0 rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 hover:border-line-strong"
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-16 text-center text-sm text-muted">
          {q ? "No order matched that." : "No orders in this section."}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="grid gap-1 p-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink tnum">{o.orderNumber}</span>
                  <span className="font-semibold text-ink tnum">{formatPaise(o.total)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[13px] text-muted">
                    {o.email} · {o._count.items} {o._count.items === 1 ? "item" : "items"}
                  </span>
                  <span className="shrink-0 text-[12.5px] text-muted">
                    {formatDate(o.placedAt)}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone={ORDER_TONE[o.status]} size="xs">{ORDER_LABEL[o.status]}</Badge>
                  <Badge tone={PAYMENT_TONE[o.paymentStatus]} size="xs">
                    {PAYMENT_LABEL[o.paymentStatus]}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Button asChild variant="secondary">
            <Link
              href={`/admin/orders?${new URLSearchParams({
                ...(status ? { status } : {}),
                ...(q ? { q } : {}),
                cursor: nextCursor,
              })}`}
            >
              Next {PAGE_SIZE}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
