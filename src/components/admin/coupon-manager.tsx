"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveCoupon, toggleCoupon } from "@/app/admin/actions";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENT" | "FLAT" | "FREESHIP";
  valueDisplay: number;
  minOrderRupees: number | null;
  maxDiscountRupees: number | null;
  firstOrderOnly: boolean;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
  endsAtISO: string | null;
};

type Draft = {
  id?: string;
  code: string;
  description: string;
  type: "PERCENT" | "FLAT" | "FREESHIP";
  value: string;
  minOrderRupees: string;
  maxDiscountRupees: string;
  firstOrderOnly: boolean;
  usageLimit: string;
  endsAt: string;
};

const EMPTY: Draft = {
  code: "", description: "", type: "PERCENT", value: "10",
  minOrderRupees: "", maxDiscountRupees: "", firstOrderOnly: false,
  usageLimit: "", endsAt: "",
};

function describe(c: Coupon): string {
  const base =
    c.type === "PERCENT"
      ? `${c.valueDisplay}% off`
      : c.type === "FLAT"
        ? `₹${c.valueDisplay} off`
        : "Free delivery";
  const min = c.minOrderRupees ? ` on orders above ₹${c.minOrderRupees}` : "";
  const cap = c.type === "PERCENT" && c.maxDiscountRupees ? `, up to ₹${c.maxDiscountRupees}` : "";
  return base + min + cap;
}

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function edit(c: Coupon) {
    setErrors({});
    setDraft({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: String(c.valueDisplay),
      minOrderRupees: c.minOrderRupees ? String(c.minOrderRupees) : "",
      maxDiscountRupees: c.maxDiscountRupees ? String(c.maxDiscountRupees) : "",
      firstOrderOnly: c.firstOrderOnly,
      usageLimit: c.usageLimit ? String(c.usageLimit) : "",
      endsAt: c.endsAtISO ?? "",
    });
  }

  async function save() {
    if (!draft || pending) return;
    setPending(true);
    setErrors({});

    const result = await saveCoupon({
      id: draft.id,
      code: draft.code,
      description: draft.description || undefined,
      type: draft.type,
      value: Number(draft.value || 0),
      minOrderRupees: draft.minOrderRupees ? Number(draft.minOrderRupees) : undefined,
      maxDiscountRupees: draft.maxDiscountRupees ? Number(draft.maxDiscountRupees) : undefined,
      firstOrderOnly: draft.firstOrderOnly,
      usageLimit: draft.usageLimit ? Number(draft.usageLimit) : undefined,
      endsAt: draft.endsAt || undefined,
      isActive: true,
    });

    setPending(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Saved.");
    setDraft(null);
    router.refresh();
  }

  async function pause(c: Coupon) {
    const result = await toggleCoupon(c.id, !c.isActive);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Updated.");
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {!draft ? (
        <Button type="button" className="justify-self-start" onClick={() => setDraft(EMPTY)}>
          <Plus className="size-4" aria-hidden />
          New offer
        </Button>
      ) : (
        <section className="grid gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 className="font-display text-lg text-ink">
            {draft.id ? `Edit ${draft.code}` : "New offer"}
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Code customers type" htmlFor="code" required error={errors.code}>
              <Input
                id="code"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder="DIWALI500"
                className="uppercase tracking-wider"
              />
            </Field>

            <Field label="What kind?" htmlFor="type">
              <Select
                id="type"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as Draft["type"] })}
              >
                <option value="PERCENT">Percent off</option>
                <option value="FLAT">Rupees off</option>
                <option value="FREESHIP">Free delivery</option>
              </Select>
            </Field>
          </div>

          {draft.type !== "FREESHIP" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={draft.type === "PERCENT" ? "Discount (%)" : "Discount (₹)"}
                htmlFor="value"
                required
                error={errors.value}
              >
                <Input
                  id="value"
                  inputMode="decimal"
                  value={draft.value}
                  onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                  className="tnum"
                />
              </Field>

              {draft.type === "PERCENT" ? (
                <Field
                  label="Most it can take off (₹)"
                  htmlFor="maxDiscountRupees"
                  hint="Stops a big order costing you too much"
                >
                  <Input
                    id="maxDiscountRupees"
                    inputMode="decimal"
                    value={draft.maxDiscountRupees}
                    onChange={(e) => setDraft({ ...draft, maxDiscountRupees: e.target.value })}
                    className="tnum"
                  />
                </Field>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Only on orders above (₹)" htmlFor="minOrderRupees" hint="Optional">
              <Input
                id="minOrderRupees"
                inputMode="decimal"
                value={draft.minOrderRupees}
                onChange={(e) => setDraft({ ...draft, minOrderRupees: e.target.value })}
                className="tnum"
              />
            </Field>

            <Field label="Runs until" htmlFor="endsAt" hint="Leave blank for no end date">
              <Input
                id="endsAt"
                type="date"
                value={draft.endsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Note for yourself" htmlFor="description">
            <Textarea
              id="description"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Diwali sale, printed on the shop banner"
            />
          </Field>

          <label className="flex items-center gap-3 text-[14.5px] text-ink">
            <input
              type="checkbox"
              checked={draft.firstOrderOnly}
              onChange={(e) => setDraft({ ...draft, firstOrderOnly: e.target.checked })}
              className="size-4 accent-[var(--color-brand)]"
            />
            Only for a customer&apos;s first order
          </label>

          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save offer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}

      {coupons.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-12 text-center text-sm text-muted">
          No offers yet. A first-order discount is the usual place to start.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium tracking-wider text-ink">{c.code}</span>
                  <Badge tone={c.isActive ? "success" : "neutral"} size="xs">
                    {c.isActive ? "Live" : "Paused"}
                  </Badge>
                  {c.firstOrderOnly ? <Badge tone="gold" size="xs">First order</Badge> : null}
                </p>
                <p className="mt-0.5 text-[13.5px] text-muted">{describe(c)}</p>
                <p className="mt-0.5 text-[12.5px] text-muted tnum">
                  Used {c.usedCount} {c.usedCount === 1 ? "time" : "times"}
                  {c.usageLimit ? ` of ${c.usageLimit}` : ""}
                  {c.endsAtISO ? ` · ends ${c.endsAtISO}` : ""}
                </p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => edit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => pause(c)}>
                  {c.isActive ? "Pause" : "Resume"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
