# AgentHub — Hermes Plugin

Plugin para Hermes Agent que añade un dashboard con wizard para crear agentes autónomos.

## Qué es

Un plugin para Hermes Agent que añade al dashboard una pestaña **AgentHub** con:

- **Wizard de creación** — selector de 12 templates, configuración de provider/modelo, skills, toolsets, schedule y delivery
- **Gestión de agentes** — listar, pausar, reanudar, eliminar cron jobs
- **12 templates** — plantillas predefinidas para Research, DevOps, Development y Multi-Skill

## Instalación

```bash
# Clonar el repo
git clone https://github.com/Canopix/hermes-research-lab.git
cd hermes-research-lab

# Instalar el plugin en el profile activo
bash scripts/install-plugin.sh

# Abrir el dashboard
hermes dashboard
```

El script detecta automáticamente tu profile activo (el que tiene `~/.hermes/active_profile`) e instala el plugin en `~/.hermes/profiles/<tu-profile>/plugins/agenthub/`.

Si no tienes un profile activo, créalo primero:

```bash
hermes profile create mi-profile
echo "mi-profile" > ~/.hermes/active_profile
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
