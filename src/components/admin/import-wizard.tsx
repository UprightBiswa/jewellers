"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Images, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  commitImport,
  exportProductsCsv,
  previewImport,
  type CommitResult,
  type ImportPlan,
  type UploadedImage,
} from "@/app/admin/import-actions";

/**
 * Loading the catalogue from a spreadsheet, in four steps.
 *
 * Rahul is putting three hundred prices into a live shop in one go. The whole
 * design follows from that: he sees exactly what will happen before anything is
 * written, the photographs upload with a visible count because nine hundred
 * files take minutes not seconds, and a row that fails is named by its line in
 * his sheet so he can find it.
 */

type Step = "choose" | "preview" | "uploading" | "done";

export function ImportWizard() {
  const csvRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [step, setStep] = useState<Step>("choose");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [uploaded, setUploaded] = useState(0);
  const [result, setResult] = useState<CommitResult | null>(null);

  async function chooseCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsvFile(file);
    setCsvText(text);
    setPlan(null);
    setStep("choose");
  }

  async function runPreview() {
    if (!csvText) {
      toast.error("Choose the spreadsheet first.");
      return;
    }

    setBusy(true);
    try {
      const res = await previewImport(
        csvText,
        imageFiles.map((f) => f.name),
      );
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPlan(res.data);
      setStep("preview");
    } catch {
      toast.error("Could not read that file. Is it a CSV?");
    } finally {
      setBusy(false);
    }
  }

  /** Uploads one photograph, compressed, through the same signed route the product form uses. */
  async function uploadOne(file: File): Promise<UploadedImage> {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.82,
    });

    const signRes = await fetch("/api/v1/admin/upload-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: "products" }),
    });
    const signJson = await signRes.json().catch(() => null);
    if (!signRes.ok || !signJson?.ok) {
      throw new Error(signJson?.error?.message ?? "Could not start the upload.");
    }

    const { uploadUrl, fields } = signJson.data as {
      uploadUrl: string;
      fields: Record<string, string>;
    };

    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append("file", compressed, file.name);

    const res = await fetch(uploadUrl, { method: "POST", body: form });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.public_id) {
      throw new Error(json?.error?.message ?? `${file.name} did not upload.`);
    }

    return {
      publicId: json.public_id,
      url: json.secure_url,
      width: json.width,
      height: json.height,
    };
  }

  async function commit() {
    if (!plan) return;

    setBusy(true);
    setStep("uploading");
    setUploaded(0);

    try {
      // Only the photographs some row actually asked for. A folder often holds
      // rejects and duplicates, and uploading those costs real Cloudinary quota.
      const wanted = new Set(plan.rows.flatMap((r) => r.imagesFound));
      const toUpload = imageFiles.filter((f) => wanted.has(f.name));

      const images: Record<string, UploadedImage> = {};

      // Four at a time. Serial is too slow for 900 files; unbounded parallelism
      // makes the browser drop connections and Cloudinary rate-limit us.
      const queue = [...toUpload];
      const workers = Array.from({ length: 4 }, async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          try {
            images[file.name] = await uploadOne(file);
          } catch {
            // Left out of the map, so the row that wanted it is reported as
            // failed rather than saved with a missing photograph.
          }
          setUploaded((n) => n + 1);
        }
      });
      await Promise.all(workers);

      const res = await commitImport(csvText, images);
      if (!res.ok) {
        toast.error(res.message);
        setStep("preview");
        return;
      }

      setResult(res.data);
      setStep("done");
      toast.success(`${res.data.created} added, ${res.data.updated} updated.`);
    } catch {
      toast.error("The import stopped. Nothing after the last successful row was saved.");
      setStep("preview");
    } finally {
      setBusy(false);
    }
  }

  async function downloadExport() {
    setBusy(true);
    try {
      const res = await exportProductsCsv();
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `charubala-products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  }

  function downloadFailures() {
    if (!result?.failed.length) return;
    const lines = [
      "line,serial,title,problem",
      ...result.failed.map(
        (f) => `${f.line},"${f.serial}","${f.title.replace(/"/g, '""')}","${f.message.replace(/"/g, '""')}"`,
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rows-that-failed.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* ---------------------------------------------------------------------- */

  if (step === "done" && result) {
    return (
      <div className="grid gap-6">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 text-emerald-600" aria-hidden />
            <h2 className="font-display text-xl text-ink">Catalogue loaded</h2>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-4">
            <Stat label="Added" value={result.created} />
            <Stat label="Updated" value={result.updated} />
            <Stat label="Did not load" value={result.failed.length} tone={result.failed.length ? "bad" : "plain"} />
          </dl>

          {result.failed.length > 0 && (
            <div className="mt-6 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                {result.failed.length} row{result.failed.length === 1 ? "" : "s"} did not load.
                Everything else did — fix these and upload just them.
              </p>
              <ul className="mt-3 grid gap-1.5 text-sm text-amber-900">
                {result.failed.slice(0, 8).map((f) => (
                  <li key={f.line}>
                    <span className="font-medium">Line {f.line}</span> · {f.title || f.serial} — {f.message}
                  </li>
                ))}
              </ul>
              {result.failed.length > 8 && (
                <p className="mt-2 text-sm text-amber-800">and {result.failed.length - 8} more.</p>
              )}
              <Button variant="secondary" size="sm" className="mt-4" onClick={downloadFailures}>
                <Download className="size-4" aria-hidden /> Download the failed rows
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="/admin/products">See the products</a>
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep("choose");
                setPlan(null);
                setResult(null);
                setCsvFile(null);
                setCsvText("");
                setImageFiles([]);
              }}
            >
              Import another sheet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "uploading") {
    const wanted = new Set(plan?.rows.flatMap((r) => r.imagesFound) ?? []);
    const total = imageFiles.filter((f) => wanted.has(f.name)).length;

    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-8 text-center">
        <Spinner label="Uploading" />
        <p className="mt-4 font-display text-lg text-ink">
          {total > 0 ? `Sending photo ${Math.min(uploaded + 1, total)} of ${total}` : "Saving products"}
        </p>
        <p className="mt-1 text-sm text-muted">
          Keep this page open. Large phone photographs take a moment each.
        </p>
        {total > 0 && (
          <div className="mx-auto mt-5 h-2 w-full max-w-md overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.round((uploaded / Math.max(total, 1)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Step 1 — the files */}
      <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
        <h2 className="font-display text-lg text-ink">1 · Choose the files</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => csvRef.current?.click()}
            className={cn(
              "flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed p-5 text-left transition",
              csvFile ? "border-accent bg-accent/5" : "border-line hover:border-accent hover:bg-surface-2",
            )}
          >
            <FileSpreadsheet className="size-5 text-accent" aria-hidden />
            <span className="font-medium text-ink">{csvFile ? csvFile.name : "The spreadsheet"}</span>
            <span className="text-sm text-muted">
              {csvFile ? "Tap to choose a different one" : "Saved from Excel or Sheets as CSV"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => imagesRef.current?.click()}
            className={cn(
              "flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed p-5 text-left transition",
              imageFiles.length ? "border-accent bg-accent/5" : "border-line hover:border-accent hover:bg-surface-2",
            )}
          >
            <Images className="size-5 text-accent" aria-hidden />
            <span className="font-medium text-ink">
              {imageFiles.length ? `${imageFiles.length} photographs` : "The photographs"}
            </span>
            <span className="text-sm text-muted">
              Named 001-1.jpg, 001-2.jpg — the number matches the serial column
            </span>
          </button>
        </div>

        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => void chooseCsv(e.target.files?.[0])}
        />
        <input
          ref={imagesRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => setImageFiles(Array.from(e.target.files ?? []))}
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => void runPreview()} disabled={!csvFile || busy}>
            {busy ? <Spinner label="Checking" /> : <Upload className="size-4" aria-hidden />}
            Check the sheet
          </Button>
          <Button variant="secondary" onClick={() => void downloadExport()} disabled={busy}>
            <Download className="size-4" aria-hidden /> Export what is already here
          </Button>
          <a
            href="/templates/products-template.csv"
            download
            className="text-sm text-accent underline-offset-4 hover:underline"
          >
            Download a blank sheet
          </a>
        </div>
      </section>

      {/* Step 2 — what will happen */}
      {plan && (
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
          <h2 className="font-display text-lg text-ink">2 · What will happen</h2>

          <dl className="mt-5 grid grid-cols-3 gap-4">
            <Stat label="New products" value={plan.totals.create} />
            <Stat label="Will be updated" value={plan.totals.update} />
            <Stat
              label="Cannot load"
              value={plan.totals.reject}
              tone={plan.totals.reject ? "bad" : "plain"}
            />
          </dl>

          {plan.unknownColumns.length > 0 && (
            <p className="mt-4 text-sm text-muted">
              Ignored columns: {plan.unknownColumns.join(", ")}. Nothing is lost — they are simply
              not used.
            </p>
          )}

          {plan.totals.reject > 0 && (
            <div className="mt-5 rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-700" aria-hidden />
                <p className="text-sm font-medium text-amber-900">
                  These rows will be skipped. The rest still load.
                </p>
              </div>
              <ul className="mt-3 grid gap-2 text-sm text-amber-900">
                {plan.rows
                  .filter((r) => r.action === "reject")
                  .slice(0, 10)
                  .map((r) => (
                    <li key={r.line}>
                      <span className="font-medium">Line {r.line}</span>
                      {r.title ? ` · ${r.title}` : ""} — {r.issues.map((i) => i.message).join(" ")}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-3 font-medium">Line</th>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Photos</th>
                  <th className="py-2 pr-3 font-medium">New</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.slice(0, 50).map((r) => (
                  <tr key={r.line} className="border-b border-line/60">
                    <td className="py-2 pr-3 text-muted">{r.line}</td>
                    <td className="py-2 pr-3 text-ink">{r.title || r.serial || "—"}</td>
                    <td className="py-2 pr-3 text-muted">{r.imagesFound.length || "—"}</td>
                    <td className="py-2 pr-3 text-muted">
                      {[r.newCategory, ...r.newCollections].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          r.action === "create" && "bg-emerald-50 text-emerald-700",
                          r.action === "update" && "bg-sky-50 text-sky-700",
                          r.action === "reject" && "bg-amber-50 text-amber-800",
                        )}
                      >
                        {r.action === "create" ? "Add" : r.action === "update" ? "Update" : "Skip"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plan.rows.length > 50 && (
              <p className="mt-3 text-sm text-muted">
                Showing the first 50 of {plan.rows.length} rows.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void commit()}
              disabled={busy || plan.totals.create + plan.totals.update === 0}
            >
              Load {plan.totals.create + plan.totals.update} product
              {plan.totals.create + plan.totals.update === 1 ? "" : "s"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("choose")} disabled={busy}>
              Back
            </Button>
          </div>

          <p className="mt-3 text-sm text-muted">
            Nothing has been saved yet. Products load as drafts unless the sheet says active.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number;
  tone?: "plain" | "bad";
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-display text-2xl",
          tone === "bad" ? "text-amber-700" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
