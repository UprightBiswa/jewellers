/**
 * The image provider seam.
 *
 * Nothing outside this folder imports the Cloudinary SDK. Components and route
 * handlers talk to this interface, so moving to ImageKit, Cloudflare Images or
 * R2 later is a new implementation of `ImageProvider` and one line in
 * `getImageProvider()` — not a database migration and not a hunt through JSX.
 */

export type ImageFit = "cover" | "contain" | "pad";

export type ImageTransform = {
  width?: number;
  height?: number;
  fit?: ImageFit;
  /** 1-100, or "auto" to let the CDN decide */
  quality?: number | "auto";
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  /** Pads a non-square phone photo out to a square product tile */
  background?: string;
  blur?: number;
};

export type UploadResult = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export type SignedUpload = {
  /** Where the browser POSTs the file */
  uploadUrl: string;
  /** Fields the browser must send alongside the file */
  fields: Record<string, string>;
  folder: string;
  expiresAt: number;
};

export interface ImageProvider {
  readonly name: string;
  readonly configured: boolean;

  /** Build a delivery URL. Pure string work — safe in a client component. */
  url(publicId: string, transform?: ImageTransform): string;

  /** Signature for a direct browser upload; the file never touches our server. */
  signUpload(folder: string): Promise<SignedUpload>;

  /** Server-side upload, used by the seed script and by imports. */
  upload(file: Buffer | string, folder: string, filename?: string): Promise<UploadResult>;

  remove(publicId: string): Promise<void>;
}

/** Standard sizes, so every surface asks for the same handful of derivatives. */
export const IMAGE_PRESETS = {
  thumb: { width: 120, height: 120, fit: "cover" },
  card: { width: 500, height: 500, fit: "cover" },
  cardRetina: { width: 1000, height: 1000, fit: "cover" },
  detail: { width: 1200, height: 1200, fit: "contain", background: "white" },
  zoom: { width: 2000, height: 2000, fit: "contain", background: "white" },
  banner: { width: 1920, height: 720, fit: "cover" },
  bannerMobile: { width: 800, height: 900, fit: "cover" },
  og: { width: 1200, height: 630, fit: "pad", background: "white" },
} as const satisfies Record<string, ImageTransform>;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/** A tiny inline SVG used while a real image loads and when one is missing. */
export const PLACEHOLDER_BLUR =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e6e8ec"/></svg>`,
  ).toString("base64");
