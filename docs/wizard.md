---
tags: [project, hackathon, agenthub, wizard, builder]
status: active
created: 2026-06-09
up: "[[🎯 Hackathon AgentHub]]"
---

# 🔧 Wizard (Builder) — Flujo detallado

> El wizard es la funcionalidad principal de AgentHub: crear un agente en 3-4 pasos sin escribir código.

---

## Flujo general

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  1. Elegir  │ ──→ │  2. Config   │ ──→ │  3. Preview  │ ──→ │  4. Crear   │
│  template   │     │  parámetros  │     │  + Confirmar │     │  + Ejecutar │
└─────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

---

## Paso 1: Elegir template

### Qué ve el usuario

Una galería de cards con los templates disponibles. Cada card muestra:

```
┌──────────────────────────────────┐
│  🔬                              │
│  AI Researcher                   │
│                                  │
│  Busca noticias de IA en la web  │
│  y genera resúmenes diarios.     │
│                                  │
│  📅 Diario  │  🔧 web, tts      │
│                                  │
│  [Seleccionar]                   │
└──────────────────────────────────┘
```

### Datos que carga

```
GET /api/templates → [
  {
    "id": "ai-researcher",
    "name": "AI Researcher",
    "description": "Busca noticias de IA en la web y genera resúmenes diarios.",
    "tags": ["research", "news", "ai", "daily"],
    "tools": ["web", "tts"],
    "params": [...]
  },
  ...
]
```

### Acción del usuario

Clic en **"Seleccionar"** → avanza al paso 2 con ese template pre-seleccionado.

### Sidebar / breadcrumbs

```
[● Elegir] [○ Configurar] [○ Preview] [○ Crear]
```

---

## Paso 2: Configurar parámetros

### Qué ve el usuario

Un formulario dinámico generado a partir de `template.params[]`. Cada param se renderiza según su tipo:

#### Tipo `text` → Input de texto

```
Tema principal a investigar *
┌──────────────────────────────────┐
│  Inteligencia artificial         │
└──────────────────────────────────┘
```

#### Tipo `select` → Dropdown

```
Frecuencia de ejecución *
┌──────────────────────────────────┐
│  Diario                        ▼ │
└──────────────────────────────────┘
  ○ Diario
  ○ Cada 12 horas
  ○ Semanal
```

#### Tipo `toggle` → Switch

```
Incluir podcast de audio (TTS)
                    ┌─────┐
                    │ OFF │
                    └─────┘
```

#### Tipo `number` → Input numérico

```
Número máximo de fuentes
┌──────────────────────────┐
│  10                      │
└──────────────────────────┘
```

### Reglas de validación

- Campos con `required: true` → asterisco rojo, botón "Siguiente" disabled si vacío
- `default` → valor pre-rellenado
- `number` → validación de rango (0-100)
- `select` → primera opción seleccionada por defecto

### Ejemplo completo (AI Researcher)

```
Configurar: AI Researcher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tema principal a investigar *        Frecuencia de ejecución *
┌────────────────────────────┐      ┌────────────────────────┐
│  Agentes de IA autónomos   │      │  Diario              ▼ │
└────────────────────────────┘      └────────────────────────┘

Incluir podcast de audio (TTS)      Número máximo de fuentes
         ┌─────┐                    ┌────────────────────────┐
         │ OFF │                    │  10                    │
         └─────┘                    └────────────────────────┘

Entregar output por                  Destino del output
┌────────────────────────┐          ┌────────────────────────┐
│  Telegram             ▼ │          │  home                 ▼ │
└────────────────────────┘          └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         [← Atrás]              [Siguiente →]
```

---

## Paso 3: Preview + Confirmar

### Qué ve el usuario

Un resumen de todo lo configurado + preview del prompt que Hermes recibirá.

```
Resumen: AI Researcher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Configuración:
  • Tema: "Agentes de IA autónomos"
  • Frecuencia: Diario
  • Podcast: No
  • Máx fuentes: 10
  • Delivery: Telegram → home

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 Prompt que recibirá el agente:

┌──────────────────────────────────────┐
│ Busca las últimas noticias sobre     │
│ "Agentes de IA autónomos" en la web. │
│                                      │
│ Genera un resumen ejecutivo con las  │
│ 10 tendencias más importantes.       │
│                                      │
│ Incluye fuentes (URLs).              │
│                                      │
│ Skills: ai-researcher                │
│ Schedule: every 24h                  │
│ Delivery: telegram                   │
└──────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [← Atrás]              [Crear agente ✨]
```

### Cómo se genera el prompt

```
GET /api/templates/ai-researcher/preview?topic=Agentes+de+IA&frequency=Diario&include_podcast=false&max_results=10
```

```json
{
  "template_id": "ai-researcher",
  "rendered_prompt": "Busca las últimas noticias sobre \"Agentes de IA autónomos\" en la web.\n\nGenera un resumen ejecutivo con las 10 tendencias más importantes.\n\nIncluye fuentes (URLs).",
  "schedule": "every 24h",
  "skills": ["ai-researcher"],
  "delivery": "telegram"
}
```

---

## Paso 4: Crear + Ejecutar

### Qué pasa al clickear "Crear agente"

```
1. POST /api/jobs
   {
     "prompt": "...(prompt renderizado)...",
     "skills": ["ai-researcher"],
     "schedule": "every 24h",
     "delivery": "telegram",
     "profile": "agent-ai-researcher",
     "model": "qwen/qwen3-30b-a3b:free"
   }

2. Hermes crea el cron job

3. Hermes crea el profile (si no existe)
   ~/.hermes/profiles/agent-ai-researcher/
   ├── SOUL.md     ← Configurado con los params
   ├── MEMORY.md   ← Vacío, se llena con el tiempo
   └── config.yaml ← Provider, model, etc.

4. Opcional: POST /api/jobs/{id}/run → ejecutar ahora
```

### Qué ve el usuario

```
✅ ¡Agente creado!

┌──────────────────────────────────────┐
│  🔬 AI Researcher                    │
│                                      │
│  Estado:  ● Activo                   │
│  Próxima ejecución: mañana 9:00      │
│  Entrega: Telegram → home            │
│                                      │
│  [Ejecutar ahora]  [Ver dashboard]   │
└──────────────────────────────────────┘
```

### Opciones post-creación

| Botón | Acción |
|-------|--------|
| **Ejecutar ahora** | `POST /api/jobs/{id}/run` — ejecuta inmediatamente |
| **Ver dashboard** | Navega a `/agents` — ve el agente en el dashboard |
| **Crear otro** | Vuelve al paso 1 |

---

## UX: Flujo completo animado

```
Step 1          Step 2          Step 3          Step 4
┌─────┐        ┌─────┐        ┌─────┐        ┌─────┐
│ 🔬  │  ──→   │ 📝  │  ──→   │ 👀  │  ──→   │ ✅  │
│ 📦  │        │     │        │     │        │     │
│ 📄  │        │ Form│        │Preview│       │Done!│
│ 👀  │        │     │        │     │        │     │
└─────┘        └─────┘        └─────┘        └─────┘
 Galería       Parámetros     Confirmar       Listo
```

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
├── StepTemplateGallery.tsx  ← Paso 1: galería de templates
├── TemplateCard.tsx         ← Card de template (icono, nombre, descripción)
├── StepConfigure.tsx        ← Paso 2: formulario de params
├── DynamicParamField.tsx    ← Renderiza 1 param según su tipo
│   ├── ParamTextInput.tsx
│   ├── ParamSelectInput.tsx
│   ├── ParamToggleInput.tsx
│   └── ParamNumberInput.tsx
├── StepPreview.tsx          ← Paso 3: resumen + preview del prompt
├── PromptPreview.tsx        ← Caja con el prompt renderizado
├── StepCreate.tsx           ← Paso 4: confirmación + opciones post-create
└── StepIndicator.tsx        ← Breadcrumbs / progress bar
```

### Estado del wizard (React state)

```typescript
interface WizardState {
  step: 1 | 2 | 3 | 4;
  selectedTemplate: Template | null;
  config: Record<string, string>;
  delivery: {
    platform: string;     // "telegram" | "discord" | ...
    target: string;       // "home" | "#channel" | ...
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
| Preview del prompt | Exploration API | `GET /api/templates/{id}/preview` |
| Crear agente | Hermes API Server | `POST /api/jobs` |
| Ejecutar ahora | Hermes API Server | `POST /api/jobs/{id}/run` |
| Ir al dashboard | Frontend | Navigate → `/agents` |
