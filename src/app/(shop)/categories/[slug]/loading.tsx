import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page py-8">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="mt-5 h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-80" />
      <div className="mt-8 mb-6 flex items-center justify-between border-b border-line pb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
