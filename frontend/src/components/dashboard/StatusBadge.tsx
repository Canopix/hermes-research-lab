import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type AgentLifecycleStatus = 'active' | 'paused' | 'error' | 'running'

interface StatusBadgeProps {
  status: AgentLifecycleStatus
}

const statusLabels: Record<AgentLifecycleStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  error: "Error",
  running: "Ejecutando",
}

const dotColors: Record<AgentLifecycleStatus, string> = {
  active: "bg-success",
  paused: "bg-warning",
  error: "bg-error",
  running: "bg-primary",
}

const badgeVariants: Record<AgentLifecycleStatus, string> = {
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  running: "bg-primary/10 text-primary border-primary/20",
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const isPulsing = status === 'active' || status === 'running'

  return (
    <Badge variant="outline" className={cn("font-semibold text-[10px] flex items-center gap-1.5 px-2 py-0.5 rounded-md", badgeVariants[status])}>
      <span className={cn("relative h-1.5 w-1.5 rounded-full", dotColors[status])}>
        {isPulsing && (
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping",
            status === 'running' ? "bg-primary" : "bg-success"
          )} />
        )}
      </span>
      {statusLabels[status]}
    </Badge>
  )
}
