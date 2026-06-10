"use client"

import { useEffect, useState } from "react"
import { getToolsets } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { WrenchIcon, TerminalIcon } from "lucide-react"

interface ToolsetEntry {
  name: string
  description?: string
  tools?: string[]
  [key: string]: any
}

export default function ToolsetsTab() {
  const [toolsets, setToolsets] = useState<ToolsetEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getToolsets()
      .then((data) => {
        const arr = Array.isArray(data) ? data : data.toolsets || []
        setToolsets(arr)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
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
          <CardTitle className="text-destructive">Error Loading Toolsets</CardTitle>
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
        <WrenchIcon className="h-5 w-5" />
        Toolsets ({toolsets.length})
      </h3>

      {toolsets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No toolsets found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {toolsets.map((ts) => {
            const tools = ts.tools || []
            const toolNames = tools.map((t: any) =>
              typeof t === "string" ? t : t.name || t.tool || "unnamed"
            )
            return (
              <Card key={ts.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {ts.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {ts.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {ts.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {toolNames.slice(0, 6).map((toolName: string) => (
                      <Badge key={toolName} variant="secondary" className="text-xs">
                        <TerminalIcon className="h-3 w-3 mr-0.5" />
                        {toolName}
                      </Badge>
                    ))}
                    {toolNames.length > 6 && (
                      <Badge variant="secondary" className="text-xs">
                        +{toolNames.length - 6}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
