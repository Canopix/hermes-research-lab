"use client"

import { useEffect, useState, useMemo } from "react"
import { getSkills } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CodeIcon, SearchIcon, FolderIcon } from "lucide-react"

interface SkillEntry {
  name: string
  description?: string
  category?: string
  [key: string]: any
}

export default function SkillsGrid() {
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  useEffect(() => {
    getSkills()
      .then((data) => {
        // Normalize: some APIs return { skills: [...] }, others return [...]
        const arr = Array.isArray(data) ? data : data.skills || []
        setSkills(arr)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    skills.forEach((s) => {
      const cat = s.category || s.scope || s.group || "uncategorized"
      cats.add(cat)
    })
    return Array.from(cats).sort()
  }, [skills])

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const matchSearch =
        !search ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
      const matchCat =
        categoryFilter === "all" ||
        (s.category || s.scope || s.group || "uncategorized") === categoryFilter
      return matchSearch && matchCat
    })
  }, [skills, search, categoryFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
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
          <CardTitle className="text-destructive">Error Loading Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CodeIcon className="h-5 w-5" />
          Skills ({filtered.length}/{skills.length})
        </h3>
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v || "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {skills.length === 0
              ? "No skills installed."
              : "No skills match your filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <Card key={skill.name} className="group/card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium truncate">
                    {skill.name}
                  </CardTitle>
                  <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                {skill.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-3">
                    {skill.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {skill.category || skill.scope || skill.group || "uncategorized"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
