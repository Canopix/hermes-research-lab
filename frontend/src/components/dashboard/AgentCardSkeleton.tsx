import { Skeleton } from "@/components/ui/skeleton";

export function AgentCardSkeleton() {
  return (
    <div className="overflow-hidden flex flex-col rounded-lg border bg-card">
      {/* Header: avatar circle + name + template badge */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      </div>

      {/* Body: schedule info + progress + output preview */}
      <div className="flex-1 px-5 space-y-4">
        {/* Next Run / Last Run grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>

        {/* Output preview box */}
        <div className="border border-border/50 rounded-md bg-muted/30 p-3 space-y-2">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>

      {/* Footer: action buttons */}
      <div className="px-5 py-3 border-t border-border/40 bg-muted/10">
        <div className="flex items-center gap-1.5 justify-between">
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}
