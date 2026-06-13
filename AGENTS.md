# AgentHub — hermes-research-lab

You are working on **AgentHub**, a web platform for creating, configuring, and monitoring autonomous AI agents built on top of Hermes Agent. Originally a hackathon project (deadline: June 13, 2026), now post-hackathon development.

## Project Identity

- **Repo:** https://github.com/Canopix/hermes-research-lab
- **Org:** Canopix
- **Maintainer:** nrocaalh (Nuria) — contacto.nuriaroca@gmail.com
- **License:** MIT

## Stack

- **Frontend:** Next.js 14+ / React 18+ / TypeScript / Tailwind CSS / shadcn/ui
- **Backend:** FastAPI (Exploration API on :8643) + Hermes API Server (:8642)
- **Agent Runtime:** Hermes Agent (open-source AI agent framework by Nous Research)
- **Templates:** SKILL.md files for agent creation (12 templates in 4 categories)
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
├── templates/                 # 12 SKILL.md agent templates (4 categories)
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
│   ├── tareas.md             # Task breakdown by role (P1/P2/P3)
│   ├── bug-audit.md          # Comprehensive bug audit (69 bugs catalogued)
│   └── plan.md               # Implementation plan
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

## Tasks Completed

### Hackathon phases (F0-F10) ✅
All original phases completed. See PHASES.md for details.

### Plugin integration (June 13, 2026) ✅
- Plugin extracted from `feat/agenthub-hermes-plugin` (commit 347c33e)
- `scripts/install-plugin.sh` for local installation
- Playwright E2E tests in `tests/`
- `.gitignore` updated with exception for `plugin/**/dist/`

### Automation Blueprints (June 13, 2026) ✅
8 templates from Hermes Automation Blueprints docs integrated:
- **Research & Intelligence:** ai-researcher, paper-summarizer, competitor-watcher, repo-scout, ai-news-digest, morning-briefing
- **Development Workflow:** backlog-triage, docs-drift, dep-audit
- **DevOps & Monitoring:** repo-monitor, uptime-monitor
- **Multi-Skill Workflows:** security-audit, content-pipeline

Each template exists in:
- **Standalone format:** `templates/{name}/{hermes.yaml, params.yaml, soul.md}`
- **Plugin format:** `plugin/agenthub/dashboard/templates/{name}/SKILL.md`

Frontend + plugin show templates grouped by category.

### Wizard Improvements (June 13, 2026) ✅
Upgraded the `/create` wizard to expose all Hermes cronjob parameters:

- **Scroll automático** — smooth scroll al seleccionar template
- **Provider/Modelo** — `GET /api/system/providers` lee config.yaml real, selector dropdown
- **Skills** — multi-select con búsqueda, filtros, recomendaciones por template
- **Toolsets** — checkbox de herramientas con pre-selección del template
- **Schedule** — presets (30m, 1h, 6h, diario, semanal) + cron personalizado
- **Delivery** — local, chat actual, Telegram (con chat_id/thread_id), all

New backend endpoints: `/api/system/providers`, `/api/system/channels`, enriched `/v1/skills`.
New frontend components: ProviderModelSelector, SkillsSelector, ToolsetsSelector, ScheduleSelector, DeliverySelector.
Backend `_wizard_payload_to_hermes_job` now forwards user-selected skills, toolsets, and model.

**Known issue:** Plugin dashboard at :9119 uses stale `dist/index.js` (old build). Standalone frontend at :3000 has all changes.

### Bug audit & security hardening (June 13, 2026) ✅
Comprehensive code audit found 69 bugs across plugin, frontend, backend, and scripts. Fixed 14 critical/high issues:

**Plugin fixes:**
- Fixed double-toggle on checkbox rows (skills, toolsets, delivery were non-functional)
- Fixed provider initialized with template ID instead of empty string
- Added supports_chat_id/supports_thread_id to channel detection in plugin_api.py

**Backend security:**
- Added path traversal validation (`_validate_id` regex) on profiles and templates endpoints
- Fixed race condition in hermes_client singleton with asyncio.Lock
- Converted blocking subprocess.run to asyncio.create_subprocess_exec
- Wrapped sync file I/O with asyncio.to_thread in async endpoints
- Fixed API key timing attack with hmac.compare_digest

**Frontend:**
- Removed duplicate DynamicParam.tsx (dead code)
- Moved API key server-side (EXPLORE_API_KEY, no NEXT_PUBLIC_ prefix)
- Replaced manual OutputViewer modal with shadcn Dialog (accessibility)
- Added 12s timeouts to all API fetch calls

**Scripts:**
- Fixed JSON injection in wizard.sh using jq for safe construction
- Added process ownership check in start.sh before killing on ports

**Docs:**
- Created comprehensive bug audit (docs/bug-audit.md) with 69 bugs catalogued
- Created implementation plan (plan.md)

### Commits on feature/dashboardv1
- `a72a72b` — feat(frontend): integrate provider, skills, toolsets, schedule, delivery tabs + scroll fix
- `eade2c2` — feat(api): forward user-selected skills, toolsets, model to Hermes job
- `01b3223` — feat(frontend): add DeliverySelector component
- `178968b` — feat(frontend): add ScheduleSelector component
- `8aca58e` — feat(frontend): add ToolsetsSelector component
- `bc8940a` — feat(frontend): add SkillsSelector component with checkbox support
- `021017a` — feat(frontend): add ProviderModelSelector component
- `b647856` — feat(frontend): add types and API functions for providers, channels, skills, toolsets
- `73a498a` — feat(api): add GET /api/system/channels endpoint
- `495d8f3` — feat(api): add GET /api/system/providers endpoint
- `189be77` — feat(api): enrich skills endpoint with metadata
- `dbf7b8e` — docs: add wizard improvements plan + execution plan for subagent dispatch
- `e28d325` — docs: update AGENTS.md with current project state
- `d612877` — chore: remove stray SKILL.md from standalone templates
- `e624f25` — feat: add 8 automation blueprints + category grouping
- `e1f0db0` — feat: add Hermes dashboard plugin + convert 3 templates

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
