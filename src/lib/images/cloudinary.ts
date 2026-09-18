import "server-only";
import { v2 as cloudinary } from "cloudinary";
import {
  type ImageProvider,
  type SignedUpload,
  type UploadResult,
} from "./provider";
import { cdnUrl } from "./url";
import { isCloudinaryConfigured } from "@/lib/integrations";

const cloudName = (
  process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
)?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
const rootFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || "silver-store";

/**
 * Shape check, not just a presence check — a placeholder left in a hosting
 * dashboard must degrade to Unsplash placeholders, never break a build or sign
 * an upload that Cloudinary will reject. A cloud name is a bare slug, the API
 * key is numeric, the secret is a long token.
 */
const configured = isCloudinaryConfigured(cloudName, apiKey, apiSecret);

if (configured) {
  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  } catch (err) {
    console.warn("[images] Cloudinary rejected its credentials — using placeholders", err);
  }
} else if (cloudName || apiKey || apiSecret) {
  console.warn("[images] CLOUDINARY_* is set but does not look valid — using placeholders");
}

export const cloudinaryProvider: ImageProvider = {
  name: "cloudinary",
  configured,

  url: cdnUrl,

  async signUpload(folder): Promise<SignedUpload> {
    if (!configured || !cloudName || !apiKey || !apiSecret) {
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

  url: cdnUrl,

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

