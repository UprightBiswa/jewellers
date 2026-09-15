import type { Metadata } from "next";

import { db } from "@/lib/db";
import { paiseToRupees } from "@/lib/money";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Offers" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({
    select: {
      id: true, code: true, description: true, type: true, value: true,
      minOrder: true, maxDiscount: true, firstOrderOnly: true,
      usageLimit: true, usedCount: true, isActive: true, endsAt: true,
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="grid max-w-3xl gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Offers and coupons</h1>
        <p className="text-sm text-muted">
          Codes customers type at checkout. Pausing one stops it immediately.
        </p>
      </header>

      <CouponManager
        coupons={coupons.map((c) => ({
          ...c,
          valueDisplay: c.type === "FLAT" ? paiseToRupees(c.value) : c.value,
          minOrderRupees: c.minOrder ? paiseToRupees(c.minOrder) : null,
          maxDiscountRupees: c.maxDiscount ? paiseToRupees(c.maxDiscount) : null,
          endsAtISO: c.endsAt ? c.endsAt.toISOString().slice(0, 10) : null,
        }))}
      />
    </div>
  );
}
