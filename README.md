# AgentHub — Hermes Plugin

Plugin para [Hermes Agent](https://hermes-agent.nousresearch.com) que añade al dashboard una pestaña **AgentHub** con wizard interactivo para crear, configurar y monitorear agentes autónomos.

## Qué incluye

- **Wizard de creación** — selector de 12 templates, configuración de provider/modelo, skills, toolsets, schedule y delivery
- **Gestión de agentes** — listar, ejecutar, pausar y eliminar cron jobs por perfil
- **12 templates** — plantillas predefinidas derivadas de [Hermes Automation Blueprints](https://hermes-agent.nousresearch.com/docs/guides/automation-blueprints)
- **CLI wizard** — `wizard.sh` para crear agentes desde terminal
- **E2E tests** — tests Playwright contra el plugin

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

El script detecta automáticamente tu profile activo (`~/.hermes/active_profile`) e instala en `~/.hermes/profiles/<profile>/plugins/agenthub/`.

Si no tienes un profile activo:

```bash
hermes profile create mi-profile
echo "mi-profile" > ~/.hermes/active_profile
```

## Estructura del repo

```
hermes-research-lab/
├── plugin/agenthub/dashboard/    # Plugin (core)
│   ├── plugin_api.py             # Backend — 14 endpoints FastAPI
│   ├── job_outputs.py            # Reader de reportes de cron jobs
│   ├── manifest.json             # Registro en dashboard Hermes
│   ├── dist/
│   │   ├── index.js              # Frontend IIFE bundle (React)
│   │   └── style.css
│   └── templates/                # 12 templates SKILL.md
├── templates/                    # 13 templates standalone
│   └── <template>/
│       ├── hermes.yaml           # Config de ejecución
│       ├── params.yaml           # Parámetros del wizard
│       └── soul.md               # Prompt body
├── scripts/
│   ├── install-plugin.sh         # Instalación automática
│   └── wizard.sh                 # CLI wizard interactivo
├── tests/e2e/                    # Tests Playwright
└── docs/                         # Documentación
```

## Templates (12)

### Research & Intelligence
| Template | Descripción |
|----------|-------------|
| AI Researcher | Investigación diaria de papers y noticias AI |
| AI News Digest | Resumen semanal de noticias AI |
| Paper Summarizer | Resumen de papers académicos |
| Competitor Watcher | Monitoreo de sitios de competidores |
| Competitive Repository Scout | Exploración de repositorios relevantes |

### Development Workflow
| Template | Descripción |
|----------|-------------|
| Nightly Backlog Triage | Clasificación nocturna de issues por prioridad |
| Docs Drift Detection | Detección de desfase entre docs y código |
| Dependency Security Audit | Auditoría de seguridad de dependencias |

### DevOps & Monitoring
| Template | Descripción |
|----------|-------------|
| Repo Monitor | Actividad en repositorios (commits, PRs, issues) |
| Uptime Monitor | Verificación periódica de disponibilidad |

### Multi-Skill Workflows
| Template | Descripción |
|----------|-------------|
| Security Audit Pipeline | Auditoría completa de seguridad |
| Content Pipeline | Pipeline automatizado de contenido |

> Templates standalone incluyen `morning-briefing` (13 total). El plugin tiene 12.

## API del plugin (14 endpoints)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/providers` | Providers y modelos de config.yaml |
| GET | `/skills` | Skills disponibles en el profile |
| GET | `/toolsets` | Toolsets de Hermes |
| GET | `/channels` | Canales de delivery configurados |
| GET | `/templates` | Catálogo de templates |
| GET | `/templates/{id}` | Detalle de un template |
| POST | `/preview` | Renderiza prompt con parámetros |
| POST | `/create-agent` | Crea perfil + cron job |
| GET | `/agents` | Lista agentes con cron jobs |
| GET | `/agents/{profile}` | Detalle de agente + historial |
| POST | `/agents/{profile}/run` | Ejecuta agente ahora |
| POST | `/agents/{profile}/run/{job_id}` | Ejecuta cron job específico |
| GET | `/jobs` | Lista de jobs AgentHub |

Base path: `/api/plugins/agenthub/`

## Cómo funciona

1. El usuario selecciona un template en el wizard
2. Configura parámetros, provider/modelo, skills, toolsets, schedule y delivery
3. El wizard renderiza el prompt del template con los parámetros
4. Crea un perfil dedicado: `hermes profile create --clone`
5. Crea un cron job en ese perfil con el prompt renderizado
6. El agente ejecuta según el schedule configurado

## CLI Wizard

```bash
bash scripts/wizard.sh
```

Requiere el dashboard corriendo (`hermes dashboard`). Interactúa por terminal con el mismo flujo que el wizard web.

## Testing

```bash
cd tests
npm install
npx playwright install
npx playwright test
```

## Docs

| Archivo | Contenido |
|---------|-----------|
| `docs/concepto.md` | Concepto y visión del producto |
| `docs/templates.md` | Sistema de templates y formato |
| `docs/wizard.md` | Detalle del wizard de creación |
| `docs/skills-templates-mapping.md` | Mapeo de skills por template |
| `docs/plans/blueprints-integration.md` | Integración con Hermes Blueprints |

## Colaboradores

- **[Canopix](https://github.com/Canopix)** — Plugin dashboard + agent endpoints
- **[jmagdalena](https://github.com/jmagdalena)** — Security hardening + install-plugin

## License

MIT
