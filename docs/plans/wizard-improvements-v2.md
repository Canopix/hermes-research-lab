# Plan de Mejoras — AgentHub Wizard

> **Objetivo:** Mejorar la UX del wizard de creación de agentes y la gestión de agentes existentes.

## Estado actual

El wizard funciona como una sola pantalla con 6 tabs internos (Params, Model, Skills, Toolsets, Schedule, Delivery). El AgentsTab solo muestra texto raw de `hermes cron list`. No hay edición ni eliminación de agentes.

## Mejoras propuestas

### Fase 1 — UX del Wizard (prioridad alta)

#### 1.1 Stepper visual en vez de tabs
- Reemplazar los 6 tabs por un **stepper horizontal** con pasos: `Params → Model → Skills → Schedule → Create`
- Cada paso muestra solo los campos relevantes
- Botones "Siguiente" / "Anterior" en vez de tabs libres
- **Razón:** Los usuarios no saben qué orden seguir. Un stepper guía el flujo.

#### 1.2 Simplificar tabs
- **Fusionar Skills + Toolsets** en un solo paso "Herramientas" con secciones colapsables
- **Eliminar Delivery del wizard** — usar "local" por defecto, permitir cambiar después desde Agents
- **Razón:** Delivery es avanzado y confunde a usuarios nuevos. 90% de los casos usan "local".

#### 1.3 Validación en tiempo real
- Marcar campos obligatorios que faltan (nombre del agente, al menos 1 schedule)
- Deshabilitar "Siguiente" si faltan campos requeridos
- Mostrar errores inline, no solo al final

#### 1.4 Preview mejorado
- Mostrar el prompt renderizado en un panel expandible antes de crear
- Syntax highlighting básico (variables en color, instrucciones en negrita)
- Botón "Copiar prompt" para inspeccionar

#### 1.5 Feedback de creación
- Spinner animado mientras crea perfil + cron job
- Paso a paso: "Creando perfil... ✓" → "Configurando cron... ✓" → "¡Listo!"
- Al terminar, mostrar resumen con link al cron job

### Fase 2 — Gestión de Agentes (prioridad alta)

#### 2.1 AgentsTab interactivo
- Reemplazar el `<pre>` raw por **cards** con:
  - Nombre del agente
  - Schedule (human-readable)
  - Estado (active/paused)
  - Última ejecución
  - Botones: Pausar / Reanudar / Ejecutar ahora / Eliminar

#### 2.2 Detalle de agente
- Al hacer click en una card, mostrar detalle:
  - Cron job completo
  - Profile asociado
  - Historial de ejecuciones (últimas 5)
  - Prompt completo

#### 2.3 Eliminar agente
- Botón de eliminar con confirmación
- Elimina profile + cron job

### Fase 3 — Templates mejorados (prioridad media)

#### 3.1 Búsqueda de templates
- Barra de búsqueda en la gallery
- Filtrar por nombre, categoría, tags

#### 3.2 Templates con preview
- Hover sobre un template card muestra una preview del prompt
- Click izquierdo → wizard, click derecho → preview

#### 3.3 Templates favoritos
- Estrella para marcar templates como favoritos
- Favoritos aparecen primero en la gallery

### Fase 4 — Detalles polish (prioridad baja)

#### 4.1 Empty states con illustrations
- Cuando no hay templates: ilustración + "Crea tu primer template"
- Cuando no hay agentes: ilustración + "Crea tu primer agente"

#### 4.2 Responsive
- En pantallas pequeñas, el stepper se convierte en tabs verticales
- Summary se colapsa en un accordion

#### 4.3 Keyboard shortcuts
- `Enter` para siguiente paso
- `Esc` para volver a la gallery
- `Ctrl+K` para buscar templates

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `plugin/agenthub/dashboard/dist/index.js` | Stepper, validation, agents cards, search |
| `plugin/agenthub/dashboard/dist/style.css` | Estilos del stepper, cards, responsive |
| `plugin/agenthub/dashboard/plugin_api.py` | Endpoints para pause/resume/delete agent |
| `plugin/agenthub/dashboard/manifest.json` | Sin cambios |

## Orden de ejecución

1. **1.1** Stepper visual (reemplaza tabs)
2. **2.1** AgentsTab interactivo (cards en vez de pre)
3. **1.3** Validación en tiempo real
4. **1.4** Preview mejorado
5. **2.2** Detalle de agente
6. **2.3** Eliminar agente
7. **1.2** Simplificar tabs (fusionar Skills+Toolsets)
8. **1.5** Feedback de creación
9. **3.1** Búsqueda de templates
10. Resto según prioridad

## Criterios de éxito

- [ ] Usuario puede crear un agente en < 2 minutos
- [ ] Stepper guía el flujo sin confusión
- [ ] AgentsTab muestra agentes con estado y acciones
- [ ] Preview muestra el prompt antes de crear
- [ ] Eliminar agente funciona con confirmación
