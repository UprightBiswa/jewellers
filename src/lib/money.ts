/**
 * All money in this codebase is an integer number of PAISE.
 *
 * Rupees only ever exist at the edges: what a person types into the admin, and
 * what a person reads on the page. Everything in between — database columns,
 * API payloads, totals, discounts, Razorpay amounts — is paise.
 */

export const PAISE_PER_RUPEE = 100;

/** 249.5 -> 24950. Rounds half away from zero. */
export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/[^0-9.-]/g, "")) : rupees;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * PAISE_PER_RUPEE);
}

/** 24950 -> 249.5 */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrWithPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 24950 -> "₹250" (or "₹249.50" when showPaise) */
export function formatPaise(paise: number, showPaise = false): string {
  const rupees = paiseToRupees(paise);
  return showPaise || rupees % 1 !== 0 ? inrWithPaise.format(rupees) : inr.format(rupees);
}

/** Percentage off, for the strike-through badge. 0 when there is no saving. */
export function discountPercent(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/**
 * GST on jewellery in India is 3% on the item value. Making charges are 5% when
 * billed as a separate line. Whether GST applies at all depends on the shop's
 * registration, so the caller passes the rate from Setting — never hardcode it.
 */
export function gstOn(amountPaise: number, ratePercent: number): number {
  return Math.round((amountPaise * ratePercent) / 100);
}

/** Split an inclusive price into base + tax. */
export function splitInclusiveGst(totalPaise: number, ratePercent: number) {
  const base = Math.round((totalPaise * 100) / (100 + ratePercent));
  return { base, tax: totalPaise - base };
}
