import type { Metadata } from "next";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AddressManager } from "@/components/storefront/address-manager";

export const metadata: Metadata = {
  title: "Your addresses",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountAddressesPage() {
  const session = await auth();

  const addresses = await db.address.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, label: true, fullName: true, phone: true, line1: true, line2: true,
      landmark: true, city: true, state: true, pincode: true, isDefault: true,
    },
  });

  return (
    <div className="grid gap-5">
      <div>
        <h2 className="font-display text-lg text-ink">Delivery addresses</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          Saved here so you do not have to type them again at checkout.
        </p>
      </div>

      <AddressManager addresses={addresses} />
    </div>
  );
}
