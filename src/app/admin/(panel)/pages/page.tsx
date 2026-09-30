import type { Metadata } from "next";

import { db } from "@/lib/db";
import { PageEditor, type PageRow } from "@/components/admin/page-editor";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const rows = await db.page.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      bodyMd: true,
      metaTitle: true,
      metaDescription: true,
      isPublished: true,
      updatedAt: true,
    },
  });

  const pages: PageRow[] = rows.map((p) => ({
    ...p,
    updatedAt: p.updatedAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Pages</h1>
        <p className="text-sm text-muted">
          Returns, shipping, about, privacy — every page of words on the shop. Change them here and
          they change on the site straight away.
        </p>
      </header>

      <PageEditor pages={pages} />
    </div>
  );
}
