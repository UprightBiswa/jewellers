import { ProductDetailSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-6">
      <Skeleton className="h-3.5 w-56" />
      <div className="mt-6">
        <ProductDetailSkeleton />
      </div>
    </div>
  );
}
