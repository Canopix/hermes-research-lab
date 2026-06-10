# hermes-research-lab — AgentHub

Hackathon project: AgentHub is a web platform for creating, configuring, and monitoring autonomous AI agents built on top of Hermes Agent.

## Stack

- **Frontend**: Next.js 14 + shadcn/ui + TypeScript (P1 — DONE)
- **Backend**: FastAPI (Exploration API on :8643) + Hermes API Server (:8642)
- **Templates**: 4 SKILL.md templates for agent creation
- **Monitoring**: Gateway hook for activity logging

## Structure

```
explore-api/           — FastAPI Exploration API (Python)
  main.py              — App + CORS + routers
  routers/             — system, profiles, templates, sessions_search
  services/            — hermes_reader, template_service, session_service
templates/             — 4 SKILL.md agent templates
  ai-researcher/       — Daily AI research digest
  repo-monitor/        — GitHub repo activity tracking
  paper-summarizer/    — Academic paper summaries
  competitor-watcher/  — Website change detection
hooks/                 — Gateway hooks for monitoring
  agent-monitor/       — Activity logging hook
scripts/               — Setup, start, demo scripts
docs/                  — Architecture and task docs
frontend/              — Next.js frontend (pending P1)
```

## Quick Start

```bash
bash scripts/setup.sh    # Install dependencies
bash scripts/start.sh    # Start API + Frontend
bash scripts/demo.sh     # Run demo against live API
```

## API Endpoints (Exploration API :8643)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/system/overview` | System summary |
| `GET /api/system/profiles` | List all profiles |
| `GET /api/system/profiles/{name}` | Profile detail |
| `GET /api/system/profiles/{name}/memory` | Profile memory |
| `GET /api/templates` | List agent templates |
| `GET /api/templates/{id}` | Template detail |
| `GET /api/templates/{id}/preview` | Render template prompt |
| `GET /api/system/sessions/search?q=...` | Full-text session search |
| `GET /api/system/hooks` | List configured hooks |
| `GET /api/system/mcp-servers` | List MCP servers |
| `GET /api/system/activity` | Activity log |

## Hackathon Deadline

**June 13, 2026 at 23:59**

## Team Roles

- **P1 (Frontend)**: Next.js dashboard, builder wizard, history, exploration views, agent detail, SSE streaming — ✅ COMPLETED (feat/sse-streaming → main)
- **P2 (Backend)**: Exploration API + monitoring hook — ✅ COMPLETED
- **P3 (Templates + DevOps)**: SKILL.md templates + scripts — ✅ COMPLETED

## Latest Integration

- `feat/sse-streaming` merged into `main` (2026-06-10): SSE streaming, agent detail page `/agents/[id]`, auto-refresh 30s, RunProgress modal, .env.example
- All 3 roles integrated on `main` — ready for final team review before June 13 deadline
