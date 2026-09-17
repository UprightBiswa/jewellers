import "server-only";
import { db } from "@/lib/db";
import { ApiException } from "@/lib/api/response";
import { readCartLines, type ServerCartLine } from "@/lib/cart/server";
import { computeTotals, type PaymentChoice } from "./totals";
import { getSettings } from "@/lib/settings";

/**
 * Placing an order.
 *
 * Everything that must not half-happen happens in one transaction: the order
 * rows, the stock decrement, the coupon redemption, and emptying the bag. If
 * any of it fails, none of it did.
 *
 * Stock comes down at creation, not at payment. For a shop with two of most
 * things, selling the same ring twice while a payment is pending is a much
 * worse problem than briefly holding stock for an abandoned checkout — and an
 * abandoned order releases it again (see `releaseOrder`).
 */

export type ShippingAddressInput = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
};

export type CreateOrderInput = {
  cartId: string;
  userId: string | null;
  email: string;
  phone: string;
  address: ShippingAddressInput;
  payment: PaymentChoice;
  couponCode?: string | null;
  customerNote?: string | null;
};

export type CreatedOrder = {
  id: string;
  orderNumber: string;
  total: number;
  payment: PaymentChoice;
};

function orderNumber(sequence: number, at = new Date()): string {
  const yy = String(at.getFullYear()).slice(2);
  const mm = String(at.getMonth() + 1).padStart(2, "0");
  const dd = String(at.getDate()).padStart(2, "0");
  return `CS-${yy}${mm}${dd}-${String(sequence).padStart(4, "0")}`;
}

function assertStock(lines: ServerCartLine[]) {
  for (const line of lines) {
    if (line.maxQty <= 0) {
      throw new ApiException("out_of_stock", `${line.title} has just sold out.`);
    }
    if (line.qty > line.maxQty) {
      throw new ApiException(
        "out_of_stock",
        line.maxQty === 1
          ? `Only one ${line.title} is left.`
          : `Only ${line.maxQty} of ${line.title} are left.`,
      );
    }
  }
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  // Re-priced from the database. Whatever the browser thought the total was is
  // irrelevant from here on.
  const lines = await readCartLines(input.cartId);
  if (lines.length === 0) {
    throw new ApiException("bad_request", "Your bag is empty.");
  }
  assertStock(lines);

  const settings = await getSettings();
  const totals = await computeTotals({
    lines,
    couponCode: input.couponCode,
    payment: input.payment,
    userId: input.userId,
  });

  const taxRate = settings.tax.gstEnabled ? settings.tax.ratePercent : 0;

  // Two attempts: the only expected collision is two orders on the same day
  // racing for the same sequence number.
  for (let attempt = 0; attempt < 3; attempt++) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    try {
      return await db.$transaction(async (tx) => {
        const todayCount = await tx.order.count({ where: { placedAt: { gte: startOfDay } } });
        const number = orderNumber(todayCount + 1 + attempt);

        const order = await tx.order.create({
          data: {
            orderNumber: number,
            userId: input.userId,
            email: input.email.toLowerCase().trim(),
            phone: input.phone,
            status: "PENDING",
            paymentStatus: input.payment === "COD" ? "COD_PENDING" : "PENDING",
            subtotal: totals.subtotal,
            discount: totals.discount,
            shippingFee: totals.shippingFee + totals.codFee,
            gstAmount: totals.gstAmount,
            total: totals.total,
            couponCode: totals.coupon?.code ?? null,
            shippingAddress: { ...input.address, country: input.address.country ?? "India" },
            customerNote: input.customerNote ?? null,
            items: {
              create: lines.map((line) => ({
                productId: line.productId,
                variantId: line.variantId,
                titleSnapshot: line.title,
                slugSnapshot: line.slug,
                imageSnapshot: line.image,
                variantLabel: line.variantLabel,
                sku: line.variantId ?? line.productId,
                unitPrice: line.unitPrice,
                qty: line.qty,
                lineTotal: line.unitPrice * line.qty,
                taxRate,
              })),
            },
          },
          select: { id: true, orderNumber: true, total: true },
        });

        // Stock down. A variant holds its own stock; a product without variants
        // holds it on the product row.
        for (const line of lines) {
          if (line.variantId) {
            await tx.productVariant.update({
              where: { id: line.variantId },
              data: { stock: { decrement: line.qty } },
            });
          } else {
            await tx.product.update({
              where: { id: line.productId },
              data: { stock: { decrement: line.qty } },
            });
          }
        }

        if (totals.coupon) {
          await tx.coupon.update({
            where: { id: totals.coupon.couponId },
            data: { usedCount: { increment: 1 } },
          });
          await tx.couponRedemption.create({
            data: {
              couponId: totals.coupon.couponId,
              orderId: order.id,
              userId: input.userId,
              amount: totals.discount,
            },
          });
        }

        // The bag is now an order. Emptying it here means a refresh cannot
        // place the same order twice.
        await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          payment: input.payment,
        };
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      const isNumberClash =
        code === "P2002" &&
        String((err as { meta?: { target?: string[] } }).meta?.target).includes("orderNumber");

      if (!isNumberClash || attempt === 2) throw err;
      // else: loop and try the next sequence number
    }
  }

  throw new ApiException("internal_error", "Could not place the order. Please try again.");
}

/**
 * Puts stock back and cancels an order that was never paid for.
 *
 * Called by the Razorpay webhook on `payment.failed`, and by the admin when an
 * order is cancelled. Idempotent: an order already CANCELLED is left alone, so
 * a webhook delivered twice cannot credit stock twice.
 */
export async function releaseOrder(orderId: string, reason: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        couponCode: true,
        items: { select: { productId: true, variantId: true, qty: true } },
      },
    });

    if (!order || order.status === "CANCELLED") return false;
    if (order.paymentStatus === "PAID") return false; // never unwind a paid order

    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.qty } },
        });
      } else if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
      }
    }

    const redemption = await tx.couponRedemption.findFirst({
      where: { orderId: order.id },
      select: { id: true, couponId: true },
    });
    if (redemption) {
      await tx.coupon.update({
        where: { id: redemption.couponId },
        data: { usedCount: { decrement: 1 } },
      });
      await tx.couponRedemption.delete({ where: { id: redemption.id } });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: order.paymentStatus === "PENDING" ? "FAILED" : order.paymentStatus,
        internalNote: reason,
      },
    });

    return true;
  });
}
