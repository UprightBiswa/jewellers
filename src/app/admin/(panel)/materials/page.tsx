import type { Metadata } from "next";

import { db } from "@/lib/db";
import { MaterialManager, type MaterialRow } from "@/components/admin/material-manager";

export const metadata: Metadata = { title: "Silver types" };
export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage() {
  const rows = await db.material.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameBn: true,
      code: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  const materials: MaterialRow[] = rows.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    nameBn: m.nameBn,
    code: m.code,
    sortOrder: m.sortOrder,
    isActive: m.isActive,
    productCount: m._count.products,
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl text-ink">Silver types</h1>
        <p className="text-sm text-muted">
          What the pieces are made of — 925 sterling, 999 fine, oxidised, and anything else you
          start offering. Every product picks one.
        </p>
      </header>

      <MaterialManager materials={materials} />
    </div>
  );
}
