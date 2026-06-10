"use client"

import { useEffect, useState } from "react"
import { getGlobalConfig } from "@/lib/api"
import { GlobalConfig } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SettingsIcon } from "lucide-react"

export default function ConfigTab() {
  const [config, setConfig] = useState<GlobalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getGlobalConfig()
      .then(setConfig)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Config</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <SettingsIcon className="h-5 w-5" />
        Global Config
      </h3>

      {config ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              ~/.hermes/config.yaml (read-only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full rounded-lg border">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                {config.content}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No global config.yaml found at ~/.hermes/config.yaml.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
