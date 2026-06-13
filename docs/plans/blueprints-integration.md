# Plan: Integrar Automation Blueprints de Hermes en AgentHub

> **Fecha:** 13 junio 2026
> **Objetivo:** Expandir el catálogo de templates de AgentHub con los blueprints oficiales de Hermes
> **Fuente:** https://hermes-agent.nousresearch.com/docs/guides/automation-blueprints
> **Branch:** `feature/dashboardv1` (post-hackathon)

---

## Contexto

### Qué son los Automation Blueprints

Son patrones de automatización pre construidos que Hermes documenta como "copy-paste". Cada blueprint tiene:
- **Trigger:** schedule (cron), webhook de GitHub, o llamada API externa
- **Prompt:** las instrucciones del agente
- **Delivery:** dónde enviar el resultado (Telegram, Discord, Slack, email, etc.)
- **Opcionalmente:** skills adicionales, scripts, configuración de webhook

### Por qué son valiosos para AgentHub

AgentHub actualmente tiene **5 templates** genéricos. Los blueprints de Hermes son **15+ automatizaciones reales** ya probadas, documentadas y categorizadas. Integrarlas:

1. **Multiplica el catálogo** de 5 → 20+ templates
2. **Añade categorías** (DevOps, Business, GitHub, Research) que el wizard puede mostrar
3. **Incluye webhooks** — un tipo de trigger que AgentHub no soporta aún
4. **Da credibilidad** — son templates oficiales de Nous Research
5. **Reduce fricción** — el usuario no tiene que inventar prompts, solo configurar parámetros

---

## Blueprints disponibles (15 total)

### 📊 Categoría 1: Development Workflow (4)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Nightly Backlog Triage | Cron (0 2 * * *) | terminal (gh), web | ✅ Cron-based |
| PR Code Review | Webhook (pull_request) | web, terminal | ⚠️ Webhook — requiere soporte |
| Docs Drift Detection | Cron (0 9 * * 1) | terminal (gh), web | ✅ Cron-based |
| Dependency Security Audit | Cron (0 6 * * *) | terminal (pip audit, npm audit) | ✅ Cron-based |

### 🔧 Categoría 2: DevOps & Monitoring (3)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Deploy Verification | Webhook (API call) | terminal (curl) | ⚠️ Webhook |
| Alert Triage | Webhook (API call) | web | ⚠️ Webhook |
| Uptime Monitor | Cron (every 30m) | terminal (script) | ✅ Cron + script |

### 🔬 Categoría 3: Research & Intelligence (3)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Competitive Repository Scout | Cron (0 8 * * *) | terminal (gh), web | ✅ Cron-based |
| AI News Digest | Cron (0 9 * * 1) | web | ✅ Cron-based |
| Paper Digest with Notes | Cron (0 8 * * *) | web, skills (arxiv, obsidian) | ✅ Cron-based |

### 🐙 Categoría 4: GitHub Event Automations (3)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Issue Auto-Labeling | Webhook (issues) | terminal (gh) | ⚠️ Webhook |
| CI Failure Analysis | Webhook (check_run) | web | ⚠️ Webhook |
| Auto-Port Changes | Webhook (pull_request) | terminal (gh), web | ⚠️ Webhook |

### 💼 Categoría 5: Business Operations (2)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Stripe Payment Monitoring | Webhook (stripe events) | web | ⚠️ Webhook |
| Daily Revenue Summary | Cron (0 8 * * *) | web | ✅ Cron-based |

### 🔄 Categoría 6: Multi-Skill Workflows (2)

| Blueprint | Trigger | Tools | AgentHub template? |
|---|---|---|---|
| Security Audit Pipeline | Cron (0 3 * * 0) | terminal, web, skills | ✅ Cron-based |
| Content Pipeline | Cron (0 10 * * 3) | web, terminal | ✅ Cron-based |

---

## Decisión clave: Cron vs Webhook

**8 templates** son cron-based → se pueden implementar con el sistema actual de AgentHub (wizard + cron job).

**7 templates** son webhook-based → requieren una extensión del wizard:

### Opción A: Soporte completo de webhooks (post-hackathon largo)
- Añadir paso "Trigger" al wizard: Schedule / GitHub Webhook / API Webhook
- Añadir endpoint `POST /api/webhooks` en Exploration API
- Generar rutas en `config.yaml` de Hermes
- Configurar GitHub webhook en el repo del usuario

### Opción B: Simplificar a cron (recomendado para ahora)
- Los blueprints webhook se convierten a cron con frequency configurable
- El usuario pierde la reactividad en tiempo real
- Gana simplicidad: todo funciona con el wizard actual
- **Se puede migrar a webhook después** sin perder los prompts

**Recomendación:** Opción B para el catálogo actual. Los blueprints webhook más importantes (PR Review, Issue Labeling) se documentan como "próximamente" con webhook trigger.

---

## Templates a crear (Fase 1 — cron-based, 8 templates)

### Prioridad P0 — Alto valor, fácil de implementar

**1. `backlog-triage` — Nightly Backlog Triage**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal, web]
- `params.yaml`: repo (text, required), max_issues (number, default 30), language
- `soul.md`: Prompt de triage nocturno de issues
- **Fuente:** Blueprint "Nightly Backlog Triage"

**2. `ai-news-digest` — AI News Digest**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[web]
- `params.yaml`: topics (text), sources (text), language
- `soul.md`: Prompt de resumen semanal de noticias IA
- **Fuente:** Blueprint "AI News Digest"

**3. `security-audit` — Security Audit Pipeline**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal, web]
- `params.yaml`: repo_path (text, default ~/.hermes/hermes-agent), language
- `soul.md`: Prompt de auditoría de seguridad semanal
- **Fuente:** Blueprint "Security Audit Pipeline"

### Prioridad P1 — Alto valor, algo más de trabajo

**4. `repo-scout` — Competitive Repository Scout**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal, web]
- `params.yaml`: repos (text, required), language
- `soul.md`: Prompt de scout de repos competidores
- **Fuente:** Blueprint "Competitive Repository Scout"

**5. `docs-drift` — Docs Drift Detection**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal, web]
- `params.yaml`: repo (text, required), language
- `soul.md`: Prompt de detección de drift en docs
- **Fuente:** Blueprint "Docs Drift Detection"

**6. `dep-audit` — Dependency Security Audit**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal]
- `params.yaml`: project_path (text), cvss_threshold (number, default 7), language
- `soul.md`: Prompt de auditoría de dependencias
- **Fuente:** Blueprint "Dependency Security Audit"

**7. `uptime-monitor` — Uptime Monitor**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[terminal, web]
- `params.yaml`: endpoints (text, required), language
- `soul.md`: Prompt de monitorización de uptime (con script auxiliar)
- **Fuente:** Blueprint "Uptime Monitor"
- **Nota:** Incluye script `check-uptime.py` como archivo auxiliar

**8. `content-pipeline` — Content Pipeline**
- `hermes.yaml`: model=deepseek-v4-flash, toolsets=[web, terminal]
- `params.yaml`: topics (text), output_dir (text, default ~/drafts), language
- `soul.md`: Prompt de pipeline de contenido semanal
- **Fuente:** Blueprint "Content Pipeline"

---

## Templates webhook → "Coming Soon" (Fase 2)

Estos blueprints se documentan en el catálogo como "próximamente" con badge de webhook:

| Template | Trigger | Nota |
|---|---|---|
| `pr-review` | GitHub PR webhook | Requiere webhook platform |
| `issue-labeler` | GitHub Issues webhook | Requiere webhook platform |
| `ci-failure` | GitHub Check Run webhook | Requiere webhook platform |
| `deploy-verify` | API webhook | Requiere webhook platform |
| `alert-triage` | API webhook | Requiere webhook platform |
| `stripe-monitor` | Stripe webhook | Requiere webhook platform |
| `auto-port` | GitHub PR webhook | Requiere webhook platform |

---

## Cambios necesarios en el frontend

### 1. Categorías en la galería de templates

El wizard actual muestra todos los templates en una lista plana. Con 20+ templates, necesita **categorías**:

```
📁 Development Workflow    → backlog-triage, docs-drift, dep-audit, pr-review*
📁 DevOps & Monitoring    → uptime-monitor, deploy-verify*, alert-triage*
📁 Research & Intelligence → ai-news-digest, repo-scout, paper-digest
📁 GitHub Automations     → issue-labeler*, ci-failure*, auto-port*
📁 Business Operations    → stripe-monitor*, revenue-summary
📁 Multi-Skill Workflows  → security-audit, content-pipeline
```

**Cambios en:**
- `GET /api/templates` → añadir campo `category`
- `frontend/src/app/create/page.tsx` → agrupar por categoría
- `frontend/src/components/` → Tarjeta de categoría con count

### 2. Badge "Webhook" en templates próximamente

Para los templates que requieren webhook:
- Mostrar badge naranja "Webhook trigger"
- Botón deshabilitado "Próximamente"
- Tooltip explicando que requiere webhook platform

### 3. Campo `trigger_type` en params.yaml

Añadir metadata al formato AgentHub:

```yaml
# En hermes.yaml o params.yaml
trigger_type: cron  # | webhook | api
trigger_help: "Se ejecuta automáticamente según la frecuencia configurada"
```

---

## Cambios en el backend (Exploration API)

### `GET /api/templates` — Respuesta enriquecida

```json
{
  "id": "backlog-triage",
  "name": "Nightly Backlog Triage",
  "description": "Etiqueta y prioriza issues nuevos cada noche",
  "category": "development-workflow",
  "trigger_type": "cron",
  "difficulty": "easy",
  "tags": ["github", "issues", "triage"],
  "params": [...]
}
```

### `GET /api/templates/{category}` — Filtrado por categoría

Nuevo endpoint para filtrar templates por categoría.

---

## Estructura de archivos

```
templates/
├── ai-researcher/          # ✅ Ya existe
├── morning-briefing/       # ✅ Ya existe
├── competitor-watcher/     # ✅ Ya existe
├── paper-summarizer/       # ✅ Ya existe
├── repo-monitor/           # ✅ Ya existe
│
├── backlog-triage/         # 🆕 Fase 1
│   ├── hermes.yaml
│   ├── params.yaml
│   └── soul.md
├── ai-news-digest/         # 🆕 Fase 1
├── security-audit/         # 🆕 Fase 1
├── repo-scout/             # 🆕 Fase 1
├── docs-drift/             # 🆕 Fase 1
├── dep-audit/              # 🆕 Fase 1
├── uptime-monitor/         # 🆕 Fase 1 (con script auxiliar)
│   ├── hermes.yaml
│   ├── params.yaml
│   ├── soul.md
│   └── scripts/check-uptime.py
└── content-pipeline/       # 🆕 Fase 1
```

---

## Orden de ejecución

### Fase 1 — Post-hackathon (1-2 días)

1. **Añadir `category` al formato de templates** (hermes.yaml o metadata.yaml)
2. **Crear los 8 templates cron-based** (orden: P0 primero)
3. **Añadir categorías al frontend** (galera + filtrado)
4. **Añadir badge "Webhook"** para templates próximamente
5. **Actualizar Exploration API** (endpoint de categorías)
6. **Documentar** en docs/templates.md

### Fase 2 — Futuro (requiere trabajo significativo)

1. Soporte de webhooks en Exploration API
2. Generación de rutas config.yaml desde el wizard
3. Integración con GitHub webhook setup
4. Los 7 templates webhook-based

---

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| 20+ templates saturan la UI | Alto | Categorías + búsqueda + filtrado |
| Algunos blueprints usan skills que el usuario no tiene | Medio | Añadir `required_skills` y mostrar instalar |
| Prompts hardcoded a NousResearch/hermes-agent | Bajo | Generalizar con parámetro `repo` |
| Uptime monitor necesita script auxiliar | Bajo | Bundlear scripts/ en templates/ |
| Templates webhook dan falsa expectativa | Medio | Badge claro "Próximamente" |

---

## Métricas de éxito

- [ ] 13 templates totales (5 actuales + 8 nuevos)
- [ ] 6 categorías funcionales en el wizard
- [ ] Cada template tiene hermes.yaml + params.yaml + soul.md
- [ ] Frontend muestra categorías con count
- [ ] Templates webhook muestran badge "Coming Soon"
- [ ] Exploration API soporta filtrado por categoría
