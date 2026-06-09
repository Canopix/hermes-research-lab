---
tags: [project, hackathon, agenthub, tasks]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 📋 Tareas y Reparto — AgentHub

---

## Cómo compartir con el equipo

### Lo que se comparte (GitHub)

El **repo** con el código + documentación resumida:

```
agenthub/
├── README.md              ← Primer contacto del equipo
├── docs/
│   ├── concepto.md        ← Qué es AgentHub
│   ├── arquitectura.md    ← Cómo funciona
│   ├── wizard.md          ← Detalle del Builder
│   ├── componentes.md     ← Mapa Hermes → AgentHub
│   └── deployment.md      ← Cómo instalar y correr
├── frontend/              ← Código P1
├── explore-api/           ← Código P2
├── templates/             ← Código P3
├── hooks/                 ← Código P3
└── scripts/               ← Setup + Start
```

### Lo que NO se comparte (Obsidian privado)

Notas de trabajo, borradores, decisiones personales:
- Borradores y notas de iteración

### Cómo compartir

| Canal | Qué | Cuándo |
|-------|-----|--------|
| **GitHub repo** | Código + docs técnicas | Siempre actualizado |
| **README del repo** | Resumen ejecutivo (2 min de lectura) | Primera vez que entran |
| **Call/grabación** | Walkthrough de la arquitectura (10 min) | Inicio del hackathon |
| **Obsidian** | Tus notas privadas | Solo tú |

---

## Los 3 roles y sus tareas

### P1 — Frontend (la cara del producto)

**Entregable:** Next.js con las 4 vistas

| # | Tarea | Dependencia | Horas est. |
|---|-------|------------|-----------|
| 1 | Setup proyecto Next.js + shadcn/ui + tailwind | Ninguna | 1h |
| 2 | API client (`lib/api.ts`) + types TypeScript | Contrato P2 | 1h |
| 3 | **Dashboard** (`/agents`) — agent cards + stats | Tarea 2 | 3h |
| 4 | **Builder** wizard — 4 pasos (ver [[🎯 AH-Wizard]]) | Tarea 2 | 4h |
| 5 | **Historial** (`/history`) — tabla + output viewer | Tarea 2 | 2h |
| 6 | **Exploración** (`/explore`) — tabs + contenido | Tarea 2 | 3h |
| 7 | Streaming SSE (ver progreso de ejecución en vivo) | Tarea 3 | 2h |
| 8 | Responsive + polish final | Todas | 2h |
| **Total** | | | **~18h** |

### P2 — Backend (exploración + integración)

**Entregable:** Exploration API + hook de monitoreo

| # | Tarea | Dependencia | Horas est. |
|---|-------|------------|-----------|
| 1 | Setup FastAPI + CORS + health endpoint | Ninguna | 0.5h |
| 2 | **Contrato API** — definir todas las interfaces TypeScript | Ninguna | 1h |
| 3 | `GET /api/system/overview` — resumen completo | Tarea 1 | 1h |
| 4 | `GET /api/system/profiles` — lista + detalle + memory | Tarea 1 | 2h |
| 5 | `GET /api/templates` — parse SKILL.md frontmatter | Tarea 1 | 2h |
| 6 | `GET /api/templates/{id}/preview` — render prompt | Tarea 5 | 1h |
| 7 | `GET /api/system/sessions/search` — FTS5 wrapper | Tarea 1 | 1h |
| 8 | `GET /api/system/hooks` + `/mcp-servers` + `/activity` | Tarea 1 | 1h |
| 9 | Gateway hook de monitoreo (HOOK.yaml + handler.py) | Ninguna | 1h |
| 10 | Tests de integración con Hermes real | Todas | 1.5h |
| **Total** | | | **~12h** |

### P3 — Templates + DevOps (configuración + deployment)

**Entregable:** 4 templates + scripts + deployment

| # | Tarea | Dependencia | Horas est. |
|---|-------|------------|-----------|
| 1 | Crear 4 SKILL.md (ai-researcher, repo-monitor, paper-summarizer, competitor-watcher) | Ninguna | 3h |
| 2 | Testear cada template: crear job → ejecutar → verificar output | Tarea 1 | 2h |
| 3 | `scripts/setup.sh` — instalar todo | Tarea 1 | 1h |
| 4 | `scripts/start.sh` — levantar Exploration API + Frontend | Ninguna | 1h |
| 5 | `scripts/demo.sh` — script de demo para el jurado | Tarea 4 | 1h |
| 6 | `.env.example` + `.gitignore` + README del repo | Ninguna | 1h |
| 7 | Hook de monitoreo: HOOK.yaml + handler.py | Tarea 1 | 1h |
| 8 | Verificar todo junto: `agenthub start` → funciona | Todas | 1h |
| **Total** | | | **~11h** |

---

## Dependencias entre roles

```
P2 (contrato API) ────────→ P1 (puede empezar a usar los types)
P1 + P2 en paralelo ──────→ P3 (testea todo junto al final)
P3 (templates listos) ────→ P2 (puede testear con templates reales)
```

### Día 1: Fundamentos

| Persona | Tareas |
|---------|--------|
| **P1** | Setup Next.js, API client, types (tareas 1-2) |
| **P2** | Setup FastAPI, contrato API, overview endpoint (tareas 1-3) |
| **P3** | Crear 4 templates SKILL.md (tarea 1) |

### Día 2: Core

| Persona | Tareas |
|---------|--------|
| **P1** | Dashboard + Builder wizard (tareas 3-4) |
| **P2** | Profiles, templates endpoints, preview (tareas 4-6) |
| **P3** | Testear templates, scripts setup + start (tareas 2-4) |

### Día 3: Integración

| Persona | Tareas |
|---------|--------|
| **P1** | Historial + Exploración (tareas 5-6) |
| **P2** | Sessions search, hooks, activity (tareas 7-9) |
| **P3** | README, demo script, hook monitoreo (tareas 5-7) |

### Día 4: Polish

| Persona | Tareas |
|---------|--------|
| **P1** | Streaming SSE, responsive, polish (tareas 7-8) |
| **P2** | Tests integración, fix bugs (tarea 10) |
| **P3** | Verificar todo junto, fix deployment (tarea 9) |

---

## Primer paso concreto

### Hoy (pre-hackathon)

1. **Crear el repo** en GitHub:
   ```bash
   gh repo create agenthub --public --description "Plataforma web para crear agentes IA con Hermes"
   ```

2. **Estructura base:**
   ```bash
   mkdir -p frontend explore-api templates hooks scripts docs
   ```

3. **Copiar docs** de Obsidian al repo:
   - `🎯 AH-Concepto.md` → `docs/concepto.md`
   - `🎯 AH-Arquitectura.md` → `docs/arquitectura.md`
   - `🎯 AH-Wizard.md` → `docs/wizard.md`
   - `🎯 AH-Componentes-Hermes.md` → `docs/componentes.md`
   - `🎯 AH-Deployment.md` → `docs/deployment.md`

4. **Crear README** que el equipo lea primero

5. **Compartir repo** con el equipo + hacer un call de 10 min para explicar la arquitectura

### Primer día del hackathon

1. Cada persona clona el repo
2. Crea su rama: `p1-frontend`, `p2-backend`, `p3-templates`
3. Empieza con sus tareas del día 1
4. Al final del día, PRs a main
