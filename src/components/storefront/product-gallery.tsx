"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { imageUrl } from "@/lib/images/url";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; publicId: string; alt: string | null };

/**
 * Product gallery.
 *
 * On a phone it is a swipeable, snapping strip with dots underneath — the
 * gesture people already use in every other shopping app. From `sm` up it
 * becomes a main image with thumbnails down the side, where there is a cursor
 * and room for both.
 *
 * The comment above this component used to describe exactly that, while the
 * code rendered a row of small thumbnails to tap on a phone and nothing to
 * swipe. This is the version the comment was describing.
 *
 * The phone strip tracks the active slide from scroll position rather than
 * driving the scroll from state: a native snap-scroll already knows where it
 * is, and anything that also sets scrollLeft fights the finger mid-gesture.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);
  const strip = useRef<HTMLDivElement>(null);

  const current = images[active] ?? images[0];

  useEffect(() => {
    const el = strip.current;
    if (!el || images.length < 2) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = el.clientWidth || 1;
        setSlide(Math.round(el.scrollLeft / width));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [images.length]);

  function goTo(i: number) {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (images.length === 0) {
    return <div className="aspect-square rounded-[var(--radius-card)] bg-surface-2" />;
  }

  return (
    <>
      {/* Phone: swipe through the pictures, and tap a thumbnail to jump.
          The slides are the width of this column, not the viewport. They were
          w-screen with a negative margin, which burst out of the grid column the
          gallery sits in and dragged the whole product page sideways. */}
      <div className="sm:hidden">
        <div
          ref={strip}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[var(--radius-card)] bg-surface-2"
          aria-label={`${title} — ${images.length} photographs`}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={imageUrl(img.publicId, "detail")}
                alt={img.alt ?? title}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-contain"
              />
            </div>
          ))}
        </div>

        {images.length > 1 ? (
          <ul
            className="no-scrollbar mt-3 flex gap-2 overflow-x-auto"
            aria-label="Product images"
          >
            {images.map((img, i) => (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Photograph ${i + 1} of ${images.length}`}
                  aria-current={i === slide}
                  className={cn(
                    "relative block size-14 overflow-hidden rounded-lg bg-surface-2 ring-1 transition-[box-shadow]",
                    i === slide ? "ring-2 ring-brand" : "ring-line",
                  )}
                >
                  <Image
                    src={imageUrl(img.publicId, "thumb")}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Desktop: thumbnails beside one large image. */}
      <div className="hidden gap-3 sm:flex">
        {images.length > 1 ? (
          <ul className="no-scrollbar flex w-20 flex-col gap-2" aria-label="Product images">
            {images.map((img, i) => (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  aria-current={i === active}
                  className={cn(
                    "relative block size-20 overflow-hidden rounded-lg bg-surface-2 ring-1 transition-[box-shadow]",
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
                  sizes="45vw"
                  className="object-contain"
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}
