import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, TriangleAlert } from "lucide-react";

import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Badge, ORDER_LABEL, ORDER_TONE } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Shop admin" };
export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboard() {
  const today = startOfToday();
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const settings = await getSettings();
  const lowStock = settings.catalog.lowStockThreshold;

  const [
    todayOrders,
    todayRevenue,
    weekRevenue,
    toPack,
    unreadMessages,
    lowStockProducts,
    recentOrders,
    draftCount,
  ] = await Promise.all([
    db.order.count({ where: { placedAt: { gte: today } } }),
    db.order.aggregate({
      where: { placedAt: { gte: today }, paymentStatus: { in: ["PAID", "COD_PENDING"] } },
      _sum: { total: true },
    }),
    db.order.aggregate({
      where: { placedAt: { gte: weekAgo }, paymentStatus: { in: ["PAID", "COD_PENDING"] } },
      _sum: { total: true },
    }),
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.product.findMany({
      where: { status: "ACTIVE", stock: { lte: lowStock } },
      select: { id: true, title: true, stock: true, sku: true },
      orderBy: { stock: "asc" },
      take: 6,
    }),
    db.order.findMany({
      select: {
        id: true, orderNumber: true, total: true, status: true, placedAt: true,
        email: true,
        _count: { select: { items: true } },
      },
      orderBy: { placedAt: "desc" },
      take: 8,
    }),
    db.product.count({ where: { status: "DRAFT" } }),
  ]);

  const stats = [
    { label: "Orders today", value: String(todayOrders), href: "/admin/orders" },
    { label: "Sales today", value: formatPaise(todayRevenue._sum.total ?? 0), href: "/admin/orders" },
    { label: "Sales this week", value: formatPaise(weekRevenue._sum.total ?? 0), href: "/admin/orders" },
    { label: "Waiting to pack", value: String(toPack), href: "/admin/orders?status=CONFIRMED" },
  ];

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="font-display text-2xl text-ink lg:text-3xl">Today at the shop</h1>
        <p className="mt-1 text-sm text-muted">{formatDate(new Date())}</p>
      </header>

      {/* What needs doing, before what happened */}
      {(toPack > 0 || unreadMessages > 0 || draftCount > 0) && (
        <section className="grid gap-2">
          {toPack > 0 ? (
            <Link
              href="/admin/orders"
              className="flex items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-[14.5px] text-brand"
            >
              <span>
                <strong className="font-semibold">{toPack}</strong>{" "}
                {toPack === 1 ? "order is" : "orders are"} waiting to be packed
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </Link>
          ) : null}

          {unreadMessages > 0 ? (
            <Link
              href="/admin/messages"
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[14.5px] text-ink"
            >
              <span>
                <strong className="font-semibold">{unreadMessages}</strong> unread{" "}
                {unreadMessages === 1 ? "message" : "messages"} from customers
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : null}

          {draftCount > 0 ? (
            <Link
              href="/admin/products?status=DRAFT"
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[14.5px] text-ink"
            >
              <span>
                <strong className="font-semibold">{draftCount}</strong>{" "}
                {draftCount === 1 ? "product is" : "products are"} still a draft — nobody can buy them
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
            </Link>
          ) : null}
        </section>
      )}

      <section aria-label="Sales summary">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <dt className="text-[12.5px] text-muted">{s.label}</dt>
              <dd className="mt-1 font-display text-2xl text-ink tnum">{s.value}</dd>
            </Link>
          ))}
        </dl>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Latest orders</h2>
          <Link href="/admin/orders" className="text-sm text-brand hover:underline">
            All orders
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center text-sm text-muted">
            No orders yet. They will appear here the moment one comes in.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink tnum">
                      {o.orderNumber}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {o.email} · {o._count.items} {o._count.items === 1 ? "item" : "items"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[14.5px] font-semibold text-ink tnum">
                      {formatPaise(o.total)}
                    </p>
                    <p className="text-[12px] text-muted">{formatDate(o.placedAt)}</p>
                  </div>

                  <Badge tone={ORDER_TONE[o.status]} size="xs" className="shrink-0">
                    {ORDER_LABEL[o.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lowStockProducts.length > 0 ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-ink">
            <TriangleAlert className="size-4 text-warn" aria-hidden />
            Running low
          </h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
            {lowStockProducts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/products/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-[14.5px] hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{p.title}</span>
                    <span className="block text-[12.5px] text-muted tnum">{p.sku}</span>
                  </span>
                  <Badge tone={p.stock === 0 ? "danger" : "warn"} size="xs">
                    {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
