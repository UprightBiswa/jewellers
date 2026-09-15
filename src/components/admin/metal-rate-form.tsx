"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { setMetalRate } from "@/app/admin/actions";

export function MetalRateForm({ currentRupees }: { currentRupees: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(currentRupees ? String(currentRupees) : "");
  const [pending, setPending] = useState(false);

  const parsed = Number(value);
  const changedALot =
    currentRupees !== null &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    Math.abs(parsed - currentRupees) / currentRupees > 0.2;

  async function save() {
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter today's rate per gram.");
      return;
    }

    // A 20% jump is almost always a typo — an extra zero, or rate per 10 grams.
    if (changedALot && !confirm(`That is a big change from ₹${currentRupees}. Is it right?`)) {
      return;
    }

    setPending(true);
    const result = await setMetalRate(parsed);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message ?? "Saved.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <h2 className="font-display text-lg text-ink">Set today&apos;s rate</h2>
      <p className="mt-1 text-[13.5px] text-muted">
        999 fine silver, rupees per gram, as you would quote it at the counter.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Rate per gram (₹)" htmlFor="rate" className="w-40">
          <Input
            id="rate"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="96"
            className="tnum"
          />
        </Field>

        <Button type="button" disabled={pending} onClick={save} className="mb-[2px]">
          {pending ? "Saving…" : "Save rate"}
        </Button>
      </div>

      {changedALot ? (
        <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-[13.5px] text-warn">
          That is more than 20% away from the current rate. Check it before saving.
        </p>
      ) : null}
    </section>
  );
}
