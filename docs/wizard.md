---
tags: [project, hackathon, agenthub, wizard, builder]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🔧 Wizard (Builder) — Flujo detallado

> El wizard es la funcionalidad principal de AgentHub: crear un agente en 3-4 pasos sin escribir código.

---

## Flujo del Wizard (Dashboard)

### Paso 1: Selección de Template
Galería de templates agrupados por categoría. Click en un template abre el wizard.

### Paso 2: Configuración (6 tabs)

#### Tab: Params
Parámetros dinámicos del template (text, select, toggle, secret). Generados desde SKILL.md frontmatter.

#### Tab: Model
Selector de provider y modelo. Lee providers reales de `config.yaml` via `GET /api/system/providers`.

#### Tab: Skills
Multi-select con búsqueda. Skills instalados en Hermes. Recomendaciones por template.

#### Tab: Toolsets
Checkbox grid. 19 toolsets disponibles. Pre-selección según template.

#### Tab: Schedule
8 presets: 30min, 1h, 6h, 12h, daily 9AM, weekly, monthly, custom cron.

#### Tab: Delivery
Selector de canal: local, origin, Telegram (con chat_id/thread_id), Discord, Slack, all.
Detecta canales automáticamente desde `config.yaml`.

### Paso 3: Preview
Muestra el prompt renderizado con los parámetros configurados.

### Paso 4: Create
Crea el agente via `POST /api/jobs`. Payload incluye: template, name, config, provider, model, skills, toolsets, schedule, delivery.

---

## Wizard CLI (scripts/wizard.sh)

El wizard CLI tiene los mismos pasos que el dashboard:
1. Selección de template (numerado)
2. Nombre del agente + parámetros dinámicos
3. Provider/Modelo (dropdown numerado)
4. Skills (multi-select con comas)
5. Toolsets (multi-select con comas)
6. Schedule (8 presets + cron custom)
7. Delivery (channels con chat_id/thread_id)
8. Preview del prompt
9. Confirmación y creación

Usa `jq` para construcción segura de JSON (previene JSON injection).
Requiere: `bash 4+`, `jq`, `curl`.

---

## Datos que maneja el wizard

### Template (input del wizard)

```json
{
  "id": "ai-researcher",
  "name": "AI Researcher",
  "description": "...",
  "params": [
    {
      "name": "topic",
      "description": "Tema principal a investigar",
      "type": "text",
      "required": true
    },
    {
      "name": "frequency",
      "description": "Frecuencia de ejecución",
      "type": "select",
      "required": true,
      "options": ["Diario", "Cada 12 horas", "Semanal"]
    },
    {
      "name": "include_podcast",
      "description": "Incluir podcast de audio",
      "type": "toggle",
      "required": false,
      "default": "false"
    },
    {
      "name": "max_results",
      "description": "Número máximo de fuentes",
      "type": "number",
      "required": false,
      "default": "10"
    }
  ]
}
```

### Configuración del usuario (generada en el wizard)

```json
{
  "template_id": "ai-researcher",
  "config": {
    "topic": "Agentes de IA autónomos",
    "frequency": "Diario",
    "include_podcast": "false",
    "max_results": "10"
  },
  "delivery": "telegram",
  "delivery_target": "home"
}
```

### Job creado (output del wizard → Hermes)

```json
{
  "prompt": "Busca las últimas noticias sobre \"Agentes de IA autónomos\" en la web.\n\nGenera un resumen ejecutivo con las 10 tendencias más importantes.\n\nIncluye fuentes (URLs).",
  "skills": ["ai-researcher"],
  "schedule": "every 24h",
  "delivery": "telegram",
  "profile": "agent-ai-researcher",
  "model": "qwen/qwen3-30b-a3b:free"
}
```

---

## Componentes React

```
src/components/builder/
├── WizardShell.tsx          ← Contenedor del wizard (steps, nav, progress)
├── WizardStepper.tsx        ← Barra de progreso del wizard
├── StepTemplateGallery.tsx  ← Paso 1: galería de templates
├── TemplateCard.tsx         ← Card de template (icono, nombre, descripción)
├── ProviderModelSelector.tsx ← Tab Model: selector de provider y modelo
├── SkillsSelector.tsx       ← Tab Skills: multi-select con búsqueda
├── ToolsetsSelector.tsx     ← Tab Toolsets: checkbox grid
├── ScheduleSelector.tsx     ← Tab Schedule: presets + cron custom
├── DeliverySelector.tsx     ← Tab Delivery: selector de canal
├── StepPreview.tsx          ← Paso 3: resumen + preview del prompt
├── PromptPreview.tsx        ← Caja con el prompt renderizado
├── StepCreate.tsx           ← Paso 4: confirmación + opciones post-create
└── StepIndicator.tsx        ← Breadcrumbs / progress bar
```

### Estado del wizard (React state)

```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4;
  activeTab: 'params' | 'model' | 'skills' | 'toolsets' | 'schedule' | 'delivery';
  selectedTemplate: Template | null;
  config: Record<string, string>;
  provider: string;
  model: string;
  skills: string[];
  toolsets: string[];
  schedule: string;
  delivery: {
    platform: string;     // "telegram" | "discord" | "local" | ...
    target: string;       // "home" | "#channel" | ...
    chat_id?: string;
    thread_id?: string;
  };
  preview: TemplatePreview | null;
  creating: boolean;
  createdJobId: string | null;
}
```

---

## Integración con el resto de AgentHub

| Desde el wizard | Hacia | Endpoint |
|----------------|-------|----------|
| Cargar templates | Exploration API | `GET /api/templates` |
| Providers/Modelos | Exploration API | `GET /api/system/providers` |
| Canales | Exploration API | `GET /api/system/channels` |
| Skills | Hermes API Server | `GET /v1/skills` |
| Toolsets | Hermes API Server | `GET /v1/toolsets` |
| Preview del prompt | Exploration API | `GET /api/templates/{id}/preview` |
| Crear agente | Hermes API Server | `POST /api/jobs` |
| Ejecutar ahora | Hermes API Server | `POST /api/jobs/{id}/run` |
| Ir al dashboard | Frontend | Navigate → `/agents` |
