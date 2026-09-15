import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CartView } from "@/components/storefront/cart-view";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const settings = await getSettings();

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-[clamp(1.8rem,5vw,2.4rem)] text-ink">Your bag</h1>
      <CartView
        flatFee={settings.shipping.flatFee}
        freeAbove={settings.shipping.freeAbove}
        deliveryDays={settings.shipping.deliveryDays}
      />
    </div>
  );
}
