# AgentHub

> Plataforma de gestión multi-agente sobre Hermes Agent. Crea, configura, monitorea y explora tus agentes AI desde una interfaz web unificada.

## Descripción

AgentHub es un sistema completo para gestionar agentes AI basados en Hermes Agent. Proporciona:

- **Dashboard** - Visualiza todos tus agentes activos con métricas en tiempo real
- **Wizard de creación** - Crea agentes desde templates predefinidos con configuración guiada
- **Historial** - Revisa outputs de ejecuciones anteriores con markdown rendering
- **Exploración** - Navega profiles, skills, toolsets, hooks, MCP servers, cron jobs y config de Hermes
- **Streaming SSE** - Monitorea la ejecución de agentes en tiempo real
- **CLI unificada** - Scripts de gestión para setup, start, stop y status

## Arquitectura

El frontend solo habla con la Exploration API, que actúa como gateway unificado:

    Frontend (:3000) ──> Exploration API (:8643) ──> Hermes Agent (:8642)
                                  │
                                  ├── Jobs CRUD (crear, listar, trigger, pausar...)
                                  ├── SSE streaming (eventos en tiempo real)
                                  ├── System overview, profiles, skills
                                  ├── Templates
                                  └── Sessions search, hooks, MCP, cron

El usuario final solo necesita que el Exploration API esté corriendo. La comunicación con el API Server de Hermes (:8642) es interna.

## Requisitos

- **Hermes Agent** v0.12.0+ instalado
- **Python** 3.10+
- **Node.js** 18+

## Quick Start

    agenthub setup    # Instala dependencias, configura Hermes API Server
    agenthub start    # Arranca Exploration API + Frontend
    agenthub status   # Verifica que todo funcione

## Scripts CLI (agenthub)

| Comando         | Descripción                                                          |
|-----------------|----------------------------------------------------------------------|
| agenthub setup  | Instala dependencias, habilita Hermes API Server, configura entornos |
| agenthub start  | Arranca Exploration API + Frontend en background                     |
| agenthub stop   | Detiene todos los servicios                                          |
| agenthub status | Verifica estado de Hermes, Explore API y Frontend                    |
| agenthub demo   | Ejecuta demo de 5 pasos                                              |

## Templates Disponibles

| Template          | Descripción                                           | Toolsets      |
|-------------------|------------------------------------------------------|---------------|
| AI Researcher     | Monitorea web/RSS, genera resúmenes + podcast TTS     | web, tts      |
| Repo Monitor      | Monitorea repos GitHub: PRs, issues, releases        | web, terminal |
| Paper Summarizer  | Monitorea arXiv por categoría, resúmenes técnicos    | web           |
| Competitor Watcher| Monitorea URLs de competidores y detecta cambios      | web           |

## Endpoints

| Servicio          | Puerto | URL                        |
|-------------------|--------|----------------------------|
| Exploration API   | 8643   | http://localhost:8643      |
| Frontend          | 3000   | http://localhost:3000      |
| Hermes API Server | 8642   | http://localhost:8642 (interno) |

> **Nota:** El Hermes API Server (:8642) es un servicio interno que usa la Exploration API. Los usuarios solo interactúan con el frontend (:3000).

## Estructura del Proyecto

    agenthub/
    ├── frontend/              # Next.js 15 + TypeScript + Tailwind
    ├── explore-api/           # FastAPI - Exploration API (gateway unificado)
    │   ├── routers/
    │   │   ├── jobs.py        # Jobs CRUD + SSE proxy → Hermes API Server
    │   │   ├── system.py      # Overview, profiles, skills, toolsets
    │   │   ├── templates.py   # Catálogo de templates
    │   │   ├── sessions.py    # Búsqueda FTS5
    │   │   └── extras.py      # Hooks, MCP, cron, activity
    │   └── services/
    │       └── hermes_client.py  # Async client → Hermes API Server
    ├── scripts/               # CLI scripts + agenthub.py
    ├── docs/                  # Documentación
    ├── README.md
    └── PHASES.md

## Docs

- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## Licencia

MIT
