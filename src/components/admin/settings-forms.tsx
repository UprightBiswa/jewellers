"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveSettings } from "@/app/admin/actions";
import { paiseToRupees, rupeesToPaise } from "@/lib/money";
import type { Settings, SettingsGroup } from "@/lib/settings";

/**
 * One card per group, each saving on its own.
 *
 * Splitting the save is the point: the owner changing his free-delivery
 * threshold during a sale should not have to scroll past his GST number and
 * risk saving something he did not mean to touch.
 */
function Card({
  title,
  description,
  children,
  onSave,
  pending,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {description ? <p className="mt-1 text-[13.5px] text-muted">{description}</p> : null}
      <div className="mt-4 grid gap-5">{children}</div>
      <Button type="button" className="mt-5" disabled={pending} onClick={onSave}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </section>
  );
}

export function SettingsForms({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [saving, setSaving] = useState<SettingsGroup | null>(null);

  const [store, setStore] = useState({
    ...settings.store,
    addressText: settings.store.addressLines.join("\n"),
  });
  const [tax, setTax] = useState(settings.tax);
  const [shipping, setShipping] = useState({
    ...settings.shipping,
    flatFeeRupees: String(paiseToRupees(settings.shipping.flatFee)),
    freeAboveRupees: settings.shipping.freeAbove
      ? String(paiseToRupees(settings.shipping.freeAbove))
      : "",
  });
  const [payments, setPayments] = useState({
    ...settings.payments,
    codMaxRupees: String(paiseToRupees(settings.payments.codMaxOrder)),
    codFeeRupees: String(paiseToRupees(settings.payments.codFee)),
  });
  const [returns, setReturns] = useState(settings.returns);
  const [announcements, setAnnouncements] = useState(settings.announcements.join("\n"));
  const [social, setSocial] = useState(settings.social);

  async function save(group: SettingsGroup, value: unknown) {
    setSaving(group);
    const result = await saveSettings(group, value);
    setSaving(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Saved.");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      <Card
        title="Your shop"
        description="Shown in the footer, on the contact page and on every invoice."
        pending={saving === "store"}
        onSave={() =>
          save("store", {
            ...store,
            addressLines: store.addressText.split("\n").map((l) => l.trim()).filter(Boolean),
          })
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Shop name" htmlFor="storeName">
            <Input id="storeName" value={store.name}
              onChange={(e) => setStore({ ...store, name: e.target.value })} />
          </Field>
          <Field label="Tagline" htmlFor="tagline">
            <Input id="tagline" value={store.tagline}
              onChange={(e) => setStore({ ...store, tagline: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Email for orders" htmlFor="storeEmail">
            <Input id="storeEmail" type="email" value={store.email}
              onChange={(e) => setStore({ ...store, email: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="storePhone">
            <Input id="storePhone" value={store.phone}
              onChange={(e) => setStore({ ...store, phone: e.target.value })} />
          </Field>
        </div>

        <Field label="WhatsApp number" htmlFor="whatsapp"
          hint="With country code, digits only — e.g. 919876543210">
          <Input id="whatsapp" value={store.whatsapp} className="tnum"
            onChange={(e) => setStore({ ...store, whatsapp: e.target.value.replace(/\D/g, "") })} />
        </Field>

        <Field label="Shop address" htmlFor="address" hint="One line per line">
          <Textarea id="address" rows={3} value={store.addressText}
            onChange={(e) => setStore({ ...store, addressText: e.target.value })} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="City" htmlFor="city">
            <Input id="city" value={store.city}
              onChange={(e) => setStore({ ...store, city: e.target.value })} />
          </Field>
          <Field label="State" htmlFor="state">
            <Input id="state" value={store.state}
              onChange={(e) => setStore({ ...store, state: e.target.value })} />
          </Field>
          <Field label="Pincode" htmlFor="pincode">
            <Input id="pincode" value={store.pincode} className="tnum"
              onChange={(e) => setStore({ ...store, pincode: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card
        title="Delivery charges"
        description="Applied at checkout."
        pending={saving === "shipping"}
        onSave={() =>
          save("shipping", {
            ...shipping,
            flatFee: rupeesToPaise(Number(shipping.flatFeeRupees || 0)),
            freeAbove: shipping.freeAboveRupees
              ? rupeesToPaise(Number(shipping.freeAboveRupees))
              : null,
          })
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Delivery charge (₹)" htmlFor="flatFee">
            <Input id="flatFee" inputMode="decimal" className="tnum"
              value={shipping.flatFeeRupees}
              onChange={(e) => setShipping({ ...shipping, flatFeeRupees: e.target.value })} />
          </Field>
          <Field label="Free above (₹)" htmlFor="freeAbove" hint="Blank means never free">
            <Input id="freeAbove" inputMode="decimal" className="tnum"
              value={shipping.freeAboveRupees}
              onChange={(e) => setShipping({ ...shipping, freeAboveRupees: e.target.value })} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Packed in" htmlFor="dispatchDays">
            <Input id="dispatchDays" value={shipping.dispatchDays}
              onChange={(e) => setShipping({ ...shipping, dispatchDays: e.target.value })} />
          </Field>
          <Field label="Delivered in" htmlFor="deliveryDays">
            <Input id="deliveryDays" value={shipping.deliveryDays}
              onChange={(e) => setShipping({ ...shipping, deliveryDays: e.target.value })} />
          </Field>
        </div>

        <Field label="We deliver to" htmlFor="shipsTo">
          <Input id="shipsTo" value={shipping.shipsTo}
            onChange={(e) => setShipping({ ...shipping, shipsTo: e.target.value })} />
        </Field>
      </Card>

      <Card
        title="Payment"
        description="Cash on delivery rules."
        pending={saving === "payments"}
        onSave={() =>
          save("payments", {
            ...payments,
            codMaxOrder: rupeesToPaise(Number(payments.codMaxRupees || 0)),
            codFee: rupeesToPaise(Number(payments.codFeeRupees || 0)),
          })
        }
      >
        <label className="flex items-center gap-3 text-[14.5px] text-ink">
          <input type="checkbox" checked={payments.codEnabled}
            onChange={(e) => setPayments({ ...payments, codEnabled: e.target.checked })}
            className="size-4 accent-[var(--color-brand)]" />
          Accept cash on delivery
        </label>

        {payments.codEnabled ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="COD only up to (₹)" htmlFor="codMax">
              <Input id="codMax" inputMode="decimal" className="tnum"
                value={payments.codMaxRupees}
                onChange={(e) => setPayments({ ...payments, codMaxRupees: e.target.value })} />
            </Field>
            <Field label="Extra charge for COD (₹)" htmlFor="codFee">
              <Input id="codFee" inputMode="decimal" className="tnum"
                value={payments.codFeeRupees}
                onChange={(e) => setPayments({ ...payments, codFeeRupees: e.target.value })} />
            </Field>
          </div>
        ) : null}
      </Card>

      <Card
        title="GST"
        description="Leave this off until your registration comes through."
        pending={saving === "tax"}
        onSave={() => save("tax", tax)}
      >
        <label className="flex items-center gap-3 text-[14.5px] text-ink">
          <input type="checkbox" checked={tax.gstEnabled}
            onChange={(e) => setTax({ ...tax, gstEnabled: e.target.checked })}
            className="size-4 accent-[var(--color-brand)]" />
          I am registered for GST
        </label>

        {tax.gstEnabled ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="GSTIN" htmlFor="gstin">
                <Input id="gstin" value={tax.gstin} className="tnum uppercase"
                  onChange={(e) => setTax({ ...tax, gstin: e.target.value.toUpperCase() })} />
              </Field>
              <Field label="GST rate (%)" htmlFor="gstRate" hint="3% on finished jewellery">
                <Input id="gstRate" inputMode="decimal" className="tnum"
                  value={String(tax.ratePercent)}
                  onChange={(e) => setTax({ ...tax, ratePercent: Number(e.target.value || 0) })} />
              </Field>
            </div>

            <Field label="Prices shown on the website" htmlFor="inclusive">
              <Select id="inclusive" value={tax.pricesIncludeGst ? "yes" : "no"}
                onChange={(e) => setTax({ ...tax, pricesIncludeGst: e.target.value === "yes" })}>
                <option value="yes">Already include GST</option>
                <option value="no">GST is added at checkout</option>
              </Select>
            </Field>
          </>
        ) : null}
      </Card>

      <Card
        title="Returns"
        description="Shown on every product page and in the footer."
        pending={saving === "returns"}
        onSave={() => save("returns", returns)}
      >
        <Field label="Return window (days)" htmlFor="windowDays">
          <Input id="windowDays" inputMode="numeric" className="w-24 tnum"
            value={String(returns.windowDays)}
            onChange={(e) => setReturns({ ...returns, windowDays: Number(e.target.value || 0) })} />
        </Field>

        <Field label="Exchange or buyback" htmlFor="buyback">
          <Input id="buyback" value={returns.buyback}
            onChange={(e) => setReturns({ ...returns, buyback: e.target.value })} />
        </Field>

        <Field label="What cannot be returned" htmlFor="nonReturnable">
          <Input id="nonReturnable" value={returns.nonReturnable}
            onChange={(e) => setReturns({ ...returns, nonReturnable: e.target.value })} />
        </Field>
      </Card>

      <Card
        title="Offer strip"
        description="The rotating line at the very top of your website. One message per line."
        pending={saving === "announcements"}
        onSave={() =>
          save(
            "announcements",
            announcements.split("\n").map((l) => l.trim()).filter(Boolean),
          )
        }
      >
        <Field label="Messages" htmlFor="announcements">
          <Textarea id="announcements" rows={4} value={announcements}
            onChange={(e) => setAnnouncements(e.target.value)} />
        </Field>
      </Card>

      <Card
        title="Social links"
        description="Blank ones are simply hidden."
        pending={saving === "social"}
        onSave={() => save("social", social)}
      >
        <Field label="Instagram" htmlFor="instagram">
          <Input id="instagram" value={social.instagram} placeholder="https://instagram.com/…"
            onChange={(e) => setSocial({ ...social, instagram: e.target.value })} />
        </Field>
        <Field label="Facebook" htmlFor="facebook">
          <Input id="facebook" value={social.facebook} placeholder="https://facebook.com/…"
            onChange={(e) => setSocial({ ...social, facebook: e.target.value })} />
        </Field>
        <Field label="YouTube" htmlFor="youtube">
          <Input id="youtube" value={social.youtube} placeholder="https://youtube.com/…"
            onChange={(e) => setSocial({ ...social, youtube: e.target.value })} />
        </Field>
      </Card>
    </div>
  );
}
