import Link from "next/link";
import { Suspense } from "react";
import { User } from "lucide-react";

import { listCategories, listCollections } from "@/lib/queries/catalog";
import { getSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { AnnouncementBar } from "./announcement-bar";
import { CartButton } from "./cart-button";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const [settings, categories, collections] = await Promise.all([
    getSettings(),
    listCategories(),
    listCollections(),
  ]);

  const navCategories = categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameBn: c.nameBn,
    count: c._count.products,
  }));

  // The header shows the categories that actually have stock; the rest stay in
  // the drawer and on the all-categories page.
  const primary = navCategories.filter((c) => c.count > 0).slice(0, 8);

  return (
    <>
      <AnnouncementBar messages={settings.announcements} />

      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center gap-2">
          <MobileNav
            categories={navCategories}
            collections={collections.map((c) => ({ slug: c.slug, name: c.name }))}
            whatsapp={settings.store.whatsapp}
          />

          <Link href="/" className="shrink-0" aria-label={`${settings.store.name} home`}>
            <Logo storeName={settings.store.name} tagline={settings.store.tagline} />
          </Link>

          <Suspense fallback={<div className="mx-auto hidden h-10 w-full max-w-md lg:block" />}>
            <SearchBox className="mx-auto hidden w-full max-w-md lg:block" />
          </Suspense>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link
              href="/account"
              aria-label="My account"
              className="grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <User className="size-[19px]" aria-hidden />
            </Link>
            <CartButton />
          </div>
        </div>

        <nav aria-label="Product categories" className="hidden border-t border-line lg:block">
          <div className="container-page flex h-11 items-center gap-1 overflow-x-auto no-scrollbar">
            <Link
              href="/collections/all"
              className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              All jewellery
            </Link>
            {primary.map((c) => (
              <Link
                key={c.slug}
                href={`/categories/${c.slug}`}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/collections/new-arrivals"
              className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[13.5px] font-medium text-brand transition-colors hover:bg-brand-soft"
            >
              New arrivals
            </Link>
          </div>
        </nav>

        <div className="border-t border-line px-4 py-2 lg:hidden">
          <Suspense fallback={<div className="h-10" />}>
            <SearchBox />
          </Suspense>
        </div>
      </header>
    </>
  );
}
