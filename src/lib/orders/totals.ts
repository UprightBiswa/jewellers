import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { gstOn, splitInclusiveGst } from "@/lib/money";
import { shippingFee } from "@/lib/pricing";
import { ApiException } from "@/lib/api/response";
import type { ServerCartLine } from "@/lib/cart/server";

/**
 * The only place an order total is decided.
 *
 * Nothing here reads a number the browser sent. The cart lines are re-priced
 * from the database before they arrive, the coupon is re-checked against the
 * database, and the shipping and COD rules come from Settings. A client that
 * posts its own `total` is ignored, because the amount handed to Razorpay is
 * the one computed here.
 */

export type CouponResult = {
  code: string;
  couponId: string;
  /** paise taken off the subtotal */
  discount: number;
  /** true when the coupon pays for delivery instead of discounting goods */
  freeShipping: boolean;
  description: string | null;
};

export type OrderTotals = {
  subtotal: number;
  discount: number;
  shippingFee: number;
  codFee: number;
  gstAmount: number;
  total: number;
  coupon: CouponResult | null;
  /** paise the customer pays now on a made-to-order piece; 0 when not applicable */
  advanceDue: number;
};

export type PaymentChoice = "ONLINE" | "COD";

/**
 * Validates a coupon for this customer and this cart. Throws with a message a
 * customer can read — "this code has expired", not "constraint violation".
 */
export async function validateCoupon(
  code: string,
  subtotal: number,
  userId: string | null,
): Promise<CouponResult> {
  const coupon = await db.coupon.findUnique({
    where: { code: code.toUpperCase().trim() },
    select: {
      id: true, code: true, description: true, type: true, value: true,
      minOrder: true, maxDiscount: true, startsAt: true, endsAt: true,
      usageLimit: true, usedCount: true, perUserLimit: true,
      firstOrderOnly: true, isActive: true,
    },
  });

  if (!coupon || !coupon.isActive) {
    throw new ApiException("not_found", "That code is not valid.");
  }

  const now = new Date();
  if (coupon.startsAt > now) {
    throw new ApiException("bad_request", "That offer has not started yet.");
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    throw new ApiException("bad_request", "That offer has ended.");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiException("bad_request", "That offer has been fully claimed.");
  }
  if (coupon.minOrder && subtotal < coupon.minOrder) {
    const short = (coupon.minOrder - subtotal) / 100;
    throw new ApiException(
      "bad_request",
      `Add ₹${short.toFixed(0)} more to use this code.`,
    );
  }

  if (coupon.firstOrderOnly) {
    if (!userId) {
      throw new ApiException(
        "unauthorized",
        "Sign in to use your first-order discount.",
      );
    }
    const previous = await db.order.count({
      where: { userId, paymentStatus: { in: ["PAID", "COD_PENDING"] } },
    });
    if (previous > 0) {
      throw new ApiException("bad_request", "This code is only for a first order.");
    }
  }

  if (userId && coupon.perUserLimit !== null) {
    const used = await db.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) {
      throw new ApiException("bad_request", "You have already used this code.");
    }
  }

  let discount = 0;
  if (coupon.type === "PERCENT") {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else if (coupon.type === "FLAT") {
    discount = Math.min(coupon.value, subtotal);
  }

  return {
    code: coupon.code,
    couponId: coupon.id,
    discount,
    freeShipping: coupon.type === "FREESHIP",
    description: coupon.description,
  };
}

/** Computes every line of the bill from the cart, the settings and the coupon. */
export async function computeTotals(input: {
  lines: ServerCartLine[];
  couponCode?: string | null;
  payment: PaymentChoice;
  userId: string | null;
  /** true when any line is made to order, which triggers the advance rule */
  madeToOrder?: boolean;
}): Promise<OrderTotals> {
  const settings = await getSettings();

  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  if (subtotal <= 0) {
    throw new ApiException("bad_request", "Your bag is empty.");
  }

  let coupon: CouponResult | null = null;
  if (input.couponCode) {
    coupon = await validateCoupon(input.couponCode, subtotal, input.userId);
  }

  const discount = coupon?.discount ?? 0;
  const goods = Math.max(0, subtotal - discount);

  const shipping = coupon?.freeShipping
    ? 0
    : shippingFee(goods, {
        flatFee: settings.shipping.flatFee,
        freeAbove: settings.shipping.freeAbove,
      });

  if (input.payment === "COD") {
    if (!settings.payments.codEnabled) {
      throw new ApiException("bad_request", "Cash on delivery is not available right now.");
    }
    if (goods > settings.payments.codMaxOrder) {
      const limit = settings.payments.codMaxOrder / 100;
      throw new ApiException(
        "bad_request",
        `Cash on delivery is only for orders up to ₹${limit.toFixed(0)}. Please pay online for this one.`,
      );
    }
  }

  const codFee = input.payment === "COD" ? settings.payments.codFee : 0;

  // GST only exists if the shop is registered. Charubala Silver is not, so this
  // resolves to zero until the owner turns it on in Settings.
  let gstAmount = 0;
  if (settings.tax.gstEnabled && settings.tax.ratePercent > 0) {
    gstAmount = settings.tax.pricesIncludeGst
      ? splitInclusiveGst(goods, settings.tax.ratePercent).tax
      : gstOn(goods, settings.tax.ratePercent);
  }

  const addedTax = settings.tax.pricesIncludeGst ? 0 : gstAmount;
  const total = goods + shipping + codFee + addedTax;

  const advanceDue =
    input.madeToOrder && settings.payments.advancePercent > 0
      ? Math.round((total * settings.payments.advancePercent) / 100)
      : 0;

  return { subtotal, discount, shippingFee: shipping, codFee, gstAmount, total, coupon, advanceDue };
}
