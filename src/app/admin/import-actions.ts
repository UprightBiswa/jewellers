"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canOpenPanel } from "@/auth.config";
import {
  exportProducts,
  planImport,
  runImport,
  type CommitResult,
  type ImportPlan,
  type ImportResult,
  type UploadedImage,
} from "@/lib/import/run";

/**
 * The session layer over the catalogue importer.
 *
 * All the work is in src/lib/import/run.ts. This file exists to answer one
 * question — may this person write to the catalogue — and to tell Next what to
 * re-render afterwards.
 *
 * `commitImport` re-parses the CSV from scratch rather than trusting a plan sent
 * back by the browser. A preview is a rendering of the file, not a permission
 * slip; otherwise anyone who can open the panel could post an edited plan and
 * write whatever they liked.
 */

export type { CommitResult, ImportPlan, ImportResult, UploadedImage };

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canOpenPanel(session.user)) throw new Error("FORBIDDEN");
  return session.user;
}

/** Reads the file and reports what would happen. Writes nothing. */
export async function previewImport(
  csvText: string,
  imageFileNames: string[],
): Promise<ImportResult<ImportPlan>> {
  await requireStaff();
  return planImport(csvText, imageFileNames);
}

/** Writes the rows, then refreshes the pages that show products. */
export async function commitImport(
  csvText: string,
  images: Record<string, UploadedImage>,
): Promise<ImportResult<CommitResult>> {
  const user = await requireStaff();

  const result = await runImport(csvText, images, user.id!);

  revalidatePath("/admin/products");
  revalidatePath("/");

  return result;
}

/** The catalogue as a sheet, in exactly the columns the importer reads. */
export async function exportProductsCsv(): Promise<ImportResult<string>> {
  await requireStaff();
  return exportProducts();
}
