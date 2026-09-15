import "server-only";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { computePrice } from "@/lib/pricing";
import { getMetalRate } from "@/lib/queries/catalog";
import { ApiException } from "@/lib/api/response";
import { databaseReachable } from "@/lib/demo/fallback";

const COOKIE = "cart_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export type ServerCartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  slug: string;
  title: string;
  variantLabel: string | null;
  image: string | null;
  unitPrice: number;
  qty: number;
  maxQty: number;
};

async function readSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/**
 * Finds the caller's cart, creating one only when asked to.
 *
 * A plain GET must not create rows — otherwise every crawler that touches the
 * site leaves an empty cart behind.
 */
export async function getCart(create = false) {
  // Preview mode has no bag: the cart is pure database state, so in development
  // without one we return empty rather than crashing on the first "Add".
  if (!(await databaseReachable())) {
    if (create) {
      throw new ApiException(
        "internal_error",
        "The bag needs a database. Connect one and run the migration — see the banner at the top of the page.",
      );
    }
    return null;
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;
  let sessionId = await readSessionId();

  if (userId) {
    const existing = await db.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, sessionId: true },
    });
    if (existing) return existing;
  }

  if (sessionId) {
    const existing = await db.cart.findUnique({
      where: { sessionId },
      select: { id: true, sessionId: true },
    });

    if (existing) {
      // Signing in adopts the guest cart rather than losing it.
      if (userId) {
        await db.cart.update({ where: { id: existing.id }, data: { userId } });
      }
      return existing;
    }
  }

  if (!create) return null;

  sessionId = sessionId ?? nanoid(24);
  const created = await db.cart.create({
    data: { sessionId, userId },
    select: { id: true, sessionId: true },
  });

  const jar = await cookies();
  jar.set(COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return created;
}

/** Re-prices every line against today's rate; never trusts the stored price. */
export async function readCartLines(cartId: string): Promise<ServerCartLine[]> {
  const [items, rate] = await Promise.all([
    db.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        qty: true,
        variantId: true,
        product: {
          select: {
            id: true, slug: true, title: true, price: true, priceMode: true, purity: true,
            weightG: true, makingCharge: true, makingChargePct: true, stock: true,
            status: true,
            images: { select: { publicId: true }, orderBy: { sortOrder: "asc" }, take: 1 },
          },
        },
        variant: { select: { id: true, label: true, stock: true, priceDelta: true } },
      },
    }),
    getMetalRate(),
  ]);

  return items
    .filter((i) => i.product.status === "ACTIVE")
    .map((i) => {
      const { total } = computePrice({
        priceMode: i.product.priceMode,
        price: i.product.price,
        purity: i.product.purity,
        weightG: i.product.weightG ? Number(i.product.weightG) : null,
        makingCharge: i.product.makingCharge,
        makingChargePct: i.product.makingChargePct ? Number(i.product.makingChargePct) : null,
        ratePerGram: rate,
        variantDelta: i.variant?.priceDelta ?? 0,
      });

      return {
        id: i.id,
        productId: i.product.id,
        variantId: i.variantId,
        slug: i.product.slug,
        title: i.product.title,
        variantLabel: i.variant?.label ?? null,
        image: i.product.images[0]?.publicId ?? null,
        unitPrice: total,
        qty: i.qty,
        maxQty: i.variant ? i.variant.stock : i.product.stock,
      };
    });
}

export async function addToCart(input: {
  productId: string;
  variantId?: string | null;
  qty: number;
}): Promise<ServerCartLine[]> {
  const cart = await getCart(true);
  if (!cart) throw new ApiException("internal_error", "Could not open a bag for you.");

  const product = await db.product.findFirst({
    where: { id: input.productId, status: "ACTIVE" },
    select: {
      id: true, stock: true,
      variants: { select: { id: true, stock: true } },
    },
  });
  if (!product) throw new ApiException("not_found", "That piece is no longer available.");

  const variant = input.variantId
    ? product.variants.find((v) => v.id === input.variantId)
    : null;

  if (input.variantId && !variant) {
    throw new ApiException("bad_request", "Please choose an available size.");
  }

  const available = variant ? variant.stock : product.stock;
  if (available < 1) {
    throw new ApiException("out_of_stock", "That piece just sold out.");
  }

  const existing = await db.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id, variantId: input.variantId ?? null },
    select: { id: true, qty: true },
  });

  const wanted = (existing?.qty ?? 0) + input.qty;
  if (wanted > available) {
    throw new ApiException(
      "out_of_stock",
      available === 1
        ? "Only one of these is left."
        : `Only ${available} of these are left.`,
    );
  }

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { qty: wanted } });
  } else {
    await db.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: input.variantId ?? null,
        qty: input.qty,
        unitPrice: 0, // recomputed on every read; kept for historical reference
      },
    });
  }

  await db.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  return readCartLines(cart.id);
}

export async function setCartQty(lineId: string, qty: number): Promise<ServerCartLine[]> {
  const cart = await getCart();
  if (!cart) return [];

  const item = await db.cartItem.findFirst({
    where: { id: lineId, cartId: cart.id },
    select: {
      id: true,
      product: { select: { stock: true } },
      variant: { select: { stock: true } },
    },
  });
  if (!item) throw new ApiException("not_found", "That item is no longer in your bag.");

  if (qty <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return readCartLines(cart.id);
  }

  const available = item.variant ? item.variant.stock : item.product.stock;
  if (qty > available) {
    throw new ApiException("out_of_stock", `Only ${available} left in stock.`);
  }

  await db.cartItem.update({ where: { id: item.id }, data: { qty } });
  return readCartLines(cart.id);
}

export async function removeCartLine(lineId: string): Promise<ServerCartLine[]> {
  const cart = await getCart();
  if (!cart) return [];

  await db.cartItem.deleteMany({ where: { id: lineId, cartId: cart.id } });
  return readCartLines(cart.id);
}

export async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
}
