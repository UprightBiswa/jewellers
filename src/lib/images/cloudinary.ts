import { v2 as cloudinary } from "cloudinary";
import {
  IMAGE_PRESETS,
  type ImageProvider,
  type ImageTransform,
  type SignedUpload,
  type UploadResult,
} from "./provider";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
const rootFolder = process.env.CLOUDINARY_UPLOAD_FOLDER ?? "silver-store";

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

const FIT_MAP: Record<NonNullable<ImageTransform["fit"]>, string> = {
  cover: "c_fill,g_auto",
  contain: "c_fit",
  pad: "c_pad",
};

function buildTransform(t: ImageTransform = {}): string {
  const parts = [`f_${t.format ?? "auto"}`, `q_${t.quality ?? "auto"}`];

  if (t.width) parts.push(`w_${t.width}`);
  if (t.height) parts.push(`h_${t.height}`);
  if (t.fit) parts.push(FIT_MAP[t.fit]);
  if (t.background) parts.push(`b_${t.background.replace("#", "rgb:")}`);
  if (t.blur) parts.push(`e_blur:${t.blur}`);
  parts.push("dpr_auto");

  return parts.join(",");
}

export const cloudinaryProvider: ImageProvider = {
  name: "cloudinary",
  configured: Boolean(cloudName && apiKey && apiSecret),

  url(publicId, transform) {
    if (!cloudName) return "";
    // Already an absolute URL (seed data, Google avatars) — pass it through.
    if (/^https?:\/\//.test(publicId)) return publicId;
    return `https://res.cloudinary.com/${cloudName}/image/upload/${buildTransform(transform)}/${publicId}`;
  },

  async signUpload(folder): Promise<SignedUpload> {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary is not configured — set CLOUDINARY_* in .env.local");
    }

    const timestamp = Math.round(Date.now() / 1000);
    const fullFolder = `${rootFolder}/${folder}`.replace(/\/+/g, "/");

    // Only the parameters listed here are signed, and Cloudinary rejects an
    // upload whose signed params do not match. That is what stops a leaked
    // signature being reused to write anywhere in the account.
    const paramsToSign = {
      folder: fullFolder,
      timestamp,
      // Square-pad phone photos to a consistent product tile on arrival.
      eager: "c_pad,w_1200,h_1200,b_auto",
      eager_async: "true",
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      fields: {
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
        folder: fullFolder,
        eager: paramsToSign.eager,
        eager_async: "true",
      },
      folder: fullFolder,
      expiresAt: (timestamp + 3600) * 1000,
    };
  },

  async upload(file, folder, filename): Promise<UploadResult> {
    if (!this.configured) {
      throw new Error("Cloudinary is not configured — set CLOUDINARY_* in .env.local");
    }

    const payload =
      typeof file === "string" ? file : `data:image/jpeg;base64,${file.toString("base64")}`;

    const res = await cloudinary.uploader.upload(payload, {
      folder: `${rootFolder}/${folder}`.replace(/\/+/g, "/"),
      public_id: filename,
      overwrite: false,
      resource_type: "image",
    });

    return {
      publicId: res.public_id,
      url: res.secure_url,
      width: res.width,
      height: res.height,
      bytes: res.bytes,
      format: res.format,
    };
  },

  async remove(publicId) {
    if (!this.configured) return;
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
  },
};

/**
 * Fallback used before Cloudinary keys exist, so the whole site — including
 * seeded demo products — still renders instead of showing broken images.
 */
export const placeholderProvider: ImageProvider = {
  name: "placeholder",
  configured: true,

  url(publicId, transform) {
    if (/^https?:\/\//.test(publicId)) return publicId;
    const w = transform?.width ?? 600;
    const h = transform?.height ?? 600;
    const label = encodeURIComponent(publicId.split("/").pop() ?? "silver");
    return `https://placehold.co/${w}x${h}/eef0f3/6a717b/png?text=${label}`;
  },

  async signUpload(): Promise<SignedUpload> {
    throw new Error("Image uploads need Cloudinary keys. Add CLOUDINARY_* to .env.local");
  },

  async upload(): Promise<UploadResult> {
    throw new Error("Image uploads need Cloudinary keys. Add CLOUDINARY_* to .env.local");
  },

  async remove() {},
};

export function getImageProvider(): ImageProvider {
  return cloudinaryProvider.configured ? cloudinaryProvider : placeholderProvider;
}

/** Convenience used all over the storefront. */
export function imageUrl(
  publicId: string | null | undefined,
  preset: keyof typeof IMAGE_PRESETS = "card",
): string {
  if (!publicId) {
    return getImageProvider().url("placeholder", IMAGE_PRESETS[preset]);
  }
  return getImageProvider().url(publicId, IMAGE_PRESETS[preset]);
}
