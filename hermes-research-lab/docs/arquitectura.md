---
tags: [project, hackathon, agenthub, architecture]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🏗️ Arquitectura — AgentHub

> **Principio de diseño:** No construir lo que Hermes ya tiene. Solo exponerlo.

---

## Visión general

AgentHub se compone de **3 capas**:

```
┌─────────────────────────────────────┐
│  Frontend (Next.js)                 │  ← La cara del producto
├─────────────────────────────────────┤
│  Hermes API Server + Exploration API│  ← El cerebro
├─────────────────────────────────────┤
│  Hermes nativo (runtime + storage)  │  ← Todo el trabajo pesado
└─────────────────────────────────────┘
```

- **Capa 1 — Frontend:** Next.js + shadcn/ui. Las 4 vistas (dashboard, builder, historial, exploración).
- **Capa 2 — API layer:** Hermes API Server (`:8642`) para runtime + FastAPI (`:8643`) para exploración y templates.
- **Capa 3 — Hermes nativo:** Profiles, cron, sessions, skills, memory, hooks, MCP. Todo ya construido.

---

## Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────────────┐
│                     AGENTHUB FRONTEND (:3000)                         │
│                 Next.js 14 + shadcn/ui + TypeScript                   │
│                                                                       │
│  ┌───────────┬───────────┬───────────┬────────────────────────────┐  │
│  │ Dashboard │  Builder  │ Historial │      Exploración           │  │
│  │ /agents   │ /create   │ /history  │ /explore                   │  │
│  └─────┬─────┴─────┬─────┴─────┬─────┴────────────┬──────────────┘  │
└────────┼───────────┼───────────┼──────────────────┼──────────────────┘
         │           │           │                  │
         ▼           ▼           ▼                  ▼
┌─────────────────────────┐  ┌──────────────────────────────────────┐
│  HERMES API SERVER      │  │  EXPLORATION API (:8643)              │
│  :8642                  │  │  FastAPI — solo lectura + templates   │
│                         │  │                                       │
│  /v1/runs + /events     │  │  GET /api/system/overview             │
│  /api/jobs (CRUD)       │  │  GET /api/system/profiles             │
│  /api/sessions          │  │  GET /api/system/profiles/{name}/...  │
│  /v1/skills             │  │  GET /api/templates                   │
│  /v1/toolsets           │  │  POST /api/templates                  │
│  /health/detailed       │  │  GET /api/system/hooks                │
│  /v1/models             │  │  GET /api/system/mcp-servers          │
│  /v1/capabilities       │  │  GET /api/system/cron-overview        │
└────────────┬────────────┘  └────────────────┬─────────────────────┘
             │                                │
             ▼                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     HERMES NATIVO                                     │
│                                                                       │
│  ~/.hermes/                                                          │
│  ├── state.db          Sesiones + FTS5 (SQLite + búsqueda)           │
│  ├── cron/jobs.json    Definiciones de jobs programados              │
│  ├── cron/output/      Outputs de cada ejecución (.md)               │
│  ├── skills/           Skills instalados (~150 bundled)              │
│  ├── hooks/            Gateway hooks (monitoreo de actividad)        │
│  ├── plugins/          Plugins Python                                │
│  ├── config.yaml       Configuración global                          │
│  ├── .env              API keys                                      │
│  ├── auth.json         OAuth credentials                             │
│  └── profiles/         Un profile = un agente aislado                │
│      ├── default/                                                      │
│      │   ├── config.yaml    Config del profile                        │
│      │   ├── SOUL.md        Personalidad del agente                   │
│      │   ├── MEMORY.md      Memoria persistente                       │
│      │   ├── USER.md        Modelo del usuario                        │
│      │   ├── skills/        Skills del profile                        │
│      │   ├── sessions/      Sesiones (transcripciones)                │
│      │   └── cron/          Jobs del profile                          │
│      ├── agent-researcher/  Profile para AI Researcher                │
│      └── ...                                                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## API Server (:8642) — Endpoints que usa el Frontend

### Jobs (agentes programados)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/jobs` | Listar todos los jobs |
| POST | `/api/jobs` | Crear un job nuevo |
| GET | `/api/jobs/{id}` | Detalle de un job |
| PATCH | `/api/jobs/{id}` | Actualizar un job |
| DELETE | `/api/jobs/{id}` | Eliminar un job |
| POST | `/api/jobs/{id}/pause` | Pausar |
| POST | `/api/jobs/{id}/resume` | Reanudar |
| POST | `/api/jobs/{id}/run` | Ejecutar ahora (trigger) |
| GET | `/api/jobs/{id}/outputs` | Outputs históricos |

### Runs (ejecución en tiempo real)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/v1/runs` | Crear un run |
| GET | `/v1/runs/{id}` | Estado del run |
| GET | `/v1/runs/{id}/events` | SSE streaming + tool progress |
| POST | `/v1/runs/{id}/stop` | Interrumpir |

### Sessions (historial)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/sessions` | Listar sesiones |
| GET | `/api/sessions/{id}` | Detalle de sesión |
| GET | `/api/sessions/{id}/messages` | Mensajes de la sesión |
| POST | `/api/sessions/{id}/chat` | Chat síncrono |
| POST | `/api/sessions/{id}/chat/stream` | Chat streaming |

### Discovery

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/v1/skills` | Skills disponibles |
| GET | `/v1/toolsets` | Toolsets + tools |
| GET | `/v1/models` | Modelo activo |
| GET | `/v1/capabilities` | Features del API server |
| GET | `/health` | Health check |
| GET | `/health/detailed` | Estado completo del sistema |

**Auth:** `Authorization: Bearer <API_SERVER_KEY>` en todas las peticiones.

---

## Exploration API (:8643) — Lo que Hermes no expone

### System

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/system/overview` | Vista completa: profiles + jobs + skills + health |
| GET | `/api/system/health` | Health check |

### Profiles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/system/profiles` | Lista de perfiles con detalle |
| GET | `/api/system/profiles/{name}` | Detalle de un perfil |
| GET | `/api/system/profiles/{name}/memory` | MEMORY.md + USER.md del agente |
| GET | `/api/system/profiles/{name}/config` | config.yaml del profile |
| POST | `/api/system/profiles` | Crear profile (wrapper) |

### Templates (skills con category=agenthub-template)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/templates` | Catálogo de templates |
| GET | `/api/templates/{id}` | Detalle + params |
| GET | `/api/templates/{id}/preview` | Prompt renderizado con config |
| POST | `/api/templates` | Registrar template (instalar skill) |
| DELETE | `/api/templates/{id}` | Eliminar template |

### System info

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/system/tools` | Toolsets + tools disponibles |
| GET | `/api/system/hooks` | Hooks configurados |
| GET | `/api/system/mcp-servers` | MCP servers registrados |
| GET | `/api/system/cron-overview` | Vista agregada de jobs + profiles |
| GET | `/api/system/sessions/search?q=` | Búsqueda full-text (FTS5) |
| GET | `/api/system/activity` | Activity log del hook de monitoreo |

---

## Flujo de comunicación Frontend ↔ APIs

```
┌────────────────────────────────────────────────────────────┐
│                     FLUJOS DE DATOS                         │
│                                                              │
│  1. DASHBOARD                                                │
│     Frontend ──→ GET :8642/api/jobs                          │
│     Frontend ──→ GET :8642/api/jobs/{id}/outputs             │
│     Frontend ──→ GET :8642/health/detailed                   │
│     Frontend ──→ GET :8643/api/system/cron-overview          │
│                                                              │
│  2. BUILDER (crear agente)                                   │
│     Frontend ──→ GET :8643/api/templates        (ver catálogo)│
│     Frontend ──→ GET :8643/api/templates/{id}/preview        │
│     Frontend ──→ POST :8642/api/jobs             (crear job)  │
│                                                              │
│  3. HISTORIAL                                                │
│     Frontend ──→ GET :8642/api/jobs/{id}/outputs             │
│     Frontend ──→ GET :8643/api/system/sessions/search?q=     │
│                                                              │
│  4. EXPLORACIÓN                                              │
│     Frontend ──→ GET :8643/api/system/overview               │
│     Frontend ──→ GET :8642/v1/skills                         │
│     Frontend ──→ GET :8642/v1/toolsets                       │
│     Frontend ──→ GET :8643/api/system/profiles               │
│     Frontend ──→ GET :8643/api/system/profiles/{name}/memory │
│     Frontend ──→ GET :8643/api/system/hooks                  │
│     Frontend ──→ GET :8643/api/system/mcp-servers            │
│                                                              │
│  5. EJECUCIÓN EN TIEMPO REAL                                 │
│     Frontend ──→ POST :8642/api/jobs/{id}/run  (trigger)     │
│     Frontend ←── SSE :8642/v1/runs/{id}/events (streaming)   │
└────────────────────────────────────────────────────────────┘
```

---

## Stack técnico

| Componente | Tecnología | Líneas est. |
|-----------|-----------|-------------|
| Frontend | Next.js 14 + shadcn/ui + TypeScript | ~3000 |
| Hermes API Server | Nativo (`hermes gateway`) | **0** |
| Exploration API | FastAPI + hermes_state | ~800 |
| Gateway Hooks | Python handler | ~100 |
| Templates | Skills de Hermes (SKILL.md) | ~400 |
| **Total código nuevo** | | **~4300** |

### Puertos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Hermes API Server | 8642 | Runtime, jobs, sessions, skills |
| Exploration API | 8643 | System overview, templates |
| Frontend (dev) | 3000 | Next.js dev server |
| Frontend (prod) | 80/443 | Nginx reverse proxy |

### Dependencias Python

```
# Exploration API
fastapi
uvicorn
httpx          # para proxy al API Server
pyyaml         # para parsear SKILL.md frontmatter
hermes-agent   # importa hermes_state.py (SessionDB)
```

### Dependencias Frontend

```
# Next.js
next@14
react@18
typescript
tailwindcss
shadcn/ui

# HTTP client
@tanstack/react-query    # data fetching + caching
eventsource               # SSE client para streaming
```

---

## Decisiones de diseño

| Decisión | Elección | Razón |
|---------|---------|-------|
| ¿Backend custom? | **No** — usar Hermes API Server | Ya tiene todo: CRUD, streaming, scheduling |
| ¿Templates como qué? | **Skills de Hermes** | Versionado nativo, loading por nombre, params YAML |
| ¿Cómo se ejecutan agentes? | **Hermes cron + Jobs API** | Persistente, delivery multi-plataforma |
| ¿Cómo se ve el progreso? | **SSE via Runs API** | Nativo, con tool progress events |
| ¿Cómo se busca el historial? | **SessionDB FTS5** | Búsqueda full-text nativa |
| ¿Cómo se memoria? | **Hermes memory nativo** | MEMORY.md + USER.md por profile |
| ¿Cómo se monitorea? | **Gateway hooks** | agent:start, agent:end, agent:step |
| ¿Cómo se extiende? | **MCP servers** | Herramientas externas dinámicas |
| ¿1 profile por agente? | **Sí** | Aislamiento total de config, memoria, skills |
| ¿Exploration API? | **FastAPI ligero** (~800 LOC) | Solo para datos que Hermes no expone por HTTP |
