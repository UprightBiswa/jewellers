import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { ReviewManager, type ReviewRow } from "@/components/admin/review-manager";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

type Search = Promise<{ status?: string }>;

const TABS = [
  { value: "PENDING", label: "Waiting for you" },
  { value: "APPROVED", label: "On the shop" },
  { value: "REJECTED", label: "Hidden" },
  { value: "", label: "All" },
] as const;

export default async function AdminReviewsPage({ searchParams }: { searchParams: Search }) {
  const { status } = await searchParams;
  const filter =
    status === "APPROVED" || status === "REJECTED" || status === "PENDING" ? status : undefined;

  const [rows, waiting] = await Promise.all([
    db.review.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        product: { select: { title: true, slug: true } },
      },
    }),
    db.review.count({ where: { status: "PENDING" } }),
  ]);

  const reviews: ReviewRow[] = rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    customerName: r.user.name ?? "A customer",
    customerEmail: r.user.email,
    productTitle: r.product.title,
    productSlug: r.product.slug,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Reviews</h1>
        <p className="text-sm text-muted">
          {waiting > 0
            ? `${waiting} waiting for you. Nothing shows on the shop until you allow it.`
            : "Nothing is waiting. Nothing shows on the shop until you allow it."}
        </p>
      </header>

      <nav className="flex gap-1.5 overflow-x-auto no-scrollbar" aria-label="Filter reviews">
        {TABS.map((tab) => {
          const active = (status ?? "PENDING") === tab.value || (!status && tab.value === "PENDING");
          const href = tab.value ? `/admin/reviews?status=${tab.value}` : "/admin/reviews?status=all";
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
              {tab.value === "PENDING" && waiting > 0 ? (
                <span className="ms-1.5 tnum">{waiting}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <ReviewManager reviews={reviews} />
    </div>
  );
}
