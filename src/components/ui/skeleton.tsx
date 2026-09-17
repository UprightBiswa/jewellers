import { cn } from "@/lib/utils";

/**
 * A shimmering block standing in for content that is on its way.
 *
 * The point of a skeleton is that it has the SHAPE of what is coming, so the
 * page does not jump when the real thing lands. Each helper below mirrors a real
 * component's layout — if that component changes, its skeleton should too.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

/** Mirrors ProductCard. */
export function ProductCardSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="aspect-square rounded-[var(--radius-card)]" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading products"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors the product detail page: gallery on the left, buy box on the right. */
export function ProductDetailSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14" role="status" aria-label="Loading">
      <Skeleton className="aspect-square rounded-[var(--radius-card)]" />
      <div className="grid gap-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-4/5" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-lg" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

/** Mirrors the category rail on the homepage. */
export function CategoryRailSkeleton() {
  return (
    <div className="flex gap-3 sm:grid sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="w-28 shrink-0 sm:w-auto">
          <Skeleton className="aspect-square rounded-full sm:rounded-[var(--radius-card)]" />
          <Skeleton className="mx-auto mt-2.5 h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors a row in any admin list. */
export function AdminRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="flex-1 grid gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
