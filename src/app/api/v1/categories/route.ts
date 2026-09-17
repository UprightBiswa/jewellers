import { handleError, ok } from "@/lib/api/response";
import { listCategories, listCollections } from "@/lib/queries/catalog";

export const runtime = "nodejs";
export const revalidate = 300;

/** GET /api/v1/categories — the full navigation tree, with live product counts. */
export async function GET() {
  try {
    const [categories, collections] = await Promise.all([
      listCategories(),
      listCollections(),
    ]);

    return ok({
      categories: categories.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameBn: c.nameBn,
        image: c.imagePublicId,
        productCount: c._count.products,
      })),
      collections,
    });
  } catch (err) {
    return handleError(err);
  }
}
