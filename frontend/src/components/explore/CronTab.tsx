"use client"

import { useEffect, useState } from "react"
import { getCronOverview } from "@/lib/api"
import { CronJobInfo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ClockIcon } from "lucide-react"

export default function CronTab() {
  const [jobs, setJobs] = useState<CronJobInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCronOverview()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Cron Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Group jobs by profile
  const groupedByProfile: Record<string, CronJobInfo[]> = {}
  jobs.forEach((job) => {
    const profile = job.profile || "global"
    if (!groupedByProfile[profile]) {
      groupedByProfile[profile] = []
    }
    groupedByProfile[profile].push(job)
  })

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ClockIcon className="h-5 w-5" />
        Cron Jobs ({jobs.length})
      </h3>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No cron jobs configured. Add cron_jobs to your profile config.yaml.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByProfile).map(([profile, profileJobs]) => (
            <div key={profile}>
              <Separator />
              <h4 className="text-sm font-medium flex items-center gap-2 mt-4 mb-3">
                <Badge variant="outline">{profile}</Badge>
                <span className="text-muted-foreground">
                  ({profileJobs.length} job{profileJobs.length !== 1 ? "s" : ""})
                </span>
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {profileJobs.map((job, idx) => {
                  const name = job.name || job.schedule || `Job ${idx + 1}`
                  const schedule = job.schedule || job.raw || "N/A"
                  const enabled = job.enabled !== false
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            {name}
                          </CardTitle>
                          <Badge
                            variant={enabled ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-2">
                          Schedule:
                        </div>
                        <ScrollArea className="h-16 w-full">
                          <pre className="text-xs font-mono bg-muted p-2 rounded-md whitespace-pre-wrap">
                            {typeof schedule === "string"
                              ? schedule
                              : JSON.stringify(schedule, null, 2)}
                          </pre>
                        </ScrollArea>
                        {job.command && (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground">
                              Command:
                            </div>
                            <pre className="text-xs font-mono bg-muted p-2 rounded-md mt-1 overflow-x-auto">
                              {job.command}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
