"use client"

import { useEffect, useState } from "react"
import { getMcpServers } from "@/lib/api"
import { McpServerInfo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ServerIcon } from "lucide-react"

export default function McpTab() {
  const [servers, setServers] = useState<McpServerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMcpServers()
      .then(setServers)
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
          <CardTitle className="text-destructive">Error Loading MCP Servers</CardTitle>
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
        <ServerIcon className="h-5 w-5" />
        MCP Servers ({servers.length})
      </h3>

      {servers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No MCP servers configured. Add MCP server configs to your profile config.yaml.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <Card key={server.name}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ServerIcon className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-medium">
                    {server.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {server.profile && (
                  <Badge variant="secondary" className="text-xs mb-2">
                    {server.profile}
                  </Badge>
                )}
                <ScrollArea className="h-24 w-full">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(server.config, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
