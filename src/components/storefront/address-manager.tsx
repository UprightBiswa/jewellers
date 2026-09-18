"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { INDIAN_STATES, cn } from "@/lib/utils";
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
  type ActionResult,
} from "@/app/(shop)/account/actions";

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Spinner label="Saving" />
          Saving…
        </>
      ) : editing ? (
        "Save changes"
      ) : (
        "Save address"
      )}
    </Button>
  );
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(addresses.length === 0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [state, formAction] = useActionState<ActionResult | null, FormData>(saveAddress, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Saved.");
      setEditing(null);
      setAdding(false);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const showForm = adding || editing !== null;
  const current = editing;

  async function remove(address: Address) {
    if (!confirm(`Remove the address for ${address.fullName}?`)) return;
    setBusyId(address.id);
    const result = await deleteAddress(address.id);
    setBusyId(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Removed.");
    router.refresh();
  }

  async function makeDefault(address: Address) {
    setBusyId(address.id);
    const result = await setDefaultAddress(address.id);
    setBusyId(null);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {addresses.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-[var(--radius-card)] border bg-surface p-4",
                a.isDefault ? "border-brand" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink">
                  {a.fullName}
                  <span className="ml-2 text-[12px] font-normal text-muted">{a.label}</span>
                </p>
                {a.isDefault ? (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                    Default
                  </span>
                ) : null}
              </div>

              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                {[a.line1, a.line2, a.landmark, a.city, a.state, a.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-[13px] text-muted tnum">{a.phone}</p>

              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busyId === a.id}
                  onClick={() => {
                    setEditing(a);
                    setAdding(false);
                  }}
                >
                  Edit
                </Button>

                {!a.isDefault ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === a.id}
                    onClick={() => makeDefault(a)}
                  >
                    {busyId === a.id ? <Spinner label="Updating" /> : <Star className="size-3.5" aria-hidden />}
                    Make default
                  </Button>
                ) : null}

                <Button
                  size="sm"
                  variant="quiet"
                  className="text-danger"
                  disabled={busyId === a.id}
                  onClick={() => remove(a)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!showForm ? (
        <Button
          variant="secondary"
          className="justify-self-start"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add an address
        </Button>
      ) : (
        <form
          action={formAction}
          className="grid gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-5"
        >
          <h3 className="font-display text-lg text-ink">
            {current ? "Edit address" : "New address"}
          </h3>

          {current ? <input type="hidden" name="id" value={current.id} /> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" required error={fieldErrors.fullName}>
              <Input id="fullName" name="fullName" defaultValue={current?.fullName ?? ""}
                autoComplete="name" required />
            </Field>
            <Field label="Mobile number" htmlFor="phone" required error={fieldErrors.phone}>
              <Input id="phone" name="phone" type="tel" inputMode="numeric" className="tnum"
                defaultValue={current?.phone ?? ""} autoComplete="tel" required />
            </Field>
          </div>

          <Field label="House number and street" htmlFor="line1" required error={fieldErrors.line1}>
            <Input id="line1" name="line1" defaultValue={current?.line1 ?? ""}
              autoComplete="address-line1" required />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Area or village" htmlFor="line2">
              <Input id="line2" name="line2" defaultValue={current?.line2 ?? ""}
                autoComplete="address-line2" />
            </Field>
            <Field label="Landmark" htmlFor="landmark" hint="Helps the delivery boy find you">
              <Input id="landmark" name="landmark" defaultValue={current?.landmark ?? ""} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Town or city" htmlFor="city" required error={fieldErrors.city}>
              <Input id="city" name="city" defaultValue={current?.city ?? ""}
                autoComplete="address-level2" required />
            </Field>
            <Field label="State" htmlFor="state" required error={fieldErrors.state}>
              <Select id="state" name="state" defaultValue={current?.state ?? "West Bengal"} required>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Pincode" htmlFor="pincode" required error={fieldErrors.pincode}>
              <Input id="pincode" name="pincode" inputMode="numeric" maxLength={6} className="tnum"
                defaultValue={current?.pincode ?? ""} autoComplete="postal-code" required />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name this address" htmlFor="label" hint="Home, shop, mother's house…">
              <Input id="label" name="label" defaultValue={current?.label ?? "Home"} maxLength={24} />
            </Field>

            <label className="flex items-center gap-3 self-end pb-2 text-[14.5px] text-ink">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={current?.isDefault ?? addresses.length === 0}
                className="size-4 accent-[var(--color-brand)]"
              />
              Use this by default
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <SaveButton editing={Boolean(current)} />
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setAdding(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {addresses.length > 0 && !showForm ? (
        <p className="flex items-center gap-1.5 text-[13px] text-muted">
          <Check className="size-3.5 text-success" aria-hidden />
          Your default address is filled in automatically at checkout.
        </p>
      ) : null}
    </div>
  );
}
