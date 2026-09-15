import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { SettingsForms } from "@/components/admin/settings-forms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="grid max-w-3xl gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Shop settings</h1>
        <p className="text-sm text-muted">
          These appear on your website straight away — your address in the footer, your
          delivery charge at checkout, your return window on every product page.
        </p>
      </header>

      <SettingsForms settings={settings} />
    </div>
  );
}
