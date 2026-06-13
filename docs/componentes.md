---
tags: [project, hackathon, agenthub, hermes, mapping]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🔄 Componentes de Hermes → AgentHub

> Mapa exhaustivo de **cada componente de Hermes** y cómo se usa en AgentHub.
> Referencia para los 3 workstreams.

---

## Runtime y Ejecución

### API Server

| Qué es | HTTP endpoint OpenAI-compatible |
|--------|-------------------------------|
| **En Hermes** | Corre como parte del gateway en `:8642` |
| **En AgentHub** | Frontend habla directamente a este endpoint |
| **Endpoints clave** | `/v1/chat/completions`, `/v1/responses`, `/v1/runs` |
| **Para qué** | Ejecución de agentes, chat, streaming |

### Plugin API (:9119)
| Qué es | Interfaz web embebida en Hermes Dashboard |
|--------|------------------------------------------|
| **En Hermes** | Plugin registrado en `~/.hermes/plugins/agenthub/` |
| **En AgentHub** | Tab "AgentHub" dentro del dashboard Hermes |
| **Endpoints** | `/api/plugins/agenthub/templates`, `/api/plugins/agenthub/create-agent`, `/api/plugins/agenthub/providers`, `/api/plugins/agenthub/channels` |
| **Para qué** | Crear agentes sin salir de Hermes Dashboard |

### AIAgent (Python Library)

| Qué es | Clase `AIAgent` embebible en Python |
|--------|-------------------------------------|
| **En Hermes** | `from run_agent import AIAgent` |
| **En AgentHub** | Exploration API lo usa para batch operations |
| **Para qué** | Crear agentes programáticamente sin subprocess |
| **Ejemplo** | `agent = AIAgent(model="qwen3", quiet_mode=True)` |

### Runs API

| Qué es | Sesiones long-running con event streaming |
|--------|------------------------------------------|
| **En Hermes** | `POST /v1/runs`, `GET /v1/runs/{id}/events` |
| **En AgentHub** | Ejecución en tiempo real desde el frontend |
| **Eventos SSE** | Token deltas, tool progress, lifecycle |
| **Para qué** | Trigger manual + ver progreso del agente |

---

## Scheduling y Orquestación

### Cron System

| Qué es | Scheduler persistente (tick cada 60s) |
|--------|---------------------------------------|
| **En Hermes** | `~/.hermes/cron/jobs.json` + `cron/scheduler.py` |
| **En AgentHub** | Jobs API: CRUD completo sin wrappers |
| **Endpoints** | `/api/jobs`, `/api/jobs/{id}/run`, `/api/jobs/{id}/pause` |
| **Formatos** | `"30m"`, `"every 2h"`, `"0 9 * * *"`, ISO timestamp |
| **Delivery** | Telegram, Discord, Slack, email, SMS, local file |

### Jobs API

| Qué es | API REST para gestionar cron jobs |
|--------|----------------------------------|
| **En Hermes** | GET/POST/PATCH/DELETE `/api/jobs` |
| **En AgentHub** | Dashboard + Builder usan estos endpoints |
| **Campos** | prompt, schedule, skills, model, delivery, profile |

---

## Almacenamiento

### SessionDB (state.db)

| Qué es | SQLite + FTS5 para sesiones y mensajes |
|--------|---------------------------------------|
| **En Hermes** | `~/.hermes/state.db` — WAL mode |
| **En AgentHub** | Exploration API lee directamente via `hermes_state.py` |
| **Tablas** | `sessions`, `messages`, `messages_fts`, `state_meta` |
| **API Python** | `SessionDB.search_messages("query")` — búsqueda full-text |
| **Para qué** | Historial de agentes, búsqueda de outputs |

### System Endpoints (Exploration API)
| Qué es | Endpoints de configuración del sistema |
|--------|----------------------------------------|
| **En Hermes** | Lee de `config.yaml` y archivos del sistema |
| **En AgentHub** | Exploration API expone datos del sistema |
| **Endpoints nuevos** | `GET /api/system/providers` — providers configurados, `GET /api/system/channels` — canales de delivery |

### Seguridad del Backend
| Medida | Descripción |
|--------|-------------|
| **Path traversal** | Validación de rutas para prevenir acceso a archivos fuera del directorio permitido |
| **Async I/O** | Conversiones a async para evitar race conditions |
| **API key** | Clave movida server-side, comparación constant-time |
| **JSON injection** | Construcción segura de JSON con escape de caracteres |

### Cron Output Storage

| Qué es | Outputs markdown de cada ejecución |
|--------|-----------------------------------|
| **En Hermes** | `~/.hermes/cron/output/{job_id}/{timestamp}.md` |
| **En AgentHub** | Exploration API lee archivos .md |
| **Formato** | Markdown limpio, listo para mostrar |

### Sessions Files

| Qué es | Transcripciones JSONL por sesión |
|--------|--------------------------------|
| **En Hermes** | `~/.hermes/sessions/*.jsonl` |
| **En AgentHub** | API Server las expone via Sessions API |

---

## Skills y Herramientas

### Skills System (~150 skills)

| Qué es | Documentos de conocimiento on-demand |
|--------|-------------------------------------|
| **En Hermes** | `~/.hermes/skills/` — SKILL.md + references/ |
| **En AgentHub** | Templates de agentes (skills con `category: agenthub-template`) |
| **Formato** | YAML frontmatter + Markdown body |
| **Params** | Definidos en frontmatter: text, select, toggle, number |
| **Carga** | Progresiva: `skills_list()` → `skill_view(name)` → `skill_view(name, path)` |
| **Comando** | `hermes skills browse`, `hermes skills install` |

### Toolsets (30+ toolsets, 70+ tools)

| Qué es | Agrupaciones de herramientas |
|--------|-----------------------------|
| **En Hermes** | `toolsets.py` — TOOLSETS dict |
| **En AgentHub** | Exploración: qué puede hacer cada agente |
| **Endpoints** | `GET /v1/toolsets` — lista completa |
| **Ejemplos** | web, browser, terminal, file, tts, vision, image_gen, etc. |

### MCP (Model Context Protocol)

| Qué es | Conexión a servidores de herramientas externos |
|--------|-----------------------------------------------|
| **En Hermes** | `~/.hermes/config.yaml` → `mcp.servers` |
| **En AgentHub** | Exploración: extensiones instaladas |
| **Tipos** | stdio (local subprocess) o HTTP (remoto) |
| **Comando** | `hermes mcp list`, `hermes mcp add` |

---

## Profiles y Aislamiento

### Profiles

| Qué es | Directorios HERMES_HOME aislados |
|--------|--------------------------------|
| **En Hermes** | `~/.hermes/profiles/{name}/` |
| **En AgentHub** | 1 profile = 1 agente autónomo |
| **Contenido** | config.yaml, .env, SOUL.md, MEMORY.md, skills/, sessions/, cron/ |
| **Aislamiento** | Config, memoria, skills, sesiones y cron independientes |
| **Comando** | `hermes profile list`, `hermes profile create` |

### SOUL.md (Personalidad)

| Qué es | Identidad y tono del agente |
|--------|---------------------------|
| **En Hermes** | `~/.hermes/profiles/{name}/SOUL.md` — slot #1 en system prompt |
| **En AgentHub** | Builder permite configurar personalidad |
| **Ejemplo** | "Eres un investigador de IA experto en tendencias..." |

### Memory (Memoria Persistente)

| Qué es | Lo que el agente recuerda entre sesiones |
|--------|----------------------------------------|
| **En Hermes** | MEMORY.md + USER.md por profile |
| **En AgentHub** | Exploración: ver qué recuerda cada agente |
| **Providers** | built-in, Honcho, Mem0, SuperMemory |
| **Config** | `memory.memory_enabled: true` |

### Context Files

| Qué es | Archivos que dan contexto al agente |
|--------|-------------------------------------|
| **En Hermes** | AGENTS.md, SOUL.md, .cursorrules, .hermes.md |
| **En AgentHub** | Configuración de proyecto por profile |
| **Prioridad** | `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules` |
| **Progresivo** | Se descubren subdirectorios bajo demanda |

---

## Monitoreo y Hooks

### Gateway Hooks

| Qué es | Event handlers en lifecycle del gateway |
|--------|----------------------------------------|
| **En Hermes** | `~/.hermes/hooks/{name}/HOOK.yaml + handler.py` |
| **En AgentHub** | Hook de monitoreo: agent:start, step, end |
| **Eventos** | `agent:start`, `agent:step`, `agent:end`, `session:start`, `session:end` |
| **Uso** | Activity logging para dashboard |

### Shell Hooks

| Qué es | Scripts shell en eventos de tool |
|--------|-------------------------------|
| **En Hermes** | config.yaml → `hooks.pre_tool_call`, `hooks.post_tool_call` |
| **En AgentHub** | Cost tracking, audit de comandos |
| **Variables** | `HERMES_HOOK_TOOL_NAME`, `HERMES_HOOK_ARGS`, etc. |

### Health API

| Qué es | Estado del sistema en tiempo real |
|--------|--------------------------------|
| **En Hermes** | `GET /health`, `GET /health/detailed` |
| **En AgentHub** | Dashboard: sesiones activas, estado de componentes |

---

## Plataformas y Delivery

### Gateway (20+ platform adapters)

| Qué es | Conector a plataformas de mensajería |
|--------|-------------------------------------|
| **En Hermes** | `~/.hermes/gateway/platforms/` |
| **En AgentHub** | Delivery de outputs: Telegram, Discord, etc. |
| **Plataformas** | Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, SMS, Teams... |

### Send Message Tool

| Qué es | Envío de mensajes cross-platform |
|--------|--------------------------------|
| **En Hermes** | Tool `send_message` |
| **En AgentHub** | Outputs entregados automáticamente via delivery config |

---

## Resumen visual

```
HERMES COMPONENTE          →  AGENTHUB FUNCIONALIDAD
─────────────────────────────────────────────────────
API Server (:8642)         →  Runtime de agentes (chat, runs, jobs)
Sessions API               →  Historial de agentes
Jobs API                   →  Dashboard + Builder (CRUD)
Runs API + SSE             →  Ejecución en tiempo real
Skills (~150)              →  Templates de agentes
Toolsets (30+)             →  Exploración de capacidades
Profiles                   →  Agentes aislados
SOUL.md                    →  Personalidad por agente
Memory (MEMORY.md)         →  Memoria acumulada por agente
SessionDB (state.db)       →  Búsqueda full-text del historial
Cron                       →  Orquestación programada
Gateway Hooks              →  Monitoreo de actividad
MCP Servers                →  Extensiones externas
Context Files (AGENTS.md)  →  Config de proyecto
Gateway (20+ platforms)    →  Delivery multi-plataforma
AIAgent (Python lib)       →  Batch operations en Exploration API
Curator                    →  Lifecycle de templates
Kanban                     →  Tareas distribuidas (futuro)
Plugins                    →  Custom functionality
```
