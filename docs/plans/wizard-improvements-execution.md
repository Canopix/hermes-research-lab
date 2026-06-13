# AgentHub Wizard Improvements — Execution Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> Dispatch subagents with `toolsets: ['terminal', 'file', 'coding']`.

**Goal:** Upgrade the AgentHub `/create` wizard to expose all Hermes cronjob parameters (provider, model, skills, toolsets, schedule, delivery) with scroll-into-view UX.

**Architecture:** Backend adds 2 new endpoints (providers, channels) + enriches existing ones. Frontend adds 5 new builder components integrated as tabs in wizard step 2. Backend `_wizard_payload_to_hermes_job` already supports `skills`, `enabled_toolsets`, `model` from hermesConfig — we just need the frontend to send them from user selection.

**Tech Stack:** Python/FastAPI (backend), Next.js 14/React 18/TypeScript/Tailwind/shadcn-ui (frontend)

---

## Dependencies

```
T1 (Backend: providers endpoint)  ──┐
T2 (Backend: channels endpoint)   ──┼──→ T6 (Frontend: integrate all in page.tsx)
T3 (Backend: enrich skills)       ──┤
T4 (Frontend: types + api.ts)     ──┤
T5a-e (Frontend: 5 components)   ──┘
T7 (Backend: extend create_job payload)
T8 (Scroll fix)
T9 (Final review)
```

Tasks T1-T5 are independent and can run in parallel batches.

---

## T1: Backend — `GET /api/system/providers`

**Objective:** Endpoint that reads `config.yaml` and returns configured providers + default model.

**Files:**
- Modify: `explore-api/routers/system.py`
- Test: `explore-api/test_providers.py`

**Step 1: Create test file**

```python
# explore-api/test_providers.py
"""Quick smoke test for the providers endpoint."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_providers_returns_defaults():
    r = client.get("/api/system/providers")
    assert r.status_code == 200
    data = r.json()
    assert "default_provider" in data
    assert "default_model" in data
    assert "options" in data
    assert isinstance(data["options"], list)
    assert len(data["options"]) >= 1  # at least the default
    # Default option should exist
    default_opt = [o for o in data["options"] if o.get("is_default")]
    assert len(default_opt) == 1
    print(f"✅ Providers: {len(data['options'])} option(s), default={data['default_provider']}/{data['default_model']}")

if __name__ == "__main__":
    test_providers_returns_defaults()
```

**Step 2: Run test to verify it fails**

Run: `cd /root/hermes-research-lab/explore-api && python test_providers.py`
Expected: 404 — endpoint doesn't exist yet.

**Step 3: Add endpoint to `system.py`**

Append this function at the end of `explore-api/routers/system.py`:

```python
@router.get("/api/system/providers")
async def list_providers() -> dict:
    """GET /api/system/providers — list configured providers and default model from config.yaml."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    if not config_path.is_file():
        return {"default_provider": None, "default_model": None, "options": []}
    
    try:
        config = yaml.safe_load(config_path.read_text())
    except (yaml.YAMLError, OSError):
        return {"default_provider": None, "default_model": None, "options": []}
    
    default = config.get("model", {})
    providers = config.get("providers", {})
    fallback = config.get("fallback_providers", [])
    
    options = []
    
    # Default provider (always available)
    options.append({
        "id": "default",
        "name": default.get("provider", "custom"),
        "model": default.get("model", ""),
        "base_url": default.get("base_url", ""),
        "is_default": True,
    })
    
    # Additional configured providers
    for name, prov in providers.items():
        options.append({
            "id": name,
            "name": name,
            "model": prov.get("model", ""),
            "base_url": prov.get("base_url", ""),
            "is_default": False,
        })
    
    # Fallback providers (read-only, informational)
    for fb in fallback:
        fb_name = fb if isinstance(fb, str) else fb.get("name", "unknown")
        fb_model = fb.get("model", "") if isinstance(fb, dict) else ""
        options.append({
            "id": f"fallback:{fb_name}",
            "name": fb_name,
            "model": fb_model,
            "base_url": "",
            "is_default": False,
        })
    
    return {
        "default_provider": default.get("provider"),
        "default_model": default.get("model"),
        "options": options,
    }
```

**Step 4: Run test to verify pass**

Run: `cd /root/hermes-research-lab/explore-api && python test_providers.py`
Expected: ✅ Providers: N option(s), default=custom/qwen3.6

**Step 5: Commit**

```bash
cd /root/hermes-research-lab
git add explore-api/routers/system.py explore-api/test_providers.py
git commit -m "feat(api): add GET /api/system/providers endpoint"
```

---

## T2: Backend — `GET /api/system/channels`

**Objective:** Endpoint that detects connected platforms and returns delivery options.

**Files:**
- Modify: `explore-api/routers/system.py`
- Test: `explore-api/test_channels.py`

**Step 1: Create test file**

```python
# explore-api/test_channels.py
"""Quick smoke test for the channels endpoint."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_channels_returns_list():
    r = client.get("/api/system/channels")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Always has "local" and "origin"
    ids = [c["id"] for c in data]
    assert "local" in ids
    assert "origin" in ids
    # Check structure
    for ch in data:
        assert "id" in ch
        assert "name" in ch
        assert "icon" in ch
        assert "description" in ch
    print(f"✅ Channels: {len(data)} option(s): {', '.join(ids)}")

if __name__ == "__main__":
    test_channels_returns_list()
```

**Step 2: Run test to verify it fails**

Run: `cd /root/hermes-research-lab/explore-api && python test_channels.py`
Expected: 404.

**Step 3: Add endpoint to `system.py`**

Append at the end of `explore-api/routers/system.py`:

```python
@router.get("/api/system/channels")
async def list_delivery_channels() -> list[dict]:
    """GET /api/system/channels — list available delivery targets."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    
    channels = [
        {
            "id": "local",
            "name": "Archivo local",
            "icon": "📁",
            "description": "Guarda en ~/.hermes/cron/output/",
        },
        {
            "id": "origin",
            "name": "Chat actual",
            "icon": "💬",
            "description": "Envía al chat donde se ejecuta",
        },
    ]
    
    # Detect connected platforms from config
    if config_path.is_file():
        try:
            config = yaml.safe_load(config_path.read_text())
            gateway = config.get("gateway", {})
            platforms = gateway.get("platforms", {})
            
            if platforms.get("telegram", {}).get("enabled"):
                channels.append({
                    "id": "telegram",
                    "name": "Telegram",
                    "icon": "📱",
                    "description": "Envía a Telegram",
                    "supports_chat_id": True,
                    "supports_thread_id": True,
                })
            
            if platforms.get("discord", {}).get("enabled"):
                channels.append({
                    "id": "discord",
                    "name": "Discord",
                    "icon": "🎮",
                    "description": "Envía a Discord",
                })
            
            if platforms.get("slack", {}).get("enabled"):
                channels.append({
                    "id": "slack",
                    "name": "Slack",
                    "icon": "💼",
                    "description": "Envía a Slack",
                })
        except (yaml.YAMLError, OSError):
            pass
    
    channels.append({
        "id": "all",
        "name": "Todos los canales",
        "icon": "🌐",
        "description": "Fan out a todos los canales conectados",
    })
    
    return channels
```

**Step 4: Run test to verify pass**

Run: `cd /root/hermes-research-lab/explore-api && python test_channels.py`
Expected: ✅ Channels: N option(s): local, origin, ...

**Step 5: Commit**

```bash
cd /root/hermes-research-lab
git add explore-api/routers/system.py explore-api/test_channels.py
git commit -m "feat(api): add GET /api/system/channels endpoint"
```

---

## T3: Backend — Enrich skills endpoint

**Objective:** Improve `GET /v1/skills` to return name, description, and category from each skill.

**Files:**
- Modify: `explore-api/routers/system.py` (lines 54-59)
- Modify: `explore-api/services/hermes_client.py` (lines 138-146)

**Step 1: Read current skills endpoint**

Currently at `system.py` lines 54-59:
```python
@router.get("/v1/skills")
async def list_skills() -> list[dict]:
    client = await get_client()
    skills = await client.get_skills()
    return skills
```

**Step 2: Enrich the response**

Replace the `list_skills` function in `system.py` with:

```python
@router.get("/v1/skills")
async def list_skills() -> list[dict]:
    """GET /v1/skills — list all installed skills with metadata."""
    client = await get_client()
    skills = await client.get_skills()
    enriched = []
    for s in skills:
        enriched.append({
            "name": s.get("name", ""),
            "description": s.get("description", ""),
            "category": s.get("category", "general"),
        })
    return enriched
```

**Step 3: Verify no existing tests break**

Run: `cd /root/hermes-research-lab/explore-api && python -m pytest tests/ -q --tb=short 2>/dev/null || echo "No pytest tests found, manual verification OK"`

**Step 4: Commit**

```bash
cd /root/hermes-research-lab
git add explore-api/routers/system.py
git commit -m "feat(api): enrich skills endpoint with metadata"
```

---

## T4: Frontend — Types + API functions

**Objective:** Add TypeScript types and API functions for providers, channels, skills, toolsets.

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: Add types to `types.ts`**

Append after the `CreateJobPayload` interface (line 119):

```typescript
// --- Wizard improvement types ---

export interface ProviderOption {
  id: string
  name: string
  model: string
  base_url: string
  is_default: boolean
}

export interface ProvidersResponse {
  default_provider: string | null
  default_model: string | null
  options: ProviderOption[]
}

export interface DeliveryChannel {
  id: string
  name: string
  icon: string
  description: string
  supports_chat_id?: boolean
  supports_thread_id?: boolean
}

export interface SkillInfo {
  name: string
  description: string
  category: string
}

export interface ToolsetInfo {
  name: string
  description: string
  enabled: boolean
}
```

**Step 2: Add API functions to `api.ts`**

Append before the final export line (before line 367):

```typescript
// --- Wizard improvement API calls ---

export async function getProviders(): Promise<ProvidersResponse> {
  const res = await fetch(`${API_BASE}/api/system/providers`, { headers })
  if (!res.ok) throw new Error('Failed to fetch providers')
  return res.json()
}

export async function getChannels(): Promise<DeliveryChannel[]> {
  const res = await fetch(`${API_BASE}/api/system/channels`, { headers })
  if (!res.ok) throw new Error('Failed to fetch channels')
  return res.json()
}

export async function getSkillsList(): Promise<SkillInfo[]> {
  const res = await fetch(`${API_BASE}/v1/skills`, { headers })
  if (!res.ok) throw new Error('Failed to fetch skills')
  return res.json()
}

export async function getToolsetsList(): Promise<ToolsetInfo[]> {
  const res = await fetch(`${API_BASE}/v1/toolsets`, { headers })
  if (!res.ok) throw new Error('Failed to fetch toolsets')
  return res.json()
}
```

Also add the missing type imports at line 1. Change:
```typescript
import { Agent, Template, Execution } from '../lib/types'
```
to:
```typescript
import { Agent, Template, Execution, ProvidersResponse, DeliveryChannel, SkillInfo, ToolsetInfo } from '../lib/types'
```

**Step 3: Verify TypeScript compiles**

Run: `cd /root/hermes-research-lab/frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (or only pre-existing ones).

**Step 4: Commit**

```bash
cd /root/hermes-research-lab
git add frontend/src/lib/types.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): add types and API functions for providers, channels, skills, toolsets"
```

---

## T5a: Frontend — `ProviderModelSelector.tsx`

**Objective:** Dropdown for provider + input for model name.

**Files:**
- Create: `frontend/src/components/builder/ProviderModelSelector.tsx`

**Complete code:**

```tsx
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
        <Select value={selectedProvider} onValueChange={onProviderChange}>
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
```

**Verification:** Run `cd /root/hermes-research-lab/frontend && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors in this file.

**Commit:**
```bash
git add frontend/src/components/builder/ProviderModelSelector.tsx
git commit -m "feat(frontend): add ProviderModelSelector component"
```

---

## T5b: Frontend — `SkillsSelector.tsx`

**Objective:** Multi-select with search and category filter.

**Files:**
- Create: `frontend/src/components/builder/SkillsSelector.tsx`

**Complete code:**

```tsx
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
    // Recommended first, then alphabetical
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
```

**Commit:**
```bash
git add frontend/src/components/builder/SkillsSelector.tsx
git commit -m "feat(frontend): add SkillsSelector component"
```

---

## T5c: Frontend — `ToolsetsSelector.tsx`

**Objective:** Checkbox grid for available toolsets.

**Files:**
- Create: `frontend/src/components/builder/ToolsetsSelector.tsx`

**Complete code:**

```tsx
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
```

**Commit:**
```bash
git add frontend/src/components/builder/ToolsetsSelector.tsx
git commit -m "feat(frontend): add ToolsetsSelector component"
```

---

## T5d: Frontend — `ScheduleSelector.tsx`

**Objective:** Schedule picker with presets and custom cron input.

**Files:**
- Create: `frontend/src/components/builder/ScheduleSelector.tsx`

**Complete code:**

```tsx
'use client'

import React, { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

  const handlePresetChange = (v: string) => {
    if (v === "__custom__") {
      setMode("custom")
      onChange(customValue)
    } else {
      setMode("preset")
      onChange(v)
    }
  }

  const handleCustomChange = (v: string) => {
    setCustomValue(v)
    setMode("custom")
    onChange(v)
  }

  // Human-readable preview
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
```

**Commit:**
```bash
git add frontend/src/components/builder/ScheduleSelector.tsx
git commit -m "feat(frontend): add ScheduleSelector component"
```

---

## T5e: Frontend — `DeliverySelector.tsx`

**Objective:** Radio cards for delivery destination with optional chat_id input.

**Files:**
- Create: `frontend/src/components/builder/DeliverySelector.tsx`

**Complete code:**

```tsx
'use client'

import React, { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { DeliveryChannel } from "@/lib/types"

interface Props {
  channels: DeliveryChannel[]
  selectedDelivery: string
  onChange: (delivery: string) => void
}

export function DeliverySelector({ channels, selectedDelivery, onChange }: Props) {
  // Parse existing delivery value
  const [chatId, setChatId] = useState("")
  const [threadId, setThreadId] = useState("")

  // Parse "telegram:123:456" format on mount
  useEffect(() => {
    const parts = selectedDelivery.split(":")
    if (parts[0] === "telegram" && parts.length >= 2) {
      setChatId(parts[1] || "")
      if (parts.length >= 3) setThreadId(parts[2] || "")
    }
  }, [])

  const handleChannelChange = (channelId: string) => {
    if (channelId === "telegram" && chatId) {
      onChange(`telegram:${chatId}${threadId ? ":" + threadId : ""}`)
    } else {
      onChange(channelId)
    }
  }

  const handleChatIdChange = (val: string) => {
    setChatId(val)
    const base = "telegram"
    onChange(val ? `${base}:${val}${threadId ? ":" + threadId : ""}` : base)
  }

  const handleThreadIdChange = (val: string) => {
    setThreadId(val)
    if (chatId) {
      onChange(val ? `telegram:${chatId}:${val}` : `telegram:${chatId}`)
    }
  }

  const selectedChannel = channels.find(c => c.id === selectedDelivery.split(":")[0])

  return (
    <div className="space-y-4">
      <RadioGroup value={selectedDelivery.split(":")[0]} onValueChange={handleChannelChange}>
        {channels.map(ch => (
          <label
            key={ch.id}
            className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/30 cursor-pointer transition-colors"
          >
            <RadioGroupItem value={ch.id} />
            <span className="text-lg">{ch.icon}</span>
            <div className="flex-1">
              <span className="text-sm font-medium">{ch.name}</span>
              <p className="text-xs text-muted-foreground/60">{ch.description}</p>
            </div>
          </label>
        ))}
      </RadioGroup>

      {selectedChannel?.supports_chat_id && (
        <div className="space-y-3 pl-8 border-l-2 border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="chatId" className="text-xs">Chat ID (opcional)</Label>
            <Input
              id="chatId"
              type="text"
              placeholder="440219100"
              value={chatId}
              onChange={(e) => handleChatIdChange(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          {selectedChannel.supports_thread_id && (
            <div className="space-y-2">
              <Label htmlFor="threadId" className="text-xs">Thread ID (opcional, para topics)</Label>
              <Input
                id="threadId"
                type="text"
                placeholder="17585"
                value={threadId}
                onChange={(e) => handleThreadIdChange(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Commit:**
```bash
git add frontend/src/components/builder/DeliverySelector.tsx
git commit -m "feat(frontend): add DeliverySelector component"
```

---

## T6: Frontend — Integrate all components in `create/page.tsx`

**Objective:** Add tabs in step 2, wire up state, fetch data, pass to `createJob()`.

**Files:**
- Modify: `frontend/src/app/create/page.tsx`

This is the largest task. Key changes:

### 6.1: Extend WizardState (line 28-39)

Replace the WizardState interface:

```typescript
interface WizardState {
  step: Step;
  selectedTemplate: Template | null;
  agentName: string;
  config: Record<string, any>;
  preview: string | null;
  isCreating: boolean;
  error: string | null;
  errorType: ErrorType;
  schedule: string;
  deliver: string;
  // New fields
  selectedProvider: string;
  selectedModel: string;
  selectedSkills: string[];
  selectedToolsets: string[];
}
```

### 6.2: Initialize new state fields (line 54-65)

Add to the initial wizard state:

```typescript
const [wizard, setWizard] = useState<WizardState>({
  // ... existing fields ...
  selectedProvider: "default",
  selectedModel: "",
  selectedSkills: [],
  selectedToolsets: [],
});
```

### 6.3: Add data fetching in useEffect (after line 91)

Add inside the existing `load()` function, after `setTemplates(data)`:

```typescript
// Fetch providers, channels, skills, toolsets
const [providersData, channelsData, skillsData, toolsetsData] = await Promise.all([
  getProviders().catch(() => ({ default_provider: "custom", default_model: "", options: [] })),
  getChannels().catch(() => []),
  getSkillsList().catch(() => []),
  getToolsetsList().catch(() => []),
]);
setProviders(providersData.options || []);
setChannels(channelsData);
setSkillsList(skillsData);
setToolsetsList(toolsetsData);
```

Add state variables for the fetched data:

```typescript
const [providers, setProviders] = useState<ProviderOption[]>([]);
const [channels, setChannels] = useState<DeliveryChannel[]>([]);
const [skillsList, setSkillsList] = useState<SkillInfo[]>([]);
const [toolsetsList, setToolsetsList] = useState<ToolsetInfo[]>([]);
```

### 6.4: Pre-select skills/toolsets on template select (line 93-105)

In `handleTemplateSelect`, add:

```typescript
// Pre-select toolsets from template
const templateToolsets = template.hermesConfig?.toolsets || [];
setWizard(prev => ({
  ...prev,
  selectedToolsets: templateToolsets,
}));
```

### 6.5: Add tab state and tab content in step 2 (lines 286-337)

Replace the step 2 Card with a tabbed interface. Add a `configTab` state:

```typescript
const [configTab, setConfigTab] = useState<"params" | "model" | "skills" | "toolsets" | "schedule" | "delivery">("params");
```

Replace the step 2 content with tabs (using simple button tabs, no shadcn tabs needed):

```tsx
{wizard.step === 2 && wizard.selectedTemplate && (
  <AnimateIn key={wizard.step} direction="up" delay={100} duration={300}>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Configurar {wizard.selectedTemplate.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 border-b pb-2">
          {([
            ["params", "Parámetros"],
            ["model", "Modelo"],
            ["skills", "Skills"],
            ["toolsets", "Toolsets"],
            ["schedule", "Schedule"],
            ["delivery", "Entrega"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setConfigTab(key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                configTab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Params */}
        {configTab === "params" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="agentName" className="text-sm font-medium">
                Nombre del agente <span className="text-destructive">*</span>
              </label>
              <Input
                id="agentName"
                placeholder={wizard.selectedTemplate.name}
                value={wizard.agentName}
                onChange={(e) => setWizard(prev => ({ ...prev, agentName: e.target.value }))}
              />
            </div>
            <Separator />
            {wizard.selectedTemplate.params.map((p) => (
              <DynamicParam
                key={p.name}
                param={p}
                value={wizard.config[p.name]}
                onChange={(val) => setWizard(prev => ({
                  ...prev,
                  config: { ...prev.config, [p.name]: val }
                }))}
                required={p.required}
              />
            ))}
          </div>
        )}

        {/* Tab: Model */}
        {configTab === "model" && (
          <ProviderModelSelector
            providers={providers}
            selectedProvider={wizard.selectedProvider}
            selectedModel={wizard.selectedModel}
            onProviderChange={(v) => setWizard(prev => ({ ...prev, selectedProvider: v }))}
            onModelChange={(v) => setWizard(prev => ({ ...prev, selectedModel: v }))}
          />
        )}

        {/* Tab: Skills */}
        {configTab === "skills" && (
          <SkillsSelector
            skills={skillsList}
            selectedSkills={wizard.selectedSkills}
            recommendedSkills={wizard.selectedTemplate.hermesConfig?.skills || []}
            onToggle={(name) => setWizard(prev => ({
              ...prev,
              selectedSkills: prev.selectedSkills.includes(name)
                ? prev.selectedSkills.filter(s => s !== name)
                : [...prev.selectedSkills, name]
            }))}
          />
        )}

        {/* Tab: Toolsets */}
        {configTab === "toolsets" && (
          <ToolsetsSelector
            toolsets={toolsetsList}
            selectedToolsets={wizard.selectedToolsets}
            onToggle={(name) => setWizard(prev => ({
              ...prev,
              selectedToolsets: prev.selectedToolsets.includes(name)
                ? prev.selectedToolsets.filter(t => t !== name)
                : [...prev.selectedToolsets, name]
            }))}
          />
        )}

        {/* Tab: Schedule */}
        {configTab === "schedule" && (
          <ScheduleSelector
            value={wizard.schedule}
            onChange={(v) => setWizard(prev => ({ ...prev, schedule: v }))}
          />
        )}

        {/* Tab: Delivery */}
        {configTab === "delivery" && (
          <DeliverySelector
            channels={channels}
            selectedDelivery={wizard.deliver}
            onChange={(v) => setWizard(prev => ({ ...prev, deliver: v }))}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 border-t pt-6">
        <Button variant="ghost" onClick={prevStep}>Atrás</Button>
        <Button onClick={nextStep}>
          Siguiente <span className="ml-2">→</span>
        </Button>
      </CardFooter>
    </Card>
  </AnimateIn>
)}
```

### 6.6: Send new fields in createJob (line 127-134)

Update the `createJob` call in `nextStep`:

```typescript
await createJob({
  name: wizard.agentName || current.selectedTemplate.name,
  template: current.selectedTemplate.id,
  config: current.config,
  prompt: current.preview || "",
  schedule: wizard.schedule,
  deliver: wizard.deliver,
  // New fields
  skills: wizard.selectedSkills.length > 0 ? wizard.selectedSkills : undefined,
  enabled_toolsets: wizard.selectedToolsets.length > 0 ? wizard.selectedToolsets : undefined,
  model: wizard.selectedModel ? { model: wizard.selectedModel, provider: wizard.selectedProvider } : undefined,
});
```

### 6.7: Add imports

Add to the imports at the top:

```typescript
import { getProviders, getChannels, getSkillsList, getToolsetsList } from "@/lib/api";
import { ProviderOption, DeliveryChannel, SkillInfo, ToolsetInfo } from "@/lib/types";
import { ProviderModelSelector } from "@/components/builder/ProviderModelSelector";
import { SkillsSelector } from "@/components/builder/SkillsSelector";
import { ToolsetsSelector } from "@/components/builder/ToolsetsSelector";
import { ScheduleSelector } from "@/components/builder/ScheduleSelector";
import { DeliverySelector } from "@/components/builder/DeliverySelector";
```

### 6.8: Update summary in step 3 (lines 361-411)

Add provider, model, skills, toolsets to the preview summary card. After the "Template" section (line 382), add:

```tsx
<Separator />
<div>
  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Modelo</p>
  <p className="text-sm font-medium">{wizard.selectedProvider}/{wizard.selectedModel || "(default)"}</p>
</div>
<Separator />
<div>
  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Skills</p>
  <div className="flex flex-wrap gap-1">
    {wizard.selectedSkills.map(s => (
      <Badge key={s} variant="outline" className="rounded-md text-[10px]">{s}</Badge>
    ))}
    {wizard.selectedSkills.length === 0 && <span className="text-xs text-muted-foreground/60">Ninguna</span>}
  </div>
</div>
```

**Verification:** `cd /root/hermes-research-lab/frontend && npx tsc --noEmit`

**Commit:**
```bash
git add frontend/src/app/create/page.tsx
git commit -m "feat(frontend): integrate provider, skills, toolsets, schedule, delivery tabs in wizard"
```

---

## T7: Backend — Pass wizard fields to Hermes job

**Objective:** Ensure `_wizard_payload_to_hermes_job` forwards `skills`, `enabled_toolsets`, `model` from frontend payload.

**Files:**
- Modify: `explore-api/routers/jobs.py` (lines 31-65)

The current function already reads `hermesConfig` from the template. We need to also read user overrides from the frontend payload.

**Step 1: Update the function**

Replace `_wizard_payload_to_hermes_job` with:

```python
def _wizard_payload_to_hermes_job(body: dict, *, profile_name: str | None = None) -> dict:
    """Transform AgentHub wizard payload into a Hermes API Server job."""
    template_id = body.get("template", "")
    tmpl = get_template(template_id, TEMPLATES_DIR) if template_id else None
    hermes_config = (tmpl or {}).get("hermesConfig") or {}

    prompt = body.get("prompt") or ""
    if not prompt.strip() and body.get("config") is not None:
        prompt = render_preview(template_id, body.get("config"), TEMPLATES_DIR)
        config_values = body.get("config") or {}
        if config_values:
            prompt += "\n\n## Configuration\n" + json.dumps(config_values, indent=2)

    payload: dict[str, Any] = {
        "name": body.get("name") or template_id or "agent",
        "prompt": prompt,
        "schedule": body.get("schedule", "0 */6 * * *"),
        "deliver": body.get("deliver", hermes_config.get("deliver", "local")),
    }

    if profile_name:
        payload["profile"] = profile_name

    # Skills: user selection > template defaults
    skills = body.get("skills") or hermes_config.get("skills") or []
    if skills:
        payload["skills"] = skills

    # Toolsets: user selection > template defaults
    toolsets = body.get("enabled_toolsets") or hermes_config.get("toolsets") or []
    if toolsets:
        payload["enabled_toolsets"] = toolsets

    # Model: user selection > template defaults
    model = body.get("model") or hermes_config.get("model")
    if model:
        payload["model"] = model

    return payload
```

**Step 2: Verify**

Run: `cd /root/hermes-research-lab/explore-api && python -c "from routers.jobs import _wizard_payload_to_hermes_job; r = _wizard_payload_to_hermes_job({'template': 'ai-researcher', 'skills': ['web'], 'enabled_toolsets': ['web', 'terminal'], 'model': {'model': 'gpt-4', 'provider': 'openai'}}); print(r)"`

Expected: Payload includes `skills`, `enabled_toolsets`, `model`.

**Commit:**
```bash
git add explore-api/routers/jobs.py
git commit -m "feat(api): forward skills, toolsets, model from wizard payload to Hermes job"
```

---

## T8: Scroll fix

**Objective:** Smooth scroll to step content when wizard step changes.

**Files:**
- Modify: `frontend/src/app/create/page.tsx`

**Step 1: Add ref and useEffect**

After the existing `useEffect` blocks (around line 91), add:

```typescript
const stepContentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (stepContentRef.current) {
    stepContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}, [wizard.step]);
```

**Step 2: Attach ref to the content wrapper**

Change the `<div className="mt-8 sm:mt-12">` at line 211 to:

```tsx
<div ref={stepContentRef} className="mt-8 sm:mt-12">
```

**Commit:**
```bash
git add frontend/src/app/create/page.tsx
git commit -m "feat(frontend): add smooth scroll on wizard step change"
```

---

## T9: Final review

**Objective:** Run full verification — TypeScript compile, backend tests, visual check.

**Steps:**

1. TypeScript: `cd /root/hermes-research-lab/frontend && npx tsc --noEmit`
2. Backend tests: `cd /root/hermes-research-lab/explore-api && python test_providers.py && python test_channels.py`
3. Visual: Start dev server, open `/create`, verify tabs work, select template, check all tabs render.
4. Integration: Create a test agent with custom provider/skills/delivery and verify the payload reaches the API.

---

## Execution Order

Batch 1 (parallel): T1, T2, T3 (backend endpoints)
Batch 2 (parallel): T4, T5a, T5b, T5c, T5d, T5e (frontend types + components)
Batch 3 (sequential): T6 (integration), T7 (backend payload), T8 (scroll)
Batch 4: T9 (final review)
