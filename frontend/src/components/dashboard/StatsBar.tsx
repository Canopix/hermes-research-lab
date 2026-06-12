"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  accentColor?: 'primary' | 'success' | 'warning' | 'info'
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
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
    borderColor: 'border-l-primary',
  },
  success: {
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    valueColor: 'text-foreground',
    borderColor: 'border-l-success',
  },
  warning: {
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    valueColor: 'text-foreground',
    borderColor: 'border-l-warning',
  },
  info: {
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
    valueColor: 'text-foreground',
    borderColor: 'border-l-info',
  },
}

const defaultColor = colorMap.primary

export function StatsBar({ stats }: { stats: StatsCardProps[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const colors = stat.accentColor ? (colorMap[stat.accentColor] || defaultColor) : defaultColor
        return (
          <Card
            key={stat.title}
            className={cn(
              "group transition-all duration-200 hover:shadow-sm border-l-2 cursor-default",
              colors.borderColor
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {stat.title}
              </CardTitle>
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-transform group-hover:scale-105",
                colors.iconBg
              )}>
                <stat.icon className={cn("h-3.5 w-3.5", colors.iconColor)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn("text-xl font-bold tracking-tight font-mono", colors.valueColor)}>
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
