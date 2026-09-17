import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listCategories } from "@/lib/queries/catalog";
import { SearchBox } from "@/components/storefront/search-box";
import { Suspense } from "react";

/**
 * A 404 on the shop.
 *
 * A dead end is the worst possible page on a store, so this one is a way back
 * in: search, and the real categories from the database. A discontinued design
 * is the most common reason someone lands here, and the category they wanted is
 * usually still full of similar pieces.
 */
export default async function ShopNotFound() {
  const categories = await listCategories();

  return (
    <div className="container-page py-20">
      {/*
        The status will be 200 because of the Next 16.3.5 notFound() bug (see
        the note on the product and category pages). React 19 hoists this into
        <head>, which is what actually keeps a dead URL out of the index.
      */}
      <meta name="robots" content="noindex, nofollow" />

      <div className="mx-auto max-w-xl text-center">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gold">Page not found</p>

        <h1 className="mt-3 font-display text-[clamp(1.8rem,5vw,2.4rem)] text-ink">
          We could not find that
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          The link may be old, or that design may have sold out and been taken down.
          Have a look at what is on the bench now.
        </p>

        <div className="mt-7">
          <Suspense fallback={<div className="h-10" />}>
            <SearchBox />
          </Suspense>
        </div>

        {categories.length > 0 ? (
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="inline-block rounded-full border border-line px-3.5 py-1.5 text-sm text-ink-2 transition-colors hover:border-brand hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/collections/all">See everything</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/contact">Ask us for it</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
