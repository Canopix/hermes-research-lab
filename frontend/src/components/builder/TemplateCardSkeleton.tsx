import { Skeleton } from "@/components/ui/skeleton";

export function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden flex flex-col rounded-lg border bg-card h-full">
      {/* Header: icon circle + title + description */}
      <div className="px-5 pt-5 pb-3">
        <Skeleton className="w-12 h-12 rounded-lg mb-2" />
        <Skeleton className="h-5 w-3/4 mb-1" />
        <Skeleton className="h-4 w-full mb-0.5" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Content: toolset badges */}
      <div className="flex-1 px-5 flex items-start">
        <div className="flex flex-wrap gap-1 mt-2">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
      </div>

      {/* Footer: button */}
      <div className="px-5 py-3 border-t border-border/40">
        <Skeleton className="h-9 w-full rounded" />
      </div>
    </div>
  );
}
