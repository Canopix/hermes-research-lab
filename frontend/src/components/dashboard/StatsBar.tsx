import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function StatsBar({ stats }: { stats: StatsCardProps[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.description && (
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            )}
            {stat.trend && (
              <p className={cn(
                "text-xs mt-1",
                stat.trend.isPositive ? "text-emerald-500" : "text-red-500"
              )}>
                {stat.trend.isPositive ? "+" : "-"}{stat.trend.value} <span className="text-muted-foreground">from yesterday</span>
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
