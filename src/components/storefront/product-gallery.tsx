"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { imageUrl } from "@/lib/images/cloudinary";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; publicId: string; alt: string | null };

/**
 * Product gallery.
 *
 * On a phone it is a swipeable, snapping strip — the gesture people already use
 * in every other shopping app. From `sm` up it becomes a main image with
 * thumbnails down the side.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (images.length === 0) {
    return <div className="aspect-square rounded-[var(--radius-card)] bg-surface-2" />;
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 ? (
        <ul
          className="no-scrollbar flex gap-2 overflow-x-auto sm:w-20 sm:flex-col sm:overflow-visible"
          aria-label="Product images"
        >
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg bg-surface-2 ring-1 transition-[box-shadow] sm:size-20",
                  i === active ? "ring-2 ring-brand" : "ring-line hover:ring-line-strong",
                )}
              >
                <Image
                  src={imageUrl(img.publicId, "thumb")}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative flex-1 overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
        <div className="relative aspect-square">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current?.id ?? "only"}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0"
            >
              <Image
                src={imageUrl(current?.publicId, "detail")}
                alt={current?.alt ?? title}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 45vw"
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
