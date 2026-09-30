"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { deleteHeroSlide, moveHeroSlide, saveHeroSlide } from "@/app/admin/content-actions";

export type SlideRow = {
  id: string;
  eyebrow: string | null;
  title: string;
  titleAccent: string | null;
  body: string | null;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  imagePublicId: string;
  sortOrder: number;
  isActive: boolean;
};

type Draft = {
  id?: string;
  eyebrow: string;
  title: string;
  titleAccent: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  image: UploadedImage[];
  isActive: boolean;
};

const EMPTY: Draft = {
  eyebrow: "",
  title: "",
  titleAccent: "",
  body: "",
  ctaLabel: "Shop all jewellery",
  ctaHref: "/collections/all",
  secondaryLabel: "",
  secondaryHref: "",
  image: [],
  isActive: true,
};

const field =
  "h-11 rounded-lg border border-line-strong bg-surface px-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20";

/**
 * The big pictures at the top of the shop.
 *
 * Until now these were four slides written into the page component, so changing
 * "Durga Puja" to "Lakshmi Puja" needed a developer and a deploy. Charubala's
 * front page turns over with the season — that was never going to hold.
 *
 * The headline is split in two because the design sets the second half in the
 * accent colour. Rahul does not need to know that; the form calls them "first
 * line" and "second line, in gold" and the carousel does the rest.
 */
export function HeroManager({ slides }: { slides: SlideRow[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, closeForm = false) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(res.message ?? "Done.");
        if (closeForm) setDraft(null);
        setConfirming(null);
      } else {
        toast.error(res.message ?? "That did not work.");
      }
    });
  }

  function save() {
    if (!draft) return;
    run(
      () =>
        saveHeroSlide({
          id: draft.id,
          eyebrow: draft.eyebrow || undefined,
          title: draft.title,
          titleAccent: draft.titleAccent || undefined,
          body: draft.body || undefined,
          ctaLabel: draft.ctaLabel,
          ctaHref: draft.ctaHref,
          secondaryLabel: draft.secondaryLabel || undefined,
          secondaryHref: draft.secondaryHref || undefined,
          imagePublicId: draft.image[0]?.publicId ?? "",
          sortOrder: slides.length,
          isActive: draft.isActive,
        }),
      true,
    );
  }

  if (draft) {
    return (
      <form
        action={() => save()}
        className="grid gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">{draft.id ? "Edit slide" : "New slide"}</h2>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">The picture</span>
          <ImageUploader
            images={draft.image}
            onChange={(next) => set("image", next.slice(0, 1))}
            max={1}
            folder="banners"
          />
          <span className="text-[13px] text-muted">
            A wide photo works best — a piece on the bench, or a hand wearing it.
          </span>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Small line above (optional)</span>
          <input
            value={draft.eyebrow}
            onChange={(e) => set("eyebrow", e.target.value)}
            placeholder="925 Silver · Handmade"
            className={field}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">First line</span>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Silver made by hand,"
              required
              className={field}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Second line, in gold</span>
            <input
              value={draft.titleAccent}
              onChange={(e) => set("titleAccent", e.target.value)}
              placeholder="not by a catalogue."
              className={field}
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">A sentence or two</span>
          <textarea
            value={draft.body}
            onChange={(e) => set("body", e.target.value)}
            rows={3}
            placeholder="Every piece is cut, filed and polished on our own bench in Tufanganj."
            className="rounded-lg border border-line-strong bg-surface p-3.5 text-[15px] text-ink focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/20"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Button words</span>
            <input
              value={draft.ctaLabel}
              onChange={(e) => set("ctaLabel", e.target.value)}
              required
              className={field}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-ink">Button goes to</span>
            <input
              value={draft.ctaHref}
              onChange={(e) => set("ctaHref", e.target.value)}
              placeholder="/collections/all"
              required
              className={field}
            />
          </label>
        </div>

        <details className="rounded-lg border border-line p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            A second button (optional)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm text-ink">Words</span>
              <input
                value={draft.secondaryLabel}
                onChange={(e) => set("secondaryLabel", e.target.value)}
                placeholder="Under ₹999"
                className={field}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm text-ink">Goes to</span>
              <input
                value={draft.secondaryHref}
                onChange={(e) => set("secondaryHref", e.target.value)}
                placeholder="/collections/under-999"
                className={field}
              />
            </label>
          </div>
        </details>

        <label className="flex cursor-pointer items-center gap-2 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="size-4 rounded border-line-strong accent-[var(--brand)]"
          />
          Show this slide
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending || draft.image.length === 0}>
            {pending ? <Spinner label="Saving" /> : null}
            Save slide
          </Button>
          <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
            Cancel
          </Button>
        </div>
        {draft.image.length === 0 && (
          <p className="text-[13px] text-muted">Add a picture and the save button wakes up.</p>
        )}
      </form>
    );
  }

  return (
    <div className="grid gap-5">
      <Button onClick={() => setDraft(EMPTY)}>
        <Plus className="size-4" aria-hidden />
        Add a slide
      </Button>

      <ul className="grid gap-3">
        {slides.map((s, i) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
                {s.title} <span className="text-gold">{s.titleAccent}</span>
                {!s.isActive && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-normal text-muted">
                    Hidden
                  </span>
                )}
              </p>
              <p className="truncate text-[12.5px] text-muted">
                {s.eyebrow ? `${s.eyebrow} · ` : ""}
                {s.ctaLabel} → {s.ctaHref}
              </p>
            </div>

            {confirming === s.id ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink">Remove it?</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)} disabled={pending}>
                  No
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={pending}
                  onClick={() => run(() => deleteHeroSlide(s.id))}
                >
                  Yes
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={i === 0 || pending}
                  onClick={() => run(() => moveHeroSlide(s.id, "up"))}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={i === slides.length - 1 || pending}
                  onClick={() => run(() => moveHeroSlide(s.id, "down"))}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      id: s.id,
                      eyebrow: s.eyebrow ?? "",
                      title: s.title,
                      titleAccent: s.titleAccent ?? "",
                      body: s.body ?? "",
                      ctaLabel: s.ctaLabel,
                      ctaHref: s.ctaHref,
                      secondaryLabel: s.secondaryLabel ?? "",
                      secondaryHref: s.secondaryHref ?? "",
                      image: [{ publicId: s.imagePublicId, url: "", alt: s.title }],
                      isActive: s.isActive,
                    })
                  }
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                  aria-label={`Edit ${s.title}`}
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(s.id)}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                  aria-label={`Remove ${s.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {slides.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line py-12 text-center text-muted">
          No slides. The front page simply starts lower down — nothing looks broken.
        </p>
      )}
    </div>
  );
}
