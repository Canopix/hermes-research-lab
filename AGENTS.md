# AgentHub — hermes-research-lab

You are working on **AgentHub**, a web platform for creating, configuring, and monitoring autonomous AI agents built on top of Hermes Agent. This is a hackathon project (deadline: June 13, 2026 23:59).

## Project Identity

- **Repo:** https://github.com/Canopix/hermes-research-lab
- **Org:** Canopix
- **Maintainer:** nrocaalh (Nuria) — contacto.nuriaroca@gmail.com
- **License:** MIT

## Stack

- **Frontend:** Next.js 14+ / React 18+ / TypeScript / Tailwind CSS / shadcn/ui
- **Backend:** FastAPI (Exploration API on :8643) + Hermes API Server (:8642)
- **Agent Runtime:** Hermes Agent (open-source AI agent framework by Nous Research)
- **Templates:** SKILL.md files for agent creation (4 templates)
- **Monitoring:** Gateway hooks for activity logging
- **CLI:** `agenthub` wrapper scripts (setup, start, stop, status, demo)

## Architecture

```
Frontend (:3000) ──> Exploration API (:8643) ──> Hermes Agent API Server (:8642)
                                │
                                ├── Jobs CRUD (create, list, trigger, pause...)
                                ├── SSE streaming (real-time events)
                                ├── System overview, profiles, skills
                                ├── Templates
                                └── Sessions search, hooks, MCP, cron
```

The user only needs the Exploration API running. Communication with Hermes API Server (:8642) is internal.

## Project Structure

```
hermes-research-lab/
├── frontend/                 # Next.js 14 + TypeScript + Tailwind + shadcn/ui
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── page.tsx      # Dashboard (home)
│   │   │   ├── create/       # Builder wizard
│   │   │   ├── history/      # Execution history
│   │   │   └── explore/      # System exploration
│   │   ├── components/       # React components
│   │   │   ├── dashboard.tsx
│   │   │   ├── agent-card.tsx
│   │   │   ├── stats-overview.tsx
│   │   │   └── navigation.tsx
│   │   ├── hooks/            # Custom hooks (useApi, useQueries)
│   │   └── lib/              # API client + TypeScript types
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── explore-api/               # FastAPI Exploration API (Python)
│   ├── main.py               # App + CORS + routers
│   ├── routers/
│   │   ├── system.py         # Overview, profiles, skills, toolsets
│   │   ├── templates.py      # Template catalog
│   │   ├── sessions_search.py # FTS5 search
│   │   └── profiles.py       # Profile detail + memory
│   ├── services/
│   │   ├── hermes_reader.py  # Read Hermes data
│   │   ├── template_service.py # Template parsing
│   │   └── session_service.py  # Session search
│   └── requirements.txt
├── templates/                 # 4 SKILL.md agent templates
│   ├── ai-researcher/        # Daily AI research digest (web, tts)
│   ├── repo-monitor/         # GitHub repo activity (web, terminal)
│   ├── paper-summarizer/     # Academic paper summaries (web)
│   └── competitor-watcher/   # Website change detection (web)
├── hooks/
│   └── agent-monitor/        # Gateway hook for activity logging
├── scripts/
│   ├── setup.sh              # Install dependencies
│   ├── start.sh              # Start API + Frontend
│   ├── stop.sh               # Stop all services
│   ├── status.sh             # Check service health
│   └── demo.sh               # Run demo (5 steps)
├── docs/
│   ├── concepto.md           # Product concept
│   ├── arquitectura.md       # Architecture details
│   ├── wizard.md             # Builder wizard detail
│   ├── componentes.md        # Hermes → AgentHub mapping
│   ├── frontend.md           # Frontend docs
│   ├── backend.md            # Backend docs
│   ├── templates.md          # Template system docs
│   ├── deployment.md         # Deployment instructions
│   └── tareas.md             # Task breakdown by role (P1/P2/P3)
├── PHASES.md                 # Development phases tracker
├── CLAUDE.md                 # Agent context file
├── README.md                 # Project overview
└── .env.example              # Environment variables template
```

## API Endpoints (Exploration API :8643)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/system/overview` | System summary (profiles, skills, toolsets, cron) |
| `GET /api/system/profiles` | List all Hermes profiles |
| `GET /api/system/profiles/{name}` | Profile detail with skills, toolsets |
| `GET /api/system/profiles/{name}/memory` | Profile memory content |
| `GET /api/templates` | List agent templates (from SKILL.md frontmatter) |
| `GET /api/templates/{id}` | Template detail |
| `GET /api/templates/{id}/preview` | Render template prompt with params |
| `GET /api/system/sessions/search?q=...` | Full-text session search |
| `GET /api/system/hooks` | List configured hooks |
| `GET /api/system/mcp-servers` | List MCP servers |
| `GET /api/system/activity` | Activity log |

## GitHub Info

- **Owner:** nrocaalh
- **Branches:** `main`, `feature/dashboardv1` (active), `feature/dashboard+wizard`
- **Git user:** nrocaalh / contacto.nuriaroca@gmail.com
- **gh CLI:** Authenticated with full scopes (repo, admin, workflow, etc.)

## Development Guidelines

### Commits
Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`

### Branches
- Feature branches: `feat/<name>` or `feature/<name>`
- Fix branches: `fix/<name>`
- Chore branches: `chore/<name>`
- Always create PRs for changes to `main`

### Code Style
- **Python:** PEP 8, type hints, docstrings
- **TypeScript:** Strict mode, interfaces for all data shapes
- **React:** Functional components, hooks, shadcn/ui components

### Testing
- Backend: `pytest` in `explore-api/`
- Frontend: `npm test` in `frontend/`
- E2E: Check `scripts/demo.sh` for manual testing

### Environment
- Python venv in `explore-api/.venv/`
- Node modules in `frontend/node_modules/`
- Hermes API Server must be running on :8642 for the Exploration API to work

## Tasks Completed (as of PHASES.md)

All 11 phases (F0-F10) are ✅ completed:
- F0: Setup + Infrastructure
- F1: Exploration API
- F2: Templates (Skills)
- F3-F6: Frontend views (Dashboard, Builder, History, Exploration)
- F7: SSE Streaming + Real-time
- F8: Monitoring Hook
- F9: Scripts + CLI
- F10: Integration + Polish

## Known Issues / Areas for Improvement

Check GitHub issues for current work:
```bash
gh issue list --repo Canopix/hermes-research-lab --state open
gh pr list --repo Canopix/hermes-research-lab --state open
```

## Working With This Codebase

### To work on the Exploration API:
```bash
cd explore-api
source .venv/bin/activate
uvicorn main:app --reload --port 8643
```

### To work on the Frontend:
```bash
cd frontend
npm install
npm run dev
```

### To sync from agenthub (source) to hermes-research-lab:
```bash
rsync -av --delete --exclude='.git' /root/agenthub/ /root/hermes-research-lab/
cd /root/hermes-research-lab && git add -A && git commit -m "sync: update from agenthub"
```

### To push changes:
```bash
cd /root/hermes-research-lab
git push origin <branch>
gh pr create --fill --base main
```

## Important Notes

- The repo is synced between `/root/agenthub` (source) and `/root/hermes-research-lab` (synced target) using rsync — ALWAYS use `--exclude='.git'` to avoid overwriting git config
- The Exploration API reads Hermes data from `~/.hermes/` — it needs Hermes installed
- Frontend connects to Exploration API on :8643 — CORS is configured for localhost:3000
- Templates are SKILL.md files with YAML frontmatter — the template_service parses them
