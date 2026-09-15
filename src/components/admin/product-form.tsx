"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ImageUploader, type UploadedImage } from "./image-uploader";
import { saveProduct, type ProductInput } from "@/app/admin/actions";

type Option = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  title: string;
  titleHi: string;
  categoryId: string;
  shortDesc: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  purity: "S925" | "S999" | "PLATED" | "GOLD_PLATED" | "OXIDISED";
  priceMode: "FIXED" | "WEIGHT";
  priceRupees: string;
  compareAtRupees: string;
  makingChargeRupees: string;
  weightG: string;
  stock: string;
  hallmarked: boolean;
  huid: string;
  isFeatured: boolean;
  isTrending: boolean;
  isNewArrival: boolean;
  tags: string;
  images: UploadedImage[];
  variants: { id?: string; label: string; stock: string; priceDelta: string }[];
  collectionIds: string[];
};

export const EMPTY_PRODUCT: ProductFormValues = {
  title: "", titleHi: "", categoryId: "", shortDesc: "", description: "",
  status: "DRAFT", purity: "S925", priceMode: "FIXED",
  priceRupees: "", compareAtRupees: "", makingChargeRupees: "", weightG: "",
  stock: "1", hallmarked: false, huid: "",
  isFeatured: false, isTrending: false, isNewArrival: true,
  tags: "", images: [], variants: [], collectionIds: [],
};

const PURITY_OPTIONS = [
  ["S925", "925 Sterling Silver"],
  ["S999", "999 Fine Silver"],
  ["OXIDISED", "Oxidised Silver"],
  ["GOLD_PLATED", "Gold Plated on Silver"],
  ["PLATED", "Silver Plated"],
] as const;

const RING_SIZES = ["12", "14", "16", "18", "20", "22"];

/**
 * The product form.
 *
 * Laid out as one column of plain sections on purpose: the owner fills this in
 * on a phone, standing at the bench, and a two-pane editor with a floating
 * sidebar is unusable there. Rupees in, rupees out — the paise conversion
 * happens on the server, never in his head.
 */
export function ProductForm({
  initial,
  categories,
  collections,
}: {
  initial: ProductFormValues;
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  function set<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

  async function submit(status: ProductFormValues["status"]) {
    if (pending) return;
    setPending(true);
    setErrors({});

    const payload: ProductInput = {
      id: values.id,
      title: values.title,
      titleHi: values.titleHi || undefined,
      categoryId: values.categoryId,
      shortDesc: values.shortDesc || undefined,
      description: values.description || undefined,
      status,
      purity: values.purity,
      priceMode: values.priceMode,
      priceRupees: num(values.priceRupees) ?? 0,
      compareAtRupees: num(values.compareAtRupees),
      makingChargeRupees: num(values.makingChargeRupees),
      weightG: num(values.weightG),
      stock: Number(values.stock || 0),
      hallmarked: values.hallmarked,
      huid: values.huid || undefined,
      isFeatured: values.isFeatured,
      isTrending: values.isTrending,
      isNewArrival: values.isNewArrival,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      images: values.images.map((i) => ({
        publicId: i.publicId, url: i.url, alt: i.alt, width: i.width, height: i.height,
      })),
      variants: values.variants
        .filter((v) => v.label.trim())
        .map((v) => ({
          id: v.id,
          label: v.label.trim(),
          stock: Number(v.stock || 0),
          priceDelta: Math.round(Number(v.priceDelta || 0) * 100),
        })),
      collectionIds: values.collectionIds,
    };

    const result = await saveProduct(payload);
    setPending(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Saved.");
    router.push("/admin/products");
    router.refresh();
  }

  const isWeightPriced = values.priceMode === "WEIGHT";
  const hasVariants = values.variants.length > 0;

  return (
    <form
      className="grid max-w-3xl gap-8 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(values.status === "ACTIVE" ? "ACTIVE" : "DRAFT");
      }}
    >
      {/* Photos first: it is what the owner has in his hand when he starts. */}
      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">Photos</h2>
          <p className="text-[13px] text-muted">
            Plain background, good light, one piece per photo.
          </p>
        </div>
        <ImageUploader images={values.images} onChange={(next) => set("images", next)} />
        {errors.images ? <p className="text-sm text-danger">{errors.images}</p> : null}
      </section>

      <section className="grid gap-5 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">The basics</h2>

        <Field label="Product name" htmlFor="title" required error={errors.title}>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Oxidised Peacock Ring"
            required
          />
        </Field>

        <Field label="Name in Hindi" htmlFor="titleHi" hint="Optional — shown under the English name">
          <Input
            id="titleHi"
            value={values.titleHi}
            onChange={(e) => set("titleHi", e.target.value)}
            placeholder="ऑक्सीडाइज़्ड मोर अंगूठी"
            className="font-deva"
          />
        </Field>

        <Field label="Category" htmlFor="categoryId" required error={errors.categoryId}>
          <Select
            id="categoryId"
            value={values.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            required
          >
            <option value="">Choose one…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>

        <Field
          label="One-line description"
          htmlFor="shortDesc"
          hint="Shows under the name in the grid"
          error={errors.shortDesc}
        >
          <Input
            id="shortDesc"
            value={values.shortDesc}
            onChange={(e) => set("shortDesc", e.target.value)}
            placeholder="Hand-carved peacock motif with an antique finish."
            maxLength={240}
          />
        </Field>

        <Field label="Full description" htmlFor="description" hint="What is it made of, how does it wear, who is it for">
          <Textarea
            id="description"
            rows={6}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </Field>
      </section>

      <section className="grid gap-5 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">Price</h2>

        <Field label="How is this priced?" htmlFor="priceMode">
          <Select
            id="priceMode"
            value={values.priceMode}
            onChange={(e) => set("priceMode", e.target.value as ProductFormValues["priceMode"])}
          >
            <option value="FIXED">Fixed price — I set the rupees</option>
            <option value="WEIGHT">By weight — silver rate × weight + making</option>
          </Select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={isWeightPriced ? "Fallback price (₹)" : "Selling price (₹)"}
            htmlFor="priceRupees"
            required
            error={errors.priceRupees}
            hint={isWeightPriced ? "Used if today's rate is missing" : undefined}
          >
            <Input
              id="priceRupees"
              inputMode="decimal"
              value={values.priceRupees}
              onChange={(e) => set("priceRupees", e.target.value)}
              placeholder="849"
              required
            />
          </Field>

          <Field
            label="Struck-through price (₹)"
            htmlFor="compareAtRupees"
            hint="Optional — shows the discount badge"
          >
            <Input
              id="compareAtRupees"
              inputMode="decimal"
              value={values.compareAtRupees}
              onChange={(e) => set("compareAtRupees", e.target.value)}
              placeholder="1299"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Weight (grams)"
            htmlFor="weightG"
            required={isWeightPriced}
            error={errors.weightG}
          >
            <Input
              id="weightG"
              inputMode="decimal"
              value={values.weightG}
              onChange={(e) => set("weightG", e.target.value)}
              placeholder="4.2"
            />
          </Field>

          {isWeightPriced ? (
            <Field
              label="Making charge (₹ per gram)"
              htmlFor="makingChargeRupees"
              error={errors.makingChargeRupees}
            >
              <Input
                id="makingChargeRupees"
                inputMode="decimal"
                value={values.makingChargeRupees}
                onChange={(e) => set("makingChargeRupees", e.target.value)}
                placeholder="12"
              />
            </Field>
          ) : null}
        </div>

        <Field label="Purity" htmlFor="purity">
          <Select
            id="purity"
            value={values.purity}
            onChange={(e) => set("purity", e.target.value as ProductFormValues["purity"])}
          >
            {PURITY_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </Field>

        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3.5">
          <input
            type="checkbox"
            checked={values.hallmarked}
            onChange={(e) => set("hallmarked", e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-brand)]"
          />
          <span>
            <span className="block text-[14.5px] font-medium text-ink">BIS hallmarked</span>
            <span className="block text-[13px] text-muted">
              Shows a hallmark badge on the product
            </span>
          </span>
        </label>

        {values.hallmarked ? (
          <Field label="HUID" htmlFor="huid" hint="The six-character code on the piece">
            <Input
              id="huid"
              value={values.huid}
              onChange={(e) => set("huid", e.target.value.toUpperCase())}
              className="tnum"
            />
          </Field>
        ) : null}
      </section>

      <section className="grid gap-5 border-t border-line pt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ink">Sizes and stock</h2>
            <p className="text-[13px] text-muted">
              Add sizes only if this comes in more than one.
            </p>
          </div>
          {!hasVariants ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                set(
                  "variants",
                  RING_SIZES.map((s) => ({ label: `Size ${s}`, stock: "2", priceDelta: "0" })),
                )
              }
            >
              Add ring sizes
            </Button>
          ) : null}
        </div>

        {hasVariants ? (
          <div className="grid gap-2">
            {values.variants.map((v, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={i === 0 ? "Size" : ""} className="flex-1">
                  <Input
                    value={v.label}
                    onChange={(e) => {
                      const next = [...values.variants];
                      next[i] = { ...v, label: e.target.value };
                      set("variants", next);
                    }}
                    placeholder="Size 16"
                  />
                </Field>

                <Field label={i === 0 ? "In stock" : ""} className="w-24">
                  <Input
                    inputMode="numeric"
                    value={v.stock}
                    onChange={(e) => {
                      const next = [...values.variants];
                      next[i] = { ...v, stock: e.target.value };
                      set("variants", next);
                    }}
                    className="tnum"
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => set("variants", values.variants.filter((_, j) => j !== i))}
                  aria-label={`Remove ${v.label || "this size"}`}
                  className="mb-1 grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                set("variants", [...values.variants, { label: "", stock: "1", priceDelta: "0" }])
              }
            >
              <Plus className="size-4" aria-hidden />
              Add another size
            </Button>
          </div>
        ) : (
          <Field label="How many do you have?" htmlFor="stock" error={errors.stock}>
            <Input
              id="stock"
              inputMode="numeric"
              value={values.stock}
              onChange={(e) => set("stock", e.target.value)}
              className="w-28 tnum"
            />
          </Field>
        )}
      </section>

      <section className="grid gap-5 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">Where it appears</h2>

        {collections.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">Collections</legend>
            <div className="flex flex-wrap gap-2">
              {collections.map((c) => {
                const on = values.collectionIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      set(
                        "collectionIds",
                        on
                          ? values.collectionIds.filter((id) => id !== c.id)
                          : [...values.collectionIds, c.id],
                      )
                    }
                    className={
                      on
                        ? "rounded-full border border-brand bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand"
                        : "rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-2 hover:border-ink-2"
                    }
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Highlight on the homepage</legend>
          <div className="grid gap-2">
            {([
              ["isFeatured", "Our own favourites"],
              ["isTrending", "Trending this week"],
              ["isNewArrival", "New arrivals"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-[14.5px] text-ink">
                <input
                  type="checkbox"
                  checked={values[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="size-4 accent-[var(--color-brand)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Search words" htmlFor="tags" hint="Comma separated — helps customers find it">
          <Input
            id="tags"
            value={values.tags}
            onChange={(e) => set("tags", e.target.value)}
            placeholder="oxidised, tribal, daily wear"
          />
        </Field>
      </section>

      {/* Sticky action bar — always reachable on a phone */}
      <div
        className="sticky bottom-0 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:mx-0 lg:px-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => void submit("ACTIVE")}>
            {pending ? "Saving…" : "Save and put on sale"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => void submit("DRAFT")}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            variant="quiet"
            disabled={pending}
            onClick={() => router.push("/admin/products")}
          >
            Cancel
          </Button>
        </div>
        <p className="mt-2 text-[12.5px] text-muted lg:hidden">
          A draft is saved but hidden from customers.
        </p>
      </div>
    </form>
  );
}
