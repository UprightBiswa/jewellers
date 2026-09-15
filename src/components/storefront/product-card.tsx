import Image from "next/image";
import Link from "next/link";
import { imageUrl } from "@/lib/images/url";
import { discountPercent, formatPaise } from "@/lib/money";
import { PURITY_LABEL } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import type { ProductCard as Card } from "@/lib/queries/catalog";
import { cn } from "@/lib/utils";

/**
 * The single product tile used by every grid and rail on the site.
 *
 * A second image, when the product has one, cross-fades in on hover — the
 * closest a website gets to turning a ring over in your hand.
 */
export function ProductCard({ product, priority }: { product: Card; priority?: boolean }) {
  const off = discountPercent(product.price, product.compareAtPrice);

  return (
    <article className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="block focus-visible:outline-none"
        aria-label={product.title}
      >
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <Image
            src={imageUrl(product.image, "card")}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={cn(
              "object-cover transition-[opacity,transform] duration-500 ease-[var(--ease-out-expo)]",
              "group-hover:scale-[1.04]",
              product.secondImage && "group-hover:opacity-0",
            )}
          />

          {product.secondImage ? (
            <Image
              src={imageUrl(product.secondImage, "card")}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1.5">
            {off > 0 ? (
              <Badge tone="solid" size="xs">{off}% off</Badge>
            ) : null}
            {product.hallmarked ? (
              <Badge tone="gold" size="xs">BIS Hallmark</Badge>
            ) : null}
            {product.isLivePrice ? (
              <Badge tone="neutral" size="xs">Live rate</Badge>
            ) : null}
          </div>

          {!product.inStock ? (
            <div className="absolute inset-0 grid place-items-center bg-surface/75 backdrop-blur-[2px]">
              <Badge tone="neutral" size="md">Sold out</Badge>
            </div>
          ) : null}
        </div>

        <div className="mt-3 grid gap-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
            {PURITY_LABEL[product.purity]}
          </p>

          <h3 className="font-display text-[17px] leading-snug text-ink group-hover:text-brand transition-colors">
            {product.title}
          </h3>

          {product.titleHi ? (
            <p className="deva text-[13px] text-muted">{product.titleHi}</p>
          ) : null}

          <div className="mt-0.5 flex items-baseline gap-2 tnum">
            <span className="text-[15px] font-semibold text-ink">
              {formatPaise(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <span className="text-[13px] text-muted line-through">
                {formatPaise(product.compareAtPrice)}
              </span>
            ) : null}
            {product.weightG ? (
              <span className="ml-auto text-[12px] text-muted">{product.weightG} g</span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="skeleton aspect-square rounded-[var(--radius-card)]" />
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-4 w-40 rounded" />
      <div className="skeleton h-4 w-24 rounded" />
    </div>
  );
}
