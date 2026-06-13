# Plan de Mejoras — AgentHub Interface Wizard

> Fecha: 13 junio 2026 | Estado: v2 (reescrito con docs oficiales)
> Basado en: [Automation Blueprints](https://hermes-agent.nousresearch.com/docs/guides/automation-blueprints), [Cron Docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron), [Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers)

---

## Contexto: Cómo funciona Hermes realmente

Cuando AgentHub crea un agente, internamente crea un **cron job** via la API de Hermes. El cron job es el que realmente "lanza" el agente periódicamente. Según la documentación oficial:

```
cronjob(
  action="create",
  schedule="0 9 * * *",        # cron expression, duration ("30m"), o ISO timestamp
  prompt="...",                  # prompt autocontenido (sin memoria entre runs)
  skills=["blogwatcher"],        # skills a cargar antes del prompt
  model={"model": "...", "provider": "..."},  # override de modelo por job
  enabled_toolsets=["web", "terminal"],        # restringir toolsets
  deliver="telegram",            # destino: origin, local, telegram, discord, all...
  name="Nightly digest",
)
```

**Entonces SÍ, los agentes son cron jobs.** La interfaz de AgentHub debe reflejar esto correctamente.

---

## Problema Actual en `/create`

| Problema | Detalle |
|----------|---------|
| **Sin scroll automático** | Al seleccionar template, hay que hacer scroll manual hacia abajo |
| **Sin selección de Provider/Modelo** | No se puede elegir qué modelo usar. Hermes soporta 20+ providers |
| **Sin selección de Skills** | No se puede elegir qué skills cargar. Solo usa las del template |
| **Sin selección de Toolsets** | No se puede restringir qué herramientas tiene el agente |
| **Sin configuración de Schedule** | Hardcodeado a `0 */6 * * *` sin opciones |
| **Sin configuración de Delivery** | Hardcodeado a `"local"`. Debería permitir Telegram, Discord, etc. |

---

## Mejora 1: Scroll automático al seleccionar template

### Problema
Al hacer clic en un TemplateCard, el wizard avanza al paso 2 pero el contenido queda fuera del viewport.

### Solución
Usar `scrollIntoView()` con `useRef` en el contenedor del paso activo.

### Implementación
```tsx
// page.tsx — añadir ref y useEffect
const stepContentRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  stepContentRef.current?.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}, [wizard.step]);

// En el JSX
<div ref={stepContentRef} className="mt-8 sm:mt-12">
  {/* contenido del paso */}
</div>
```

### Archivos
- `frontend/src/app/create/page.tsx`

### Criterio
- [x] Scroll suave al seleccionar template
- [x] Scroll al avanzar entre pasos
- [x] WizardStepper siempre visible

---

## Mejora 2: Selección de Provider y Modelo

### Referencia oficial
Hermes soporta **20+ providers** ([docs](https://hermes-agent.nousresearch.com/docs/integrations/providers)):
- Nous Portal, Anthropic, OpenRouter, Google Gemini, xAI/Grok, DeepSeek
- GitHub Copilot, AWS Bedrock, Hugging Face, Ollama (local)
- Custom endpoint (cualquier API compatible con OpenAI)

El `config.yaml` tiene:
```yaml
model:
  default: qwen3.6
  provider: custom
  base_url: https://api.nan.builders/v1
  api_key: sk-...
providers: {}           # providers adicionales
fallback_providers: []  # fallback automático
```

### Backend — Endpoint `GET /api/system/providers`
```python
# explore-api/routers/system.py

@router.get("/api/system/providers")
async def list_providers() -> dict:
    """Lee config.yaml y retorna providers configurados + modelo por defecto."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    config = yaml.safe_load(config_path.read_text())
    
    default = config.get("model", {})
    providers = config.get("providers", {})
    fallback = config.get("fallback_providers", [])
    
    options = []
    
    # Provider por defecto (siempre disponible)
    options.append({
        "id": "default",
        "name": default.get("provider", "custom"),
        "model": default.get("model", ""),
        "base_url": default.get("base_url", ""),
        "is_default": True,
    })
    
    # Providers adicionales
    for name, prov in providers.items():
        options.append({
            "id": name,
            "name": name,
            "model": prov.get("model", ""),
            "base_url": prov.get("base_url", ""),
            "is_default": False,
        })
    
    return {
        "default_provider": default.get("provider"),
        "default_model": default.get("model"),
        "options": options,
        "fallback_count": len(fallback),
    }
```

### Frontend — `ProviderModelSelector.tsx`
```tsx
interface ProviderOption {
  id: string;
  name: string;
  model: string;
  base_url: string;
  is_default: boolean;
}

// Dropdown con provider actual pre-seleccionado
// Input editable para modelo (con placeholder del default)
// Mostrar URL base del provider seleccionado
```

### Criterio
- [x] Endpoint retorna providers configurados
- [x] Provider por defecto pre-seleccionado
- [x] Usuario puede cambiar provider y modelo
- [x] Cambio reflejado en `model` override del cronjob

---

## Mejora 3: Selección de Skills

### Referencia oficial
Skills se cargan en el cronjob via el array `skills` ([docs cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)):
```python
cronjob(
  action="create",
  skills=["blogwatcher", "maps"],  # ← skills a cargar
  prompt="Look for new local events...",
)
```

Skills instaladas se listan con `hermes skills list` o `GET /v1/skills`.

### Backend — Endpoint enriquecido `GET /v1/skills`
Ya existe pero retorna datos básicos. Necesitamos metadata del SKILL.md:
```python
@router.get("/v1/skills")
async def list_skills() -> list[dict]:
    client = await get_client()
    skills = await get_client().get_skills()
    # Enriquecer con categoría y descripción
    return [{
        "name": s.get("name", ""),
        "description": s.get("description", ""),
        "category": s.get("category", "general"),
    } for s in skills]
```

### Frontend — `SkillsSelector.tsx`
```tsx
interface SkillOption {
  name: string;
  description: string;
  category: string;
}

// Multi-select con:
// - Barra de búsqueda
// - Filtro por categoría
// - Skills del template pre-seleccionadas
// - Toggle "Solo recomendadas" vs "Todas"
```

### Mapeo template → skills sugeridas (basado en blueprints oficiales)
```typescript
const TEMPLATE_SKILL_RECOMMENDATIONS: Record<string, string[]> = {
  "ai-researcher":    ["web", "arxiv"],
  "ai-news-digest":   ["web", "blogwatcher", "xurl"],
  "repo-monitor":     ["terminal", "github-workflows"],
  "paper-summarizer": ["web", "arxiv"],
  "competitor-watcher": ["web", "browser"],
  "repo-scout":       ["terminal", "github-workflows"],
  "backlog-triage":   ["web", "github-workflows"],
  "docs-drift":       ["web", "github-workflows"],
  "dep-audit":        ["terminal"],
  "uptime-monitor":   ["web", "terminal"],
  "security-audit":   ["terminal", "web"],
  "content-pipeline": ["web", "obsidian"],
};
```

### Criterio
- [x] Skills disponibles listadas desde la API
- [x] Skills del template pre-seleccionadas
- [x] Búsqueda y filtro por categoría
- [x] Selección reflejada en `skills` del cronjob

---

## Mejora 4: Selección de Toolsets

### Referencia oficial
Hermes tiene **30+ toolsets** ([docs](https://hermes-agent.nousresearch.com/docs/reference/tools-reference)):
`web`, `search`, `browser`, `terminal`, `file`, `code_execution`, `vision`, `image_gen`, `tts`, `skills`, `memory`, `session_search`, `delegation`, `cronjob`, `todo`, `spotify`, `homeassistant`, `discord`, etc.

El cronjob permite restringir toolsets via `enabled_toolsets`:
```python
cronjob(
  action="create",
  enabled_toolsets=["web", "terminal"],  # solo estas herramientas
  ...
)
```

### Backend — Endpoint `GET /v1/toolsets`
Ya existe. Retorna la lista de toolsets disponibles.

### Frontend — `ToolsetsSelector.tsx`
```tsx
// Checkbox grid con todos los toolsets
// Pre-seleccionados según el template (de hermesConfig.toolsets)
// Tooltip con descripción de cada toolset
```

### Criterio
- [x] Toolsets listados desde la API
- [x] Toolsets del template pre-seleccionados
- [x] Descripción de cada toolset visible
- [x] Selección reflejada en `enabled_toolsets` del cronjob

---

## Mejora 5: Configuración de Schedule

### Referencia oficial
Hermes acepta múltiples formatos ([docs cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)):

| Formato | Ejemplo | Descripción |
|---------|---------|-------------|
| Duración | `30m`, `2h`, `1d` | Ejecutar cada X tiempo |
| Intervalo | `every 30m`, `every 2h` | Mismo que duración |
| Cron | `0 9 * * *`, `0 2 * * *` | Expresión cron estándar |
| ISO timestamp | `2026-03-15T09:00:00` | One-shot |

### Frontend — `ScheduleSelector.tsx`
```tsx
// Modos:
// 1. "Frecuencia" — dropdown: cada 30m, cada 1h, cada 6h, cada 12h, diario, semanal
// 2. "Cron personalizado" — input para expresión cron con preview
// 3. "One-shot" — date picker para ISO timestamp

// Preview: "Se ejecutará cada día a las 9:00 AM"
```

### Criterio
- [x] Selector de frecuencia predefinida
- [x] Input para cron personalizado
- [x] Preview legible del schedule
- [x] Valor reflejado en `schedule` del cronjob

---

## Mejora 6: Configuración de Delivery (Entrega)

### Referencia oficial
Opciones de delivery ([docs cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)):

| Opción | Valor | Descripción |
|--------|-------|-------------|
| Chat actual | `origin` | Envía al chat donde se creó (default en messaging) |
| Archivo local | `local` | Guarda en `~/.hermes/cron/output/` (default en CLI) |
| Telegram | `telegram` | Envía al home channel de Telegram |
| Telegram específico | `telegram:chat_id` | Chat específico |
| Telegram con topic | `telegram:chat_id:thread_id` | Topic específico |
| Discord | `discord` | Home channel de Discord |
| Slack | `slack` | Home channel de Slack |
| Todos | `all` | Fan out a todos los canales conectados |
| Múltiples | `telegram,discord` | Comma-separated |

### Backend — Endpoint `GET /api/system/channels`
```python
@router.get("/api/system/channels")
async def list_delivery_channels() -> list[dict]:
    """Detecta plataformas conectadas y retorna opciones de delivery."""
    config_path = Path(HERMES_HOME) / "config.yaml"
    config = yaml.safe_load(config_path.read_text())
    
    channels = [
        {"id": "local", "name": "Archivo local", "icon": "📁",
         "description": "Guarda en ~/.hermes/cron/output/", "always": True},
        {"id": "origin", "name": "Chat actual", "icon": "💬",
         "description": "Envía al chat donde se ejecuta", "always": True},
    ]
    
    # Detectar plataformas conectadas desde config
    gateway = config.get("gateway", {})
    platforms = gateway.get("platforms", {})
    
    if platforms.get("telegram", {}).get("enabled"):
        channels.append({
            "id": "telegram", "name": "Telegram", "icon": "📱",
            "description": "Envía a Telegram",
            "supports_chat_id": True,
            "supports_thread_id": True,
        })
    
    if platforms.get("discord", {}).get("enabled"):
        channels.append({
            "id": "discord", "name": "Discord", "icon": "🎮",
            "description": "Envía a Discord",
        })
    
    if platforms.get("slack", {}).get("enabled"):
        channels.append({
            "id": "slack", "name": "Slack", "icon": "💼",
            "description": "Envía a Slack",
        })
    
    channels.append({
        "id": "all", "name": "Todos los canales", "icon": "🌐",
        "description": "Fan out a todos los conectados",
    })
    
    return channels
```

### Frontend — `DeliverySelector.tsx`
```tsx
// Radio buttons con icono + nombre + descripción
// Si selecciona Telegram → input para chat_id (opcional)
// Si selecciona Telegram + thread_id → input adicional (opcional)
// Preview del valor final: "telegram:440219100"
```

### Criterio
- [x] Canales detectados desde config de Hermes
- [x] Telegram permite especificar chat_id y thread_id
- [x] Preview del valor de delivery
- [x] Valor reflejado en `deliver` del cronjob

---

## Resumen: Wizard actualizado

```
ANTES:
  1. Template → 2. Configurar → 3. Preview → 4. Crear

AHORA (con tabs en paso 2):
  1. Template
  2. Configurar
     ├── [Parámetros]  — nombre + params del template
     ├── [Modelo]      — provider + modelo (de config.yaml)
     ├── [Skills]      — multi-select de skills
     ├── [Toolsets]    — checkbox de herramientas
     ├── [Schedule]    — frecuencia o cron
     └── [Entrega]     — destino de los resultados
  3. Preview
  4. Crear
```

**Por qué tabs y no 7 pasos:** El wizard ya tiene 4 pasos. Añadir 4 pasos más lo haría pesado. Con tabs en el paso 2, el usuario configura todo en un solo lugar pero puede expandir solo lo que necesita.

### Wireframe del paso 2 con tabs

```
┌──────────────────────────────────────────────────┐
│  ⚙️ Configurar: AI Researcher                    │
├──────────────────────────────────────────────────┤
│  [Parámetros] [Modelo] [Skills] [Toolsets]       │
│  [Schedule] [Entrega]                             │
├──────────────────────────────────────────────────┤
│                                                   │
│  ── Tab: Modelo ──                                │
│  Provider: [custom ▼]                             │
│  Modelo:   [qwen3.6________]                      │
│  URL:      [https://api.nan.builders/v1]          │
│  ℹ️ Usa la configuración actual de Hermes         │
│                                                   │
│  ── Tab: Skills ──                                │
│  🔍 Buscar skills...                              │
│  ✨ Recomendadas por template:                    │
│    [x] web          [x] arxiv                     │
│  Todas las skills:                                │
│    [ ] blogwatcher  [ ] terminal                  │
│    [ ] github-workflows  [ ] obsidian             │
│                                                   │
│  ── Tab: Entrega ──                               │
│  📁 Archivo local          ●                      │
│  💬 Chat actual            ○                      │
│  📱 Telegram               ○                      │
│     Chat ID: [440219100___]                       │
│  🌐 Todos los canales      ○                      │
│                                                   │
│  [Atrás]                     [Siguiente →]        │
└──────────────────────────────────────────────────┘
```

---

## Payload final del cronjob

El wizard genera este payload que se envía a la Exploration API:

```json
{
  "name": "AI Researcher Daily",
  "template": "ai-researcher",
  "prompt": "(rendered from soul.md)",
  "schedule": "0 8 * * *",
  "deliver": "telegram:440219100",
  "skills": ["web", "arxiv"],
  "enabled_toolsets": ["web", "terminal", "file"],
  "model": {
    "model": "qwen3.6",
    "provider": "custom"
  },
  "config": {
    "topics": "LLM, agents, RAG",
    "max_results": 10
  }
}
```

Esto mapea directamente a los parámetros del `cronjob` tool de Hermes.

---

## Archivos a crear/modificar

### Backend (explore-api)

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `routers/system.py` | +endpoint `/api/system/providers` | Nuevo |
| `routers/system.py` | +endpoint `/api/system/channels` | Nuevo |
| `routers/system.py` | mejorar `/v1/skills` con metadata | Modificar |

### Frontend (frontend/src)

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `app/create/page.tsx` | +scroll, +tabs en paso 2, integrar componentes | Modificar |
| `components/builder/ProviderModelSelector.tsx` | Selector de provider + modelo | Nuevo |
| `components/builder/SkillsSelector.tsx` | Multi-selector de skills | Nuevo |
| `components/builder/ToolsetsSelector.tsx` | Checkbox de toolsets | Nuevo |
| `components/builder/ScheduleSelector.tsx` | Selector de frecuencia/cron | Nuevo |
| `components/builder/DeliverySelector.tsx` | Selector de destino de entrega | Nuevo |
| `lib/types.ts` | +tipos para providers, channels, toolsets | Modificar |
| `lib/api.ts` | +funciones: `getProviders()`, `getChannels()` | Modificar |

### Exploration API — Payload de creación

| Archivo | Cambio | Tipo |
|---------|--------|------|
| `routers/jobs.py` | Aceptar campos `skills`, `enabled_toolsets`, `model` en create | Modificar |

---

## Prioridad y esfuerzo

| # | Mejora | Prioridad | Esfuerzo |
|---|--------|-----------|----------|
| 1 | Scroll automático | 🔴 Alta | 1h |
| 2 | Provider/Modelo | 🔴 Alta | 3h |
| 6 | Delivery (Entrega) | 🔴 Alta | 2h |
| 5 | Schedule | 🟡 Media | 2h |
| 3 | Skills | 🟡 Media | 3h |
| 4 | Toolsets | 🟢 Baja | 1.5h |

**Total estimado:** ~12.5h de desarrollo

---

## Notas de diseño

### Principios
1. **Sensible por defecto** — Si el usuario no configura nada extra, usa provider actual, skills del template, toolsets del template, schedule del template, deliver `local`.
2. **No romper el flujo** — Las mejoras son aditivas. El wizard funciona igual si el usuario no toca las tabs avanzadas.
3. **Reflejar la API real** — Cada campo del wizard mapea 1:1 a un parámetro del `cronjob` tool de Hermes.
4. **Basado en docs oficiales** — Cada opción de delivery, schedule, model, etc. viene de la documentación de Hermes, no inventado.

### El agente = un cron job
El wizard de AgentHub es esencialmente una interfaz gráfica para crear cron jobs de Hermes. El payload final se envía a la Exploration API que internamente llama al `cronjob` tool. Por eso es crucial que los campos del wizard correspondan exactamente a los parámetros soportados por Hermes.

---

## Completado ✅

### Todas las mejoras implementadas (13 junio 2026)

Las 6 mejoras del wizard están completas. Ver criterios marcados en cada sección arriba.

### CLI Wizard Parity ✅

El wizard CLI (`scripts/wizard.sh`) ahora tiene los mismos parámetros que el dashboard:
- Provider/Model selection
- Skills multi-select
- Toolsets selection
- Schedule presets + custom cron
- Delivery channels con chat_id/thread_id
- JSON seguro con jq
