import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api/response";
import { features } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/health
 *
 * Deliberately reports which integrations are configured, but never any value.
 * Point an uptime monitor at this; a 503 means the database is unreachable,
 * which is the only failure that takes the shop down.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    // Not $queryRaw — see lib/demo/fallback.ts: the raw path throws
    // asynchronously when the server is unreachable, which no catch here sees.
    await db.setting.findFirst({ select: { key: true } });

    return ok({
      status: "ok",
      databaseLatencyMs: Date.now() - startedAt,
      integrations: {
        googleAuth: features.googleAuth,
        cloudinary: features.cloudinary,
        razorpay: features.razorpay,
        email: features.email,
        redis: features.redis,
      },
      time: new Date().toISOString(),
    });
  } catch {
    return fail("internal_error", "Database unreachable.", undefined, { status: 503 });
  }
}
