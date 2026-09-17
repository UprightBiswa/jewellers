import { z } from "zod";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fail, handleError, ok } from "@/lib/api/response";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { getCart } from "@/lib/cart/server";
import { createOrder } from "@/lib/orders/create";
import { createRazorpayOrder, isConfigured, publicCheckoutConfig } from "@/lib/payments/razorpay";
import { INDIAN_STATES, PHONE_RE, PINCODE_RE } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const addressSchema = z.object({
  fullName: z.string().min(2, "Please enter the name for delivery.").max(80),
  phone: z.string().regex(PHONE_RE, "Enter a 10-digit Indian mobile number."),
  line1: z.string().min(4, "Enter the house and street.").max(160),
  line2: z.string().max(160).optional().nullable(),
  landmark: z.string().max(120).optional().nullable(),
  city: z.string().min(2, "Enter your town or city.").max(80),
  state: z.enum(INDIAN_STATES, { message: "Choose your state." }),
  pincode: z.string().regex(PINCODE_RE, "Enter a 6-digit pincode."),
});

const schema = z.object({
  email: z.string().email("We need an email to send the order confirmation."),
  address: addressSchema,
  /** Reuse a saved address instead of typing one */
  addressId: z.string().optional(),
  payment: z.enum(["ONLINE", "COD"]),
  couponCode: z.string().max(24).optional().nullable(),
  customerNote: z.string().max(500).optional().nullable(),
  saveAddress: z.boolean().default(false),
});

/**
 * POST /api/v1/orders — place an order.
 *
 * Guest checkout is allowed: a customer in Tufanganj should not have to create
 * an account to buy a pair of toe rings. Signing in is only needed for the
 * first-order discount and to see past orders, and the form says so.
 *
 * The response never contains a total the browser supplied — the amount handed
 * to Razorpay is the one computed on the server from the cart.
 */
export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimit("checkout", callerKey(req, "checkout"));
    if (!limit.success) {
      return fail("rate_limited", "Too many attempts. Wait a minute and try again.");
    }

    const input = schema.parse(await req.json());

    if (input.payment === "ONLINE" && !isConfigured) {
      return fail(
        "bad_request",
        "Online payment is not switched on yet. Please choose cash on delivery, or order on WhatsApp.",
      );
    }

    const cart = await getCart();
    if (!cart) return fail("bad_request", "Your bag is empty.");

    const session = await auth();
    const userId = session?.user?.id ?? null;

    const order = await createOrder({
      cartId: cart.id,
      userId,
      email: input.email,
      phone: input.address.phone,
      address: input.address,
      payment: input.payment,
      couponCode: input.couponCode,
      customerNote: input.customerNote,
    });

    // Saving the address is a convenience, never a reason to fail an order.
    if (userId && input.saveAddress && !input.addressId) {
      await db.address
        .create({
          data: {
            userId,
            fullName: input.address.fullName,
            phone: input.address.phone,
            line1: input.address.line1,
            line2: input.address.line2 ?? null,
            landmark: input.address.landmark ?? null,
            city: input.address.city,
            state: input.address.state,
            pincode: input.address.pincode,
          },
        })
        .catch(() => undefined);
    }

    if (order.payment === "COD") {
      return ok({
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        payment: "COD" as const,
      });
    }

    // Online: open a Razorpay order for exactly the server-computed amount.
    const rzp = await createRazorpayOrder({
      amount: order.total,
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await db.payment.create({
      data: {
        orderId: order.id,
        provider: "RAZORPAY",
        providerOrderId: rzp.id,
        amount: order.total,
        status: "PENDING",
      },
    });

    return ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      payment: "ONLINE" as const,
      razorpay: {
        orderId: rzp.id,
        amount: rzp.amount,
        currency: rzp.currency,
        keyId: publicCheckoutConfig().keyId,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
