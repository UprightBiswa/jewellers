"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/images/url";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  image: string;
};

const INTERVAL = 6500;

/**
 * The hero.
 *
 * Deliberately not a full-height banner: the categories below it have to be
 * visible without scrolling, because that is what a customer arriving from
 * WhatsApp is actually looking for.
 *
 * The motion is one orchestrated sequence rather than scattered effects — the
 * image cross-fades while it drifts, and the text lands line by line just after
 * it. Auto-advance stops on hover, on focus, when the tab is hidden, and after
 * any manual interaction, because a carousel that keeps moving while you are
 * reading it is worse than no carousel.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setIndex((i) => (i + 1) % count);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [paused, reduced, count]);

  const slide = slides[index];
  if (!slide) return null;

  // Text lands after the image has started moving, so the eye follows one thing
  // at a time.
  const lines = {
    hidden: { opacity: 0, y: reduced ? 0 : 18 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.12 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
    }),
  };

  return (
    <section
      className="relative overflow-hidden border-b border-line bg-surface"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && Math.abs(end - start) > 45) {
          go(index + (end < start ? 1 : -1));
        }
        touchStart.current = null;
      }}
    >
      <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
        <div className="max-w-xl">
          <AnimatePresence mode="wait">
            <motion.div key={slide.id} initial="hidden" animate="show" exit="hidden">
              <motion.p
                custom={0}
                variants={lines}
                className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold"
              >
                <span className="inline-block size-1.5 rotate-45 bg-gold" aria-hidden />
                {slide.eyebrow}
              </motion.p>

              <motion.h1
                custom={1}
                variants={lines}
                className="mt-4 font-display text-[clamp(2rem,6vw,3.4rem)] leading-[1.08] text-ink"
              >
                {slide.title}
                {slide.titleAccent ? (
                  <>
                    <br />
                    <span className="text-brand">{slide.titleAccent}</span>
                  </>
                ) : null}
              </motion.h1>

              <motion.p
                custom={2}
                variants={lines}
                className="mt-5 max-w-prose text-[15px] leading-relaxed text-ink-2"
              >
                {slide.body}
              </motion.p>

              <motion.div custom={3} variants={lines} className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
                </Button>
                {slide.secondaryLabel && slide.secondaryHref ? (
                  <Button asChild variant="secondary" size="lg">
                    <Link href={slide.secondaryHref}>{slide.secondaryLabel}</Link>
                  </Button>
                ) : null}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            {[
              ["2 days", "to pack"],
              ["7 days", "to exchange"],
              ["Made", "to order"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-lg text-ink">{value}</dt>
                <dd className="text-[12.5px] text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] bg-surface-2 md:aspect-square">
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: reduced ? 1 : 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.7 },
                scale: { duration: reduced ? 0 : 7, ease: "linear" },
              }}
            >
              <Image
                src={imageUrl(slide.image, "banner")}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-surface/85 text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <div className="container-page flex justify-center gap-2 pb-6 md:absolute md:bottom-6 md:left-1/2 md:w-auto md:-translate-x-1/2 md:pb-0">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-brand" : "w-1.5 bg-line-strong hover:bg-muted",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
