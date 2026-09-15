"use client";

import { useEffect, useState } from "react";

/**
 * The offer strip both reference sites run above the header.
 *
 * It rotates rather than scrolls: a marquee on a phone is unreadable and never
 * stops, while a timed swap lets someone actually finish the sentence. Pauses
 * when the tab is hidden and when the visitor prefers reduced motion.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        setIndex((i) => (i + 1) % messages.length);
      }
    }, 4200);

    return () => clearInterval(id);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="border-b border-line bg-ink text-bg">
      <div className="container-page flex h-9 items-center justify-center overflow-hidden">
        <p
          key={index}
          className="animate-[fade-in_0.4s_var(--ease-out-soft)] text-center text-[12.5px] tracking-wide"
        >
          {messages[index]}
        </p>
      </div>
    </div>
  );
}
