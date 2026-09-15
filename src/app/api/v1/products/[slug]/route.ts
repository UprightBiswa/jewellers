import type { NextRequest } from "next/server";

import { handleError, notFound, ok } from "@/lib/api/response";
import { getProductBySlug, getRelated } from "@/lib/queries/catalog";

export const runtime = "nodejs";

/** GET /api/v1/products/:slug — full detail plus four related pieces. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) throw notFound("That product");

    const related = await getRelated(product.id, product.category.id, 4);

    return ok({
      product: {
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        title: product.title,
        titleHi: product.titleHi,
        shortDesc: product.shortDesc,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        priceBreakdown: product.breakdown,
        purity: product.purity,
        weightG: product.weightG,
        hallmarked: product.hallmarked,
        huid: product.huid,
        tags: product.tags,
        category: product.category,
        images: product.images,
        variants: product.variants,
        rating: { average: product.ratingAvg, count: product.ratingCount },
      },
      related,
    });
  } catch (err) {
    return handleError(err);
  }
}
