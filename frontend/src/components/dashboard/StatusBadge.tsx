import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'error'
}

const statusLabels: Record<StatusBadgeProps['status'], string> = {
  active: "Activo",
  paused: "Pausado",
  error: "Error",
}

const dotColors: Record<StatusBadgeProps['status'], string> = {
  active: "bg-success",
  paused: "bg-warning",
  error: "bg-error",
}

const badgeVariants: Record<StatusBadgeProps['status'], string> = {
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isPulsing = status === 'active'

  return (
    <Badge variant="outline" className={cn("font-semibold text-[10px] flex items-center gap-1.5 px-2 py-0.5 rounded-full", badgeVariants[status])}>
      <span className={cn("relative h-1.5 w-1.5 rounded-full", dotColors[status])}>
        {isPulsing && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-50 animate-ping" />
        )}
      </span>
      {statusLabels[status]}
    </Badge>
  )
}
