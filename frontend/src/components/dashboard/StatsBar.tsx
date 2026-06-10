"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimateIn } from "@/components/AnimateIn"

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

const colorMap: Record<string, { from: string; to: string; icon: string; text: string; ring: string }> = {
  blue: {
    from: 'from-blue-500/10',
    to: 'to-transparent',
    icon: 'bg-blue-500/15 text-blue-500',
    text: 'text-blue-500',
    ring: 'ring-blue-500/20',
  },
  green: {
    from: 'from-emerald-500/10',
    to: 'to-transparent',
    icon: 'bg-emerald-500/15 text-emerald-500',
    text: 'text-emerald-500',
    ring: 'ring-emerald-500/20',
  },
  purple: {
    from: 'from-violet-500/10',
    to: 'to-transparent',
    icon: 'bg-violet-500/15 text-violet-500',
    text: 'text-violet-500',
    ring: 'ring-violet-500/20',
  },
  amber: {
    from: 'from-amber-500/10',
    to: 'to-transparent',
    icon: 'bg-amber-500/15 text-amber-500',
    text: 'text-amber-500',
    ring: 'ring-amber-500/20',
  },
}

const defaultColor = colorMap.blue

export function StatsBar({ stats }: { stats: StatsCardProps[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => {
        const colors = stat.accentColor ? (colorMap[stat.accentColor] || defaultColor) : defaultColor
        return (
          <AnimateIn key={stat.title} delay={i * 100} direction="up" duration={400}>
            <Card
              className={cn(
                "bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-lg cursor-default",
                colors.from
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={cn("text-sm font-medium", colors.text)}>
                  {stat.title}
                </CardTitle>
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", colors.icon)}>
                  <stat.icon className="h-4 w-4" />
                </div>
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
                    {stat.trend.isPositive ? "+" : "−"}{stat.trend.value}{" "}
                    <span className="text-muted-foreground">desde ayer</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </AnimateIn>
        )
      })}
    </div>
  )
}
