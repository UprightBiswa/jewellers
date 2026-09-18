/**
 * Proves the image bucket works, end to end.
 *
 * Uploads a real file to Cloudinary with the server credentials, fetches the
 * delivered URL back through the same transformation the shop uses, then
 * deletes it. Anything broken — wrong cloud, wrong secret, folder permissions,
 * delivery disabled — fails here rather than the first time Rahul tries to add
 * a product.
 *
 *   npm run check:images
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: [".env.local", ".env"], quiet: true });

import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("Cloudinary is not configured — set CLOUDINARY_* in .env.local");
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

console.log(`\nChecking Cloudinary "${cloudName}"\n`);

// A small but real PNG, so the transformation has something to work on.
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4" +
  "2mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

let publicId;

try {
  // --- 1. Upload ----------------------------------------------------------
  const uploaded = await cloudinary.uploader.upload(PNG_1PX, {
    folder: "silver-store/_healthcheck",
    public_id: `check-${Date.now()}`,
    overwrite: true,
  });
  publicId = uploaded.public_id;
  record("upload accepted", Boolean(publicId), publicId);

  // --- 2. Deliver, through the shop's own transformation -------------------
  const url = cloudinary.url(publicId, {
    transformation: [{ width: 420, height: 420, crop: "pad", background: "auto" }],
    fetch_format: "auto",
    quality: "auto",
    secure: true,
  });

  const res = await fetch(url);
  record("delivery reachable", res.ok, `${res.status} ${res.headers.get("content-type") ?? ""}`);

  const bytes = Number(res.headers.get("content-length") ?? 0);
  record("transformed file has content", bytes > 0, `${bytes} bytes`);

  // --- 3. Account headroom ------------------------------------------------
  try {
    const usage = await cloudinary.api.usage();
    const credits = usage.credits;
    if (credits) {
      const used = Number(credits.usage ?? 0);
      const limit = Number(credits.limit ?? 0);
      const pct = limit ? ((used / limit) * 100).toFixed(1) : "?";
      record("plan headroom", limit === 0 || used < limit * 0.8,
        `${used} of ${limit} credits used (${pct}%)`);
    } else {
      record("plan headroom", true, "usage not reported on this plan");
    }
  } catch (err) {
    record("plan headroom", true, `could not read usage: ${err.message}`);
  }
} catch (err) {
  record("upload accepted", false, err?.message ?? String(err));
} finally {
  // --- 4. Clean up --------------------------------------------------------
  if (publicId) {
    try {
      const gone = await cloudinary.uploader.destroy(publicId);
      record("test file removed", gone.result === "ok" || gone.result === "not found", gone.result);
    } catch (err) {
      record("test file removed", false, err?.message ?? String(err));
    }
  }
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
