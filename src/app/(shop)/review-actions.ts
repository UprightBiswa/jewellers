"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/auth";

/**
 * Writing a review.
 *
 * Two rules, and both matter more to a shop this size than to a large one.
 *
 * You must have bought the piece. Charubala has a few hundred customers, so a
 * handful of invented reviews would be a large share of the total and the
 * ratings would stop meaning anything. The order is looked up rather than
 * trusted from the form.
 *
 * And nothing appears until Rahul allows it. Reviews arrive as PENDING and wait
 * on /admin/reviews. The customer is told that plainly — a review that seems to
 * vanish is worse than one that is honestly held.
 */

export type ReviewResult =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  title: z.string().trim().max(80).optional(),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a little more — a sentence is plenty.")
    .max(2000, "That is longer than we can store. Please shorten it."),
});

export async function submitReview(_prev: unknown, formData: FormData): Promise<ReviewResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Please sign in first — it takes a moment." };
  }

  const parsed = schema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title") || undefined,
    body: formData.get("body"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Please check what you have written.", fieldErrors };
  }

  const { productId, rating, title, body } = parsed.data;
  const userId = session.user.id;

  // Bought it? Any order that is not cancelled counts, including one still on
  // its way — somebody who has the parcel in hand may well want to say so
  // before it is marked delivered.
  const bought = await db.orderItem.count({
    where: {
      productId,
      order: { userId, status: { not: "CANCELLED" } },
    },
  });

  if (bought === 0) {
    return {
      ok: false,
      message: "Reviews are for pieces you have bought, so the ratings here mean something.",
    };
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  if (!product) return { ok: false, message: "That piece is no longer in the shop." };

  // One per person per piece — the schema enforces it too. Writing again
  // replaces what was said rather than failing, which is what someone who
  // changed their mind expects.
  await db.review.upsert({
    where: { productId_userId: { productId, userId } },
    create: { productId, userId, rating, title: title || null, body, status: "PENDING" },
    update: { rating, title: title || null, body, status: "PENDING" },
  });

  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin/reviews");

  return {
    ok: true,
    message: "Thank you. We read every one — it will appear on the piece once we have.",
  };
}

/** What the product page needs to decide which form, if any, to show. */
export async function reviewEligibility(productId: string): Promise<{
  signedIn: boolean;
  bought: boolean;
  existing: { rating: number; title: string | null; body: string; status: string } | null;
}> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return { signedIn: false, bought: false, existing: null };

  const [bought, existing] = await Promise.all([
    db.orderItem.count({
      where: { productId, order: { userId, status: { not: "CANCELLED" } } },
    }),
    db.review.findUnique({
      where: { productId_userId: { productId, userId } },
      select: { rating: true, title: true, body: true, status: true },
    }),
  ]);

  return { signedIn: true, bought: bought > 0, existing };
}
