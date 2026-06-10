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

    Frontend (:3000) --> Exploration API (:8643) --> Hermes Agent (:8642)

## Requisitos

- **Hermes Agent** v0.12.0+ instalado y corriendo
- **Python** 3.10+
- **Node.js** 18+
- **npm** o **pnpm**

## Quick Start

    agenthub setup && agenthub start

## Scripts CLI (agenthub)

| Comando      | Descripción                                                |
|-------------|-----------------------------------------------------------|
| agenthub setup   | Instala dependencias, configura Hermes, venv, npm, templates, hooks |
| agenthub start   | Arranca Exploration API + Frontend en background          |
| agenthub stop    | Detiene todos los servicios                               |
| agenthub status  | Verifica estado de Hermes, Explore API y Frontend         |
| agenthub demo    | Ejecuta demo de 5 pasos                                   |

## Templates Disponibles

| Template          | Descripción                                           | Toolsets      |
|-------------------|------------------------------------------------------|---------------|
| AI Researcher     | Monitorea web/RSS, genera resúmenes + podcast TTS     | web, tts      |
| Repo Monitor      | Monitorea repos GitHub: PRs, issues, releases        | web, terminal |
| Paper Summarizer  | Monitorea arXiv por categoría, resúmenes técnicos       | web           |
| Competitor Watcher| Monitorea URLs de competidores y detecta cambios       | web           |

## Endpoints

| Servicio           | Puerto | URL                        |
|--------------------|--------|----------------------------|
| Hermes API Server  | 8642   | http://localhost:8642      |
| Exploration API    | 8643   | http://localhost:8643      |
| Frontend           | 3000   | http://localhost:3000      |

## Estructura del Proyecto

    agenthub/
    +-- frontend/              # Next.js 15 + TypeScript + Tailwind
    +-- explore-api/           # FastAPI - Exploration API
    +-- scripts/               # CLI scripts + agenthub.py
    +-- docs/                  # Documentación
    +-- README.md
    +-- PHASES.md

## Docs

- [Hermes Agent Docs](https://hermes-agent.nousresearch.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## Licencia

MIT
