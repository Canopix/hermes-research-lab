# AgentHub — Hermes Plugin

Plugin para Hermes Agent que añade un dashboard con wizard para crear agentes autónomos.

## Qué es

Un plugin que se instala en `~/.hermes/plugins/` y añade al dashboard de Hermes:

- **Wizard de creación** — selector de templates, configuración de provider/modelo, skills, toolsets, schedule y delivery
- **Gestión de agentes** — listar, pausar, reanudar, eliminar cron jobs
- **12 templates** — plantillas predefinidas para diferentes casos de uso

## Instalación

```bash
bash scripts/install-plugin.sh
hermes dashboard
```

## Estructura

```
plugin/agenthub/dashboard/
├── plugin_api.py          # Backend (FastAPI routes)
├── dist/
│   ├── index.js           # Frontend compilado (React)
│   └── style.css
├── manifest.json
└── templates/             # SKILL.md templates (12 agentes)
    ├── ai-researcher/
    ├── ai-news-digest/
    ├── competitor-watcher/
    ├── paper-summarizer/
    ├── repo-monitor/
    ├── repo-scout/
    ├── morning-briefing/
    ├── security-audit/
    ├── content-pipeline/
    ├── backlog-triage/
    ├── docs-drift/
    └── dep-audit/

templates/                 # Templates standalone (hermes.yaml + params.yaml + soul.md)
tests/                     # E2E tests (Playwright)
docs/                      # Documentación
scripts/                   # Script de instalación
```

## Templates

| Template | Categoría | Descripción |
|----------|-----------|-------------|
| ai-researcher | Research | Investigación diaria de AI |
| ai-news-digest | Research | Resumen semanal de noticias AI |
| competitor-watcher | Research | Monitoreo de competidores |
| paper-summarizer | Research | Resumen de papers académicos |
| repo-scout | Research | Exploración de repositorios |
| morning-briefing | Research | Briefing matutino |
| repo-monitor | DevOps | Monitoreo de repositorios |
| uptime-monitor | DevOps | Monitoreo de uptime |
| security-audit | DevOps | Auditoría de seguridad |
| content-pipeline | Multi-Skill | Pipeline de contenido |
| backlog-triage | Development | Triagem de backlog |
| docs-drift | Development | Detección de drift en docs |
| dep-audit | Development | Auditoría de dependencias |

## Cómo funciona

1. El wizard renderiza el prompt del template seleccionado con los parámetros del usuario
2. Crea un perfil dedicado (`hermes profile create --clone`)
3. Crea un cron job en ese perfil con el prompt renderizado
4. El agente ejecuta según el schedule configurado

## Testing

```bash
cd tests && npm install && npx playwright install
npx playwright test
```

## License

MIT
