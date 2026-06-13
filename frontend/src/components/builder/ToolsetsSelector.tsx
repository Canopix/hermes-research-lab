'use client'

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { ToolsetInfo } from "@/lib/types"

interface Props {
  toolsets: ToolsetInfo[]
  selectedToolsets: string[]
  onToggle: (name: string) => void
}

export function ToolsetsSelector({ toolsets, selectedToolsets, onToggle }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground/60">
        Herramientas disponibles para el agente. El template ya sugiere algunas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-[240px] overflow-y-auto">
        {toolsets.map(ts => (
          <label
            key={ts.name}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <Checkbox
              checked={selectedToolsets.includes(ts.name)}
              onCheckedChange={() => onToggle(ts.name)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium font-mono">{ts.name}</span>
                {ts.enabled && <Badge variant="secondary" className="text-[10px]">active</Badge>}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
