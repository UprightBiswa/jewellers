import { IMAGE_PRESETS, type ImageTransform } from "./provider";

/**
 * Pure URL building — safe in a client component.
 *
 * This deliberately does NOT import the Cloudinary SDK. That SDK reaches for
 * `fs` and `path`, so a single import of it from a shared module drags Node
 * built-ins into every client bundle that renders a product image and the build
 * fails. Signing and uploading live in ./cloudinary.ts, which only ever runs on
 * the server; everything that just needs a `src=` uses this file.
 */

const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? "";

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

/** A grey tile with the asset's name on it, used before Cloudinary is set up. */
function placeholderUrl(publicId: string, transform?: ImageTransform): string {
  const w = transform?.width ?? 600;
  const h = transform?.height ?? 600;
  const label = encodeURIComponent(publicId.split("/").pop() ?? "silver");
  return `https://placehold.co/${w}x${h}/eef0f3/6a717b/png?text=${label}`;
}

export function cdnUrl(publicId: string, transform?: ImageTransform): string {
  // Absolute URLs (seed data, Google avatars) pass straight through.
  if (/^https?:\/\//.test(publicId)) return publicId;
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
