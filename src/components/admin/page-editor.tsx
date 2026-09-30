"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { deletePage, savePage } from "@/app/admin/content-actions";

export type PageRow = {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  updatedAt: string;
};

type Draft = {
  id?: string;
  slug: string;
  title: string;
  bodyMd: string;
  metaTitle: string;
  metaDescription: string;
  isPublished: boolean;
};

const EMPTY: Draft = {
  slug: "",
  title: "",
  bodyMd: "",
  metaTitle: "",
  metaDescription: "",
  isPublished: true,
};

/**
 * Every page of words on the shop, editable by the person whose shop it is.
 *
 * Returns, Shipping, About, Privacy, Terms — and anything else Rahul wants to
 * add later. The fourth rule in CLAUDE.md is that policy text belongs to him,
 * not in JSX, and the `Page` model has always supported that. This is the screen
 * that was missing.
 *
 * The body is Markdown because it is the least he can get wrong: a blank line
 * makes a paragraph, a dash makes a bullet, and nothing can break the layout.
 * A rich-text editor would let him paste styled Word text and ruin the page.
 */
export function PageEditor({ pages }: { pages: PageRow[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  function save() {
    if (!draft) return;
    startTransition(async () => {
      const res = await savePage({
        id: draft.id,
        slug: draft.slug || undefined,
        title: draft.title,
        bodyMd: draft.bodyMd,
        metaTitle: draft.metaTitle || undefined,
        metaDescription: draft.metaDescription || undefined,
        isPublished: draft.isPublished,
      });
      res.ok ? (toast.success(res.message ?? "Saved."), setDraft(null)) : toast.error(res.message);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deletePage(id);
      res.ok ? toast.success(res.message ?? "Deleted.") : toast.error(res.message);
      setConfirming(null);
    });
  }

  if (draft) {
    return (
      <form
        action={() => save()}
        className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">
            {draft.id ? `Editing “${draft.title}”` : "New page"}
          </h2>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Page title</span>
          <input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Returns and exchange"
            required
            className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">The words on the page</span>
          <textarea
            value={draft.bodyMd}
            onChange={(e) => set("bodyMd", e.target.value)}
            rows={18}
            required
            placeholder={"We exchange within 7 days.\n\n- Bring the bill\n- The piece must be unworn\n\n## Postage\nWe pay the return postage for a faulty piece."}
            className="rounded-lg border border-line-strong bg-surface p-3.5 font-mono text-[14px] leading-relaxed text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
          />
          <span className="text-[13px] text-muted">
            A blank line starts a new paragraph. A line beginning with <code>-</code> makes a
            bullet. <code>##</code> makes a heading.
          </span>
        </label>

        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            What Google shows (optional)
          </summary>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1.5">
              <span className="text-sm text-ink">Title in search results</span>
              <input
                value={draft.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
                placeholder="Leave blank to use the page title"
                className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm text-ink">The line under it</span>
              <input
                value={draft.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                placeholder="One sentence, about 150 letters"
                className="h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
              />
            </label>
          </div>
        </details>

        <label className="flex cursor-pointer items-center gap-2 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={draft.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
            className="size-4 rounded border-line-strong accent-[var(--brand)]"
          />
          Show this page on the shop
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner label="Saving" /> : null}
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-5">
      <Button onClick={() => setDraft(EMPTY)}>
        <Plus className="size-4" aria-hidden />
        Add a page
      </Button>

      <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
        {pages.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-[15px] font-medium text-ink">
                {p.title}
                {!p.isPublished && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">
                    Hidden
                  </span>
                )}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                /pages/{p.slug} · changed {p.updatedAt}
              </p>
            </div>

            {confirming === p.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">Delete this page?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  No
                </Button>
                <Button size="sm" variant="danger" onClick={() => remove(p.id)} disabled={pending}>
                  Yes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  href={`/pages/${p.slug}`}
                  target="_blank"
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`View ${p.title} on the shop`}
                >
                  <ExternalLink className="size-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: p.id,
                      slug: p.slug,
                      title: p.title,
                      bodyMd: p.bodyMd,
                      metaTitle: p.metaTitle ?? "",
                      metaDescription: p.metaDescription ?? "",
                      isPublished: p.isPublished,
                    })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`Edit ${p.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(p.id)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  aria-label={`Delete ${p.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {pages.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-12 text-center text-muted">
          No pages yet. Returns, Shipping, About and Privacy are the usual four.
        </p>
      )}
    </div>
  );
}
