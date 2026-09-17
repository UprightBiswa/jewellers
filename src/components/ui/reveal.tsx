import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A gentle entrance for a section.
 *
 * CSS only, and deliberately so. The previous version used a scroll-triggered
 * JavaScript animation starting at opacity 0, which meant the server sent a
 * homepage whose hero and ten sections were all invisible until React hydrated.
 * If hydration was slow — a mid-range phone on Tufanganj mobile data, exactly
 * our customer — the shop looked blank and broken.
 *
 * A CSS animation starts at first paint whether or not JavaScript ever arrives,
 * so the content is guaranteed on screen within 600ms. `prefers-reduced-motion`
 * is handled globally in globals.css, which collapses every animation to
 * nothing — leaving the content simply visible.
 */
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
  return (
    <div
      className={cn("animate-[fade-up_0.6s_var(--ease-out-expo)_both]", className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

/** Staggers its children, for product grids and category rails. */
export function RevealGroup({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode[];
  className?: string;
  stagger?: number;
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className="animate-[fade-up_0.5s_var(--ease-out-expo)_both]"
          style={{ animationDelay: `${Math.min(i * stagger, 0.4)}s` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
