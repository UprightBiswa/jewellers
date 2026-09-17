import { CategoryRailSkeleton, ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      {/* Mirrors the hero: text column on the left, image on the right. */}
      <section className="border-b border-line bg-surface">
        <div className="container-page grid items-center gap-8 py-12 md:grid-cols-2 md:py-20">
          <div className="grid gap-4">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-14 w-full max-w-md" />
            <Skeleton className="h-14 w-3/4 max-w-sm" />
            <Skeleton className="mt-2 h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-4/5 max-w-md" />
            <div className="mt-3 flex gap-3">
              <Skeleton className="h-13 w-48 rounded-lg" />
              <Skeleton className="h-13 w-32 rounded-lg" />
            </div>
          </div>
          <Skeleton className="aspect-4/5 rounded-[var(--radius-card)] md:aspect-square" />
        </div>
      </section>

      <section className="container-page py-12">
        <Skeleton className="h-8 w-64" />
        <div className="mt-6">
          <CategoryRailSkeleton />
        </div>
      </section>

      <section className="container-page py-8">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6">
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
