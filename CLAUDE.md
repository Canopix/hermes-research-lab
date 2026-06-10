# hermes-research-lab — AgentHub

Hackathon project: AgentHub is a web platform for creating, configuring, and monitoring autonomous AI agents built on top of Hermes Agent.

## Stack

- **Frontend**: moving into the native Hermes dashboard as a drop-in plugin (see `docs/hermes-ui-integration.md`). The standalone Next.js app has been removed.
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

- **P1 (Frontend)**: being re-platformed as a Hermes dashboard plugin (see `docs/hermes-ui-integration.md`); standalone Next.js app removed
- **P2 (Backend)**: Exploration API + monitoring hook — DONE (this branch)
- **P3 (Templates + DevOps)**: SKILL.md templates + scripts — DONE (this branch)
