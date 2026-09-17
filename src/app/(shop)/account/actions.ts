"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { INDIAN_STATES, PHONE_RE, PINCODE_RE } from "@/lib/utils";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHENTICATED");
  return session.user.id;
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

const profileSchema = z.object({
  name: z.string().min(2, "Please enter your name.").max(80),
  phone: z
    .string()
    .refine((v) => !v || PHONE_RE.test(v), "That phone number does not look right.")
    .optional(),
});

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, message: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  }

  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name.trim(), phone: parsed.data.phone || null },
  });

  revalidatePath("/account");
  return { ok: true, message: "Saved." };
}

/* -------------------------------------------------------------------------- */
/* Addresses                                                                  */
/* -------------------------------------------------------------------------- */

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().max(24).default("Home"),
  fullName: z.string().min(2, "Who is it for?").max(80),
  phone: z.string().regex(PHONE_RE, "Enter a 10-digit Indian mobile number."),
  line1: z.string().min(4, "Enter the house and street.").max(160),
  line2: z.string().max(160).optional(),
  landmark: z.string().max(120).optional(),
  city: z.string().min(2, "Enter your town or city.").max(80),
  state: z.enum(INDIAN_STATES, { message: "Choose your state." }),
  pincode: z.string().regex(PINCODE_RE, "Enter a 6-digit pincode."),
  isDefault: z.boolean().default(false),
});

export async function saveAddress(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userId = await requireUserId();

  const parsed = addressSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label") || "Home",
    fullName: formData.get("fullName"),
    phone: String(formData.get("phone") ?? "").replace(/\D/g, "").slice(-10),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    landmark: formData.get("landmark") || undefined,
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { id, isDefault, ...data } = parsed.data;

  await db.$transaction(async (tx) => {
    // Exactly one default. Clearing the others first keeps that true even if
    // two tabs save at once.
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    if (id) {
      // Scoped by userId as well as id: an address id from someone else's
      // account must not be editable by guessing it.
      const owned = await tx.address.findFirst({ where: { id, userId }, select: { id: true } });
      if (!owned) throw new Error("NOT_FOUND");
      await tx.address.update({ where: { id }, data: { ...data, isDefault } });
    } else {
      const count = await tx.address.count({ where: { userId } });
      await tx.address.create({
        data: { ...data, userId, isDefault: isDefault || count === 0 },
      });
    }
  });

  revalidatePath("/account/addresses");
  return { ok: true, message: id ? "Address updated." : "Address saved." };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const address = await db.address.findFirst({
    where: { id, userId },
    select: { id: true, isDefault: true },
  });
  if (!address) return { ok: false, message: "That address is already gone." };

  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });

    // Never leave an account with addresses but no default.
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });

  revalidatePath("/account/addresses");
  return { ok: true, message: "Address removed." };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const userId = await requireUserId();

  const owned = await db.address.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return { ok: false, message: "That address is no longer there." };

  await db.$transaction([
    db.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/account/addresses");
  return { ok: true, message: "Default address changed." };
}

/* -------------------------------------------------------------------------- */
/* Wishlist                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Add or remove in one call, returning the resulting state.
 *
 * The heart on a product card has no idea whether the piece is already saved
 * until the server says so, and a toggle keeps that from needing two round
 * trips or a stale-state bug.
 */
export async function toggleWishlist(
  productId: string,
): Promise<{ ok: true; saved: boolean } | { ok: false; message: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Sign in to save pieces for later." };
  }
  const userId = session.user.id;

  const existing = await db.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/account/wishlist");
    return { ok: true, saved: false };
  }

  const product = await db.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!product) return { ok: false, message: "That piece is no longer available." };

  await db.wishlistItem.create({ data: { userId, productId } });
  revalidatePath("/account/wishlist");
  return { ok: true, saved: true };
}
