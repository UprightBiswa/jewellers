import { z } from "zod";
import type { NextRequest } from "next/server";

import { auth, isAdminRole } from "@/auth";
import { fail, forbidden, handleError, ok } from "@/lib/api/response";
import { isCrossSiteRequest } from "@/lib/api/csrf";
import { callerKey, rateLimit } from "@/lib/api/ratelimit";
import { getImageProvider } from "@/lib/images/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  folder: z.enum(["products", "categories", "collections", "reviews", "banners"]),
});

/**
 * POST /api/v1/admin/upload-sign
 *
 * Hands the browser a short-lived, scoped Cloudinary signature so the photo
 * goes straight from the phone to the CDN. Our server never receives the file,
 * which is what stops a 12 MP camera shot on a weak connection from timing out
 * a serverless function.
 */
export async function POST(req: NextRequest) {
  try {
    if (isCrossSiteRequest(req)) {
      return fail("forbidden", "This request did not come from the shop.");
    }

    const session = await auth();
    if (!session?.user || !isAdminRole(session.user.role)) throw forbidden();

    const limit = await rateLimit("upload", callerKey(req, session.user.id));
    if (!limit.success) {
      return fail("rate_limited", "Too many uploads at once. Wait a moment and try again.");
    }

    const { folder } = schema.parse(await req.json());
    const provider = getImageProvider();

    if (!provider.configured || provider.name !== "cloudinary") {
      return fail(
        "bad_request",
        "Image uploads are not set up yet. Add the Cloudinary keys to .env.local.",
      );
    }

    return ok(await provider.signUpload(folder));
  } catch (err) {
    return handleError(err);
  }
}
