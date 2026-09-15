import type { PriceMode, Purity } from "@/generated/prisma";

/**
 * Two ways a silver shop prices an item, and the store supports both:
 *
 *   FIXED   the price on the tag is the price. Nothing to compute.
 *   WEIGHT  price = weight x today's rate x purity factor + making charge.
 *
 * In WEIGHT mode `Product.price` is only a cached preview for listing pages.
 * The authoritative number is computed here and frozen into OrderItem at
 * checkout, so an order total never moves when the metal rate does.
 */

export const PURITY_FACTOR: Record<Purity, number> = {
  S925: 0.925,
  S999: 0.999,
  PLATED: 0, // no silver value, priced as FIXED
  GOLD_PLATED: 0.925, // gold plate over sterling
  OXIDISED: 0.925,
};

export const PURITY_LABEL: Record<Purity, string> = {
  S925: "925 Sterling Silver",
  S999: "999 Fine Silver",
  PLATED: "Silver Plated",
  GOLD_PLATED: "Gold Plated on Silver",
  OXIDISED: "Oxidised Silver",
};

export type PriceInput = {
  priceMode: PriceMode;
  /** paise — authoritative in FIXED mode */
  price: number;
  purity: Purity;
  /** grams */
  weightG?: number | null;
  /** paise per gram of finished weight */
  makingCharge?: number | null;
  /** percentage of metal value, used when makingCharge is null */
  makingChargePct?: number | null;
  /** paise per gram of pure silver, from the MetalRate table */
  ratePerGram?: number | null;
  /** paise, from the selected variant */
  variantDelta?: number;
};

export type PriceBreakdown = {
  /** paise, what the customer pays for one unit */
  total: number;
  metalValue: number;
  makingValue: number;
  /** true when the number came out of the rate table rather than the tag */
  isLive: boolean;
};

export function computePrice(input: PriceInput): PriceBreakdown {
  const delta = input.variantDelta ?? 0;

  if (input.priceMode === "FIXED" || !input.weightG || !input.ratePerGram) {
    return {
      total: Math.max(0, input.price + delta),
      metalValue: input.price,
      makingValue: 0,
      isLive: false,
    };
  }

  const factor = PURITY_FACTOR[input.purity] || 0.925;
  const metalValue = Math.round(input.weightG * factor * input.ratePerGram);

  const makingValue = input.makingCharge
    ? Math.round(input.weightG * input.makingCharge)
    : input.makingChargePct
      ? Math.round((metalValue * Number(input.makingChargePct)) / 100)
      : 0;

  return {
    total: Math.max(0, metalValue + makingValue + delta),
    metalValue,
    makingValue,
    isLive: true,
  };
}

/**
 * Shipping. Deliberately simple and driven by Setting rows, because the client
 * will want to change the free-shipping threshold during a festival sale
 * without calling the developer.
 */
export function shippingFee(
  subtotalPaise: number,
  opts: { flatFee: number; freeAbove: number | null },
): number {
  if (opts.freeAbove !== null && subtotalPaise >= opts.freeAbove) return 0;
  return opts.flatFee;
}
