import { IMAGE_PRESETS, type ImageTransform } from "./provider";
import { placeholderPhoto } from "./placeholders";
import { isCloudinaryCloudName } from "@/lib/integrations";

/**
 * Pure URL building — safe in a client component.
 *
 * This deliberately does NOT import the Cloudinary SDK. That SDK reaches for
 * `fs` and `path`, so a single import of it from a shared module drags Node
 * built-ins into every client bundle that renders a product image and the build
 * fails. Signing and uploading live in ./cloudinary.ts, which only ever runs on
 * the server; everything that just needs a `src=` uses this file.
 */

/**
 * The same shape check the server module makes. A placeholder value left in a
 * hosting dashboard would otherwise build real-looking Cloudinary URLs against a
 * cloud that does not exist, and every product image on the shop would be a
 * broken icon. An unusable name means placeholders, which at least look like a
 * shop.
 */
const rawCloudName = (
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? ""
).trim();

const cloudName = isCloudinaryCloudName(rawCloudName) ? rawCloudName : "";

const FIT_MAP: Record<NonNullable<ImageTransform["fit"]>, string> = {
  cover: "c_fill,g_auto",
  contain: "c_fit",
  pad: "c_pad",
};

export function buildTransform(t: ImageTransform = {}): string {
  const parts = [`f_${t.format ?? "auto"}`, `q_${t.quality ?? "auto"}`];

  if (t.width) parts.push(`w_${t.width}`);
  if (t.height) parts.push(`h_${t.height}`);
  if (t.fit) parts.push(FIT_MAP[t.fit]);
  if (t.background) parts.push(`b_${t.background.replace("#", "rgb:")}`);
  if (t.blur) parts.push(`e_blur:${t.blur}`);
  parts.push("dpr_auto");

  return parts.join(",");
}

/** Stand-in photography, used before Cloudinary is set up. See ./placeholders.ts. */
function placeholderUrl(publicId: string, transform?: ImageTransform): string {
  return placeholderPhoto(publicId, {
    width: transform?.width ?? 600,
    height: transform?.height ?? transform?.width ?? 600,
  });
}

export function cdnUrl(publicId: string, transform?: ImageTransform): string {
  // Absolute URLs (seed data, Google avatars) pass straight through.
  if (/^https?:\/\//.test(publicId)) return publicId;

  // Seeded rows carry ids like "demo/products/chhoto-jhumka-1", which exist in
  // no Cloudinary account. Without this, the day the keys are added every
  // product image turns into a 404 — the demo catalogue keeps its stand-in
  // photographs until Rahul uploads his own.
  if (publicId.startsWith("demo/")) return placeholderUrl(publicId, transform);

  if (!cloudName) return placeholderUrl(publicId, transform);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${buildTransform(transform)}/${publicId}`;
}

/** What components call. Missing ids fall back to a placeholder, never a 404. */
export function imageUrl(
  publicId: string | null | undefined,
  preset: keyof typeof IMAGE_PRESETS = "card",
): string {
  return cdnUrl(publicId || "placeholder", IMAGE_PRESETS[preset]);
}
