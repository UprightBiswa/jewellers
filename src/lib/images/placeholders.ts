/**
 * Stand-in photography for development and the preview shop.
 *
 * Real photographs beat grey rectangles for judging a layout — spacing, crops
 * and contrast all read differently over an actual image. These are Unsplash
 * URLs, each one checked to resolve, picked deterministically from the image's
 * id so a given product always shows the same picture and the page does not
 * reshuffle on every render.
 *
 * They are NOT Charubala Silver's jewellery, and they are never used in
 * production: `cdnUrl` only reaches for them when Cloudinary is unconfigured.
 * The moment the owner uploads his own photos, these disappear.
 */

const UNSPLASH_IDS = [
  "1515562141207-7a88fb7ce338",
  "1611591437281-460bfbe1220a",
  "1599643478518-a784e5dc4c8f",
  "1602173574767-37ac01994b2a",
  "1535632066927-ab7c9ab60908",
  "1573408301185-9146fe634ad0",
  "1620656798579-1984d9e87df7",
  "1617038220319-276d3cfab638",
  "1506630448388-4e683c67ddb0",
  "1589128777073-263566ae5e4d",
  "1596944924616-7b38e7cfac36",
] as const;

/** Stable, well-spread hash — the same id always lands on the same photo. */
function pick(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % UNSPLASH_IDS.length;
  return UNSPLASH_IDS[index]!;
}

export function placeholderPhoto(
  publicId: string,
  opts: { width?: number; height?: number } = {},
): string {
  const w = Math.min(opts.width ?? 800, 1600);
  const h = Math.min(opts.height ?? w, 1600);

  return (
    `https://images.unsplash.com/photo-${pick(publicId)}` +
    `?w=${w}&h=${h}&fit=crop&crop=entropy&auto=format&q=75`
  );
}
