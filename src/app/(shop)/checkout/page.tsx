import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCart, readCartLines } from "@/lib/cart/server";
import { isConfigured, publicCheckoutConfig } from "@/lib/payments/razorpay";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCart();
  const lines = cart ? await readCartLines(cart.id) : [];

  // Nothing to check out. Send them somewhere useful rather than showing an
  // empty form they cannot submit.
  if (lines.length === 0) redirect("/cart");

  const [settings, session] = await Promise.all([getSettings(), auth()]);

  const addresses = session?.user?.id
    ? await db.address.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        select: {
          id: true, label: true, fullName: true, phone: true, line1: true, line2: true,
          landmark: true, city: true, state: true, pincode: true, isDefault: true,
        },
      })
    : [];

  // Narrower than the rest of the shop on purpose. The page container is 80rem,
  // which left the form column around 800px on a desktop — an email box that
  // wide reads as a mistake, and a line of input that long is harder to scan.
  // 64rem puts the form at a normal measure and keeps the summary beside it.
  return (
    <div className="container-page py-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-[clamp(1.8rem,5vw,2.4rem)] text-ink">Checkout</h1>

        <CheckoutForm
          lines={lines}
          addresses={addresses}
          signedIn={Boolean(session?.user)}
          defaultEmail={session?.user?.email ?? ""}
          settings={{
            flatFee: settings.shipping.flatFee,
            freeAbove: settings.shipping.freeAbove,
            deliveryDays: settings.shipping.deliveryDays,
            codEnabled: settings.payments.codEnabled,
            codMaxOrder: settings.payments.codMaxOrder,
            codFee: settings.payments.codFee,
            storeName: settings.store.name,
            whatsapp: settings.store.whatsapp,
          }}
          razorpay={{ enabled: isConfigured, keyId: publicCheckoutConfig().keyId }}
        />
      </div>
    </div>
  );
}
