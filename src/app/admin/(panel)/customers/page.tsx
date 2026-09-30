import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { CustomerList, type CustomerRow } from "@/components/admin/customer-list";

export const metadata: Metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

type Search = Promise<{ q?: string; cursor?: string }>;
const PAGE_SIZE = 25;

export default async function AdminCustomersPage({ searchParams }: { searchParams: Search }) {
  const { q, cursor } = await searchParams;

  const where = {
    role: "CUSTOMER" as const,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const rows = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { orders: true, addresses: true, reviews: true } },
      orders: { select: { total: true }, where: { status: { not: "CANCELLED" } } },
      addresses: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { city: true, state: true, pincode: true },
      },
    },
  });

  const hasMore = rows.length > PAGE_SIZE;
  const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  const customers: CustomerRow[] = page.map((u) => ({
    id: u.id,
    name: u.name ?? "No name given",
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    joined: u.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    lastSeen: u.lastLoginAt
      ? u.lastLoginAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "never signed in",
    orderCount: u._count.orders,
    addressCount: u._count.addresses,
    reviewCount: u._count.reviews,
    spent: formatPaise(u.orders.reduce((sum, o) => sum + o.total, 0)),
    place: u.addresses[0]
      ? [u.addresses[0].city, u.addresses[0].state, u.addresses[0].pincode].filter(Boolean).join(", ")
      : null,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Customers</h1>
        <p className="text-sm text-muted">
          Everyone with an account. Guests who checked out without one appear only on their order.
        </p>
      </header>

      <form className="flex gap-2" action="/admin/customers">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name, email or phone"
          aria-label="Search customers"
          className="h-10 flex-1 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-line-strong bg-surface px-4 text-[15px] text-ink hover:bg-surface-2"
        >
          Search
        </button>
      </form>

      <CustomerList customers={customers} />

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`/admin/customers?${new URLSearchParams({
              ...(q ? { q } : {}),
              cursor: nextCursor,
            })}`}
            className="rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-[15px] text-ink hover:bg-surface-2"
          >
            Next {PAGE_SIZE}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
