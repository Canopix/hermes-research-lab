"use client"

import { useEffect, useState } from "react"
import { getSystemOverview } from "@/lib/api"
import { SystemOverview as SystemOverviewType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  UsersIcon,
  CodeIcon,
  WrenchIcon,
  ServerIcon,
  ActivityIcon,
} from "lucide-react"

// Fallback icon components since HookIcon may not exist
function HooksIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6c0 2-3 3-3 3" />
      <path d="M15 9c0 2 3 3 3 3" />
      <path d="M6 18c0-2 3-3 3-3" />
      <path d="M9 15c0-2-3-3-3-3" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

const statCards = [
  {
    title: "Profiles",
    value: "profiles_count",
    icon: UsersIcon,
    description: "Configured profiles",
    color: "text-blue-500",
  },
  {
    title: "Skills",
    value: "skills_count",
    icon: CodeIcon,
    description: "Installed skills",
    color: "text-green-500",
  },
  {
    title: "Toolsets",
    value: "toolsets_count",
    icon: WrenchIcon,
    description: "Available toolsets",
    color: "text-purple-500",
  },
  {
    title: "Hooks",
    value: "hooks_count",
    icon: HooksIcon,
    description: "Configured hooks",
    color: "text-orange-500",
  },
]

export default function SystemOverview() {
  const [data, setData] = useState<SystemOverviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSystemOverview()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const healthStatus = data?.health?.status || "unknown"
  const isHealthy = healthStatus === "healthy" || healthStatus === "ok"

  return (
    <div className="space-y-6">
      {/* Health status banner */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ActivityIcon className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge
              variant={isHealthy ? "default" : "destructive"}
              className="text-sm"
            >
              {isHealthy ? "Healthy" : "Unhealthy"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {data?.health?.error || "All systems operational"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          const value = data ? (data as Record<string, any>)[card.value] : 0
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Jobs count */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerIcon className="h-5 w-5" />
            Active Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data?.jobs_count ?? 0}</div>
          <p className="text-sm text-muted-foreground">
            Running agents on the system
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
