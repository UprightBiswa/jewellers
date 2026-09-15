"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { Camera, GripVertical, Star, Trash2, Upload } from "lucide-react";

import { imageUrl } from "@/lib/images/url";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadedImage = {
  publicId: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
};

/**
 * Product photos, uploaded from a phone.
 *
 * Compression happens in the browser before anything leaves the device: a 12 MP
 * camera photo becomes roughly 500 KB, which is the difference between an upload
 * that finishes on shop wifi and one that does not. The file then goes straight
 * to Cloudinary with a signature our server issued, so nothing large passes
 * through the app.
 */
export function ImageUploader({
  images,
  onChange,
  folder = "products",
  max = 8,
}: {
  images: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  folder?: "products" | "categories" | "collections" | "banners";
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);

  async function uploadOne(file: File): Promise<UploadedImage | null> {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.82,
    });

    const signRes = await fetch("/api/v1/admin/upload-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    const signJson = await signRes.json().catch(() => null);

    if (!signRes.ok || !signJson?.ok) {
      throw new Error(signJson?.error?.message ?? "Could not start the upload.");
    }

    const { uploadUrl, fields } = signJson.data as {
      uploadUrl: string;
      fields: Record<string, string>;
    };

    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append("file", compressed, file.name);

    const upload = await fetch(uploadUrl, { method: "POST", body: form });
    const result = await upload.json().catch(() => null);

    if (!upload.ok || !result?.public_id) {
      throw new Error(result?.error?.message ?? "The photo did not upload.");
    }

    return {
      publicId: result.public_id,
      url: result.secure_url,
      alt: "",
      width: result.width,
      height: result.height,
    };
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    const room = max - images.length;
    const files = Array.from(fileList).slice(0, Math.max(0, room));

    if (files.length === 0) {
      toast.error(`You can add up to ${max} photos for one product.`);
      return;
    }
    if (fileList.length > room) {
      toast.warning(`Only the first ${room} of those were added — ${max} photos is the limit.`);
    }

    setBusy(files.length);
    const added: UploadedImage[] = [];

    for (const file of files) {
      try {
        const uploaded = await uploadOne(file);
        if (uploaded) added.push(uploaded);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `${file.name} did not upload.`);
      } finally {
        setBusy((n) => n - 1);
      }
    }

    if (added.length > 0) {
      onChange([...images, ...added]);
      toast.success(`${added.length} ${added.length === 1 ? "photo" : "photos"} added.`);
    }
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function makePrimary(index: number) {
    const next = [...images];
    const [picked] = next.splice(index, 1);
    if (picked) next.unshift(picked);
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    onChange(next);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="primary"
          onClick={() => cameraRef.current?.click()}
          disabled={busy > 0 || images.length >= max}
          className="sm:hidden"
        >
          <Camera className="size-4" aria-hidden />
          Take a photo
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
          disabled={busy > 0 || images.length >= max}
        >
          <Upload className="size-4" aria-hidden />
          {busy > 0 ? `Uploading ${busy}…` : "Choose photos"}
        </Button>
      </div>

      <p className="text-[13px] text-muted">
        First photo is the one customers see in the grid. {images.length} of {max} added.
        Photos are shrunk on your phone before uploading, so this works on slow data.
      </p>

      {images.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line py-10 text-center">
          <p className="text-sm text-muted">No photos yet</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.publicId}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1",
                i === 0 ? "ring-2 ring-brand" : "ring-line",
              )}
            >
              <Image
                src={img.url || imageUrl(img.publicId, "thumb")}
                alt={img.alt || `Photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 160px"
                className="object-cover"
              />

              {i === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-on-brand">
                  Main
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-0.5 bg-black/55 p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                  className="grid size-6 place-items-center rounded text-white/90 disabled:opacity-30"
                >
                  <GripVertical className="size-3" aria-hidden />
                </button>
                {i !== 0 ? (
                  <button
                    type="button"
                    onClick={() => makePrimary(i)}
                    aria-label="Make this the main photo"
                    className="grid size-6 place-items-center rounded text-white/90"
                  >
                    <Star className="size-3" aria-hidden />
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label="Remove photo"
                  className="grid size-6 place-items-center rounded text-white/90"
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
