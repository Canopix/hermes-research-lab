# Hermes UI Integration — Spec & Findings

> Status: investigation complete (2026-06-10). Captures what we learned about
> running AgentHub **inside the native Hermes dashboard** as a plugin, the **real
> Hermes API Server** contract, and which parts of this repo are now obsolete.

The team decided (Discord) to surface AgentHub inside the Hermes dashboard that
ships with Hermes, rather than host a standalone Next.js app. This document is
the grounded blueprint for that, plus the integration facts discovered while
verifying the end-to-end flow against a **real** Hermes install (v0.16.0).

---

## 1. The real Hermes API Server (`:8642`) — it exists and how to start it

The "Hermes API Server" the frontend talks to is **real**: it's a *gateway
platform* at `gateway/platforms/api_server.py` (`DEFAULT_PORT = 8642`), an
aiohttp server exposing `/v1/chat/completions`, `/v1/responses`, `/v1/runs`
(+ SSE `/v1/runs/{id}/events`), `/api/jobs`, `/api/sessions`, `/health`.

**It is enabled via environment variables**, not `config.yaml` keys
(`gateway/config.py`): `if API_SERVER_ENABLED or API_SERVER_KEY: enable platform`.

Start it (verified):

```bash
API_SERVER_ENABLED=true API_SERVER_KEY=<key> API_SERVER_PORT=8642 \
  API_SERVER_CORS_ORIGINS="http://localhost:3000" \
  HERMES_HOME=<home> hermes gateway run
# -> "[Api_Server] API server listening on http://127.0.0.1:8642"
```

`docs/deployment.md`'s `hermes config set api_server.enabled true` does **not**
start it on its own — use the env vars above.

### Real `POST /api/jobs` contract (verified)

`_handle_create_job` requires **`name`** and **`schedule`**; the delivery field
is **`deliver`** (not `delivery`); the response is `{"job": {...}}`:

```json
{ "name": "AI Researcher", "schedule": "every 24h", "prompt": "...",
  "deliver": "local", "skills": ["ai-researcher"], "repeat": <int?> }
```

> Bug this surfaced: our `create-agent` endpoint was sending `{prompt, skills,
> profile, schedule, delivery}` — no `name`, wrong `deliver` key → real Hermes
> returned `400 "Name is required"`. A mock had hidden it; only the real server
> caught it. (Fixed on `oc/create-flow`.)

---

## 2. Hermes dashboard plugin system — the integration target

`hermes dashboard` (web UI, default `:9119`) has a **drop-in plugin system**
(used by the bundled `kanban` and `achievements` plugins). A plugin lives in
`~/.hermes/dashboard-plugins/<name>/`:

```
manifest.json   name, label, icon, version,
                tab: { path: "/agenthub", position: "after:skills" },
                entry: "dist/index.js", css: "dist/style.css", api: "plugin_api.py"
plugin_api.py   FastAPI APIRouter, mounted at /api/plugins/<name>/,
                behind the dashboard's session-token auth middleware
dist/index.js   a single IIFE bundle — NO npm build at runtime —
                that uses window.__HERMES_PLUGIN_SDK__ (React + shadcn provided
                by the dashboard) and renders into the tab
dist/style.css
```

(`tips.py`: "Dashboard plugins are drop-in: manifest.json + JS bundle in
`~/.hermes/dashboard-plugins/` — no npm build required.") Install/manage via
`hermes plugins` (`dashboard_install_plugin`, …).

### How AgentHub maps onto it

| AgentHub piece | In the plugin | Effort |
|---|---|---|
| Exploration API (FastAPI `APIRouter`s) | → `plugin_api.py` mounted at `/api/plugins/agenthub/` (kanban uses the identical `router = APIRouter()` pattern) | **Low** |
| Auth / CORS / separate `:8643` server | Gone — rides on the dashboard's session token & process | **Eliminated** |
| Jobs / runs / SSE | Already provided by the `:8642` api_server; the plugin consumes them | reuse |
| Frontend | → `dist/index.js` **IIFE using the dashboard's React/shadcn SDK** | **Medium-High** ⚠️ |

**The real work is the frontend.** The bundle is a plain IIFE that does **not**
ship its own React (uses the SDK's) and is **not** Next.js — `next build` does
not produce this. A plain React + shadcn SPA (like the one on
`feature/dashboardv1`) is the right base: strip the routing, mount into the tab
node, externalize React/shadcn to `window.__HERMES_PLUGIN_SDK__`.

### Recommended path

1. **PoC of one tab** (e.g. Agents or Templates): `manifest.json` + a
   `plugin_api.py` with 1–2 routes + a minimal `dist/index.js`. Drop into
   `~/.hermes/dashboard-plugins/agenthub/`, run `hermes dashboard`, validate
   tab + auth + data end-to-end. First confirm exactly what
   `window.__HERMES_PLUGIN_SDK__` exposes.
2. If it validates, port the backend routers to `plugin_api.py` and re-bundle
   the React components to IIFE, tab by tab.

---

## 3. Obsolescence map — this repo (main) vs `feature/dashboardv1` (Nuria)

`feature/dashboardv1` is a far more complete v1.0/v1.1 of AgentHub.

**Superseded by Nuria's branch (her version is more complete):**
- The whole standalone **frontend** (being removed from main).
- The entire **`explore-api`** backend: she renamed/rewrote
  (`hermes_reader→hermes_client`, `template_service→template_parser`,
  `session_service→session_db`, `sessions_search→sessions`) and added
  `jobs.py` (real create-flow with config→prompt injection), `executions.py`,
  `extras.py`, `websocket.py`, `config.py`, **plus a pytest suite**
  (`tests/test_{profiles,system,templates}.py`).
- The **scripts** (she has `agenthub.py` CLI, `status.sh`, `stop.sh`, rewritten
  setup/start/demo).

**Unique to this repo and MISSING from `feature/dashboardv1` — must be preserved
and carried into the integration, not deleted:**
- The **4 agent templates** `templates/*/SKILL.md`.
- The **monitoring hook** `hooks/agent-monitor/` (HOOK.yaml + handler.py).

---

## 4. Create-agent flow (what "create a profile" should do)

Per `docs/templates.md`/`wizard.md`: render the prompt → create the profile dir
+ `SOUL.md` → `POST /api/jobs` (real shape above) → Hermes creates the cron job.
A working `POST /api/templates/{id}/create-agent` (verified to write
`~/.hermes/profiles/agent-<id>/SOUL.md` and create a real cron job in Hermes)
lives on `oc/create-flow`; the plugin's `plugin_api.py` should fold this in.
