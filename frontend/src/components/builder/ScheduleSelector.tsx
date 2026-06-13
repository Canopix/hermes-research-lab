'use client'

import React, { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"

const PRESETS = [
  { label: "Cada 30 minutos", value: "every 30m" },
  { label: "Cada hora", value: "every 1h" },
  { label: "Cada 6 horas", value: "every 6h" },
  { label: "Cada 12 horas", value: "every 12h" },
  { label: "Diario a las 9:00", value: "0 9 * * *" },
  { label: "Diario a las 2:00", value: "0 2 * * *" },
  { label: "Semanal (lunes 9:00)", value: "0 9 * * 1" },
  { label: "Personalizado...", value: "__custom__" },
]

interface Props {
  value: string
  onChange: (schedule: string) => void
}

export function ScheduleSelector({ value, onChange }: Props) {
  const isPreset = PRESETS.some(p => p.value === value)
  const [mode, setMode] = useState<"preset" | "custom">(isPreset ? "preset" : "custom")
  const [customValue, setCustomValue] = useState(isPreset ? value : value)

  const handlePresetChange = (v: string | null) => {
    if (v === "__custom__") {
      setMode("custom")
      onChange(customValue)
    } else if (v !== null) {
      setMode("preset")
      onChange(v)
    }
  }

  const handleCustomChange = (v: string) => {
    setCustomValue(v)
    setMode("custom")
    onChange(v)
  }

  const previewSchedule = (s: string): string => {
    const preset = PRESETS.find(p => p.value === s)
    if (preset) return preset.label
    if (s.match(/^\d+ [a-z]+$/i)) return `Cada ${s.replace("every ", "")}`
    if (s.match(/^[\d\*\/\-\,]+ [\d\*\/\-\,]+ [\d\*\/\-\,]+ [\d\*\/\-\,]+ [\d\*\/\-\,]+$/)) {
      return `Cron: ${s}`
    }
    if (s.includes("T")) return `Ejecutar una vez: ${s}`
    return s
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <Select
          value={mode === "preset" ? value : "__custom__"}
          onValueChange={handlePresetChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar frecuencia" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mode === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="customSchedule">Expresión cron o duración</Label>
          <Input
            id="customSchedule"
            type="text"
            placeholder="0 9 * * * o every 6h"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground/60">
            Formatos: <code>30m</code>, <code>every 2h</code>, <code>0 9 * * *</code> (cron), o <code>2026-12-31T23:59:00</code> (one-shot)
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm">{previewSchedule(value)}</span>
      </div>
    </div>
  )
}
