"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  accentColor?: 'blue' | 'green' | 'purple' | 'amber'
  trend?: {
    value: string
    isPositive: boolean
  }
}

const colorMap: Record<string, {
  iconBg: string
  iconColor: string
  valueColor: string
  borderColor: string
}> = {
  blue: {
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
    borderColor: 'border-l-primary',
  },
  green: {
    iconBg: 'bg-success/10 dark:bg-success/15',
    iconColor: 'text-success',
    valueColor: 'text-foreground',
    borderColor: 'border-l-success',
  },
  purple: {
    iconBg: 'bg-[oklch(0.55_0.18_300)]/10 dark:bg-[oklch(0.55_0.18_300)]/15',
    iconColor: 'text-[oklch(0.55_0.18_300)]',
    valueColor: 'text-foreground',
    borderColor: 'border-l-[oklch(0.55_0.18_300)]',
  },
  amber: {
    iconBg: 'bg-warning/10 dark:bg-warning/15',
    iconColor: 'text-warning',
    valueColor: 'text-foreground',
    borderColor: 'border-l-warning',
  },
}

const defaultColor = colorMap.blue

export function StatsBar({ stats }: { stats: StatsCardProps[] }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const colors = stat.accentColor ? (colorMap[stat.accentColor] || defaultColor) : defaultColor
        return (
          <Card
            key={stat.title}
            className={cn(
              "group transition-all duration-200 hover:shadow-md border-l-[3px] cursor-default",
              colors.borderColor
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                colors.iconBg
              )}>
                <stat.icon className={cn("h-4 w-4", colors.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold tracking-tight", colors.valueColor)}>
                {stat.value}
              </div>
              {stat.description && (
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              )}
              {stat.trend && (
                <p className={cn(
                  "text-xs mt-1 font-medium",
                  stat.trend.isPositive ? "text-success" : "text-error"
                )}>
                  {stat.trend.isPositive ? "+" : "−"}{stat.trend.value}{" "}
                  <span className="text-muted-foreground font-normal">desde ayer</span>
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
