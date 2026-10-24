import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";

import { getSettings } from "@/lib/settings";
import { isConfigured, publicCheckoutConfig } from "@/lib/payments/razorpay";
import { SettingsForms } from "@/components/admin/settings-forms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  /**
   * Can a customer actually pay?
   *
   * Switching cash on delivery off is one click, and with Razorpay still on its
   * test keys it quietly closes the shop: the only route left opens a checkout
   * that accepts nothing but Razorpay's own fake cards. Orders simply stop, and
   * nothing on the site looks broken. So the panel says it out loud.
   */
  const testKeys = publicCheckoutConfig().keyId.startsWith("rzp_test_");
  const noRealRoute = !settings.payments.codEnabled && (!isConfigured || testKeys);

  return (
    <div className="grid max-w-3xl gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Shop settings</h1>
        <p className="text-sm text-muted">
          These appear on your website straight away — your address in the footer, your
          delivery charge at checkout, your return window on every product page.
        </p>
      </header>

      {noRealRoute ? (
        <div className="flex gap-3 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <div className="text-[14.5px] text-amber-900">
            <p className="font-medium">Nobody can pay you right now.</p>
            <p className="mt-1">
              Cash on delivery is switched off, and online payment is still using Razorpay&rsquo;s
              test keys — those accept only pretend cards, so a real customer&rsquo;s payment will
              fail at the last step.
            </p>
            <p className="mt-2">
              Either switch cash on delivery back on under Payments below, or finish Razorpay&rsquo;s
              KYC and put the live keys into Vercel.
            </p>
          </div>
        </div>
      ) : null}

      <SettingsForms settings={settings} />
    </div>
  );
}
