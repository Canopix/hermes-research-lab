---
tags: [project, hackathon, agenthub, backend]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# ⚙️ Backend — P2

> **Entregable:** Exploration API (:8643) + Gateway Hook de monitoreo
> **Persona:** P2 — Backend
> **Dependencia:** Hermes API Server (:8642) ya corriendo + hermes_state.py importable

---

## Resumen

El backend de AgentHub se compone de **2 piezas**:

1. **Exploration API** (~800 LOC) — FastAPI que expone datos de Hermes que el API Server NO expone por HTTP
2. **Gateway Hook** (~100 LOC) — Monitoreo de actividad de agentes

**NO hay backend custom para:** jobs, sessions, skills, streaming, scheduling. Todo eso ya lo hace Hermes API Server en `:8642`.

---

## Pieza 1: Exploration API (:8643)

### Setup

```python
# explore_api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AgentHub Exploration API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Dependencias

```txt
fastapi
uvicorn
httpx
pyyaml
```

### Importar desde Hermes

```python
import sys
sys.path.insert(0, os.path.expanduser("~/.hermes"))
from hermes_state import SessionDB

db = SessionDB(os.path.expanduser("~/.hermes/state.db"))
```

### Módulos

```
explore_api/
├── main.py              ← FastAPI app + CORS
├── routers/
│   ├── system.py        ← GET /api/system/overview, /health
│   ├── profiles.py      ← GET /api/system/profiles
│   ├── templates.py     ← CRUD templates (skills)
│   └── sessions_search.py ← Búsqueda full-text via SessionDB
├── services/
│   ├── hermes_reader.py ← Lee archivos de ~/.hermes/ de forma segura
│   ├── template_service.py ← Parse SKILL.md, lista templates
│   └── session_service.py  ← Wrapper sobre SessionDB
└── requirements.txt
```

---

### Endpoints detallados

#### `GET /api/system/overview`

Resumen completo del estado de Hermes.

```python
@app.get("/api/system/overview")
async def get_overview():
    hermes_dir = Path.home() / ".hermes"

    profiles = []
    for p in (hermes_dir / "profiles").iterdir():
        if p.is_dir():
            profiles.append({
                "name": p.name,
                "model": _read_config_field(p / "config.yaml", "model"),
                "skills_count": len(list((p / "skills").glob("*/SKILL.md"))) if (p / "skills").exists() else 0,
                "has_memory": (p / "MEMORY.md").exists(),
            })

    return {
        "hermes_version": _get_hermes_version(),
        "provider": _read_config_field(hermes_dir / "config.yaml", "provider"),
        "profiles": profiles,
        "templates_count": len(_list_templates()),
        "total_skills": len(list((hermes_dir / "skills").glob("*/SKILL.md"))) if (hermes_dir / "skills").exists() else 0,
    }
```

#### `GET /api/system/profiles`

Lista todos los profiles con información detallada.

```python
@app.get("/api/system/profiles")
async def get_profiles():
    profiles_dir = Path.home() / ".hermes" / "profiles"
    result = []

    for p in profiles_dir.iterdir():
        if not p.is_dir() or p.name.startswith("."):
            continue

        config = _load_yaml(p / "config.yaml") if (p / "config.yaml").exists() else {}
        memory_preview = ""
        if (p / "MEMORY.md").exists():
            memory_preview = (p / "MEMORY.md").read_text()[:500]

        result.append({
            "name": p.name,
            "model": config.get("model"),
            "provider": config.get("provider"),
            "soul": _read_file(p / "SOUL.md"),
            "memory_preview": memory_preview,
            "memory_enabled": config.get("memory", {}).get("memory_enabled", False),
            "skills_count": len(list((p / "skills").iterdir())) if (p / "skills").exists() else 0,
            "sessions_count": len(list((p / "sessions").iterdir())) if (p / "sessions").exists() else 0,
        })

    return result
```

#### `GET /api/system/profiles/{name}/memory`

Devuelve el contenido de MEMORY.md y USER.md de un profile.

```python
@app.get("/api/system/profiles/{name}/memory")
async def get_profile_memory(name: str):
    profile_dir = Path.home() / ".hermes" / "profiles" / name

    if not profile_dir.exists():
        raise HTTPException(404, f"Profile '{name}' not found")

    memory = (profile_dir / "MEMORY.md").read_text() if (profile_dir / "MEMORY.md").exists() else ""
    user = (profile_dir / "USER.md").read_text() if (profile_dir / "USER.md").exists() else ""

    return {"profile": name, "memory": memory, "user": user}
```

#### `GET /api/templates`

Lista skills con `category: agenthub-template` como templates.

```python
@app.get("/api/templates")
async def get_templates():
    return TemplateService.list_templates()
```

```python
# services/template_service.py
import yaml
from pathlib import Path

class TemplateService:
    TEMPLATES_DIR = Path.home() / ".hermes" / "skills"

    @classmethod
    def list_templates(cls):
        templates = []
        for skill_dir in cls.TEMPLATES_DIR.iterdir():
            skill_file = skill_dir / "SKILL.md"
            if not skill_file.exists():
                continue

            # Parse frontmatter
            content = skill_file.read_text()
            if not content.startswith("---"):
                continue
            _, frontmatter, _ = content.split("---", 2)
            meta = yaml.safe_load(frontmatter)

            if meta.get("category") != "agenthub-template":
                continue

            templates.append({
                "id": skill_dir.name,
                "name": meta.get("name", skill_dir.name),
                "description": meta.get("description", ""),
                "params": meta.get("params", []),
                "tags": meta.get("tags", []),
            })

        return templates
```

#### `GET /api/templates/{id}/preview`

Renderiza el prompt con los parámetros proporcionados.

```python
@app.get("/api/templates/{id}/preview")
async def get_template_preview(id: str, params: dict = Query({})):
    return TemplateService.preview(id, params)
```

#### `GET /api/system/sessions/search`

Búsqueda full-text sobre el historial de sesiones.

```python
@app.get("/api/system/sessions/search")
async def search_sessions(q: str, limit: int = 20):
    db = SessionDB(os.path.expanduser("~/.hermes/state.db"))
    results = db.search_messages(q, limit=limit)
    return {"query": q, "results": results}
```

#### `GET /api/system/hooks`

Lee HOOK.yaml de todos los hooks configurados.

```python
@app.get("/api/system/hooks")
async def get_hooks():
    hooks_dir = Path.home() / ".hermes" / "hooks"
    if not hooks_dir.exists():
        return []

    hooks = []
    for h in hooks_dir.iterdir():
        hook_file = h / "HOOK.yaml"
        if hook_file.exists():
            hooks.append({
                "name": h.name,
                "config": yaml.safe_load(hook_file.read_text()),
            })
    return hooks
```

#### `GET /api/system/mcp-servers`

Lee configuración MCP de config.yaml.

```python
@app.get("/api/system/mcp-servers")
async def get_mcp_servers():
    config_path = Path.home() / ".hermes" / "config.yaml"
    config = yaml.safe_load(config_path.read_text()) if config_path.exists() else {}
    return config.get("mcp", {}).get("servers", [])
```

#### `GET /api/system/activity`

Lee el activity log del hook de monitoreo.

```python
@app.get("/api/system/activity")
async def get_activity(limit: int = 50):
    activity_log = Path.home() / ".hermes" / "activity.jsonl"
    if not activity_log.exists():
        return []

    entries = []
    with open(activity_log) as f:
        for line in f:
            entries.append(json.loads(line))
    return entries[-limit:]
```

---

## Pieza 2: Gateway Hook de Monitoreo

### Estructura

```
~/.hermes/hooks/agent-monitor/
├── HOOK.yaml
└── handler.py
```

### HOOK.yaml

```yaml
name: agent-monitor
version: "1.0"
description: "Logs agent activity for AgentHub dashboard"
events:
  - agent:start
  - agent:step
  - agent:end
```

### handler.py

```python
import json
import os
from pathlib import Path
from datetime import datetime

ACTIVITY_LOG = Path.home() / ".hermes" / "activity.jsonl"

def handle_event(event_type: str, payload: dict):
    entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": event_type,
        "profile": payload.get("profile", "unknown"),
        "session_id": payload.get("session_id"),
    }

    if event_type == "agent:start":
        entry["prompt_preview"] = (payload.get("prompt", "")[:200])
        entry["toolsets"] = payload.get("toolsets", [])

    elif event_type == "agent:step":
        entry["tool_name"] = payload.get("tool_name")
        entry["step_number"] = payload.get("step_number", 0)

    elif event_type == "agent:end":
        entry["total_steps"] = payload.get("total_steps", 0)
        entry["duration_ms"] = payload.get("duration_ms", 0)
        entry["tokens"] = payload.get("tokens", {})

    # Append to JSONL
    with open(ACTIVITY_LOG, "a") as f:
        f.write(json.dumps(entry) + "\n")
```

---

## Firma de la API (contrato entre P1 y P2)

P1 (frontend) consume estas interfaces de P2:

```typescript
// types.ts

interface SystemOverview {
  hermes_version: string;
  provider: string;
  profiles: ProfileSummary[];
  templates_count: number;
  total_skills: number;
}

interface ProfileSummary {
  name: string;
  model: string;
  provider: string;
  soul: string | null;
  memory_preview: string;
  memory_enabled: boolean;
  skills_count: number;
  sessions_count: number;
}

interface ProfileMemory {
  profile: string;
  memory: string;
  user: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  params: ParamDef[];
  tags: string[];
}

interface ParamDef {
  name: string;
  description: string;
  type: 'text' | 'select' | 'toggle' | 'number';
  required: boolean;
  default?: string;
  options?: string[];
}

interface TemplatePreview {
  template_id: string;
  rendered_prompt: string;
}

interface ActivityEntry {
  timestamp: string;
  event: 'agent:start' | 'agent:step' | 'agent:end';
  profile: string;
  session_id?: string;
  tool_name?: string;
  step_number?: number;
  total_steps?: number;
  duration_ms?: number;
}

interface SessionSearchResult {
  query: string;
  results: Array<{
    session_id: string;
    title: string;
    snippet: string;
  }>;
}

interface Hook {
  name: string;
  config: Record<string, any>;
}

interface McpServer {
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  url?: string;
}
```

---

## Orden de desarrollo

1. **Setup base** — FastAPI + CORS + health endpoint
2. **System overview** — Lee profiles, skills, config
3. **Profiles** — Lista profiles + detalle + memory
4. **Templates** — Parse SKILL.md frontmatter, CRUD
5. **Sessions search** — Wrapper SessionDB
6. **Gateway hook** — Monitoreo + activity log
7. **Integration test** — Conectar frontend contra las APIs
