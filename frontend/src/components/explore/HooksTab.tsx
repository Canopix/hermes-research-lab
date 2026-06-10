"use client"

import { useEffect, useState } from "react"
import { getSystemHooks, getSystemActivity } from "@/lib/api"
import { HookInfo, ActivityLog } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileTextIcon, PlayIcon, FileCodeIcon } from "lucide-react"

export default function HooksTab() {
  const [hooks, setHooks] = useState<HookInfo[]>([])
  const [activity, setActivity] = useState<ActivityLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getSystemHooks().then(setHooks),
      getSystemActivity().then(setActivity),
    ]).catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
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
        <Separator />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Hooks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FileTextIcon className="h-5 w-5" />
          Configured Hooks ({hooks.length})
        </h3>
        {hooks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hooks configured. Place scripts in ~/.hermes/hooks/ to create hooks.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {hooks.map((hook) => (
              <Card key={hook.name} className="group/card">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {hook.executable ? (
                      <PlayIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <FileCodeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-sm font-medium">
                      {hook.name}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{hook.size} bytes</span>
                    <span>•</span>
                    <span>
                      {new Date(hook.modified * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  {hook.executable && (
                    <Badge variant="default" className="mt-2 text-xs">
                      Executable
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <FileTextIcon className="h-5 w-5" />
          Activity Log
        </h3>
        {activity && activity.content ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {activity.lines} lines from {activity.source}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 w-full rounded-md border p-3">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {activity.content}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {activity?.note || "No activity log found. Ensure the monitoring hook is installed."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
