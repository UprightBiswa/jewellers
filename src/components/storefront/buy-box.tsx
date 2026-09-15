"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cart } from "@/lib/cart/store";
import { formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  stock: number;
  priceDelta: number;
};

/**
 * Size, quantity, and the two buttons that actually matter.
 *
 * A size is never preselected when a product has several: picking the wrong
 * ring size is the single most expensive mistake a jewellery shop can let a
 * customer make, so the choice has to be deliberate.
 */
export function BuyBox({
  productId,
  productTitle,
  basePrice,
  variants,
  stock,
  whatsapp,
  productUrl,
}: {
  productId: string;
  productTitle: string;
  basePrice: number;
  variants: Variant[];
  stock: number;
  whatsapp?: string;
  productUrl: string;
}) {
  const router = useRouter();
  const hasVariants = variants.length > 0;

  const [variantId, setVariantId] = useState<string | null>(
    hasVariants && variants.length === 1 ? (variants[0]?.id ?? null) : null,
  );
  const [qty, setQty] = useState(1);
  const [pending, setPending] = useState(false);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const available = hasVariants ? (selected?.stock ?? 0) : stock;
  const price = basePrice + (selected?.priceDelta ?? 0);
  const soldOut = hasVariants
    ? variants.every((v) => v.stock === 0)
    : stock === 0;

  async function add(thenCheckout = false) {
    if (hasVariants && !variantId) {
      toast.error("Please choose a size first.");
      return;
    }
    if (pending) return;

    setPending(true);
    try {
      await cart.add({ productId, variantId, qty });
      toast.success(`${productTitle} added to your bag.`);
      if (thenCheckout) router.push("/checkout");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that to your bag.");
    } finally {
      setPending(false);
    }
  }

  if (soldOut) {
    return (
      <div className="grid gap-3">
        <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4 text-center">
          <p className="font-medium text-ink">Sold out for now</p>
          <p className="mt-1 text-sm text-muted">
            We make this to order too — message us and we will tell you how long it takes.
          </p>
        </div>
        {whatsapp ? (
          <Button asChild variant="secondary" block size="lg">
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                `Hello, is "${productTitle}" available to order? ${productUrl}`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask on WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {hasVariants ? (
        <fieldset>
          <legend className="mb-2 flex items-baseline justify-between gap-3 text-sm font-medium text-ink">
            <span>Size</span>
            <a href="/pages/about" className="text-[13px] font-normal text-brand underline-offset-4 hover:underline">
              Not sure of your size?
            </a>
          </legend>

          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  aria-pressed={variantId === v.id}
                  onClick={() => {
                    setVariantId(v.id);
                    setQty(1);
                  }}
                  className={cn(
                    "h-10 min-w-16 rounded-lg border px-3 text-sm transition-colors",
                    out && "cursor-not-allowed border-line text-muted/50 line-through",
                    !out && variantId === v.id && "border-brand bg-brand-soft font-semibold text-brand",
                    !out && variantId !== v.id && "border-line-strong text-ink hover:border-ink-2",
                  )}
                >
                  {v.label.replace(/^Size\s+/i, "")}
                </button>
              );
            })}
          </div>

          {selected && selected.stock <= 3 ? (
            <p className="mt-2 text-sm text-warn">
              {selected.stock === 1 ? "Last one in this size." : `Only ${selected.stock} left in this size.`}
            </p>
          ) : null}
        </fieldset>
      ) : stock <= 3 ? (
        <p className="text-sm text-warn">
          {stock === 1 ? "Last one in stock." : `Only ${stock} left.`}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <div className="flex items-center rounded-lg border border-line-strong">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Reduce quantity"
            className="grid size-10 place-items-center text-ink-2 disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-10 text-center text-[15px] font-medium tnum" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(available || 1, q + 1))}
            disabled={qty >= (available || 1)}
            aria-label="Increase quantity"
            className="grid size-10 place-items-center text-ink-2 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <p className="text-sm text-muted tnum">
          {formatPaise(price)} each · {formatPaise(price * qty)} total
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Button size="lg" block disabled={pending} onClick={() => add(false)}>
          <ShoppingBag className="size-4" aria-hidden />
          {pending ? "Adding…" : "Add to bag"}
        </Button>
        <Button size="lg" block variant="secondary" disabled={pending} onClick={() => add(true)}>
          Buy now
        </Button>
      </div>

      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Hello, I have a question about "${productTitle}". ${productUrl}`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm text-brand underline-offset-4 hover:underline"
        >
          Ask a question on WhatsApp
        </a>
      ) : null}
    </div>
  );
}
