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
  active: "bg-emerald-500",
  paused: "bg-amber-500",
  error: "bg-red-500",
}

const badgeVariants: Record<StatusBadgeProps['status'], string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  error: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isPulsing = status === 'active'

  return (
    <Badge variant="outline" className={cn("font-medium flex items-center gap-1.5", badgeVariants[status])}>
      <span className={cn("relative h-2 w-2 rounded-full", dotColors[status])}>
        {isPulsing && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50 animate-ping" />
        )}
      </span>
      {statusLabels[status]}
    </Badge>
  )
}
