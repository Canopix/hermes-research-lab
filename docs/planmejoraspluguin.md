# Plan de Mejoras — Plugin AgentHub para Hermes Dashboard

> Fecha: 13 junio 2026 | Estado: v3 (implementado + fixes)
> Basado en: [Automation Blueprints](https://hermes-agent.nousresearch.com/docs/guides/automation-blueprints), [Cron Docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron), [Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers), [Tools & Toolsets](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools)

---

## Contexto: Plugin vs Standalone

El proyecto AgentHub tiene **dos interfaces**:

| | Standalone (`:3000`) | Plugin (`:9119`) |
|---|---|---|
| **Stack** | Next.js 14 + shadcn/ui | IIFE bundle + Hermes Plugin SDK |
| **Ubicación** | `frontend/src/` | `plugin/agenthub/dashboard/dist/` |
| **API** | Exploration API (`:8643`) | Plugin API (`plugin_api.py`) |
| **Estado** | ✅ Wizard completo (6 tabs) | ⚠️ Básico (sin config avanzada) |
| **Build** | `npm run dev` / `npm run build` | Bundle manual del IIFE |

**El plugin es el que se ve dentro de Hermes** (en el tab "AgentHub" del dashboard). Es la experiencia principal del usuario final. Actualmente le faltan todas las mejoras que ya tiene el standalone.

---

## Problema Actual del Plugin

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Sin scroll/cambio de vista** | ✅ RESUELTO — DetailPanel reemplaza el grid al seleccionar template |
| 2 | **Sin Provider/Modelo** | ✅ RESUELTO — GET /providers lee config.yaml, ModelTabPanel con dropdown |
| 3 | **Sin Skills** | ✅ RESUELTO — GET /skills escanea directorios, SkillsTabPanel multi-select |
| 4 | **Sin Toolsets** | ✅ RESUELTO — GET /toolsets con 20 toolsets, ToolsetsTabPanel checkbox grid |
| 5 | **Sin Schedule real** | ✅ RESUELTO — ScheduleTabPanel con 7 presets + cron personalizado |
| 6 | **Sin Delivery** | ✅ RESUELTO — GET /channels detecta plataformas, DeliveryTabPanel radio cards |
| 7 | **Agentes creados sin profile real** | ✅ RESUELTO — create-agent renderiza SKILL.md body en SOUL.md |
| 8 | **Jobs en default profile** | ✅ RESUELTO — usa `hermes profile create --clone` + `hermes -p <name> cron create` |

---

## Arquitectura del Plugin (cómo funciona)

```
Hermes Dashboard (:9119)
  └── Tab "AgentHub"
        ├── manifest.json → carga dist/index.js + dist/style.css
        ├── index.js (IIFE) → usa window.__HERMES_PLUGIN_SDK__
        │     ├── SDK.React (useState, useEffect, useCallback)
        │     ├── SDK.hooks
        │     ├── SDK.fetchJSON (llama a /api/plugins/agenthub/*)
        │     └── SDK.components (Button, Card, Badge, Input, Select, etc.)
        └── plugin_api.py (FastAPI APIRouter)
              ├── GET  /templates
              ├── GET  /templates/{id}
              ├── POST /preview
              ├── POST /create-agent
              ├── GET  /jobs
              └── GET  /health
```

**限制 del SDK:** El plugin usa los componentes pre-expuestos por Hermes:
`Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`,
`Checkbox`, `Input`, `Label`, `Separator`, `Select`, `SelectOption`.

No tenemos acceso a componentes custom como `RadioGroup`, `Tabs`, `Dialog`, etc.
La UI se construye con `React.createElement` (h()), no JSX.

---

## Mejora 1: Cambio de Vista al Seleccionar Template

### Problema actual
El `CreateTab` muestra el grid de templates + el formulario en el mismo div.
Al hacer clic en un template, el formulario se renderiza debajo del grid.
El usuario tiene que hacer scroll hacia abajo para verlo.

### Solución: Vista tipo "detail panel"
En lugar de scroll, **reemplazar el grid por la vista de creación** cuando se selecciona un template. Un botón "← Volver" regresa al grid.

```
ANTES ( CreateTab):
  [Grid de templates]
  [Formulario debajo] ← hay que hacer scroll

AHORA ( CreateTab):
  si NO hay template seleccionado:
    [Grid de templates]
  si SÍ hay template seleccionado:
    [Header: ← Volver | Template seleccionado]
    [Tabs: Parámetros | Modelo | Skills | Toolsets | Schedule | Entrega]
    [Contenido del tab activo]
    [Botones: Preview | Crear]
```

### Implementación en `index.js`

```javascript
function CreateTab(props) {
  var s1 = useState(null), selected = s1[0], setSelected = s1[1];
  // ... otros states ...

  // Si hay template seleccionado, mostrar vista de creación
  if (selected) {
    return h("div", null,
      // Header con botón volver
      h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" } },
        h(Button, { variant: "ghost", onClick: function() { setSelected(null); } }, "← Volver"),
        h("span", { style: { fontWeight: 600, fontSize: "16px" } }, selected.name)
      ),
      // Tabs de configuración
      h(ConfigTabs, { template: selected, config: config, onChange: change, ... }),
      // Botones de acción
      h("div", { style: { display: "flex", gap: "8px", marginTop: "16px" } },
        h(Button, { variant: "outline", onClick: preview }, "Preview"),
        h(Button, { onClick: create }, "Crear agente")
      )
    );
  }

  // Si no hay template, mostrar grid
  return h("div", null, gallery);
}
```

### Criterio
- [ ] Al hacer clic en template → vista de creación (sin scroll)
- [ ] Botón "← Volver" regresa al grid
- [ ] Nombre del template visible en el header
- [ ] Transición limpia entre vistas

---

## Mejora 2: Selección de Provider y Modelo

### Referencia oficial
Hermes soporta **20+ providers** ([docs](https://hermes-agent.nousresearch.com/docs/integrations/providers)):
- Nous Portal, Anthropic, OpenRouter, Google Gemini, xAI/Grok, DeepSeek
- GitHub Copilot, AWS Bedrock, Hugging Face, Ollama (local)
- Custom endpoint (cualquier API compatible con OpenAI)

### Backend — Nuevo endpoint `GET /providers`

```python
# plugin_api.py — añadir endpoint

@router.get("/providers")
def list_providers():
    """Lee config.yaml y retorna providers configurados + modelo por defecto."""
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    config_path = hermes_home / "config.yaml"
    
    if not config_path.exists():
        return {"default_provider": "custom", "default_model": "", "options": []}
    
    config = yaml.safe_load(config_path.read_text()) or {}
    default = config.get("model", {})
    providers = config.get("providers", {})
    
    options = []
    
    # Provider por defecto (siempre disponible)
    options.append({
        "id": "default",
        "name": default.get("provider", "custom"),
        "model": default.get("default", ""),
        "base_url": default.get("base_url", ""),
        "is_default": True,
    })
    
    # Providers adicionales del config
    for name, prov in providers.items():
        options.append({
            "id": name,
            "name": name,
            "model": prov.get("model", ""),
            "base_url": prov.get("base_url", ""),
            "is_default": False,
        })
    
    return {
        "default_provider": default.get("provider", "custom"),
        "default_model": default.get("default", ""),
        "options": options,
    }
```

### Frontend — Tab "Modelo" en ConfigTabs

```javascript
function ModelTab(props) {
  var s1 = useState(props.defaultProvider || "default"), provider = s1[0], setProvider = s1[1];
  var s2 = useState(props.defaultModel || ""), model = s2[0], setModel = s2[1];
  var providers = props.providers || [];
  var selected = providers.find(function(p) { return p.id === provider; }) || {};

  return h("div", null,
    h(Label, null, "Provider"),
    h(Select, { value: provider, onChange: function(e) { 
      setProvider(e.target.value);
      // Si selecciona un provider con modelo conocido, ofrecerlo
      var p = providers.find(function(x) { return x.id === e.target.value; });
      if (p && p.model && !model) setModel(p.model);
    }},
      providers.map(function(p) {
        return h(SelectOption, { key: p.id, value: p.id },
          p.name + (p.is_default ? " (default)" : "") + (p.model ? " — " + p.model : "")
        );
      })
    ),
    h("div", { style: { marginTop: "8px" } },
      h(Label, null, "Modelo"),
      h(Input, { value: model, placeholder: selected.model || "nombre del modelo",
        onChange: function(e) { setModel(e.target.value); } })
    ),
    selected.base_url ? h("div", { style: { marginTop: "4px", fontSize: "12px", color: "#888" } },
      "URL: " + selected.base_url
    ) : null,
    h("div", { style: { marginTop: "8px", fontSize: "12px", color: "#888" } },
      "ℹ️ Usa la configuración actual de Hermes. Para añadir providers, ejecuta `hermes model`."
    )
  );
}
```

### Criterio
- [ ] Endpoint `/providers` lee `config.yaml` real
- [ ] Provider por defecto pre-seleccionado
- [ ] Dropdown con todos los providers configurados
- [ ] Input editable para modelo
- [ ] URL base visible del provider seleccionado
- [ ] Valor reflejado en `model` override del cronjob

---

## Mejora 3: Selección de Skills

### Referencia oficial
Skills se cargan en el cronjob via el array `skills` ([docs cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)):

```python
cronjob(
  action="create",
  skills=["blogwatcher", "maps"],  # skills a cargar antes del prompt
  prompt="Look for new local events...",
)
```

Skills instaladas se listan con `hermes skills list` o `GET /v1/skills`.

### Backend — Nuevo endpoint `GET /skills`

```python
# plugin_api.py — añadir endpoint

@router.get("/skills")
def list_skills():
    """Lista skills instaladas con metadata."""
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    skills = []
    
    # Buscar skills en profiles/*/skills/ y skills/
    skills_dirs = [
        hermes_home / "skills",
        hermes_home / "profiles" / "nra_mimo" / "skills",
    ]
    
    for skills_dir in skills_dirs:
        if not skills_dir.is_dir():
            continue
        for category_dir in skills_dir.iterdir():
            if not category_dir.is_dir():
                continue
            for skill_dir in category_dir.iterdir():
                skill_md = skill_dir / "SKILL.md"
                if skill_md.exists():
                    text = skill_md.read_text(encoding="utf-8")
                    parts = text.split("---")
                    meta = {}
                    if len(parts) >= 3:
                        try:
                            meta = yaml.safe_load(parts[1]) or {}
                        except yaml.YAMLError:
                            pass
                    skills.append({
                        "name": skill_dir.name,
                        "description": meta.get("description", ""),
                        "category": category_dir.name,
                    })
    
    # Deduplicar por nombre
    seen = set()
    unique = []
    for s in skills:
        if s["name"] not in seen:
            seen.add(s["name"])
            unique.append(s)
    
    return unique
```

### Frontend — Tab "Skills" en ConfigTabs

```javascript
function SkillsTab(props) {
  var s1 = useState(props.recommendedSkills || []), selected = s1[0], setSelected = s1[1];
  var s2 = useState(""), search = s2[0], setSearch = s2[1];
  var allSkills = props.allSkills || [];

  var filtered = allSkills.filter(function(s) {
    return !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
           (s.description || "").toLowerCase().includes(search.toLowerCase());
  });

  function toggle(skillName) {
    setSelected(function(prev) {
      if (prev.includes(skillName)) return prev.filter(function(n) { return n !== skillName; });
      return prev.concat([skillName]);
    });
  }

  return h("div", null,
    // Skills recomendadas por template
    props.recommendedSkills && props.recommendedSkills.length ?
      h("div", null,
        h("div", { style: { fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "4px" } },
          "✨ Recomendadas para este template"),
        h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" } },
          props.recommendedSkills.map(function(name) {
            var active = selected.includes(name);
            return h(Button, { key: name, variant: active ? "default" : "outline",
              onClick: function() { toggle(name); }, style: { fontSize: "12px" } }, name);
          })
        )
      ) : null,
    // Búsqueda
    h(Input, { placeholder: "🔍 Buscar skills...", value: search,
      onChange: function(e) { setSearch(e.target.value); } }),
    // Lista de todas las skills
    h("div", { style: { marginTop: "8px", maxHeight: "200px", overflowY: "auto" } },
      filtered.map(function(s) {
        var active = selected.includes(s.name);
        return h("div", { key: s.name, style: { display: "flex", alignItems: "center", gap: "8px",
          padding: "4px 0", cursor: "pointer" }, onClick: function() { toggle(s.name); } },
          h(Checkbox, { checked: active }),
          h("span", null, s.name),
          s.description ? h("span", { style: { fontSize: "11px", color: "#888" } }, 
            s.description.substring(0, 60)) : null
        );
      })
    )
  );
}
```

### Mapeo template → skills sugeridas (basado en blueprints oficiales)

```javascript
var TEMPLATE_SKILL_RECOMMENDATIONS = {
  "ai-researcher":      ["web", "arxiv"],
  "ai-news-digest":     ["web", "blogwatcher", "xurl"],
  "paper-summarizer":   ["web", "arxiv"],
  "competitor-watcher": ["web", "browser"],
  "repo-scout":         ["terminal", "github-workflows"],
  "repo-monitor":       ["terminal", "github-workflows"],
  "backlog-triage":     ["web", "github-workflows"],
  "docs-drift":         ["web", "github-workflows"],
  "dep-audit":          ["terminal"],
  "uptime-monitor":     ["web", "terminal"],
  "security-audit":     ["terminal", "web"],
  "content-pipeline":   ["web", "obsidian"],
};
```

### Criterio
- [ ] Endpoint `/skills` lista skills instaladas con metadata
- [ ] Skills del template pre-seleccionadas como "recomendadas"
- [ ] Búsqueda por nombre/descripción
- [ ] Checkbox para toggle de cada skill
- [ ] Selección reflejada en `skills` del cronjob

---

## Mejora 4: Selección de Toolsets

### Referencia oficial
Hermes tiene **30+ toolsets** ([docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools)):

| Toolset | Descripción |
|---------|-------------|
| `web` | Búsqueda web + extracción de páginas |
| `search` | Búsqueda general |
| `terminal` | Ejecución de comandos shell |
| `file` | Lectura/escritura de archivos |
| `browser` | Automatización de navegador |
| `vision` | Análisis de imágenes |
| `image_gen` | Generación de imágenes |
| `tts` | Text-to-speech |
| `skills` | Carga de skills |
| `memory` | Memoria persistente |
| `session_search` | Búsqueda en sesiones |
| `delegation` | Delegación a subagentes |
| `cronjob` | Tareas programadas |
| `todo` | Lista de tareas |
| `code_execution` | Ejecución de código Python |
| `homeassistant` | Integración Home Assistant |
| `discord` | Integración Discord |
| `spotify` | Integración Spotify |

El cronjob permite restringir toolsets via `enabled_toolsets`:
```python
cronjob(
  action="create",
  enabled_toolsets=["web", "terminal"],  # solo estas herramientas
)
```

### Backend — Nuevo endpoint `GET /toolsets`

```python
# plugin_api.py — añadir endpoint

# Toolsets conocidos con descripciones
KNOWN_TOOLSETS = [
    {"id": "web", "name": "Web", "description": "Búsqueda y extracción web", "category": "research"},
    {"id": "search", "name": "Search", "description": "Búsqueda general", "category": "research"},
    {"id": "terminal", "name": "Terminal", "description": "Ejecución de comandos", "category": "development"},
    {"id": "file", "name": "File", "description": "Lectura/escritura de archivos", "category": "development"},
    {"id": "browser", "name": "Browser", "description": "Automatización de navegador", "category": "research"},
    {"id": "vision", "name": "Vision", "description": "Análisis de imágenes", "category": "media"},
    {"id": "image_gen", "name": "Image Gen", "description": "Generación de imágenes", "category": "media"},
    {"id": "tts", "name": "TTS", "description": "Text-to-speech", "category": "media"},
    {"id": "skills", "name": "Skills", "description": "Carga de skills", "category": "agent"},
    {"id": "memory", "name": "Memory", "description": "Memoria persistente", "category": "agent"},
    {"id": "session_search", "name": "Session Search", "description": "Búsqueda en sesiones", "category": "agent"},
    {"id": "delegation", "name": "Delegation", "description": "Delegación a subagentes", "category": "agent"},
    {"id": "cronjob", "name": "Cronjob", "description": "Tareas programadas", "category": "automation"},
    {"id": "todo", "name": "Todo", "description": "Lista de tareas", "category": "agent"},
    {"id": "code_execution", "name": "Code Exec", "description": "Ejecución de código Python", "category": "development"},
    {"id": "homeassistant", "name": "Home Assistant", "description": "Domótica", "category": "integration"},
    {"id": "discord", "name": "Discord", "description": "Integración Discord", "category": "integration"},
    {"id": "spotify", "name": "Spotify", "description": "Integración Spotify", "category": "integration"},
    {"id": "x_search", "name": "X Search", "description": "Búsqueda en X/Twitter", "category": "research"},
    {"id": "kanban", "name": "Kanban", "description": "Gestión de tareas tipo Kanban", "category": "agent"},
]

@router.get("/toolsets")
def list_toolsets():
    """Lista toolsets disponibles con descripciones."""
    return KNOWN_TOOLSETS
```

### Frontend — Tab "Toolsets" en ConfigTabs

```javascript
function ToolsetsTab(props) {
  var s1 = useState(props.recommendedToolsets || []), selected = s1[0], setSelected = s1[1];
  var allToolsets = props.allToolsets || [];

  function toggle(toolsetId) {
    setSelected(function(prev) {
      if (prev.includes(toolsetId)) return prev.filter(function(n) { return n !== toolsetId; });
      return prev.concat([toolsetId]);
    });
  }

  // Agrupar por categoría
  var categories = {};
  allToolsets.forEach(function(t) {
    var cat = t.category || "other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t);
  });

  return h("div", null,
    // Toolsets recomendados
    h("div", { style: { fontSize: "12px", fontWeight: 600, color: "#888", marginBottom: "4px" } },
      "Herramientas para este template"),
    h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "12px" } },
      props.recommendedToolsets.map(function(id) {
        var active = selected.includes(id);
        return h(Button, { key: id, variant: active ? "default" : "outline",
          onClick: function() { toggle(id); }, style: { fontSize: "12px" } }, id);
      })
    ),
    // Todos los toolsets agrupados
    Object.keys(categories).map(function(cat) {
      return h("div", { key: cat, style: { marginTop: "8px" } },
        h("div", { style: { fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
          color: "#888", letterSpacing: "0.05em", marginBottom: "4px" } }, cat),
        h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "4px" } },
          categories[cat].map(function(t) {
            var active = selected.includes(t.id);
            return h("div", { key: t.id, style: { display: "flex", alignItems: "center", gap: "6px",
              padding: "4px 8px", borderRadius: "4px", cursor: "pointer",
              background: active ? "#e6f3ff" : "transparent" },
              onClick: function() { toggle(t.id); } },
              h(Checkbox, { checked: active }),
              h("span", { style: { fontSize: "13px" } }, t.name),
              h("span", { style: { fontSize: "11px", color: "#888" } }, t.description)
            );
          })
        )
      );
    })
  );
}
```

### Mapeo template → toolsets sugeridos

```javascript
var TEMPLATE_TOOLSET_RECOMMENDATIONS = {
  "ai-researcher":      ["web", "file"],
  "ai-news-digest":     ["web", "file"],
  "paper-summarizer":   ["web", "file"],
  "competitor-watcher": ["web", "browser", "file"],
  "repo-scout":         ["terminal", "web", "file"],
  "repo-monitor":       ["terminal", "web", "file"],
  "backlog-triage":     ["terminal", "web"],
  "docs-drift":         ["terminal", "web"],
  "dep-audit":          ["terminal"],
  "uptime-monitor":     ["web", "terminal"],
  "security-audit":     ["terminal", "web", "file"],
  "content-pipeline":   ["web", "terminal", "file"],
};
```

### Criterio
- [ ] Endpoint `/toolsets` con toolsets conocidos y descripciones
- [ ] Toolsets del template pre-seleccionados
- [ ] Grid agrupado por categoría
- [ ] Checkbox para toggle de cada toolset
- [ ] Selección reflejada en `enabled_toolsets` del cronjob

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

### Frontend — Tab "Schedule" en ConfigTabs

```javascript
function ScheduleTab(props) {
  var s1 = useState("preset"), mode = s1[0], setMode = s1[1];
  var s2 = useState(props.defaultSchedule || "every 24h"), schedule = s2[0], setSchedule = s2[1];
  var s3 = useState(""), customCron = s3[0], setCustomCron = s3[1];

  var presets = [
    { label: "Cada 30 minutos", value: "every 30m", icon: "⏱️" },
    { label: "Cada hora", value: "every 1h", icon: "🕐" },
    { label: "Cada 6 horas", value: "every 6h", icon: "🕕" },
    { label: "Cada 12 horas", value: "every 12h", icon: "🕛" },
    { label: "Diario (9:00 AM)", value: "0 9 * * *", icon: "📅" },
    { label: "Semanal (lunes 9:00)", value: "0 9 * * 1", icon: "📆" },
  ];

  function cronPreview(expr) {
    if (!expr) return "";
    if (expr.startsWith("every")) return "Se ejecutará " + expr;
    // Simple cron preview
    var parts = expr.split(" ");
    if (parts.length === 5) {
      var hour = parts[1] !== "*" ? parts[1] + ":00" : "cada hora";
      var day = parts[2] === "*" && parts[3] === "*" && parts[4] === "*" ? "diariamente" : "personalizado";
      return "Se ejecutará " + day + " a las " + hour;
    }
    return "Expresión cron: " + expr;
  }

  return h("div", null,
    // Presets
    h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" } },
      presets.map(function(p) {
        return h("div", { key: p.value,
          style: { padding: "8px 12px", borderRadius: "6px", cursor: "pointer",
            border: schedule === p.value ? "2px solid #0066cc" : "1px solid #ddd",
            background: schedule === p.value ? "#f0f7ff" : "white" },
          onClick: function() { setSchedule(p.value); setMode("preset"); } },
          h("div", null, p.icon + " " + p.label),
          h("div", { style: { fontSize: "11px", color: "#888" } }, p.value)
        );
      })
    ),
    // Cron personalizado
    h("div", { style: { marginTop: "12px" } },
      h(Label, null, "O expresión cron personalizada"),
      h(Input, { placeholder: "0 9 * * *", value: customCron,
        onChange: function(e) { setCustomCron(e.target.value); setMode("custom"); },
        onFocus: function() { setMode("custom"); } }),
      mode === "custom" && customCron ?
        h("div", { style: { fontSize: "12px", color: "#888", marginTop: "4px" } },
          cronPreview(customCron)) : null
    ),
    // Preview
    h("div", { style: { marginTop: "8px", padding: "8px", background: "#f5f5f5",
      borderRadius: "4px", fontSize: "13px" } },
      "📅 " + cronPreview(mode === "custom" ? customCron : schedule)
    )
  );
}
```

### Criterio
- [ ] Presets de frecuencia comunes con iconos
- [ ] Input para cron personalizado
- [ ] Preview legible del schedule seleccionado
- [ ] Valor reflejado en `schedule` del cronjob

---

## Mejora 6: Configuración de Delivery (Entrega)

### Referencia oficial
Opciones de delivery ([docs cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron)):

| Opción | Valor | Descripción |
|--------|-------|-------------|
| Archivo local | `local` | Guarda en `~/.hermes/cron/output/` |
| Chat actual | `origin` | Envía al chat donde se creó |
| Telegram | `telegram` | Envía al home channel |
| Telegram específico | `telegram:chat_id` | Chat específico |
| Telegram con topic | `telegram:chat_id:thread_id` | Topic específico |
| Discord | `discord` | Home channel |
| Slack | `slack` | Home channel |
| Todos | `all` | Fan out a todos los canales |

### Backend — Nuevo endpoint `GET /channels`

```python
# plugin_api.py — añadir endpoint

@router.get("/channels")
def list_delivery_channels():
    """Detecta plataformas conectadas y retorna opciones de delivery."""
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    config_path = hermes_home / "config.yaml"
    
    channels = [
        {"id": "local", "name": "Archivo local", "icon": "📁",
         "description": "Guarda en ~/.hermes/cron/output/", "always": True},
        {"id": "origin", "name": "Chat actual", "icon": "💬",
         "description": "Envía al chat donde se ejecuta", "always": True},
    ]
    
    if config_path.exists():
        config = yaml.safe_load(config_path.read_text()) or {}
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

### Frontend — Tab "Entrega" en ConfigTabs

```javascript
function DeliveryTab(props) {
  var s1 = useState(props.defaultDeliver || "local"), deliver = s1[0], setDeliver = s1[1];
  var s2 = useState(""), chatId = s2[0], setChatId = s2[1];
  var s3 = useState(""), threadId = s3[0], setThreadId = s3[1];
  var channels = props.channels || [];

  function deliverPreview() {
    if (deliver === "local" || deliver === "origin" || deliver === "all") return deliver;
    if (deliver === "telegram") {
      if (chatId && threadId) return "telegram:" + chatId + ":" + threadId;
      if (chatId) return "telegram:" + chatId;
      return "telegram";
    }
    return deliver;
  }

  return h("div", null,
    // Lista de canales como radio buttons
    channels.map(function(ch) {
      return h("div", { key: ch.id,
        style: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px",
          borderRadius: "6px", cursor: "pointer", marginBottom: "4px",
          border: deliver === ch.id ? "2px solid #0066cc" : "1px solid #ddd",
          background: deliver === ch.id ? "#f0f7ff" : "white" },
        onClick: function() { setDeliver(ch.id); } },
        h("span", { style: { fontSize: "18px" } }, ch.icon),
        h("div", null,
          h("div", { style: { fontWeight: 500 } }, ch.name),
          h("div", { style: { fontSize: "12px", color: "#888" } }, ch.description)
        )
      );
    }),
    // Inputs condicionales para Telegram
    deliver === "telegram" ?
      h("div", { style: { marginTop: "8px", padding: "8px", background: "#f5f5f5", borderRadius: "4px" } },
        h(Label, null, "Chat ID (opcional)"),
        h(Input, { placeholder: "440219100", value: chatId,
          onChange: function(e) { setChatId(e.target.value); } }),
        h("div", { style: { marginTop: "4px" } },
          h(Label, null, "Thread/Topic ID (opcional)"),
          h(Input, { placeholder: "17585", value: threadId,
            onChange: function(e) { setThreadId(e.target.value); } })
        )
      ) : null,
    // Preview del valor final
    h("div", { style: { marginTop: "8px", padding: "8px", background: "#f5f5f5",
      borderRadius: "4px", fontSize: "13px" } },
      "📦 Deliver: ", h("code", null, deliverPreview())
    )
  );
}
```

### Criterio
- [ ] Canales detectados desde config de Hermes
- [ ] Radio buttons con icono + nombre + descripción
- [ ] Telegram permite especificar chat_id y thread_id
- [ ] Preview del valor de delivery final
- [ ] Valor reflejado en `deliver` del cronjob

---

## Mejora 7: Backend — create-agent mejorado

### Problema actual
El endpoint `POST /create-agent` actual:
- Crea un SOUL.md básico (no renderiza el SKILL.md body)
- No acepta `skills`, `enabled_toolsets`, `model`
- Crea el cron job sin这些 parámetros
- Hardcodea `deliver: "local"`

### Solución: Aceptar todos los campos del wizard

```python
class CreateAgentRequest(BaseModel):
    template_id: str
    name: str
    config: dict[str, str] = {}
    schedule: str | None = None
    deliver: str | None = None
    skills: list[str] = []
    enabled_toolsets: list[str] = []
    model_provider: str | None = None
    model_name: str | None = None


@router.post("/create-agent")
def create_agent(req: CreateAgentRequest):
    hermes_home = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))
    profile_name = f"agent-{req.name.lower().replace(' ', '-')}"
    profile_dir = hermes_home / "profiles" / profile_name
    profile_dir.mkdir(parents=True, exist_ok=True)

    tpl = _parse_template(req.template_id)
    if tpl is None:
        raise HTTPException(status_code=404, detail="Template not found")

    # 1. Renderizar el SKILL.md body con los params del usuario
    body = _read_skill_body(req.template_id)
    rendered = body
    for k, v in req.config.items():
        rendered = rendered.replace("{" + k + "}", str(v))

    # 2. Crear SOUL.md con el prompt renderizado
    soul_lines = [
        f"# {req.name}",
        f"",
        f"Based on template: {tpl['name']}",
        f"Description: {tpl['description']}",
        f"",
        rendered,
    ]
    (profile_dir / "SOUL.md").write_text("\n".join(soul_lines), encoding="utf-8")

    # 3. Resolver schedule
    schedule = req.schedule
    if not schedule:
        freq = req.config.get("frequency", "")
        schedule_map = {
            "Diario": "every 24h",
            "Cada 12 horas": "every 12h",
            "Cada 6 horas": "every 6h",
            "Semanal": "every 7d",
        }
        schedule = schedule_map.get(freq, "every 24h")

    # 4. Construir comando hermes cron create
    agent_name = req.name or tpl["name"]
    deliver = req.deliver or "local"
    
    cmd = [
        "hermes", "cron", "create", schedule, rendered,
        "--name", agent_name,
        "--deliver", deliver,
    ]
    
    # Añadir skills
    for skill in req.skills:
        cmd.extend(["--skill", skill])
    
    # Añadir toolsets (si soportado por CLI)
    if req.enabled_toolsets:
        # El CLI no soporta --toolsets directamente, pero sí el tool
        # Guardamos en un metadata file para referencia
        metadata = {
            "enabled_toolsets": req.enabled_toolsets,
            "model": {},
        }
        if req.model_provider and req.model_name:
            metadata["model"] = {
                "provider": req.model_provider,
                "model": req.model_name,
            }
        (profile_dir / "agenthub-metadata.json").write_text(
            json.dumps(metadata, indent=2), encoding="utf-8"
        )
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

    if result.returncode != 0:
        return {
            "profile": profile_name,
            "profile_created": True,
            "job_created": False,
            "error": result.stderr.strip(),
        }

    return {
        "profile": profile_name,
        "profile_created": True,
        "job_created": True,
        "schedule": schedule,
        "deliver": deliver,
        "skills": req.skills,
    }
```

### Criterio
- [ ] Acepta `skills`, `enabled_toolsets`, `model_provider`, `model_name`
- [ ] Renderiza el SKILL.md body con los params del usuario
- [ ] Crea SOUL.md con el prompt renderizado
- [ ] Guarda metadata del agente (toolsets, model override)
- [ ] Pass skills al `hermes cron create`

---

## Mejora 8: ConfigTabs — Orquestador de tabs

### Estructura del componente principal

```javascript
function ConfigTabs(props) {
  var s1 = useState("params"), activeTab = s1[0], setActiveTab = s1[1];
  
  var tabs = [
    { id: "params", label: "⚙️ Parámetros" },
    { id: "model", label: "🤖 Modelo" },
    { id: "skills", label: "📚 Skills" },
    { id: "toolsets", label: "🔧 Toolsets" },
    { id: "schedule", label: "📅 Schedule" },
    { id: "delivery", label: "📦 Entrega" },
  ];

  return h("div", null,
    // Tab bar
    h("div", { style: { display: "flex", gap: "4px", marginBottom: "12px", flexWrap: "wrap" } },
      tabs.map(function(t) {
        return h(Button, { key: t.id, variant: activeTab === t.id ? "default" : "outline",
          onClick: function() { setActiveTab(t.id); },
          style: { fontSize: "12px" } }, t.label);
      })
    ),
    h(Separator, null),
    // Contenido del tab
    h("div", { style: { marginTop: "12px" } },
      activeTab === "params" ? h(ParamsTab, { template: props.template, config: props.config, onChange: props.onChange }) :
      activeTab === "model" ? h(ModelTab, { providers: props.providers, ... }) :
      activeTab === "skills" ? h(SkillsTab, { allSkills: props.skills, recommendedSkills: ... }) :
      activeTab === "toolsets" ? h(ToolsetsTab, { allToolsets: props.toolsets, recommendedToolsets: ... }) :
      activeTab === "schedule" ? h(ScheduleTab, { defaultSchedule: props.schedule }) :
      h(DeliveryTab, { channels: props.channels, defaultDeliver: props.deliver })
    )
  );
}
```

### Datos iniciales (fetch al montar)

```javascript
function CreateTab(props) {
  // ... states ...
  
  var sProviders = useState([]), providers = sProviders[0], setProviders = sProviders[1];
  var sSkills = useState([]), allSkills = sSkills[0], setAllSkills = sSkills[1];
  var sToolsets = useState([]), allToolsets = sToolsets[0], setAllToolsets = sToolsets[1];
  var sChannels = useState([]), channels = sChannels[0], setChannels = sChannels[1];

  useEffect(function() {
    fetchJSON("/api/plugins/agenthub/providers").then(setProviders).catch(function() {});
    fetchJSON("/api/plugins/agenthub/skills").then(setAllSkills).catch(function() {});
    fetchJSON("/api/plugins/agenthub/toolsets").then(setAllToolsets).catch(function() {});
    fetchJSON("/api/plugins/agenthub/channels").then(setChannels).catch(function() {});
  }, []);

  // Al seleccionar template, cargar datos
  var select = useCallback(function(tpl) {
    setSelected(tpl);
    setAgentName(tpl.name);
    // Pre-seleccionar skills y toolsets del template
    setConfigSkills(TEMPLATE_SKILL_RECOMMENDATIONS[tpl.id] || []);
    setConfigToolsets(TEMPLATE_TOOLSET_RECOMMENDATIONS[tpl.id] || []);
  }, []);

  // ... render ...
}
```

---

## Resumen: Wizard del Plugin actualizado

```
ANTES (CreateTab):
  [Grid de templates]
  [Formulario debajo del grid] ← scroll manual

AHORA (CreateTab):
  si NO hay template seleccionado:
    [Grid de templates agrupados por categoría]
  
  si SÍ hay template seleccionado:
    [← Volver] [Nombre del Template]
    ─────────────────────────────────
    [⚙️ Params] [🤖 Modelo] [📚 Skills]
    [🔧 Toolsets] [📅 Schedule] [📦 Entrega]
    ─────────────────────────────────
    [Contenido del tab activo]
    ─────────────────────────────────
    [Preview] [Crear agente]
```

### Wireframe del Plugin — Vista de creación

```
┌──────────────────────────────────────────────────────┐
│  ← Volver    AI Researcher                          │
├──────────────────────────────────────────────────────┤
│  [⚙️ Params] [🤖 Modelo] [📚 Skills] [🔧 Toolsets]  │
│  [📅 Schedule] [📦 Entrega]                          │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ── Tab: Modelo ──                                    │
│  Provider: [custom ▼]                                │
│  Modelo:   [qwen3.6________]                         │
│  URL:      [https://api.nan.builders/v1]             │
│  ℹ️ Usa la configuración actual de Hermes            │
│                                                       │
│  ── Tab: Skills ──                                    │
│  ✨ Recomendadas: [web] [arxiv]                      │
│  🔍 Buscar...                                        │
│  [x] web          [x] arxiv                          │
│  [ ] blogwatcher  [ ] terminal                       │
│  [ ] github-workflows  [ ] obsidian                  │
│                                                       │
│  ── Tab: Entrega ──                                   │
│  📁 Archivo local          ●                         │
│  💬 Chat actual            ○                         │
│  📱 Telegram               ○                         │
│     Chat ID: [440219100___]                           │
│  🌐 Todos los canales      ○                         │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐                   │
│  │   Preview   │  │ Crear agente │                   │
│  └─────────────┘  └──────────────┘                   │
└──────────────────────────────────────────────────────┘
```

---

## Archivos a crear/modificar

### Backend — `plugin/agenthub/dashboard/plugin_api.py`

| Endpoint | Cambio | Tipo |
|----------|--------|------|
| `GET /providers` | Lee config.yaml, retorna providers + modelo default | **Nuevo** |
| `GET /skills` | Lista skills instaladas con metadata | **Nuevo** |
| `GET /toolsets` | Lista toolsets conocidos con descripciones | **Nuevo** |
| `GET /channels` | Detecta plataformas conectadas para delivery | **Nuevo** |
| `POST /create-agent` | Aceptar skills, toolsets, model, deliver | **Modificar** |

### Frontend — `plugin/agenthub/dashboard/dist/index.js`

| Componente | Cambio | Tipo |
|------------|--------|------|
| `AgentHub()` | Fetch de providers, skills, toolsets, channels | Modificar |
| `CreateTab()` | Vista tipo detail panel (sin scroll) + ConfigTabs | Reescribir |
| `ConfigTabs()` | Orquestador de 6 tabs | **Nuevo** |
| `ParamsTab()` | Params del template + nombre (extraído de CreateTab) | **Nuevo** |
| `ModelTab()` | Dropdown provider + input modelo | **Nuevo** |
| `SkillsTab()` | Multi-select con búsqueda y recomendaciones | **Nuevo** |
| `ToolsetsTab()` | Checkbox grid agrupado por categoría | **Nuevo** |
| `ScheduleTab()` | Presets + cron personalizado | **Nuevo** |
| `DeliveryTab()` | Radio channels + inputs condicionales | **Nuevo** |

### Build del dist

El `dist/index.js` es un IIFE bundle. Para rebuild:

```bash
# Opción 1: Manual — copiar el JS y hacer inline
# El plugin usa React del SDK, no necesita bundler

# Opción 2: Si se quiere usar un bundler
cd plugin/agenthub/dashboard
# Crear src/index.jsx con el código
# Usar esbuild para bundle IIFE:
npx esbuild src/index.jsx --bundle --format=iife --outfile=dist/index.js --external:react
```

**Nota:** El SDK de Hermes provee `React`, `hooks`, `components`, y `fetchJSON` vía `window.__HERMES_PLUGIN_SDK__`. No necesitamos npm install ni bundler complejo — el IIFE se puede escribir directamente como vanilla JS con `React.createElement`.

---

## Prioridad y esfuerzo estimado

| # | Mejora | Prioridad | Esfuerzo Backend | Esfuerzo Frontend |
|---|--------|-----------|-----------------|-------------------|
| 1 | Vista detail panel (sin scroll) | 🔴 Alta | — | 1h |
| 6 | Delivery (Entrega) | 🔴 Alta | 30min | 1.5h |
| 2 | Provider/Modelo | 🔴 Alta | 30min | 1.5h |
| 5 | Schedule | 🟡 Media | — | 1h |
| 3 | Skills | 🟡 Media | 1h | 1.5h |
| 4 | Toolsets | 🟡 Media | 30min | 1.5h |
| 7 | create-agent mejorado | 🔴 Alta | 1.5h | — |
| 8 | ConfigTabs orquestador | 🔴 Alta | — | 1h |
| **Total** | | | **3.5h** | **9.5h** |

**Esfuerzo total estimado: ~13h**

---

## Orden de ejecución recomendado

1. **Backend primero** — Crear los 4 endpoints nuevos en `plugin_api.py`
2. **ConfigTabs** — Crear el orquestador de tabs
3. **CreateTab rewrite** — Vista detail panel + integrar ConfigTabs
4. **ParamsTab** — Extraer params existentes
5. **ModelTab** — Provider/modelo
6. **DeliveryTab** — Entrega (impacto alto, complejidad baja)
7. **ScheduleTab** — Schedule
8. **SkillsTab** — Skills
9. **ToolsetsTab** — Toolsets
10. **create-agent** — Actualizar endpoint para aceptar nuevos campos
11. **Testing** — Verificar en Hermes dashboard (:9119)

---

## Dependencias

- **Hermes Plugin SDK** (`window.__HERMES_PLUGIN_SDK__`): Componentes disponibles: `Button`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Badge`, `Checkbox`, `Input`, `Label`, `Separator`, `Select`, `SelectOption`
- **config.yaml** del profile activo para providers y canales
- **Skills instaladas** en `~/.hermes/skills/` y `~/.hermes/profiles/*/skills/`
- **Hermes CLI** (`hermes cron create`) para crear los cron jobs

---

## Changelog

### v2 — Implementado (13 junio 2026)

Commits en `feature/dashboardv1`:

| Commit | Descripción |
|--------|-------------|
| `4ee9e2a` | feat(plugin): full wizard — 4 endpoints backend + 12 componentes frontend |
| `6311d5a` | fix(plugin): providers format mismatch + TemplatesTab onSelect crash |

**Archivos modificados:**

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `plugin/agenthub/dashboard/plugin_api.py` | 534 | +4 endpoints (/providers, /skills, /toolsets, /channels), create-agent mejorado |
| `plugin/agenthub/dashboard/dist/index.js` | 817 | 12 componentes: ConfigTabs, DetailPanel, 6 tab panels, TemplatesTab, AgentsTab, AgentHub |
| `docs/planmejoraspluguin.md` | 1110 | Plan de mejoras completo |

**Bugs encontrados y arreglados:**
1. Backend `/providers` devolvía `default_model` como objeto `{provider, model, base_url, api_mode}` en vez de string → React crash #31
2. `TemplatesTab` llamaba `props.onSelect(t)` sin verificar si existía → `TypeError: props.onSelect is not a function`

**Commits adicionales:**
| Commit | Descripción |
|--------|-------------|
| `6448b6c` | feat(plugin): usa `hermes profile create --clone` para profiles dedicados |

**Todas las mejoras completadas (8/8).**

### v3 — Bug fixes y seguridad (13 junio 2026)

- ✅ Fix double-toggle en checkboxes (skills, toolsets, delivery)
- ✅ Fix provider inicializado con template ID
- ✅ Añadido supports_chat_id/supports_thread_id a canales del plugin
- ✅ Path traversal validation en backend
- ✅ Async I/O y race condition fixes
- ✅ API key moved server-side
