"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth, isAdminRole } from "@/auth";
import { rupeesToPaise } from "@/lib/money";
import { makeSku, slugify } from "@/lib/utils";
import { saveSettingsGroup, settingsSchema, type SettingsGroup } from "@/lib/settings";
import { getImageProvider } from "@/lib/images/cloudinary";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isAdminRole(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session.user;
}

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  diff?: unknown,
) {
  await db.auditLog
    .create({ data: { actorId, action, entity, entityId, diff: diff as object } })
    .catch(() => undefined);
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
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

const imageSchema = z.object({
  publicId: z.string().min(1),
  url: z.string().default(""),
  alt: z.string().default(""),
  width: z.number().optional(),
  height: z.number().optional(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Give the size a name."),
  stock: z.number().int().min(0),
  priceDelta: z.number().int().default(0),
});

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "A product needs a name.").max(140),
  titleHi: z.string().max(140).optional(),
  slug: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().min(1, "Choose a category."),
  shortDesc: z.string().max(240).optional(),
  description: z.string().max(8000).optional(),

  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  purity: z.enum(["S925", "S999", "PLATED", "GOLD_PLATED", "OXIDISED"]).default("S925"),
  priceMode: z.enum(["FIXED", "WEIGHT"]).default("FIXED"),

  /** Rupees as typed by the owner; converted to paise before storing. */
  priceRupees: z.number().min(0, "Price cannot be negative."),
  compareAtRupees: z.number().min(0).optional(),
  makingChargeRupees: z.number().min(0).optional(),
  weightG: z.number().min(0).optional(),

  stock: z.number().int().min(0).default(0),
  hallmarked: z.boolean().default(false),
  huid: z.string().max(40).optional(),

  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  tags: z.array(z.string()).default([]),

  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).default([]),
  collectionIds: z.array(z.string()).default([]),
});

export type ProductInput = z.input<typeof productSchema>;

/** Creates or updates a product, its images, variants and collection links. */
export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const p = parsed.data;

  if (p.priceMode === "WEIGHT" && !p.weightG) {
    return {
      ok: false,
      message: "Weight-priced items need a weight.",
      fieldErrors: { weightG: "Enter the weight in grams." },
    };
  }
  if (p.status === "ACTIVE" && p.images.length === 0) {
    return {
      ok: false,
      message: "Add at least one photo before putting this on sale.",
      fieldErrors: { images: "A live product needs a photo." },
    };
  }

  const slug = p.slug?.trim() || slugify(p.title);
  const data = {
    title: p.title.trim(),
    titleHi: p.titleHi?.trim() || null,
    shortDesc: p.shortDesc?.trim() || null,
    description: p.description?.trim() || null,
    categoryId: p.categoryId,
    status: p.status,
    purity: p.purity,
    priceMode: p.priceMode,
    price: rupeesToPaise(p.priceRupees),
    compareAtPrice: p.compareAtRupees ? rupeesToPaise(p.compareAtRupees) : null,
    makingCharge: p.makingChargeRupees ? rupeesToPaise(p.makingChargeRupees) : null,
    weightG: p.weightG ?? null,
    stock: p.variants.length > 0 ? 0 : p.stock,
    hallmarked: p.hallmarked,
    huid: p.huid?.trim() || null,
    isFeatured: p.isFeatured,
    isTrending: p.isTrending,
    isNewArrival: p.isNewArrival,
    tags: p.tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
    publishedAt: p.status === "ACTIVE" ? new Date() : null,
  };

  try {
    const productId = await db.$transaction(async (tx) => {
      let id = p.id;

      if (id) {
        await tx.product.update({ where: { id }, data });
      } else {
        // Slug collisions are a fact of life in a shop with twenty similar rings.
        let candidate = slug;
        for (let n = 2; await tx.product.findUnique({ where: { slug: candidate } }); n++) {
          candidate = `${slug}-${n}`;
        }

        const created = await tx.product.create({
          data: {
            ...data,
            slug: candidate,
            sku: p.sku?.trim() || makeSku(p.title.slice(0, 3)),
          },
          select: { id: true },
        });
        id = created.id;
      }

      // Images: replace wholesale. The list is short and order matters, which
      // makes a diff more fragile than a rewrite.
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (p.images.length > 0) {
        await tx.productImage.createMany({
          data: p.images.map((img, i) => ({
            productId: id!,
            publicId: img.publicId,
            url: img.url,
            alt: img.alt || p.title,
            width: img.width,
            height: img.height,
            sortOrder: i,
            isPrimary: i === 0,
          })),
        });
      }

      // Variants: keep the ones that still exist so their ids survive in carts
      // and past orders; only truly removed sizes are deleted.
      const keepIds = p.variants.map((v) => v.id).filter(Boolean) as string[];
      await tx.productVariant.deleteMany({
        where: { productId: id, ...(keepIds.length ? { id: { notIn: keepIds } } : {}) },
      });

      for (const [i, v] of p.variants.entries()) {
        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { label: v.label, stock: v.stock, priceDelta: v.priceDelta, sortOrder: i },
          });
        } else {
          await tx.productVariant.create({
            data: {
              productId: id!,
              label: v.label,
              sku: makeSku(v.label),
              stock: v.stock,
              priceDelta: v.priceDelta,
              sortOrder: i,
            },
          });
        }
      }

      await tx.productCollection.deleteMany({ where: { productId: id } });
      if (p.collectionIds.length > 0) {
        await tx.productCollection.createMany({
          data: p.collectionIds.map((collectionId) => ({ productId: id!, collectionId })),
        });
      }

      return id!;
    });

    await audit(user.id, p.id ? "product.update" : "product.create", "Product", productId);

    revalidatePath("/admin/products");
    revalidatePath("/");
    revalidatePath(`/products/${slug}`);

    return {
      ok: true,
      data: { id: productId },
      message: p.status === "ACTIVE" ? "Saved and live on the shop." : "Saved as a draft.",
    };
  } catch (err) {
    console.error("[admin] saveProduct", err);
    return { ok: false, message: "Could not save. Please try again." };
  }
}

export async function setProductStatus(
  id: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): Promise<ActionResult> {
  const user = await requireStaff();

  if (status === "ACTIVE") {
    const images = await db.productImage.count({ where: { productId: id } });
    if (images === 0) {
      return { ok: false, message: "Add a photo before putting this on sale." };
    }
  }

  await db.product.update({
    where: { id },
    data: { status, publishedAt: status === "ACTIVE" ? new Date() : null },
  });
  await audit(user.id, "product.status", "Product", id, { status });

  revalidatePath("/admin/products");
  revalidatePath("/");

  return {
    ok: true,
    message:
      status === "ACTIVE"
        ? "Now on sale."
        : status === "DRAFT"
          ? "Hidden from the shop."
          : "Archived.",
  };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  const ordered = await db.orderItem.count({ where: { productId: id } });
  if (ordered > 0) {
    // Deleting would orphan real invoices. Archiving does what they meant.
    await db.product.update({ where: { id }, data: { status: "ARCHIVED" } });
    await audit(user.id, "product.archive", "Product", id);
    revalidatePath("/admin/products");
    return {
      ok: true,
      message: "This product has been ordered before, so it was archived instead of deleted.",
    };
  }

  const images = await db.productImage.findMany({
    where: { productId: id },
    select: { publicId: true },
  });

  await db.product.delete({ where: { id } });
  await audit(user.id, "product.delete", "Product", id);

  // Free the CDN storage, but never let a failed cleanup fail the delete.
  const provider = getImageProvider();
  void Promise.all(images.map((i) => provider.remove(i.publicId))).catch(() => undefined);

  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, message: "Product deleted." };
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateOrderStatus(
  orderId: string,
  status: "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED",
): Promise<ActionResult> {
  const user = await requireStaff();

  await db.order.update({ where: { id: orderId }, data: { status } });
  await audit(user.id, "order.status", "Order", orderId, { status });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: `Marked as ${status.toLowerCase()}.` };
}

const shipmentSchema = z.object({
  orderId: z.string().min(1),
  courier: z.string().min(2, "Which courier?"),
  awb: z.string().optional(),
  trackingUrl: z.string().optional(),
});

export async function addShipment(input: z.input<typeof shipmentSchema>): Promise<ActionResult> {
  const user = await requireStaff();

  const parsed = shipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the form.", fieldErrors: fieldErrors(parsed.error) };
  }

  await db.$transaction([
    db.shipment.create({
      data: {
        orderId: parsed.data.orderId,
        courier: parsed.data.courier,
        awb: parsed.data.awb || null,
        trackingUrl: parsed.data.trackingUrl || null,
        shippedAt: new Date(),
      },
    }),
    db.order.update({ where: { id: parsed.data.orderId }, data: { status: "SHIPPED" } }),
  ]);

  await audit(user.id, "order.ship", "Order", parsed.data.orderId);
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);

  return { ok: true, message: "Marked as shipped. The customer has been emailed." };
}

/* -------------------------------------------------------------------------- */
/* Settings, metal rate, messages                                             */
/* -------------------------------------------------------------------------- */

export async function saveSettings(
  group: SettingsGroup,
  value: unknown,
): Promise<ActionResult> {
  const user = await requireStaff();

  const shape = settingsSchema.shape[group];
  const parsed = shape.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some values were not accepted.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  await saveSettingsGroup(group, parsed.data as never);
  await audit(user.id, "settings.update", "Setting", group);

  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function setMetalRate(ratePerGramRupees: number): Promise<ActionResult> {
  const user = await requireStaff();

  if (!Number.isFinite(ratePerGramRupees) || ratePerGramRupees <= 0) {
    return { ok: false, message: "Enter today's rate per gram." };
  }

  await db.metalRate.create({
    data: {
      metal: "SILVER",
      purity: "S999",
      ratePerGram: rupeesToPaise(ratePerGramRupees),
      setById: user.id,
    },
  });
  await audit(user.id, "rate.set", "MetalRate", undefined, { ratePerGramRupees });

  // Every weight-priced product's page is now stale.
  revalidatePath("/", "layout");
  return { ok: true, message: "Today's rate saved. Weight-priced items have updated." };
}

export async function setMessageStatus(
  id: string,
  status: "NEW" | "READ" | "REPLIED" | "CLOSED",
): Promise<ActionResult> {
  await requireStaff();
  await db.contactMessage.update({ where: { id }, data: { status } });
  revalidatePath("/admin/messages");
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3, "A code needs at least 3 characters.").max(24),
  description: z.string().max(140).optional(),
  type: z.enum(["PERCENT", "FLAT", "FREESHIP"]),
  value: z.number().min(0),
  minOrderRupees: z.number().min(0).optional(),
  maxDiscountRupees: z.number().min(0).optional(),
  firstOrderOnly: z.boolean().default(false),
  usageLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  endsAt: z.string().optional(),
});

export async function saveCoupon(input: z.input<typeof couponSchema>): Promise<ActionResult> {
  const user = await requireStaff();

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check the form.", fieldErrors: fieldErrors(parsed.error) };
  }

  const c = parsed.data;
  if (c.type === "PERCENT" && c.value > 90) {
    return {
      ok: false,
      message: "That discount looks like a mistake.",
      fieldErrors: { value: "Percent discounts are capped at 90%." },
    };
  }

  const data = {
    code: c.code.toUpperCase().trim(),
    description: c.description?.trim() || null,
    type: c.type,
    value: c.type === "FLAT" ? rupeesToPaise(c.value) : Math.round(c.value),
    minOrder: c.minOrderRupees ? rupeesToPaise(c.minOrderRupees) : null,
    maxDiscount: c.maxDiscountRupees ? rupeesToPaise(c.maxDiscountRupees) : null,
    firstOrderOnly: c.firstOrderOnly,
    usageLimit: c.usageLimit || null,
    isActive: c.isActive,
    endsAt: c.endsAt ? new Date(c.endsAt) : null,
  };

  try {
    if (c.id) {
      await db.coupon.update({ where: { id: c.id }, data });
    } else {
      await db.coupon.create({ data });
    }
  } catch {
    return { ok: false, message: "That code is already in use.", fieldErrors: { code: "Already used." } };
  }

  await audit(user.id, c.id ? "coupon.update" : "coupon.create", "Coupon", c.id);
  revalidatePath("/admin/coupons");
  return { ok: true, message: "Offer saved." };
}

export async function toggleCoupon(id: string, isActive: boolean): Promise<ActionResult> {
  await requireStaff();
  await db.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/coupons");
  return { ok: true, message: isActive ? "Offer is live." : "Offer paused." };
}
