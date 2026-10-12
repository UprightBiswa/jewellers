"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A section that arrives as you reach it.
 *
 * There is a trap here that this component has already fallen into once, in
 * both directions.
 *
 * The first version used a scroll-triggered animation starting at opacity 0, so
 * the server sent a homepage whose hero and ten sections were all invisible
 * until React hydrated. On a mid-range phone on Tufanganj mobile data — exactly
 * our customer — the shop looked blank and broken.
 *
 * The fix was a pure CSS animation that ran on load. That guaranteed the
 * content, but it also meant everything below the fold finished animating while
 * off screen, so scrolling the page felt completely static.
 *
 * This does both. The server renders the content plain and visible, so a
 * browser that never runs JavaScript shows a finished page. Only once mounted
 * does the component arm itself, and it arms in a layout effect — before the
 * browser paints — so nothing is ever seen jumping from visible to hidden.
 * Anything already on screen at that moment is marked shown straight away and
 * never animates; only what is still below the fold waits for the scroll.
 */

/** useLayoutEffect warns during SSR, where it would do nothing useful anyway. */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** seconds — stagger sections that appear together */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"plain" | "waiting" | "shown">("plain");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour the system setting by doing nothing at all: the content simply
    // stays as the server rendered it.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Already on screen when the page loaded? Leave it alone. Animating what
    // the visitor is already looking at is the flicker everyone complains about.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.9) {
      setState("shown");
      return;
    }

    setState("waiting");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("shown");
        io.disconnect();
      },
      // A little before the edge, so the movement finishes as it arrives rather
      // than starting once it is already in the middle of the screen.
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      className={cn(
        state === "waiting" && "translate-y-5 opacity-0",
        state === "shown" && "translate-y-0 opacity-100",
        state !== "plain" && "transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)]",
        className,
      )}
      style={state === "waiting" && delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Staggers its children — product grids, category rails.
 *
 * One observer on the group rather than one per card: a rail of eight products
 * would otherwise create eight observers that all fire within a few pixels of
 * each other, and the stagger is what makes it read as one movement anyway.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode[];
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"plain" | "waiting" | "shown">("plain");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setState("shown");
      return;
    }

    setState("waiting");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("shown");
        io.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={cn(
            state === "waiting" && "translate-y-4 opacity-0",
            state === "shown" && "translate-y-0 opacity-100",
            state !== "plain" &&
              "transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)]",
          )}
          style={
            state !== "plain"
              ? { transitionDelay: `${Math.min(i * stagger, 0.4)}s` }
              : undefined
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
