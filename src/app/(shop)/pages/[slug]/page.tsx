import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/lib/db";
import { devFallback } from "@/lib/demo/fallback";
import { DEMO_PAGES } from "@/lib/demo/data";
import { Markdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export const revalidate = 600;

export async function generateStaticParams() {
  const pages = await devFallback(
    () => db.page.findMany({ where: { isPublished: true }, select: { slug: true } }),
    () => Object.keys(DEMO_PAGES).map((slug) => ({ slug })),
  );
  return pages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await devFallback(
    () =>
      db.page.findFirst({
        where: { slug, isPublished: true },
        select: { title: true, metaTitle: true, metaDescription: true },
      }),
    () => {
      const demo = DEMO_PAGES[slug];
      return demo ? { title: demo.title, metaTitle: null, metaDescription: null } : null;
    },
  );
  if (!page) return {};

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription ?? undefined,
    alternates: { canonical: `/pages/${slug}` },
  };
}

/**
 * Policy and content pages. The body lives in the database so the owner can
 * edit his own returns policy from the admin without a deploy.
 */
export default async function ContentPage({ params }: { params: Params }) {
  const { slug } = await params;

  const page = await devFallback(
    () =>
      db.page.findFirst({
        where: { slug, isPublished: true },
        select: { title: true, bodyMd: true, updatedAt: true },
      }),
    () => {
      const demo = DEMO_PAGES[slug];
      return demo ? { ...demo, updatedAt: new Date() } : null;
    },
  );
  if (!page) notFound();

  return (
    <article className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span className="px-1.5" aria-hidden>/</span>
        <span className="text-ink">{page.title}</span>
      </nav>

      <header className="mt-5 max-w-2xl">
        <h1 className="font-display text-[clamp(1.9rem,5vw,2.6rem)] text-ink">{page.title}</h1>
        <p className="mt-2 text-[13px] text-muted">
          Last updated {formatDate(page.updatedAt)}
        </p>
      </header>

      <div className="mt-8 max-w-2xl">
        <Markdown source={page.bodyMd} />
      </div>

      <div className="mt-12 max-w-2xl rounded-[var(--radius-card)] border border-line bg-surface p-5">
        <p className="font-display text-lg text-ink">Still not sure?</p>
        <p className="mt-1.5 text-[15px] text-ink-2">
          Ask us directly — we would rather answer the question than have you guess.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
        >
          Contact us
        </Link>
      </div>
    </article>
  );
}
