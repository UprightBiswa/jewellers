"use client";

/**
 * Serve images straight from the CDN that already has them.
 *
 * Without this, `next/image` routes every photo through Vercel's own optimizer —
 * so a picture Cloudinary has already resized, re-encoded and cached gets fetched
 * and processed a second time. That is slower for the customer and it burns
 * Vercel's image-transformation quota, which is the one line item most likely to
 * push this shop off a free or cheap plan.
 *
 * With this loader, Vercel does zero image work: the browser asks Cloudinary for
 * the exact width it needs and Cloudinary answers from its edge.
 *
 * Anything that is not a CDN we recognise is returned untouched, so Google
 * avatars and any absolute URL still load.
 */

type LoaderArgs = { src: string; width: number; quality?: number };

const CLOUDINARY_MARKER = "/image/upload/";

/** `v1712345678` — a Cloudinary version, not a transformation. */
const isVersion = (segment: string) => /^v\d+$/.test(segment);

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  // --- Cloudinary ----------------------------------------------------------
  const at = src.indexOf(CLOUDINARY_MARKER);
  if (at !== -1) {
    const head = src.slice(0, at + CLOUDINARY_MARKER.length);
    const rest = src.slice(at + CLOUDINARY_MARKER.length);

    const slash = rest.indexOf("/");
    const first = slash === -1 ? "" : rest.slice(0, slash);

    // A URL may carry a transformation, a version, or go straight to the id.
    const hasTransform = slash !== -1 && first.length > 0 && !isVersion(first);
    const transform = hasTransform ? first : "";
    const tail = hasTransform ? rest.slice(slash + 1) : rest;

    // Drop any width or quality already in the URL — this call decides both,
    // which is what makes the srcset actually offer different sizes.
    const parts = transform
      .split(",")
      .filter((p) => p && !p.startsWith("w_") && !p.startsWith("q_"));

    parts.push(`w_${width}`, `q_${quality ?? "auto"}`);
    if (!parts.some((p) => p.startsWith("f_"))) parts.push("f_auto");

    return `${head}${parts.join(",")}/${tail}`;
  }

  // --- Unsplash stand-ins, development only --------------------------------
  if (src.includes("images.unsplash.com")) {
    try {
      const url = new URL(src);
      url.searchParams.set("w", String(width));
      url.searchParams.set("q", String(quality ?? 75));
      return url.toString();
    } catch {
      return src;
    }
  }

  return src;
}
