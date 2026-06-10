import { Skeleton } from "@/components/ui/skeleton";

export function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-card p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
