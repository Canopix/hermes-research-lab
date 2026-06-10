# AgentHub — hermes-research-lab

## Project Identity

- **Repo:** https://github.com/Canopix/hermes-research-lab
- **Org:** Canopix
- **Maintainer:** nrocaalh (Nuria) — contacto.nuriaroca@gmail.com

## Stack

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui → localhost:3000
- **Backend:** FastAPI (Exploration API) → localhost:8643
- **Agent Runtime:** Hermes API Server → localhost:8642 (internal)
- **Templates:** SKILL.md files (4 agent templates)
- **CLI:** `agenthub` scripts (setup, start, stop, status, demo)

## Architecture

```
Frontend (:3000) → Exploration API (:8643) → Hermes API Server (:8642)
                           │
                           ├── Jobs CRUD + SSE streaming
                           ├── System overview, profiles, skills
                           ├── Templates catalog
                           └── Sessions search, hooks, MCP, cron
```

## Project Structure

```
hermes-research-lab/
├── frontend/              # Next.js 14 + TypeScript + Tailwind + shadcn/ui
│   ├── src/app/           # App Router pages
│   ├── src/components/    # React components
│   ├── src/hooks/         # Custom hooks (useApi, useQueries)
│   └── src/lib/           # API client + TypeScript types
├── explore-api/           # FastAPI Exploration API (Python)
│   ├── main.py            # App + CORS + routers
│   ├── routers/           # system, templates, sessions_search, profiles
│   └── services/          # hermes_reader, template_service, session_service
├── templates/             # 4 SKILL.md agent templates
├── hooks/                 # Gateway hooks (agent-monitor)
├── scripts/               # CLI scripts (agenthub)
├── docs/                  # Documentation
├── PHASES.md              # Development phases tracker
├── README.md              # Project overview
└── CLAUDE.md              # This file (agent context)
```

## Git Config

- **User:** nrocaalh
- **Email:** contacto.nuriaroca@gmail.com
- **Remote:** origin → https://github.com/Canopix/hermes-research-lab.git
- **Active branch:** feature/dashboardv1
- **All branches:** main, feature/dashboardv1, feature/dashboard+wizard

## Development Rules

1. **Conventional commits:** `feat(scope): desc`, `fix(scope): desc`, `docs:`, `refactor:`, `test:`, `chore:`
2. **Always create PRs** for changes to main
3. **Test before pushing:**
   - Backend: `cd explore-api && source .venv/bin/activate && python -m pytest`
   - Frontend: `cd frontend && npm test`
4. **Branch naming:** `feat/<name>`, `fix/<name>`, `chore/<name>`
5. **Sync:** `rsync -av --delete --exclude='.git' /root/agenthub/ /root/hermes-research-lab/`

## Quick Commands

```bash
# Start everything
bash scripts/start.sh

# Check status
bash scripts/status.sh

# Run demo
bash scripts/demo.sh

# Open issues in browser
gh browse --repo Canopix/hermes-research-lab

# List open PRs
gh pr list --repo Canopix/hermes-research-lab
```

## All Phases Complete (F0-F10)

The hackathon project phases are all ✅ done. Focus areas now:
- Bug fixes
- Feature enhancements
- Code quality improvements
- Documentation updates
- Testing improvements
