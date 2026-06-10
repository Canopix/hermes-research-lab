# 🎯 AgentHub

Plataforma web para crear, configurar y monitorizar agentes de IA autónomos construida sobre [Hermes Agent](https://github.com/NousResearch/hermes-agent).

## Qué hace

AgentHub se instala **encima de tu Hermes existente** y te da interfaz web para:

- **Crear agentes** combinando templates + configuración vía wizard
- **Monitorizar** ejecuciones en tiempo real (SSE streaming)
- **Explorar** skills, tools, profiles, memoria y sesiones de forma visual
- **Gestionar** el ciclo de vida: crear → ejecutar → pausar → revisar outputs

## Quick Start

### Prerequisites

- **Hermes Agent** installed and running (api server on :8642)
- **Node.js 18+** (for frontend build)
- **Python 3.10+** (for Exploration API)

### Setup

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Install all dependencies
bash scripts/setup.sh

# 3. Start API + Frontend
bash scripts/start.sh

# 4. Run demo
bash scripts/demo.sh
```

### Or via npm/yarn

```bash
# Frontend only
cd frontend
cp .env.example .env.local
npm install
npm run dev     # → http://localhost:3000
```

Abre http://localhost:3000

## Arquitectura

```
Frontend (Next.js :3000)
        │
        ├──→ Hermes API Server (:8642)  ← runtime, jobs, sessions
        │
        └──→ Exploration API (:8643)    ← system overview, templates
                    │
                    └──→ Hermes nativo (skills, profiles, memory, cron)
```

- **Frontend** — Next.js 14 + shadcn/ui + TypeScript
- **Hermes API Server** — Runtime, jobs, sessions, streaming
- **Exploration API** — FastAPI, system overview, templates, búsqueda

Ver [docs/arquitectura.md](docs/arquitectura.md) para detalles.

## Templates

| Template | Descripción | Tools |
|----------|-------------|-------|
| 🔬 AI Researcher | Web → resumen diario de IA | web, tts |
| 📦 Repo Monitor | GitHub → digest de PRs/issues | web, terminal |
| 📄 Paper Summarizer | arXiv → resumen semanal | web |
| 👀 Competitor Watcher | URLs → detección de cambios | web |

Ver [docs/templates.md](docs/templates.md) para el formato SKILL.md.

## Equipo

| Persona | Rol | Focus |
|---------|-----|-------|
| P1 | Frontend | Dashboard, Builder, Historial, Exploración |
| P2 | Backend | Exploration API, hooks de monitoreo |
| P3 | Templates + DevOps | Skills, scripts, deployment |

Ver [docs/tareas.md](docs/tareas.md) para el reparto detallado.

## Documentación

| Doc | Contenido |
|-----|-----------|
| [Concepto](docs/concepto.md) | Visión, scope, público objetivo |
| [Arquitectura](docs/arquitectura.md) | Diagrama, endpoints, decisiones |
| [Componentes Hermes](docs/componentes.md) | Mapa Hermes → AgentHub |
| [Frontend](docs/frontend.md) | P1: las 4 vistas |
| [Backend](docs/backend.md) | P2: Exploration API + hooks |
| [Templates](docs/templates.md) | P3: skills como templates |
| [Wizard](docs/wizard.md) | Builder detallado (4 pasos) |
| [Deployment](docs/deployment.md) | Instalación y uso |
| [Tareas](docs/tareas.md) | Reparto 3 roles × 4 días |

## License

MIT
