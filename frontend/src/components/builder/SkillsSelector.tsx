'use client'

import React, { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search } from "lucide-react"
import type { SkillInfo } from "@/lib/types"

interface Props {
  skills: SkillInfo[]
  selectedSkills: string[]
  recommendedSkills: string[]
  onToggle: (name: string) => void
}

export function SkillsSelector({ skills, selectedSkills, recommendedSkills, onToggle }: Props) {
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    let list = skills
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const aRec = recommendedSkills.includes(a.name) ? 0 : 1
      const bRec = recommendedSkills.includes(b.name) ? 0 : 1
      if (aRec !== bRec) return aRec - bRec
      return a.name.localeCompare(b.name)
    })
  }, [skills, search, recommendedSkills])

  const displaySkills = showAll ? filtered : filtered.filter(s => recommendedSkills.includes(s.name) || selectedSkills.includes(s.name))
  const hiddenCount = filtered.length - displaySkills.length

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {recommendedSkills.length > 0 && (
        <p className="text-xs text-muted-foreground/60">
          ✨ Recomendadas por el template
        </p>
      )}

      <div className="space-y-1 max-h-[240px] overflow-y-auto">
        {displaySkills.map(skill => {
          const isRecommended = recommendedSkills.includes(skill.name)
          return (
            <label
              key={skill.name}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={selectedSkills.includes(skill.name)}
                onCheckedChange={() => onToggle(skill.name)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{skill.name}</span>
                  {isRecommended && <Badge variant="secondary" className="text-[10px]">✨</Badge>}
                  {skill.category && skill.category !== "general" && (
                    <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                  )}
                </div>
                {skill.description && (
                  <p className="text-xs text-muted-foreground/60 truncate">{skill.description}</p>
                )}
              </div>
            </label>
          )
        })}
      </div>

      {hiddenCount > 0 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-xs text-primary hover:underline w-full text-center py-1"
        >
          Mostrar {hiddenCount} skills más
        </button>
      )}
      {showAll && hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(false)}
          className="text-xs text-primary hover:underline w-full text-center py-1"
        >
          Mostrar solo recomendadas y seleccionadas
        </button>
      )}
    </div>
  )
}
