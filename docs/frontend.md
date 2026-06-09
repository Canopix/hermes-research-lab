---
tags: [project, hackathon, agenthub, frontend]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🖥️ Frontend — P1

> **Entregable:** Next.js + shadcn/ui con las 4 vistas
> **Persona:** P1 — Frontend
> **Dependencia:** Necesita las APIs del API Server (:8642) y Exploration API (:8643)

---

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- @tanstack/react-query (data fetching)
- eventsource (SSE client para streaming)

---

## Vista 1: Dashboard (`/agents`)

**Qué muestra:** Lista de agentes programados con estado y métricas.

### Componentes

| Componente | Descripción |
|-----------|-------------|
| `StatsBar` | 4 cards: agentes activos, ejecuciones hoy, tasa de éxito, última ejecución |
| `AgentGrid` | Grid responsivo de agent cards (1 col → 2 → 3) |
| `AgentCard` | Nombre, badge estado, próxima ejecución, último output preview |
| `StatusBadge` | active=verde, paused=amarillo, error=rojo |

### Datos

```
GET :8642/api/jobs                    → lista de jobs
GET :8642/api/jobs/{id}/outputs       → outputs recientes
GET :8642/health/detailed             → sesiones activas
GET :8643/api/system/cron-overview    → vista agregada
```

### Acciones por card

- **Pausar/Reanudar** → `POST /api/jobs/{id}/pause` / `/resume`
- **Ejecutar ahora** → `POST /api/jobs/{id}/run`
- **Ver detalle** → navegar a `/agents/{id}`

### Polling

Cada 30s refresca datos vía react-query.

---

## Vista 2: Builder (`/create`)

**Qué muestra:** Wizard de 4 pasos para crear un agente.
> Detalle completo del flujo: [[🎯 AH-Wizard]]

### Paso 1: Elegir template

| Componente | Descripción |
|-----------|-------------|
| `TemplateGrid` | Cards con icono, nombre, descripción, tags |
| `TemplateCard` | Click → siguiente paso con template pre-seleccionado |

**Datos:** `GET :8643/api/templates`

### Paso 2: Configurar parámetros

| Componente | Descripción |
|-----------|-------------|
| `DynamicParam` | Renderiza form según `template.params[]` |
| `ParamInput` | type=text → Input |
| `ParamSelect` | type=select → Select con options |
| `ParamToggle` | type=toggle → Switch |
| `ParamNumber` | type=number → Input number |

**Validación:** campos required con asterisco, botón disabled si falta alguno.

### Paso 3: Resumen + Crear

| Componente | Descripción |
|-----------|-------------|
| `WizardSummary` | Card con todos los parámetros configurados |
| `PromptPreview` | Preview del prompt renderizado |

**Datos:** `GET :8643/api/templates/{id}/preview?...params`
**Crear:** `POST :8642/api/jobs`

---

## Vista 3: Historial (`/history`)

**Qué muestra:** Timeline de ejecuciones con outputs completos.

### Componentes

| Componente | Descripción |
|-----------|-------------|
| `HistoryFilters` | Filtros: agente, estado, rango fecha |
| `ExecutionTable` | Tabla: timestamp, agente, badge estado, output preview |
| `OutputViewer` | Markdown renderizado del output completo |
| `Pagination` | 20 items por página |

### Datos

```
GET :8642/api/jobs                    → lista de jobs (para filtro)
GET :8642/api/jobs/{id}/outputs       → outputs de un job
GET :8643/api/system/sessions/search?q=  → búsqueda full-text
```

---

## Vista 4: Exploración (`/explore`)

**Qué muestra:** Todo lo que Hermes tiene configurado.

### Secciones

| Sección | Datos | Endpoint |
|---------|-------|----------|
| **Skills / Templates** | Skills instalados, categorías, params | `GET :8642/v1/skills` + `GET :8643/api/templates` |
| **Toolsets / Tools** | Toolsets habilitados, tools individuales | `GET :8642/v1/toolsets` |
| **Profiles / Agentes** | Perfiles, modelo, SOUL preview, memory | `GET :8643/api/system/profiles` |
| **Memory** | MEMORY.md y USER.md de cada agente | `GET :8643/api/system/profiles/{name}/memory` |
| **Sessions / Historial** | Sesiones recientes, búsqueda | `GET :8642/api/sessions` + `GET :8643/api/system/sessions/search` |
| **Hooks / Monitoreo** | Hooks configurados, activity log | `GET :8643/api/system/hooks` + `GET :8643/api/system/activity` |
| **MCP / Extensiones** | MCP servers registrados | `GET :8643/api/system/mcp-servers` |
| **Config** | Provider, platforms, compression | `GET :8643/api/system/overview` |

### Componentes

| Componente | Descripción |
|-----------|-------------|
| `ExploreTabs` | Tabs por sección |
| `SkillCard` | Card de skill: nombre, categoría, descripción, params |
| `ToolsetList` | Lista expandible de toolsets → tools |
| `ProfileCard` | Card de profile: nombre, modelo, SOUL preview, stats |
| `SessionList` | Lista de sesiones con búsqueda |
| `SystemOverview` | Health, provider, platforms conectados |

---

## Estructura del proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                    ← Dashboard
│   │   ├── create/
│   │   │   └── page.tsx               ← Builder wizard
│   │   ├── history/
│   │   │   └── page.tsx               ← Historial
│   │   ├── explore/
│   │   │   └── page.tsx               ← Exploración
│   │   └── agents/
│   │       └── [id]/
│   │           └── page.tsx           ← Detalle de agente
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentGrid.tsx
│   │   │   ├── StatsBar.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── builder/
│   │   │   ├── TemplateGrid.tsx
│   │   │   ├── TemplateCard.tsx
│   │   │   ├── WizardStep.tsx
│   │   │   ├── DynamicParam.tsx
│   │   │   ├── WizardSummary.tsx
│   │   │   └── PromptPreview.tsx
│   │   ├── history/
│   │   │   ├── HistoryFilters.tsx
│   │   │   ├── ExecutionTable.tsx
│   │   │   ├── OutputViewer.tsx
│   │   │   └── Pagination.tsx
│   │   └── explore/
│   │       ├── ExploreTabs.tsx
│   │       ├── SkillCard.tsx
│   │       ├── ToolsetList.tsx
│   │       ├── ProfileCard.tsx
│   │       └── SystemOverview.tsx
│   ├── lib/
│   │   ├── api.ts                     ← API client (hermes + exploration)
│   │   ├── types.ts                   ← TypeScript interfaces
│   │   └── sse.ts                     ← SSE client helper
│   └── hooks/
│       ├── useJobs.ts                 ← react-query hooks
│       ├── useTemplates.ts
│       ├── useProfiles.ts
│       └── useSystem.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## API Client (`lib/api.ts`)

```typescript
const HERMES_URL = process.env.NEXT_PUBLIC_HERMES_URL || 'http://localhost:8642';
const EXPLORE_URL = process.env.NEXT_PUBLIC_EXPLORE_URL || 'http://localhost:8643';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

// Hermes API Server
export const hermes = {
  // Jobs
  getJobs: () => fetch(`${HERMES_URL}/api/jobs`, { headers: auth() }),
  createJob: (data: CreateJob) => post(`${HERMES_URL}/api/jobs`, data),
  pauseJob: (id: string) => post(`${HERMES_URL}/api/jobs/${id}/pause`),
  resumeJob: (id: string) => post(`${HERMES_URL}/api/jobs/${id}/resume`),
  triggerJob: (id: string) => post(`${HERMES_URL}/api/jobs/${id}/run`),
  getJobOutputs: (id: string) => get(`${HERMES_URL}/api/jobs/${id}/outputs`),

  // Sessions
  getSessions: () => get(`${HERMES_URL}/api/sessions`),
  getMessages: (id: string) => get(`${HERMES_URL}/api/sessions/${id}/messages`),

  // Discovery
  getSkills: () => get(`${HERMES_URL}/v1/skills`),
  getToolsets: () => get(`${HERMES_URL}/v1/toolsets`),
  getHealth: () => get(`${HERMES_URL}/health/detailed`),

  // Runs (SSE)
  createRun: (data: CreateRun) => post(`${HERMES_URL}/v1/runs`, data),
  streamRun: (id: string) => new EventSource(`${HERMES_URL}/v1/runs/${id}/events`),
};

// Exploration API
export const explore = {
  getOverview: () => get(`${EXPLORE_URL}/api/system/overview`),
  getProfiles: () => get(`${EXPLORE_URL}/api/system/profiles`),
  getMemory: (name: string) => get(`${EXPLORE_URL}/api/system/profiles/${name}/memory`),
  getTemplates: () => get(`${EXPLORE_URL}/api/templates`),
  getTemplatePreview: (id: string, params: object) =>
    get(`${EXPLORE_URL}/api/templates/${id}/preview`, params),
  getHooks: () => get(`${EXPLORE_URL}/api/system/hooks`),
  getMcpServers: () => get(`${EXPLORE_URL}/api/system/mcp-servers`),
  searchSessions: (q: string) => get(`${EXPLORE_URL}/api/system/sessions/search`, { q }),
};
```
