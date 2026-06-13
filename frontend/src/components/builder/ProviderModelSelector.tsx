'use client'

import React from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import type { ProviderOption } from "@/lib/types"

interface Props {
  providers: ProviderOption[]
  selectedProvider: string
  selectedModel: string
  onProviderChange: (id: string) => void
  onModelChange: (model: string) => void
}

export function ProviderModelSelector({ providers, selectedProvider, selectedModel, onProviderChange, onModelChange }: Props) {
  const currentProvider = providers.find(p => p.id === selectedProvider) || providers.find(p => p.is_default)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">Provider</Label>
        <Select value={selectedProvider} onValueChange={(value) => value && onProviderChange(value)}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="Seleccionar provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  {p.name}
                  {p.is_default && <Badge variant="secondary" className="text-[10px]">default</Badge>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentProvider?.base_url && (
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {currentProvider.base_url}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">Modelo</Label>
        <Input
          id="model"
          type="text"
          placeholder={currentProvider?.model || "model-name"}
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground/60">
          Nombre del modelo a usar. Deja vacío para usar el default del provider.
        </p>
      </div>
    </div>
  )
}
