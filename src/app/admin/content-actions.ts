"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { canOpenPanel } from "@/auth.config";
import { slugify } from "@/lib/utils";

/**
 * The parts of the shop Rahul owns: what things are called, how they are
 * grouped, what the policy pages say, and which reviews are visible.
 *
 * Every model here already existed — Category, Collection, Page and Review have
 * been in the schema since the first migration. What was missing was any way for
 * the owner to touch them, which meant a category could only be renamed by a
 * developer and a review could never be approved at all.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canOpenPanel(session.user)) throw new Error("FORBIDDEN");
  return session.user;
}

async function audit(actorId: string, action: string, entity: string, entityId?: string, diff?: unknown) {
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

/** A slug nobody else is using, by adding -2, -3 … when needed. */
async function freeSlug(
  table: "category" | "collection" | "page",
  desired: string,
  ignoreId?: string,
): Promise<string> {
  const base = slugify(desired) || "item";
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const existing =
      table === "category"
        ? await db.category.findUnique({ where: { slug: candidate }, select: { id: true } })
        : table === "collection"
          ? await db.collection.findUnique({ where: { slug: candidate }, select: { id: true } })
          : await db.page.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing || existing.id === ignoreId) return candidate;
  }
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Give the category a name.").max(60),
  nameBn: z.string().max(60).optional(),
  description: z.string().max(500).optional(),
  imagePublicId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.input<typeof categorySchema>;

export async function saveCategory(input: CategoryInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const c = parsed.data;
  const data = {
    name: c.name.trim(),
    nameBn: c.nameBn?.trim() || null,
    description: c.description?.trim() || null,
    imagePublicId: c.imagePublicId?.trim() || null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };

  // The slug is left alone once it exists. It is in every link Google has
  // indexed and in any address a customer saved, so renaming "Payel" to
  // "Anklets" must not break /categories/payel.
  const saved = c.id
    ? await db.category.update({ where: { id: c.id }, data, select: { id: true } })
    : await db.category.create({
        data: { ...data, slug: await freeSlug("category", c.name) },
        select: { id: true },
      });

  await audit(user.id, c.id ? "category.update" : "category.create", "Category", saved.id, data);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true, data: { id: saved.id }, message: c.id ? "Category saved." : "Category added." };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  // A category holding products cannot go: every one of them would lose the
  // field the shop groups by. Hiding it does what was meant.
  const products = await db.product.count({ where: { categoryId: id } });
  if (products > 0) {
    await db.category.update({ where: { id }, data: { isActive: false } });
    await audit(user.id, "category.hide", "Category", id);
    revalidatePath("/admin/categories");
    revalidatePath("/");
    return {
      ok: true,
      message: `${products} ${products === 1 ? "piece is" : "pieces are"} in this category, so it was hidden from the shop instead of deleted.`,
    };
  }

  await db.category.delete({ where: { id } });
  await audit(user.id, "category.delete", "Category", id);

  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { ok: true, message: "Category deleted." };
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Give the collection a name.").max(60),
  subtitle: z.string().max(160).optional(),
  bannerPublicId: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CollectionInput = z.input<typeof collectionSchema>;

export async function saveCollection(input: CollectionInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();

  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const c = parsed.data;
  const data = {
    name: c.name.trim(),
    subtitle: c.subtitle?.trim() || null,
    bannerPublicId: c.bannerPublicId?.trim() || null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };

  const saved = c.id
    ? await db.collection.update({ where: { id: c.id }, data, select: { id: true } })
    : await db.collection.create({
        data: { ...data, slug: await freeSlug("collection", c.name) },
        select: { id: true },
      });

  await audit(user.id, c.id ? "collection.update" : "collection.create", "Collection", saved.id, data);

  revalidatePath("/admin/collections");
  revalidatePath("/");
  return { ok: true, data: { id: saved.id }, message: c.id ? "Collection saved." : "Collection added." };
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  // Unlike a category, a collection is only a grouping — a product belongs to
  // one without depending on it, so removing it takes nothing away.
  await db.productCollection.deleteMany({ where: { collectionId: id } });
  await db.collection.delete({ where: { id } });
  await audit(user.id, "collection.delete", "Collection", id);

  revalidatePath("/admin/collections");
  revalidatePath("/");
  return { ok: true, message: "Collection deleted. The pieces in it are untouched." };
}

/* -------------------------------------------------------------------------- */
/* Reviews                                                                    */
/* -------------------------------------------------------------------------- */

export async function setReviewStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
): Promise<ActionResult> {
  const user = await requireStaff();

  const review = await db.review.update({
    where: { id },
    data: { status },
    select: { product: { select: { slug: true } } },
  });

  await audit(user.id, "review.status", "Review", id, { status });

  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${review.product.slug}`);

  return {
    ok: true,
    message:
      status === "APPROVED"
        ? "Review is now on the shop."
        : status === "REJECTED"
          ? "Review hidden. The customer is not told."
          : "Review put back to waiting.",
  };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  const review = await db.review.delete({
    where: { id },
    select: { product: { select: { slug: true } } },
  });
  await audit(user.id, "review.delete", "Review", id);

  revalidatePath("/admin/reviews");
  revalidatePath(`/products/${review.product.slug}`);
  return { ok: true, message: "Review deleted for good." };
}

/* -------------------------------------------------------------------------- */
/* Pages                                                                      */
/* -------------------------------------------------------------------------- */

const pageSchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  title: z.string().min(2, "Give the page a title.").max(120),
  bodyMd: z.string().min(1, "The page cannot be empty.").max(40000),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(300).optional(),
  isPublished: z.boolean().default(true),
});

export type PageInput = z.input<typeof pageSchema>;

export async function savePage(input: PageInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const p = parsed.data;
  const data = {
    title: p.title.trim(),
    bodyMd: p.bodyMd,
    metaTitle: p.metaTitle?.trim() || null,
    metaDescription: p.metaDescription?.trim() || null,
    isPublished: p.isPublished,
  };

  const saved = p.id
    ? await db.page.update({ where: { id: p.id }, data, select: { id: true, slug: true } })
    : await db.page.create({
        data: { ...data, slug: await freeSlug("page", p.slug || p.title) },
        select: { id: true, slug: true },
      });

  await audit(user.id, p.id ? "page.update" : "page.create", "Page", saved.id, { title: data.title });

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${saved.slug}`);
  revalidatePath("/");
  return { ok: true, data: { id: saved.id }, message: "Page saved. It is live on the shop now." };
}

export async function deletePage(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  const page = await db.page.delete({ where: { id }, select: { slug: true } });
  await audit(user.id, "page.delete", "Page", id);

  revalidatePath("/admin/pages");
  revalidatePath(`/pages/${page.slug}`);
  return { ok: true, message: "Page deleted." };
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Turning an account off rather than deleting it.
 *
 * Deleting a customer would take their orders with them — Order.userId is set
 * null, but the addresses and the history stop making sense. Disabling stops the
 * sign-in and leaves the record whole.
 */
export async function setCustomerActive(id: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireStaff();

  const target = await db.user.findUnique({ where: { id }, select: { role: true, email: true } });
  if (!target) return { ok: false, message: "That account no longer exists." };

  // An owner must never be locked out of the panel from the customers screen.
  if (target.role === "OWNER") {
    return { ok: false, message: "This is the owner's account. It cannot be disabled here." };
  }

  await db.user.update({ where: { id }, data: { isActive } });
  await audit(user.id, isActive ? "customer.enable" : "customer.disable", "User", id);

  revalidatePath("/admin/customers");
  return {
    ok: true,
    message: isActive ? `${target.email} can sign in again.` : `${target.email} can no longer sign in.`,
  };
}

/* -------------------------------------------------------------------------- */
/* Homepage — hero slides                                                     */
/* -------------------------------------------------------------------------- */

const slideSchema = z.object({
  id: z.string().optional(),
  eyebrow: z.string().max(60).optional(),
  title: z.string().min(2, "The slide needs a headline.").max(80),
  titleAccent: z.string().max(80).optional(),
  body: z.string().max(400).optional(),
  ctaLabel: z.string().min(1, "The button needs words on it.").max(40),
  ctaHref: z.string().min(1, "Where should the button go?").max(200),
  secondaryLabel: z.string().max(40).optional(),
  secondaryHref: z.string().max(200).optional(),
  imagePublicId: z.string().min(1, "A slide needs a photo."),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type SlideInput = z.input<typeof slideSchema>;

export async function saveHeroSlide(input: SlideInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireStaff();

  const parsed = slideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const v = parsed.data;
  const data = {
    eyebrow: v.eyebrow?.trim() || null,
    title: v.title.trim(),
    titleAccent: v.titleAccent?.trim() || null,
    body: v.body?.trim() || null,
    ctaLabel: v.ctaLabel.trim(),
    ctaHref: v.ctaHref.trim(),
    secondaryLabel: v.secondaryLabel?.trim() || null,
    secondaryHref: v.secondaryHref?.trim() || null,
    imagePublicId: v.imagePublicId.trim(),
    sortOrder: v.sortOrder,
    isActive: v.isActive,
  };

  const saved = v.id
    ? await db.heroSlide.update({ where: { id: v.id }, data, select: { id: true } })
    : await db.heroSlide.create({ data, select: { id: true } });

  await audit(user.id, v.id ? "hero.update" : "hero.create", "HeroSlide", saved.id, {
    title: data.title,
  });

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, data: { id: saved.id }, message: "Saved. The front page has it now." };
}

export async function deleteHeroSlide(id: string): Promise<ActionResult> {
  const user = await requireStaff();

  await db.heroSlide.delete({ where: { id } });
  await audit(user.id, "hero.delete", "HeroSlide", id);

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, message: "Slide removed." };
}

/** Moves a slide one place up or down, by swapping its order with its neighbour. */
export async function moveHeroSlide(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireStaff();

  const all = await db.heroSlide.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  const i = all.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= all.length) {
    return { ok: false, message: "It is already at the end." };
  }

  // Written as a pair so a half-applied swap cannot leave two slides fighting
  // over the same position.
  await db.$transaction([
    db.heroSlide.update({ where: { id: all[i].id }, data: { sortOrder: all[j].sortOrder } }),
    db.heroSlide.update({ where: { id: all[j].id }, data: { sortOrder: all[i].sortOrder } }),
  ]);

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return { ok: true, message: "Moved." };
}
