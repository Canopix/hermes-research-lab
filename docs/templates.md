---
tags: [project, hackathon, agenthub, templates]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 📋 Templates — P3

> **Entregable:** 4 templates funcionales + sistema de params YAML + deployment
> **Persona:** P3 — Templates + DevOps
> **Dependencia:** Skills de Hermes instalados + Exploration API

---

## Qué es un Template

Un template es un **Skill de Hermes** con `category: agenthub-template` en su frontmatter YAML. Contiene:

- **Prompt:** las instrucciones del agente
- **Params:** parámetros configurables por el usuario en el Builder
- **Tags:** para categorización y búsqueda
- **Herramientas:** qué toolsets necesita el agente

### Formato de SKILL.md para templates

```markdown
---
name: AI Researcher
description: Agente que busca información en la web y genera resúmenes diarios de tendencias de IA
category: agenthub-template
tags: [research, news, ai, daily]
params:
  - name: topic
    description: "Tema principal a investigar"
    type: text
    required: true
  - name: frequency
    description: "Frecuencia de ejecución"
    type: select
    required: true
    options: ["Diario", "Cada 12 horas", "Semanal"]
  - name: include_podcast
    description: "Incluir podcast de audio (TTS)"
    type: toggle
    required: false
    default: "false"
  - name: max_results
    description: "Número máximo de fuentes"
    type: number
    required: false
    default: "10"
---

# AI Researcher

Eres un investigador de IA experto en tendencias emergentes.
Tu tarea es buscar información actualizada sobre `{topic}` y generar un resumen ejecutivo.

## Herramientas disponibles

- `web_search` — buscar información actualizada
- `web_extract` — extraer contenido de páginas web
- `tts` — generar podcast de audio (opcional)
- `write_file` — guardar resumen en disco

## Formato del output

1. **Resumen ejecutivo** (3-5 oraciones)
2. **Tendencias clave** (5-7 bullets)
3. **Fuentes** (URLs)
4. **Podcast** (si include_podcast=true)
```

---

## Los 4 Templates iniciales

### 1. 🔬 AI Researcher (`ai-researcher`)

| Campo | Valor |
|-------|-------|
| **Descripción** | Busca en web/RSS → resumen diario de tendencias de IA |
| **Frecuencia** | Diario o configurable |
| **Tools necesarios** | web, tts |
| **Output** | Resumen markdown + podcast (opcional) |
| **Params** | topic (text), frequency (select), include_podcast (toggle), max_results (number) |

### 2. 📦 Repo Monitor (`repo-monitor`)

| Campo | Valor |
|-------|-------|
| **Descripción** | Monitorea repos de GitHub → digest de PRs, issues, releases |
| **Frecuencia** | Diario |
| **Tools necesarios** | web, terminal (gh CLI) |
| **Output** | Digest markdown |
| **Params** | repo_url (text), include_prs (toggle), include_issues (toggle), include_releases (toggle) |

### 3. 📄 Paper Summarizer (`paper-summarizer`)

| Campo | Valor |
|-------|-------|
| **Descripción** | Resume papers de arXiv → resumen técnico semanal |
| **Frecuencia** | Semanal |
| **Tools necesarios** | web (arxiv) |
| **Output** | Resumen técnico + links |
| **Params** | arxiv_category (select: cs.AI, cs.CL, cs.CV, cs.LG, stat.ML), max_papers (number), focus_areas (text) |

### 4. 👀 Competitor Watcher (`competitor-watcher`)

| Campo | Valor |
|-------|-------|
| **Descripción** | Monitorea URLs de competidores → detección de cambios |
| **Frecuencia** | Diario |
| **Tools necesarios** | web |
| **Output** | Reporte de cambios detectados |
| **Params** | urls (text, multiline), keywords (text), alert_threshold (select: bajo/medio/alto) |

---

## Template adicional: Email Digest (si hay tiempo)

### 5. 📧 Email Digest (`email-digest`)

| Campo | Valor |
|-------|-------|
| **Descripción** | Lee emails → genera resumen diario |
| **Frecuencia** | Diario |
| **Tools necesarios** | himalaya (email CLI) |
| **Params** | inbox (text), importance_filter (toggle), include_attachments (toggle) |

---

## Estrategia de instalación

### Opción A: Skills bundled (recomendada para hackathon)

Los 4 templates se crean como skills dentro de `~/.hermes/skills/` directamente. No necesitan instalación externa.

```bash
# Crear estructura de cada template
mkdir -p ~/.hermes/skills/agenthub-templates/ai-researcher
mkdir -p ~/.hermes/skills/agenthub-templates/repo-monitor
mkdir -p ~/.hermes/skills/agenthub-templates/paper-summarizer
mkdir -p ~/.hermes/skills/agenthub-templates/competitor-watcher

# Crear SKILL.md para cada uno
# (contenido detallado en la sección de templates arriba)
```

### Opción B: Publicación en GitHub (post-hackathon)

Publicar los templates en un repo público para que otros los instalen con `hermes skills install`.

---

## Crear un agente desde template

### Flujo paso a paso

```
1. Frontend: GET /api/templates → muestra galería
2. Usuario: elige un template → paso 2
3. Frontend: GET /api/templates/{id}/preview → muestra form con params
4. Usuario: configura params → ve preview del prompt
5. Frontend: POST /api/jobs → crea el job
   {
     "prompt": "...(prompt renderizado)...",
     "schedule": "every 24h",
     "skills": ["ai-researcher"],
     "profile": "agent-researcher",
     "delivery": "telegram"
   }
6. Hermes: crea cron job, crea profile si no existe, inicia scheduler
```

### Creación del profile automáticamente

Cuando se crea un job, se debe crear el profile asociado si no existe:

```python
# Exploration API endpoint: POST /api/templates/{id}/create-agent
@app.post("/api/templates/{id}/create-agent")
async def create_agent_from_template(id: str, config: dict):
    template = TemplateService.get_template(id)

    # 1. Crear profile
    profile_dir = Path.home() / ".hermes" / "profiles" / f"agent-{id}"
    profile_dir.mkdir(parents=True, exist_ok=True)

    # 2. Generar SOUL.md desde template
    soul_content = f"""# {template['name']}

{template['description']}

## Configuración
"""
    for param in template['params']:
        value = config.get(param['name'], param.get('default', ''))
        soul_content += f"- **{param['name']}:** {value}\n"

    (profile_dir / "SOUL.md").write_text(soul_content)

    # 3. Copiar skill al profile
    # (opcional, para que el agente tenga su propio skill)

    # 4. Crear cron job via API Server
    job_data = {
        "prompt": TemplateService.preview(id, config)["rendered_prompt"],
        "skills": [id],
        "profile": f"agent-{id}",
        "schedule": _config_to_schedule(config),
        "delivery": config.get("delivery", "origin"),
    }

    # POST to Hermes API Server
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{HERMES_URL}/api/jobs", json=job_data)
        return resp.json()
```

---

## Deployment

Ver [[🎯 AH-Deployment]] para instrucciones de instalación y uso.
