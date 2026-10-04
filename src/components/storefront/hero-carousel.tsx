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

  /**
   * The first slide must render VISIBLE, on the server and on the first client
   * paint. An entrance animation that starts at opacity 0 means the server
   * sends a blank hero, and on a slow phone the shop looks broken until React
   * hydrates. So no `initial` until after mount; from then on, slide changes
   * animate normally.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      {/* Full-bleed picture with the words over it.
          The old layout put text beside a square image, which on a phone meant
          a small picture above a wall of words — the jewellery, the thing being
          sold, got the smaller half. Now the photograph fills the frame and the
          words sit on it. The stats that used to live here are gone: the promise
          band further down the page says the same things, and saying them twice
          made both look like filler. */}
      <div className="relative">
        <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={mounted ? { opacity: 0, scale: reduced ? 1 : 1.06 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.7 },
                scale: { duration: reduced ? 0 : 9, ease: "linear" },
              }}
            >
              <Image
                src={imageUrl(slide.image, "banner")}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Dark from the bottom-left, where the words are, and clear at the
              top-right so the piece itself is never hidden behind a wash. */}
          <div
            className="absolute inset-0 bg-gradient-to-tr from-ink/80 via-ink/45 to-ink/5"
            aria-hidden
          />

          <div className="absolute inset-0 flex items-end">
            <div className="container-page w-full pb-10 sm:pb-14 lg:pb-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide.id}
                  initial={mounted ? "hidden" : false}
                  animate="show"
                  exit="hidden"
                  className="max-w-2xl"
                >
                  {slide.eyebrow ? (
                    <motion.p
                      custom={0}
                      variants={lines}
                      className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gold"
                    >
                      <span className="inline-block size-1.5 rotate-45 bg-gold" aria-hidden />
                      {slide.eyebrow}
                    </motion.p>
                  ) : null}

                  <motion.h1
                    custom={1}
                    variants={lines}
                    className="mt-3 font-display text-[clamp(2.1rem,7vw,4rem)] leading-[1.05] text-white drop-shadow-sm"
                  >
                    {slide.title}
                    {slide.titleAccent ? (
                      <>
                        <br />
                        <span className="text-gold">{slide.titleAccent}</span>
                      </>
                    ) : null}
                  </motion.h1>

                  {slide.body ? (
                    <motion.p
                      custom={2}
                      variants={lines}
                      className="mt-4 max-w-prose text-[15px] leading-relaxed text-white/85"
                    >
                      {slide.body}
                    </motion.p>
                  ) : null}

                  <motion.div custom={3} variants={lines} className="mt-7 flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link href={slide.ctaHref}>{slide.ctaLabel}</Link>
                    </Button>
                    {slide.secondaryLabel && slide.secondaryHref ? (
                      <Link
                        href={slide.secondaryHref}
                        className="inline-flex h-13 items-center rounded-lg border border-white/45 px-7 text-base text-white backdrop-blur-[2px] transition-colors hover:bg-white/10"
                      >
                        {slide.secondaryLabel}
                      </Link>
                    ) : null}
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/35 lg:left-6"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/35 lg:right-6"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {count > 1 ? (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 lg:bottom-7">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
