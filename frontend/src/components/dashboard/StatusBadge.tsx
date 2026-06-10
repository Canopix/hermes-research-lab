import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'error'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    paused: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    error: "bg-red-500/10 text-red-500 border-red-500/20",
  }

  return (
    <Badge variant="outline" className={cn("capitalize font-medium", variants[status])}>
      {status}
    </Badge>
  )
}
