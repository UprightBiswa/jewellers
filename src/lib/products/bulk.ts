import { z } from "zod";

import { db } from "@/lib/db";

/**
 * Acting on many products at once.
 *
 * Apart from the server actions in src/app/admin/actions.ts so it can be run
 * against a real database from a script. Bulk delete is the most destructive
 * thing in the panel — it should not be a button whose behaviour nobody has
 * checked outside a browser.
 */

export type BulkResult<T> =
  | { ok: true; data: T; message: string }
  | { ok: false; message: string };

async function audit(actorId: string, action: string, entity: string, diff?: unknown) {
  await db.auditLog
    .create({ data: { actorId, action, entity, diff: diff as object } })
    .catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/* Products in bulk                                                           */
/* -------------------------------------------------------------------------- */

const MAX_AT_ONCE = 200;
const idsSchema = z.array(z.string().min(1)).min(1).max(MAX_AT_ONCE);

/**
 * One message per cause. "Select at least one product" in answer to selecting
 * three hundred is worse than no message — it sends the owner looking for a
 * problem that is not there.
 */
function checkIds(ids: string[]): string | null {
  if (!Array.isArray(ids) || ids.length === 0) return "Select at least one product.";
  if (ids.length > MAX_AT_ONCE) {
    return `That is ${ids.length} products. Do at most ${MAX_AT_ONCE} at a time — filter the list first.`;
  }
  return idsSchema.safeParse(ids).success ? null : "Some of those products could not be read.";
}

/**
 * Publish, unpublish or archive several products at once.
 *
 * A product with no photograph still cannot go on sale — the same rule the
 * single-product action enforces. Those are reported by name rather than
 * skipped quietly, because "I selected twelve and only nine went live" with no
 * explanation is how someone stops trusting the button.
 */
export async function bulkSetStatus(
  ids: string[],
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
  actorId: string,
): Promise<BulkResult<{ changed: number; blocked: string[] }>> {
  const problem = checkIds(ids);
  if (problem) return { ok: false, message: problem };

  let allowed = ids;
  const blocked: string[] = [];

  if (status === "ACTIVE") {
    const withPhotos = await db.product.findMany({
      where: { id: { in: allowed }, images: { some: {} } },
      select: { id: true },
    });
    const okIds = new Set(withPhotos.map((p) => p.id));

    const missing = await db.product.findMany({
      where: { id: { in: allowed.filter((id) => !okIds.has(id)) } },
      select: { title: true },
    });
    blocked.push(...missing.map((p) => p.title));
    allowed = allowed.filter((id) => okIds.has(id));
  }

  if (allowed.length === 0) {
    return {
      ok: false,
      message:
        blocked.length > 0
          ? `Nothing went on sale — these have no photo yet: ${blocked.join(", ")}`
          : "Nothing to change.",
    };
  }

  const { count } = await db.product.updateMany({
    where: { id: { in: allowed } },
    data: { status, publishedAt: status === "ACTIVE" ? new Date() : null },
  });

  await audit(actorId, "product.bulkStatus", "Product", { status, count });


  const verb = status === "ACTIVE" ? "on sale" : status === "DRAFT" ? "moved to drafts" : "archived";
  return {
    ok: true,
    data: { changed: count, blocked },
    message:
      blocked.length > 0
        ? `${count} ${verb}. These need a photo first: ${blocked.join(", ")}`
        : `${count} product${count === 1 ? "" : "s"} ${verb}.`,
  };
}

/**
 * Delete several products.
 *
 * Anything that has ever been ordered is archived instead — deleting it would
 * orphan a line on a real invoice. The caller is told how many went each way, so
 * "I deleted twenty and twenty-three are still listed" is never a mystery.
 */
export async function bulkDelete(
  ids: string[],
  actorId: string,
): Promise<BulkResult<{ deleted: number; archived: number }>> {
  const problem = checkIds(ids);
  if (problem) return { ok: false, message: problem };

  const ordered = await db.orderItem.findMany({
    where: { productId: { in: ids } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const keep = new Set(ordered.map((o) => o.productId).filter(Boolean) as string[]);

  const removable = ids.filter((id) => !keep.has(id));

  let archived = 0;
  if (keep.size > 0) {
    const res = await db.product.updateMany({
      where: { id: { in: [...keep] } },
      data: { status: "ARCHIVED" },
    });
    archived = res.count;
  }

  let deleted = 0;
  if (removable.length > 0) {
    const images = await db.productImage.findMany({
      where: { productId: { in: removable } },
      select: { publicId: true },
    });

    const res = await db.product.deleteMany({ where: { id: { in: removable } } });
    deleted = res.count;

    // Free the CDN storage, but never let a failed cleanup fail the delete.
    //
    // Imported here rather than at the top of the file: lib/images/cloudinary is
    // behind `server-only`, which throws the moment it is loaded outside Next —
    // and that would make this module impossible to run from a test script. The
    // catch covers both that and a Cloudinary outage.
    void import("@/lib/images/cloudinary")
      .then(({ getImageProvider }) => {
        const provider = getImageProvider();
        return Promise.all(images.map((i) => provider.remove(i.publicId)));
      })
      .catch(() => undefined);
  }

  await audit(actorId, "product.bulkDelete", "Product", { deleted, archived });


  return {
    ok: true,
    data: { deleted, archived },
    message:
      archived > 0
        ? `${deleted} deleted. ${archived} had been ordered before, so ${archived === 1 ? "it was" : "they were"} archived instead.`
        : `${deleted} product${deleted === 1 ? "" : "s"} deleted.`,
  };
}
