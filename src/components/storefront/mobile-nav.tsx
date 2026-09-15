"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

type NavCategory = { slug: string; name: string; nameHi: string | null; count: number };

export function MobileNav({
  categories,
  collections,
  whatsapp,
}: {
  categories: NavCategory[];
  collections: { slug: string; name: string }[];
  whatsapp?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A route change means the visitor got where they were going.
  useEffect(() => setOpen(false), [pathname]);

  // Lock the page behind the drawer, and restore scroll exactly where it was.
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-overlay lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col bg-surface shadow-2xl lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-display text-lg">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain">
                <p className="px-4 pt-4 text-[11px] uppercase tracking-[0.14em] text-muted">
                  Shop by category
                </p>
                <ul className="mt-1 pb-2">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/categories/${c.slug}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] text-ink active:bg-surface-2"
                      >
                        <span className="flex flex-col">
                          {c.name}
                          {c.nameHi ? (
                            <span className="deva text-[12.5px] text-muted">{c.nameHi}</span>
                          ) : null}
                        </span>
                        <span className="flex items-center gap-2 text-muted">
                          <span className="text-xs tnum">{c.count}</span>
                          <ChevronRight className="size-4" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <p className="border-t border-line px-4 pt-4 text-[11px] uppercase tracking-[0.14em] text-muted">
                  Collections
                </p>
                <ul className="mt-1 pb-2">
                  {collections.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/collections/${c.slug}`}
                        className="block px-4 py-2.5 text-[15px] text-ink active:bg-surface-2"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>

                <ul className="border-t border-line py-2">
                  {[
                    ["/account", "My account"],
                    ["/account/orders", "Track an order"],
                    ["/pages/about", "About us"],
                    ["/contact", "Contact & support"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="block px-4 py-2.5 text-[15px] text-ink active:bg-surface-2">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                <ThemeToggle />
                {whatsapp ? (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                  >
                    Chat on WhatsApp
                  </a>
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
