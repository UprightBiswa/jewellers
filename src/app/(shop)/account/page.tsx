import type { Metadata } from "next";
import Link from "next/link";
import { Heart, MapPin, Package } from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { ProfileForm } from "@/components/storefront/profile-form";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, orderCount, spent, addressCount, savedCount] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
    db.order.count({ where: { userId } }),
    db.order.aggregate({
      where: { userId, paymentStatus: { in: ["PAID", "COD_PENDING"] } },
      _sum: { total: true },
    }),
    db.address.count({ where: { userId } }),
    db.wishlistItem.count({ where: { userId } }),
  ]);

  const tiles = [
    { label: "Orders", value: String(orderCount), href: "/account/orders", Icon: Package },
    { label: "Addresses", value: String(addressCount), href: "/account/addresses", Icon: MapPin },
    { label: "Saved", value: String(savedCount), href: "/account/wishlist", Icon: Heart },
  ];

  return (
    <div className="grid gap-8">
      <section>
        <dl className="grid grid-cols-3 gap-3">
          {tiles.map(({ label, value, href, Icon }) => (
            <Link
              key={label}
              href={href}
              className="rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
            >
              <dt className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <Icon className="size-3.5" aria-hidden />
                {label}
              </dt>
              <dd className="mt-1 font-display text-2xl text-ink tnum">{value}</dd>
            </Link>
          ))}
        </dl>

        {orderCount > 0 ? (
          <p className="mt-3 text-[13px] text-muted">
            You have spent {formatPaise(spent._sum.total ?? 0)} with us. Thank you.
          </p>
        ) : (
          <p className="mt-3 text-[13px] text-muted">
            No orders yet —{" "}
            <Link href="/collections/all" className="text-brand underline underline-offset-4">
              have a look at what is on the bench
            </Link>
            .
          </p>
        )}
      </section>

      <section className="max-w-lg">
        <h2 className="font-display text-lg text-ink">Your details</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          We use these on your orders and for delivery updates.
        </p>

        <div className="mt-5">
          <ProfileForm
            initial={{
              name: user?.name ?? "",
              email: user?.email ?? "",
              phone: user?.phone ?? "",
            }}
          />
        </div>
      </section>

      <section className="max-w-lg rounded-[var(--radius-card)] border border-line bg-surface-2 p-5">
        <h2 className="font-display text-base text-ink">Password</h2>
        <p className="mt-1.5 text-[14px] text-ink-2">
          Changing your password signs you out everywhere else.
        </p>
        <Link
          href="/forgot-password"
          className="mt-3 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Send me a reset link
        </Link>
      </section>
    </div>
  );
}
