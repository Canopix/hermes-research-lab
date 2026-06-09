---
tags: [project, hackathon, agenthub, concept]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 💡 Concepto — AgentHub

## Visión

AgentHub permite a cualquier persona **crear y monitorizar agentes de IA autónomos** sin escribir código. El usuario elige un template, lo configura en 3-4 pasos, y el agente corre solo ejecutando tareas programadas (resúmenes de noticias, monitoreo de repos, etc.).

**La diferencia:** todo el runtime lo proporciona Hermes Agent — un framework open-source de agentes autónomos con 70+ herramientas, scheduling, memoria y multi-plataforma. AgentHub solo construye la interfaz.

---

## Modelo de producto

### Templates configurables (no código)

El usuario NO programa. Elige un template de una galería y lo configura:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Galería    │ ──→ │   Wizard     │ ──→ │  Agente     │
│  Templates  │     │  3-4 pasos   │     │  corriendo  │
└─────────────┘     └──────────────┘     └─────────────┘
```

### Templates iniciales (4)

| Template | Qué hace | Herramientas |
|----------|---------|-------------|
| 🔬 **AI Researcher** | Web/RSS → resumen diario + podcast TTS | web, tts, blogwatcher |
| 📦 **Repo Monitor** | GitHub → digest de PRs/issues/releases | web, terminal |
| 📄 **Paper Summarizer** | arXiv → resumen técnico semanal | web, arxiv |
| 👀 **Competitor Watcher** | URLs → detección de cambios | web |

Cada template se implementa como un **Skill de Hermes** con params configurables en frontmatter YAML.

---

## Las 4 vistas del producto

### 1. 🏠 Dashboard
Lista de agentes activos con estado, próxima ejecución y preview del último output.

### 2. 🔧 Builder (Wizard)
Galería de templates → configurar params → preview del prompt → crear agente.

### 3. 📊 Historial
Outputs de cada ejecución, búsqueda full-text, filtros por agente/fecha/estado.

### 4. 🔍 Exploración
Todo lo que Hermes tiene: skills instalados, toolsets, profiles, memoria de agentes, sesiones, hooks, MCP servers, configuración del sistema.

---

## Público objetivo

**Personas que ya usan Hermes Agent** y quieren:
- Interfaz web para gestionar sus agentes
- Crear agentes nuevos sin tocar la CLI
- Monitorizar ejecuciones en tiempo real
- Explorar skills, tools, profiles y memoria de forma visual

AgentHub es un **plugin** que se instala encima de Hermes existente. No reemplaza la CLI, no toca la config existente, solo añade interfaz web.

---

## Scope IN (construir)

- Dashboard con agentes programados
- Wizard de creación de agentes (3-4 pasos)
- Historial de outputs con búsqueda
- Vista de exploración del sistema
- 4 templates funcionales
- Streaming en tiempo real (SSE)
- Delivery multi-plataforma (Telegram, Discord, etc.)

## Scope OUT (NO construir)

- ❌ Auth compleja / multi-usuario
- ❌ Editor visual de nodos tipo Langflow
- ❌ Edición de prompts desde la UI
- ❌ Multi-tenant
- ❌ Modelo de billing / pagos
- ❌ Mobile app nativa

---

## Por qué sobre Hermes (no desde cero)

| Si construyéramos desde cero | Con Hermes |
|-----|------|
| Scheduler custom | Hermes cron nativo (persistente, delivery multi-plataforma) |
| Runtime de agentes | AIAgent con 70+ tools, 3 API modes |
| Session storage | SQLite + FTS5 con búsqueda full-text |
| Memoria | MEMORY.md + USER.md + providers externos |
| Streaming | Runs API con SSE + tool progress events |
| Herramientas | web, browser, terminal, file, tts, image_gen, etc. |
| Skills | 150+ skills instalables como templates |
| Plataformas | Telegram, Discord, Slack, WhatsApp, etc. |
| Aislamiento | Profiles con HERMES_HOME separado |

**Resultado:** ~3900 líneas de código nuevo vs ~10000+ si construyéramos todo desde cero.
