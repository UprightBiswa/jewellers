import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata: Metadata = { title: "Import products" };
export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="grid gap-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Products
        </Link>
        <h1 className="mt-2 font-display text-2xl text-ink">Load the catalogue from a sheet</h1>
        <p className="mt-1 max-w-2xl text-muted">
          For adding many pieces at once. Fill the spreadsheet, name the photographs after the
          serial number, and check it here before anything is saved.
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
