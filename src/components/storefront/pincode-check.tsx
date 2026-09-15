"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { PINCODE_RE } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * The delivery estimate both reference sites put on the product page.
 *
 * It is honest about what it knows: we do not have a pincode-level serviceability
 * feed, so it validates the pincode, states the shop's real dispatch and delivery
 * windows, and says plainly that remote pincodes can take longer — rather than
 * inventing a delivery date we cannot keep.
 */
export function PincodeCheck({
  dispatchDays,
  deliveryDays,
  freeAboveLabel,
}: {
  dispatchDays: string;
  deliveryDays: string;
  freeAboveLabel: string | null;
}) {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function check() {
    if (!PINCODE_RE.test(pincode)) {
      setResult(null);
      setError("Enter a 6-digit Indian pincode.");
      return;
    }
    setError(null);
    setResult(`Dispatched in ${dispatchDays}, delivered in about ${deliveryDays}.`);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Truck className="size-4 text-muted" aria-hidden />
        Check delivery to your pincode
      </p>

      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && check()}
          placeholder="e.g. 302003"
          aria-label="Pincode"
          aria-invalid={Boolean(error)}
          className="h-10 w-36 rounded-lg border border-line-strong bg-surface px-3 text-[15px] tnum text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
        />
        <Button type="button" variant="secondary" size="sm" className="h-10" onClick={check}>
          Check
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

      {result ? (
        <div className="mt-3 text-sm">
          <p className="text-success">{result}</p>
          <p className="mt-1 text-muted">
            Remote pincodes can take a little longer — we will tell you if yours is one.
            {freeAboveLabel ? ` Free delivery above ${freeAboveLabel}.` : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
