# AgentHub Upgrade Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Fix all bugs, complete missing integrations, and bring AgentHub to production-ready quality.

**Architecture:** The Exploration API sits between the Frontend and the Hermes API Server. Most fixes are in the API dependency chain (deps → startup → endpoints) and frontend-backend wiring (button handlers, search URL, stats).

**Tech Stack:** Python/FastAPI, Next.js 15/React 19/TypeScript, shadcn, Tailwind 4, httpx, websockets

---

## Phase 1 — Critical: Exploration API Startup (Blocks everything)

### Task 1.1: Fix requirements.txt

**Objective:** Add missing Python dependencies so the Exploration API can start.

**Files:**
- Modify: `/root/agenthub/explore-api/requirements.txt`

**Step 1: Update requirements.txt**

```txt
fastapi
uvicorn[standard]
httpx
pyyaml
websockets
pydantic
```

**Step 2: Install deps**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
pip install -r requirements.txt
```

**Step 3: Verify import**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
python -c "from main import app; print('Import OK')"
```

Expected: `Import OK`

**Step 4: Commit**

```bash
cd /root/agenthub
git add explore-api/requirements.txt
git commit -m "fix: add missing deps to requirements.txt (websockets, pydantic)"
```

---

### Task 1.2: Test Exploration API startup

**Objective:** Verify the API starts without errors.

**Step 1: Start the API manually**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8643 --timeout-graceful-shutdown 5 &
sleep 3
curl -s http://localhost:8643/health
```

Expected: `{"status":"ok","service":"exploration-api"}`

**Step 2: Test system overview**

```bash
curl -s http://localhost:8643/api/system/overview | python3 -m json.tool
```

Expected: JSON with `profiles_count`, `jobs_count`, `skills_count`, etc.

**Step 3: Kill test server**

```bash
kill $(lsof -ti:8643) 2>/dev/null
```

**Step 4: Commit (if any fixes needed)**

```bash
cd /root/agenthub
git add -A
git commit -m "fix: ensure Exploration API starts cleanly"
```

---

### Task 1.3: Make start.sh launch the Exploration API reliably

**Objective:** Ensure `agenthub start` actually starts all 3 services.

**Files:**
- Modify: `/root/agenthub/scripts/start.sh`

**Step 1: Fix start.sh Exploration API section**

Replace the start.sh Exploration API launch section. The current script uses `$VENV` but doesn't `cd` into the right directory for the venv activation. Change:

```bash
# Current (line 49-56):
cd "$EXPLORE_API_DIR"
HERMES_API_URL=http://localhost:$HERMES_PORT \
  $VENV -m uvicorn main:app --host 0.0.0.0 --port $EXPLORE_PORT --app-dir . --reload > /tmp/explore-api.log 2>&1 &

# Fixed:
cd "$EXPLORE_API_DIR"
source "$EXPLORE_API_DIR/.venv/bin/activate"
pip install -r requirements.txt -q 2>/dev/null
HERMES_API_URL=http://localhost:$HERMES_PORT \
  HERMES_API_KEY=agenthub-local \
  python -m uvicorn main:app --host 0.0.0.0 --port $EXPLORE_PORT > /tmp/explore-api.log 2>&1 &
```

**Step 2: Test with `agenthub start`**

```bash
cd /root/agenthub
python3 scripts/agenthub.py stop 2>/dev/null
python3 scripts/agenthub.py start
python3 scripts/agenthub.py status
```

Expected: All 3 services OK

**Step 3: Commit**

```bash
cd /root/agenthub
git add scripts/start.sh
git commit -m "fix: reliable Exploration API startup in start.sh"
```

---

## Phase 2 — Critical: Frontend-Backend API Bugs

### Task 2.1: Fix searchSessions URL in api.ts

**Objective:** Fix the malformed URL for session search.

**Files:**
- Modify: `/root/agenthub/frontend/src/lib/api.ts:106`

**Step 1: Fix the URL**

```typescript
// Current (line 106):
const res = await fetch(`${EXPLORE_API}/api/system/sessions/search=${encodeURIComponent(query)}`, { headers })

// Fixed:
const res = await fetch(`${EXPLORE_API}/api/system/sessions/search?q=${encodeURIComponent(query)}`, { headers })
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add frontend/src/lib/api.ts
git commit -m "fix: correct session search URL (?q= param)"
```

---

### Task 2.2: Fix previewTemplate to pass config

**Objective:** The preview endpoint should receive user params, not just defaults.

**Files:**
- Modify: `/root/agenthub/frontend/src/lib/api.ts:32-37`
- Modify: `/root/agenthub/explore-api/routers/templates.py:50-81`

**Step 1: Update frontend to send config**

```typescript
// Current (api.ts:32-37):
export async function previewTemplate(id: string, config: Record<string, any>): Promise<string> {
  const res = await fetch(`${EXPLORE_API}/api/templates/${id}/preview`, { headers })
  if (!res.ok) throw new Error('Failed to preview template')
  const data = await res.json()
  return data.prompt
}

// Fixed:
export async function previewTemplate(id: string, config: Record<string, any>): Promise<string> {
  const res = await fetch(`${EXPLORE_API}/api/templates/${id}/preview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ config }),
  })
  if (!res.ok) throw new Error('Failed to preview template')
  const data = await res.json()
  return data.prompt
}
```

**Step 2: Update backend to accept POST with config body**

In `explore-api/routers/templates.py`, change the preview endpoint:

```python
from fastapi import APIRouter, HTTPException, Body

@router.post("/api/templates/{template_id}/preview")
async def preview_template(
    template_id: str,
    config: dict = Body(default={}),
) -> dict:
    """POST /api/templates/{template_id}/preview — preview with user-provided config."""
    import os
    templates_dir = os.path.join(
        os.path.expanduser("~/.hermes"), "skills", "agenthub-templates", template_id
    )
    skill_md = os.path.join(templates_dir, "SKILL.md")

    parsed = parse_skill_md(skill_md)
    if parsed is None:
        if os.path.isfile(skill_md):
            raise HTTPException(
                status_code=500,
                detail=f"Template '{template_id}' has a YAML parsing error in SKILL.md",
            )
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    rendered = render_preview(skill_md, params=config)
    return {
        "template_id": template_id,
        "prompt": rendered,
        "config": {
            "params": parsed["params"],
            "hermesConfig": parsed["hermes_config"],
        },
    }
```

**Step 3: Commit**

```bash
cd /root/agenthub
git add frontend/src/lib/api.ts explore-api/routers/templates.py
git commit -m "fix: preview endpoint accepts user config via POST body"
```

---

### Task 2.3: Add API key validation middleware

**Objective:** Protect the Exploration API with the configured API key.

**Files:**
- Modify: `/root/agenthub/explore-api/main.py`

**Step 1: Add middleware**

```python
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

@app.middleware("http")
async def validate_api_key(request: Request, call_next):
    """Validate API key on non-health endpoints."""
    # Skip health checks and WebSocket
    path = request.url.path
    if path in ("/health", "/api/health") or path.startswith("/api/ws"):
        return await call_next(request)

    # Check Authorization header or X-API-Key
    auth = request.headers.get("Authorization", "")
    x_api_key = request.headers.get("X-API-Key", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""

    from config import HERMES_API_KEY
    if token != HERMES_API_KEY and x_api_key != HERMES_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"detail": "Invalid or missing API key"},
        )

    return await call_next(request)
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add explore-api/main.py
git commit -m "feat: add API key validation middleware"
```

---

## Phase 3 — Moderate: Missing Button Wiring

### Task 3.1: Wire AgentCard buttons to API calls

**Objective:** Make Pause/Resume and Trigger buttons functional.

**Files:**
- Modify: `/root/agenthub/frontend/src/components/dashboard/AgentCard.tsx`

**Step 1: Add onClick handlers and API imports**

```typescript
import { pauseJob, resumeJob, triggerJob } from "@/lib/api"
import { toast } from "sonner"

interface AgentCardProps {
  agent: Agent
  progress?: number
  activeTool?: string
  runId?: string | null
  onRunIdChange?: (runId: string | null) => void
  onStatusChange?: (agent: Agent) => void  // NEW
}

export function AgentCard({ agent, progress, activeTool, runId, onRunIdChange, onStatusChange }: AgentCardProps) {
  const [loading, setLoading] = useState(false)

  const handlePauseResume = async () => {
    setLoading(true)
    try {
      if (agent.status === 'active') {
        await pauseJob(agent.id)
        toast.success(`${agent.name} pausado`)
      } else {
        await resumeJob(agent.id)
        toast.success(`${agent.name} reanudado`)
      }
      onStatusChange?.({ ...agent, status: agent.status === 'active' ? 'paused' : 'active' })
    } catch (err) {
      toast.error("Error al cambiar estado del agente")
    } finally {
      setLoading(false)
    }
  }

  const handleTrigger = async () => {
    setLoading(true)
    try {
      await triggerJob(agent.id)
      toast.success(`${agent.name} ejecutándose ahora`)
    } catch (err) {
      toast.error("Error al ejecutar el agente")
    } finally {
      setLoading(false)
    }
  }

  // ... in CardFooter:
  <Button
    variant="outline"
    size="icon"
    title={agent.status === 'active' ? 'Pausar' : 'Reanudar'}
    onClick={handlePauseResume}
    disabled={loading}
  >
    {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
  </Button>
  <Button
    variant="outline"
    size="icon"
    title="Ejecutar ahora"
    onClick={handleTrigger}
    disabled={loading}
  >
    <RotateCcw className="h-4 w-4" />
  </Button>
```

**Step 2: Update agents/page.tsx to pass onStatusChange**

```typescript
// In the grid map:
<AgentCard
  key={agent.id}
  agent={agent}
  onStatusChange={(updated) => {
    setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
  }}
/>
```

**Step 3: Commit**

```bash
cd /root/agenthub
git add frontend/src/components/dashboard/AgentCard.tsx frontend/src/app/agents/page.tsx
git commit -m "feat: wire AgentCard pause/resume/trigger buttons to API"
```

---

### Task 3.2: Calculate real stats in StatsBar

**Objective:** Replace "N/A" with real data from job outputs.

**Files:**
- Modify: `/root/agenthub/frontend/src/app/agents/page.tsx`

**Step 1: Fetch outputs and compute stats**

```typescript
import { getJobs, getJobOutputs } from "@/lib/api"

// Inside the useEffect load():
const [agentsData, outputsResults] = await Promise.all([
  getJobs(),
  Promise.all(agentsData.map(a => getJobOutputs(a.id).catch(() => [])))
]);

// Compute stats
const allOutputs = outputsResults.flat()
const successCount = allOutputs.filter(o => o.status === 'completed').length
const totalCount = allOutputs.length
const successRate = totalCount > 0 ? `${Math.round((successCount / totalCount) * 100)}%` : "N/A"
const lastExecution = allOutputs.length > 0
  ? allOutputs.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime())[0]
  : null

// In StatsBar:
<StatsBar stats={[
  { title: "Agentes Activos", value: String(agentsData.filter(a => a.status === 'active').length), icon: Users },
  { title: "Total Agentes", value: String(agentsData.length), icon: Zap },
  { title: "Tasa Éxito", value: successRate, icon: CheckCircle2 },
  { title: "Última Ejecución", value: lastExecution ? new Date(lastExecution.startedAt).toLocaleString() : "N/A", icon: Clock },
]} />
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add frontend/src/app/agents/page.tsx
git commit -m "feat: compute real success rate and last execution in StatsBar"
```

---

## Phase 4 — Moderate: SSE Integration

### Task 4.1: Integrate useSSE hook into AgentCard

**Objective:** Show real-time progress when an agent is executing.

**Files:**
- Modify: `/root/agenthub/frontend/src/app/agents/page.tsx`

**Step 1: Add SSE state and hook usage**

```typescript
import { useSSE, SSEEvent } from "@/hooks/useSSE"

// In component state:
const [activeRunId, setActiveRunId] = useState<string | null>(null)
const [agentProgress, setAgentProgress] = useState<Record<string, number>>({})
const [activeTools, setActiveTools] = useState<Record<string, string>>({})

// SSE handler
const handleSSEEvent = useCallback((agentId: string) => (event: SSEEvent) => {
  if (event.type === 'lifecycle' && event.data.progress != null) {
    setAgentProgress(prev => ({ ...prev, [agentId]: event.data.progress }))
  }
  if (event.type === 'tool_start' && event.data.tool_name) {
    setActiveTools(prev => ({ ...prev, [agentId]: event.data.tool_name }))
  }
  if (event.type === 'tool_end') {
    setActiveTools(prev => ({ ...prev, [agentId]: '' }))
  }
}, [])

// In the grid render, pass SSE props to each AgentCard:
{agents.map((agent) => (
  <AgentCardWithSSE
    key={agent.id}
    agent={agent}
    hermesApi={HERMES_API}
    progress={agentProgress[agent.id]}
    activeTool={activeTools[agent.id]}
  />
))}
```

**Step 2: Create AgentCardWithSSE wrapper**

Create `/root/agenthub/frontend/src/components/dashboard/AgentCardWithSSE.tsx`:

```typescript
'use client'

import { useSSE } from "@/hooks/useSSE"
import { AgentCard } from "./AgentCard"
import { Agent } from "@/lib/types"

interface Props {
  agent: Agent
  hermesApi: string
  progress?: number
  activeTool?: string
}

export function AgentCardWithSSE({ agent, hermesApi, progress, activeTool }: Props) {
  const [runId, setRunId] = useState<string | null>(null)

  const handleEvent = useCallback((event: any) => {
    // Handle SSE events for progress/tool updates
    // ...
  }, [])

  useSSE(hermesApi, runId, handleEvent, agent.status === 'active')

  return (
    <AgentCard
      agent={agent}
      progress={progress}
      activeTool={activeTool}
      runId={runId}
      onRunIdChange={setRunId}
    />
  )
}
```

**Step 3: Commit**

```bash
cd /root/agenthub
git add frontend/src/components/dashboard/
git commit -m "feat: integrate SSE streaming into AgentCard for real-time progress"
```

---

## Phase 5 — Moderate: Demo Script Alignment

### Task 5.1: Rewrite demo.sh to match actual API

**Objective:** Make the demo script use the real endpoints.

**Files:**
- Modify: `/root/agenthub/scripts/demo.sh`

**Step 1: Rewrite demo.sh**

```bash
#!/usr/bin/env bash
set -euo pipefail

HERMES_URL="http://localhost:8642"
EXPLORE_URL="http://localhost:8643"
FRONTEND_URL="http://localhost:3000"
API_KEY="agenthub-local"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_step(){ echo -e "\n${YELLOW}>>> $1${NC}"; }

echo "=============================================="
echo "  AgentHub — Demo para el Jurado"
echo "=============================================="

# Health checks
for name_url in "Hermes:$HERMES_URL" "Explore API:$EXPLORE_URL"; do
    name="${name_url%%:*}"
    url="${name_url#*:}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" -H "X-API-Key: $API_KEY" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        log_ok "$name disponible"
    else
        echo -e "${RED}[ERR] $name no responde: $url (HTTP $STATUS)${NC}"
        exit 1
    fi
done

log_step "Paso 1: Explorar el sistema"
echo "  GET $EXPLORE_URL/api/system/overview"
OVERVIEW=$(curl -s "$EXPLORE_URL/api/system/overview" -H "X-API-Key: $API_KEY")
echo "  Profiles: $(echo $OVERVIEW | python3 -c 'import sys,json; print(json.load(sys.stdin)["profiles_count"])' 2>/dev/null || echo '?')"
echo "  Skills:   $(echo $OVERVIEW | python3 -c 'import sys,json; print(json.load(sys.stdin)["skills_count"])' 2>/dev/null || echo '?')"
echo "  Jobs:     $(echo $OVERVIEW | python3 -c 'import sys,json; print(json.load(sys.stdin)["jobs_count"])' 2>/dev/null || echo '?')"

log_step "Paso 2: Ver templates disponibles"
echo "  GET $EXPLORE_URL/api/templates"
TEMPLATES=$(curl -s "$EXPLORE_URL/api/templates" -H "X-API-Key: $API_KEY")
echo "$TEMPLATES" | python3 -c '
import sys, json
for t in json.load(sys.stdin):
    print(f"  {t[\"icon\"]} {t[\"name\"]} — {t[\"description\"][:60]}")
    print(f"     params: {len(t[\"params\"])}, toolsets: {t[\"hermesConfig\"].get(\"toolsets\", [])}")
' 2>/dev/null

log_step "Paso 3: Preview de un template"
echo "  POST $EXPLORE_URL/api/templates/ai-researcher/preview"
PREVIEW=$(curl -s -X POST "$EXPLORE_URL/api/templates/ai-researcher/preview" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{"config": {"sources": "https://arxiv.org/list/cs.AI/recent", "frequency": "diario"}}')
echo "$PREVIEW" | python3 -c 'import sys,json; p=json.load(sys.stdin)["prompt"][:300]; print(f"  Prompt preview ({len(p)} chars):\\n  {p}...")' 2>/dev/null

log_step "Paso 4: Listar jobs activos"
echo "  GET $HERMES_URL/jobs"
JOBS=$(curl -s "$HERMES_URL/jobs" -H "X-API-Key: $API_KEY" 2>/dev/null || echo "[]")
echo "  Jobs encontrados: $(echo $JOBS | python3 -c 'import sys,json; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)' 2>/dev/null || echo '0')"

log_step "Paso 5: Profiles de Hermes"
echo "  GET $EXPLORE_URL/api/system/profiles"
curl -s "$EXPLORE_URL/api/system/profiles" -H "X-API-Key: $API_KEY" | python3 -c '
import sys, json
for p in json.load(sys.stdin):
    skills = ", ".join(p["skills"][:5]) if p["skills"] else "none"
    print(f"  👤 {p[\"name\"]} — skills: {skills}")
' 2>/dev/null

echo ""
echo "=============================================="
echo -e "  ${GREEN}Demo completada${NC}"
echo "=============================================="
echo ""
echo "  Frontend: $FRONTEND_URL"
echo "  API:      $EXPLORE_URL"
echo ""
```

**Step 2: Make executable and test**

```bash
chmod +x /root/agenthub/scripts/demo.sh
bash /root/agenthub/scripts/demo.sh
```

**Step 3: Commit**

```bash
cd /root/agenthub
git add scripts/demo.sh
git commit -m "fix: rewrite demo.sh to use actual API endpoints"
```

---

## Phase 6 — Minor: Code Quality & Security

### Task 6.1: Fix SQL injection risk in session_db.py

**Objective:** Use parameterized queries instead of f-string column names.

**Files:**
- Modify: `/root/agenthub/explore-api/services/session_db.py`

**Step 1: Whitelist columns explicitly**

```python
# At top of file:
VALID_FTS_COLUMNS = {"content", "title", "query", "message", "text", "description"}
VALID_TABLES = {"sessions_fts", "sessions", "task_sessions"}

# In the search function, replace f-string queries:
if col not in VALID_FTS_COLUMNS or table not in VALID_TABLES:
    continue
# Now the query is safe because both values come from whitelists
cur.execute(f"SELECT * FROM {table} WHERE {table} MATCH ?", (search_term,))
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add explore-api/services/session_db.py
git commit -m "fix: whitelist SQL table/column names to prevent injection"
```

---

### Task 6.2: Make HERMES_HOME configurable

**Objective:** Use environment variable instead of hardcoded path.

**Files:**
- Modify: `/root/agenthub/explore-api/config.py`

**Step 1: Update config.py**

```python
import os

HERMES_API_URL: str = os.environ.get("HERMES_API_URL", "http://localhost:8642")
HERMES_API_KEY: str = os.environ.get("HERMES_API_KEY", "agenthub-local")
EXPLORE_API_PORT: int = int(os.environ.get("EXPLORE_API_PORT", "8643"))
CORS_ORIGINS: list[str] = ["http://localhost:3000"]
HERMES_HOME: str = os.environ.get("HERMES_HOME", os.path.expanduser("~/.hermes"))
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add explore-api/config.py
git commit -m "fix: make HERMES_HOME configurable via env var"
```

---

### Task 6.3: Pin requirements.txt versions

**Objective:** Reproducible builds with pinned versions.

**Files:**
- Modify: `/root/agenthub/explore-api/requirements.txt`

**Step 1: Freeze current versions**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
pip freeze | grep -E "^(fastapi|uvicorn|httpx|pyyaml|websockets|pydantic)=" > requirements.txt
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add explore-api/requirements.txt
git commit -m "chore: pin requirements.txt versions"
```

---

### Task 6.4: Add proper pytest tests

**Objective:** Replace manual test scripts with pytest.

**Files:**
- Create: `/root/agenthub/explore-api/tests/__init__.py`
- Create: `/root/agenthub/explore-api/tests/test_templates.py`
- Create: `/root/agenthub/explore-api/tests/test_system.py`
- Create: `/root/agenthub/explore-api/tests/test_profiles.py`

**Step 1: Create test file for templates**

```python
"""Tests for template endpoints."""
import pytest
from fastapi.testclient import TestClient
import sys
sys.path.insert(0, "/root/agenthub/explore-api")
from main import app

client = TestClient(app)

class TestTemplates:
    def test_list_templates(self):
        r = client.get("/api/templates", headers={"X-API-Key": "agenthub-local"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_template_not_found(self):
        r = client.get("/api/templates/nonexistent", headers={"X-API-Key": "agenthub-local"})
        assert r.status_code == 404

    def test_preview_template_not_found(self):
        r = client.post(
            "/api/templates/nonexistent/preview",
            json={"config": {}},
            headers={"X-API-Key": "agenthub-local"},
        )
        assert r.status_code == 404

    def test_health(self):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
```

**Step 2: Run tests**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
pip install pytest -q
pytest tests/ -v
```

Expected: All pass

**Step 3: Commit**

```bash
cd /root/agenthub
git add explore-api/tests/
git commit -m "test: add pytest tests for Exploration API endpoints"
```

---

### Task 6.5: Clean up stale processes

**Objective:** Kill orphaned Next.js instances and fix port conflict.

**Step 1: Kill stale processes**

```bash
# Kill the stale port 3001 instance
kill $(lsof -ti:3001) 2>/dev/null

# Verify only one Next.js on 3000
ss -tlnp | grep 3000
```

**Step 2: Update start.sh to kill orphaned processes**

Add to start.sh before launching frontend:

```bash
# Kill any stale Next.js on non-standard ports
for port in 3001 3002 3003; do
    kill $(lsof -ti:$port 2>/dev/null) 2>/dev/null || true
done
```

**Step 3: Commit**

```bash
cd /root/agenthub
git add scripts/start.sh
git commit -m "fix: clean up stale processes before starting frontend"
```

---

## Phase 7 — Polish: Documentation & UX

### Task 7.1: Add .env.example

**Objective:** Document all required environment variables.

**Files:**
- Modify: `/root/agenthub/.env.example`

**Step 1: Update .env.example**

```env
# Hermes API Server
HERMES_API_URL=http://localhost:8642
HERMES_API_KEY=agenthub-local

# Exploration API
EXPLORE_API_PORT=8643

# Frontend (Next.js)
NEXT_PUBLIC_HERMES_API=http://localhost:8642
NEXT_PUBLIC_EXPLORE_API=http://localhost:8643
NEXT_PUBLIC_API_KEY=agenthub-local
```

**Step 2: Commit**

```bash
cd /root/agenthub
git add .env.example
git commit -m "docs: update .env.example with all required variables"
```

---

### Task 7.2: Fix README.md formatting (broken encoding)

**Objective:** The README has missing accented characters (e.g., "gestin" instead of "gestión").

**Files:**
- Modify: `/root/agenthub/README.md`

**Step 1: Fix all missing accents**

Replace all broken characters:
- `gestin` → `gestión`
- `mtricas` → `métricas`
- `creacin` → `creación`
- `Configuracin` → `Configuración`
- `Explotacin` → `Exploración`
- `Descriptin` → `Descripción`
- `Estructura del Proyecto` section: fix encoding

**Step 2: Commit**

```bash
cd /root/agenthub
git add README.md
git commit -m "fix: repair broken UTF-8 encoding in README.md"
```

---

### Task 7.3: Final integration test

**Objective:** Verify the complete flow works end-to-end.

**Step 1: Start everything**

```bash
cd /root/agenthub
python3 scripts/agenthub.py stop 2>/dev/null
python3 scripts/agenthub.py start
python3 scripts/agenthub.py status
```

Expected: All 3 services OK

**Step 2: Run demo**

```bash
python3 scripts/agenthub.py demo
```

Expected: All 5 steps complete without errors

**Step 3: Run pytest**

```bash
cd /root/agenthub/explore-api
source .venv/bin/activate
pytest tests/ -v
```

Expected: All tests pass

**Step 4: Final commit**

```bash
cd /root/agenthub
git add -A
git commit -m "chore: v1.1 — all upgrades complete, integration verified"
git tag v1.1
```

---

## Summary

| Phase | Tasks | Impact | Est. Time |
|-------|-------|--------|-----------|
| 1 — API Startup | 3 | 🔴 Critical — unblocks everything | 15 min |
| 2 — API Bugs | 3 | 🔴 Critical — broken features | 20 min |
| 3 — Button Wiring | 2 | 🟡 Moderate — incomplete UX | 15 min |
| 4 — SSE Integration | 1 | 🟡 Moderate — nice real-time feature | 15 min |
| 5 — Demo Script | 1 | 🟡 Moderate — jurado can't demo | 10 min |
| 6 — Code Quality | 5 | 🟢 Minor — security & maintainability | 20 min |
| 7 — Polish | 3 | 🟢 Minor — docs & verification | 10 min |
| **Total** | **18** | | **~105 min** |
