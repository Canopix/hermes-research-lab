# Plan AgentHub — Correcciones, UX y CLI Wizard

> **Fecha:** 2026-06-13
> **Branch:** `feature/dashboardv1`
> **Objetivo:** Corregir bugs, mejorar UX del plugin, y crear CLI wizard paritario con el dashboard

---

## Resumen Ejecutivo

| # | Problema | Severidad | Archivos |
|---|---------|-----------|----------|
| 1 | `ReferenceError: props is not defined` al crear agente | 🔴 Crítico | `plugin/agenthub/dashboard/dist/index.js` |
| 2 | `401 Unauthorized` en resources del plugin | 🔴 Crítico | Plugin SDK auth / `plugin_api.py` |
| 3 | Color de fondo `#f5f5f5` en tema oscuro | 🟡 Medio | `plugin/agenthub/dashboard/dist/index.js` |
| 4 | Navegación: quitar "Create", Templates → crear directo | 🟡 UX | `plugin/agenthub/dashboard/dist/index.js` |
| 5 | Canales no muestran Telegram | 🟡 Config | `~/.hermes/config.yaml` + backend |
| 6 | CLI wizard incompleto (faltan params del dashboard) | 🟡 Feature | `scripts/wizard.sh` + backend |

---

## 1. 🔴 Fix: `ReferenceError: props is not defined`

### Root Cause
En `plugin/agenthub/dashboard/dist/index.js` línea 757, dentro del componente `AgentHub()` (que **no recibe props**):

```javascript
// Línea 661: function AgentHub() ← SIN params
// Línea 757 (dentro de handleCreate):
if (d.job_created && props && props.onCreated) props.onCreated();
```

`AgentHub` se registra como plugin via `window.__HERMES_PLUGINS__.register("agenthub", AgentHub)` — el SDK probablemente no pasa props. La referencia a `props` lanza ReferenceError.

### Fix
**Opción A (recomendada):** Eliminar la referencia a `props.onCreated` ya que el componente recarga jobs internamente:

```javascript
// Línea 757 — cambiar:
if (d.job_created && props && props.onCreated) props.onCreated();
if (d.job_created) loadJobs();

// Por:
if (d.job_created) loadJobs();
```

**Opción B:** Si el SDK sí pasa props, aceptarlos en la función:

```javascript
function AgentHub(props) {
  // ...existing code...
}
```

### Verificación
- Crear un agente desde el plugin → no debe lanzar ReferenceError en consola
- El agente debe aparecer en la lista después de crear

---

## 2. 🔴 Fix: `401 Unauthorized` en resources

### Root Cause
El plugin usa `SDK.fetchJSON("/api/plugins/agenthub/...")` que va al **Hermes API Server** (port 8642). La autenticación depende del plugin SDK inyectando el token automáticamente.

Posibles causas:
1. El SDK no inyecta el header `Authorization: Bearer <key>` correctamente
2. La API key de Hermes no está configurada o no coincide
3. Las rutas del plugin no están registradas en el API Server

### Fix
1. **Verificar que el plugin esté registrado** en el API Server:
   ```bash
   # Comprobar que las rutas /api/plugins/agenthub/* existen
   curl -s http://localhost:8642/api/plugins/agenthub/templates \
     -H "Authorization: Bearer $(grep api_key ~/.hermes/config.yaml | head -1 | awk '{print $2}')"
   ```

2. **Verificar que el SDK inyecta auth** — revisar consola del navegador para ver qué headers envía `fetchJSON`

3. **Fallback:** Si el SDK no maneja auth, añadir header manualmente en `postJSON`:
   ```javascript
   function postJSON(path, payload, onOk) {
     setLoading(true); setWErr(null);
     var token = localStorage.getItem("hermes_token") || "";
     fetchJSON(path, {
       method: "POST",
       body: JSON.stringify(payload),
       headers: {
         "Content-Type": "application/json",
         "Authorization": "Bearer " + token
       }
     })
       .then(onOk)
       .catch(function (e) { setWErr(String(e)); })
       .finally(function () { setLoading(false); });
   }
   ```

### Verificación
- Abrir DevTools → Network → verificar que requests a `/api/plugins/agenthub/*` devuelven 200
- Si siguen 401, verificar el API key con `hermes config get api_key`

---

## 3. 🟡 Fix: Color de fondo `#f5f5f5` en tema oscuro

### Root Cause
En `plugin/agenthub/dashboard/dist/index.js` hay 2 instancias de fondo claro hardcodeado:

| Línea | Estilo | Uso |
|-------|--------|-----|
| 52 | `PREVIEW_BOX = { background: "#f5f5f5", ... }` | Panel de preview del prompt |
| 656 | `background: "#f5f5f5"` en `<pre>` de AgentsTab | Lista de agents |

### Fix
Reemplazar con CSS variables que se adapten al tema:

```javascript
// Línea 52 — PREVIEW_BOX:
var PREVIEW_BOX = {
  background: "var(--muted, #f1f5f9)",
  padding: "12px",
  borderRadius: "6px",
  marginTop: "12px",
  whiteSpace: "pre-wrap",
  fontSize: "12px",
  maxHeight: "200px",
  overflowY: "auto"
};

// Línea 656 — AgentsTab pre:
h("pre", {
  "data-testid": "agents-list",
  style: {
    background: "var(--muted, #f1f5f9)",
    padding: "12px",
    borderRadius: "6px",
    whiteSpace: "pre-wrap",
    fontSize: "12px"
  }
}, content || "No agents yet.")
```

### Verificación
- Cambiar tema del dashboard a oscuro → los paneles de preview y agents no deben tener fondo blanco

---

## 4. 🟡 UX: Simplificar navegación del plugin

### Cambios solicitados
1. **Quitar botón "Create"** de la barra de tabs
2. **En "Templates":** al hacer click en una template → abrir directamente el wizard de creación (actualmente solo selecciona)
3. **En "Agents":** mantener como está

### Fix en `plugin/agenthub/dashboard/dist/index.js`

**Paso 1 — Quitar tab "Create" (líneas 802-804):**

```javascript
// Actual:
tabBtn("templates", "tab-templates", "Templates"),
tabBtn("create", "tab-create", "Create"),
tabBtn("agents", "tab-agents", "Agents")

// Cambiar a:
tabBtn("templates", "tab-templates", "Templates"),
tabBtn("agents", "tab-agents", "Agents")
```

**Paso 2 — Templates click → crear directamente (línea 787-789):**

```javascript
// Actual (tab === "templates" sin template seleccionada):
panel = h(TemplatesTab, { templates: templates, error: tErr, onSelect: selectTemplate, selected: selectedTpl });

// Cambiar para que onSelect siempre vaya al wizard:
// La función selectTemplate ya hace setSelectedTpl(tpl) que activa DetailPanel
// Solo necesitamos que el tab se cambie a "create" internamente
```

**Paso 3 — Reorganizar lógica de tabs:**

```javascript
// Renombrar tab interno "create" → "wizard" (para no confundir)
// La lógica actual ya funciona: si selectedTpl !== null, muestra DetailPanel
// Solo hay que asegurar que TemplatesTab siempre tenga onSelect

// Línea 786-790 — Simplificar:
} else {
  // Siempre mostrar gallery con onSelect habilitado
  panel = h(TemplatesTab, { templates: templates, error: tErr, onSelect: selectTemplate, selected: selectedTpl });
}
```

**Paso 4 — Header text (líneas 793-795):**

```javascript
// Actual:
var headerText = tab === "create" && selectedTpl ? "Configure Agent" :
  tab === "create" ? "Choose a Template" :
  tab === "agents" ? "Your Agents" : "Templates";

// Cambiar a:
var headerText = selectedTpl ? "Configure Agent" :
  tab === "agents" ? "Your Agents" : "Templates";
```

### Verificación
- Plugin solo muestra 2 tabs: Templates y Agents
- Click en una template → abre wizard de configuración
- Botón "← Back to templates" → vuelve a la galería
- Click en "Agents" → muestra lista de agents

---

## 5. 🟡 Config: Habilitar Telegram en canales

### Root Cause
En `~/.hermes/config.yaml` línea 265-267:

```yaml
gateway:
  platforms:
    telegram:
      streaming: true    # ← Falta enabled: true
```

El backend (`system.py` línea 121) verifica:
```python
if platforms.get("telegram", {}).get("enabled"):
```

Como `enabled` no existe, devuelve `None` → Telegram no aparece.

### Fix
**Opción A (config):** Añadir `enabled: true` en config.yaml:

```yaml
gateway:
  platforms:
    telegram:
      enabled: true      # ← Añadir
      streaming: true
```

**Opción B (backend — más robusto):** Cambiar la lógica del backend para detectar plataformas que tengan configuración (no solo `enabled: true`):

```python
# explore-api/routers/system.py línea 121
# Actual:
if platforms.get("telegram", {}).get("enabled"):

# Cambiar a (detectar si la plataforma tiene cualquier config):
if "telegram" in platforms and platforms["telegram"]:
    telegram_cfg = platforms["telegram"]
    channels.append({
        "id": "telegram",
        "name": "Telegram",
        "description": telegram_cfg.get("description", "Deliver via Telegram"),
        "supports_chat_id": True,
        "supports_thread_id": True,
    })
```

**Recomendado:** Aplicar ambas opciones para robustez.

### Verificación
- `curl http://localhost:8643/api/system/channels` → debe incluir `"id": "telegram"`
- En el dashboard, Delivery tab → debe mostrar opción Telegram con campos Chat ID / Thread ID

---

## 6. 🟡 Feature: CLI Wizard completo (paritario con dashboard)

### Estado actual
`scripts/wizard.sh` (280 líneas) solo tiene:
- ✅ Selección de template
- ✅ Nombre del agente
- ✅ Parámetros dinámicos (text, select, toggle, secret)
- ✅ Preview del prompt
- ✅ Creación del agente

**Falta:**
- ❌ Selección de Provider/Modelo
- ❌ Selección de Skills (multi-select)
- ❌ Selección de Toolsets (checkbox)
- ❌ Configuración de Schedule (presets + cron custom)
- ❌ Configuración de Delivery (channels + chat_id/thread_id)

### Backend endpoints necesarios (ya existentes)
| Endpoint | Descripción |
|----------|-------------|
| `GET /api/system/providers` | Providers + modelos disponibles |
| `GET /api/system/channels` | Canales de delivery configurados |
| `GET /api/v1/skills` | Skills instalados |
| `GET /api/v1/toolsets` | Toolsets disponibles |

### Plan de implementación

#### Paso 1: Añadir selección de Provider/Modelo (después de config params)

```bash
# ──────────────────────────────────────────────
#  Paso 2b: Seleccionar Provider y Modelo
# ──────────────────────────────────────────────
log_step "Paso 2b: Provider y Modelo"

PROVIDERS_RESP=$(hc "$EXPLORE_URL/api/system/providers")
PROVIDERS_BODY=$(echo "$PROVIDERS_RESP" | sed '$d')
PROVIDERS_CODE=$(echo "$PROVIDERS_RESP" | tail -1)

if [ "$PROVIDERS_CODE" = "200" ]; then
    DEFAULT_PROVIDER=$(echo "$PROVIDERS_BODY" | jq -r '.default_provider // ""')
    DEFAULT_MODEL=$(echo "$PROVIDERS_BODY" | jq -r '.default_model // ""')
    OPTIONS=$(echo "$PROVIDERS_BODY" | jq -c '.options // []')
    OPT_COUNT=$(echo "$OPTIONS" | jq '. | length')

    if [ "$OPT_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Providers disponibles:${NC}"
        echo ""
        for i in $(seq 0 $((OPT_COUNT - 1))); do
            P_ID=$(echo "$OPTIONS" | jq -r ".[$i].id")
            P_NAME=$(echo "$OPTIONS" | jq -r ".[$i].name")
            P_MODELS=$(echo "$OPTIONS" | jq -r ".[$i].models | join(\", \")")
            DEFAULT_MARK=""
            [ "$P_ID" = "$DEFAULT_PROVIDER" ] && DEFAULT_MARK=" ${GREEN}(por defecto)${NC}"
            echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$P_NAME${NC}$DEFAULT_MARK"
            echo -e "     Modelos: $P_MODELS"
            echo ""
        done

        read -p "  Elige provider (1-$OPT_COUNT) [$DEFAULT_PROVIDER]: " PROV_CHOICE
        if [ -z "$PROV_CHOICE" ]; then
            SELECTED_PROVIDER="$DEFAULT_PROVIDER"
        elif [[ "$PROV_CHOICE" =~ ^[0-9]+$ ]] && [ "$PROV_CHOICE" -ge 1 ] && [ "$PROV_CHOICE" -le "$OPT_COUNT" ]; then
            SELECTED_PROVIDER=$(echo "$OPTIONS" | jq -r ".[$((PROV_CHOICE-1))].id")
        else
            SELECTED_PROVIDER="$PROV_CHOICE"
        fi

        # Seleccionar modelo del provider elegido
        SELECTED_MODELS=$(echo "$OPTIONS" | jq -r ".[$((PROV_CHOICE-1))].models // []")
        MODEL_COUNT=$(echo "$SELECTED_MODELS" | jq '. | length')

        if [ "$MODEL_COUNT" -gt 1 ]; then
            echo ""
            echo -e "  ${BOLD}Modelos de $SELECTED_PROVIDER:${NC}"
            for j in $(seq 0 $((MODEL_COUNT - 1))); do
                M_NAME=$(echo "$SELECTED_MODELS" | jq -r ".[$j]")
                DEFAULT_MARK=""
                [ "$M_NAME" = "$DEFAULT_MODEL" ] && DEFAULT_MARK=" ${GREEN}(por defecto)${NC}"
                echo -e "     $((j+1)). $M_NAME$DEFAULT_MARK"
            done
            read -p "  Elige modelo (1-$MODEL_COUNT) [$DEFAULT_MODEL]: " MOD_CHOICE
            if [ -z "$MOD_CHOICE" ]; then
                SELECTED_MODEL="$DEFAULT_MODEL"
            elif [[ "$MOD_CHOICE" =~ ^[0-9]+$ ]] && [ "$MOD_CHOICE" -ge 1 ] && [ "$MOD_CHOICE" -le "$MODEL_COUNT" ]; then
                SELECTED_MODEL=$(echo "$SELECTED_MODELS" | jq -r ".[$((MOD_CHOICE-1))]")
            else
                SELECTED_MODEL="$MOD_CHOICE"
            fi
        else
            SELECTED_MODEL=$(echo "$SELECTED_MODELS" | jq -r ".[0] // \"$DEFAULT_MODEL\"")
        fi

        log_ok "Provider: ${BOLD}$SELECTED_PROVIDER${NC} | Modelo: ${BOLD}$SELECTED_MODEL${NC}"
    fi
fi
```

#### Paso 2: Añadir selección de Skills

```bash
# ──────────────────────────────────────────────
#  Paso 2c: Seleccionar Skills
# ──────────────────────────────────────────────
log_step "Paso 2c: Skills (opcional)"

SKILLS_RESP=$(hc "$EXPLORE_URL/api/v1/skills")
SKILLS_BODY=$(echo "$SKILLS_RESP" | sed '$d')
SKILLS_CODE=$(echo "$SKILLS_RESP" | tail -1)

SELECTED_SKILLS="[]"

if [ "$SKILLS_CODE" = "200" ]; then
    SKILLS=$(echo "$SKILLS_BODY" | jq -c '.skills // . // []')
    SKILL_COUNT=$(echo "$SKILLS" | jq '. | length')

    if [ "$SKILL_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Skills disponibles:${NC} (separados por comas, o vacío para ninguno)"
        echo ""

        for i in $(seq 0 $((SKILL_COUNT - 1))); do
            S_NAME=$(echo "$SKILLS" | jq -r ".[$i].name // .[$i]")
            S_DESC=$(echo "$SKILLS" | jq -r ".[$i].description // \"\"")
            echo -e "  ${BOLD}$((i+1)).${NC} $S_NAME"
            [ -n "$S_DESC" ] && echo -e "     ${S_DESC:0:80}"
        done

        echo ""
        read -p "  Números de skills (ej: 1,3,5) o vacío: " SKILLS_INPUT

        if [ -n "$SKILLS_INPUT" ]; then
            SELECTED_SKILLS="["
            FIRST=true
            for num in $(echo "$SKILLS_INPUT" | tr ',' ' '); do
                if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le "$SKILL_COUNT" ]; then
                    S_NAME=$(echo "$SKILLS" | jq -r ".[$((num-1))].name // .[$((num-1))]")
                    $FIRST || SELECTED_SKILLS+=","
                    FIRST=false
                    SELECTED_SKILLS+="\"$S_NAME\""
                fi
            done
            SELECTED_SKILLS+="]"
            log_ok "Skills seleccionados: $(echo "$SELECTED_SKILLS" | jq -r 'join(", ")')"
        fi
    fi
fi
```

#### Paso 3: Añadir selección de Toolsets

```bash
# ──────────────────────────────────────────────
#  Paso 2d: Seleccionar Toolsets
# ──────────────────────────────────────────────
log_step "Paso 2d: Toolsets (opcional)"

TOOLSETS_RESP=$(hc "$EXPLORE_URL/api/v1/toolsets")
TOOLSETS_BODY=$(echo "$TOOLSETS_RESP" | sed '$d')
TOOLSETS_CODE=$(echo "$TOOLSETS_RESP" | tail -1)

SELECTED_TOOLSETS="[]"

if [ "$TOOLSETS_CODE" = "200" ]; then
    TOOLSETS=$(echo "$TOOLSETS_BODY" | jq -c '.toolsets // . // []')
    TS_COUNT=$(echo "$TOOLSETS" | jq '. | length')

    if [ "$TS_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Toolsets disponibles:${NC} (separados por comas, o vacío para ninguno)"
        echo ""

        for i in $(seq 0 $((TS_COUNT - 1))); do
            T_ID=$(echo "$TOOLSETS" | jq -r ".[$i].id // .[$i].name // .[$i]")
            T_DESC=$(echo "$TOOLSETS" | jq -r ".[$i].description // \"\"")
            echo -e "  ${BOLD}$((i+1)).${NC} $T_ID"
            [ -n "$T_DESC" ] && echo -e "     ${T_DESC:0:80}"
        done

        echo ""
        read -p "  Números de toolsets (ej: 1,2) o vacío: " TS_INPUT

        if [ -n "$TS_INPUT" ]; then
            SELECTED_TOOLSETS="["
            FIRST=true
            for num in $(echo "$TS_INPUT" | tr ',' ' '); do
                if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le "$TS_COUNT" ]; then
                    T_ID=$(echo "$TOOLSETS" | jq -r ".[$((num-1))].id // .[$((num-1))].name // .[$((num-1))]")
                    $FIRST || SELECTED_TOOLSETS+=","
                    FIRST=false
                    SELECTED_TOOLSETS+="\"$T_ID\""
                fi
            done
            SELECTED_TOOLSETS+="]"
            log_ok "Toolsets seleccionados: $(echo "$SELECTED_TOOLSETS" | jq -r 'join(", ")')"
        fi
    fi
fi
```

#### Paso 4: Añadir configuración de Schedule

```bash
# ──────────────────────────────────────────────
#  Paso 2e: Configurar Schedule
# ──────────────────────────────────────────────
log_step "Paso 2e: Schedule"

echo ""
echo -e "  ${BOLD}Presets:${NC}"
echo "  1. Cada 30 minutos (*/30 * * * *)"
echo "  2. Cada hora (0 * * * *)"
echo "  3. Cada 6 horas (0 */6 * * *)"
echo "  4. Cada 12 horas (0 */12 * * *)"
echo "  5. Diario a las 9 AM (0 9 * * *)  ${GREEN}(por defecto)${NC}"
echo "  6. Semanal - Lunes 9 AM (0 9 * * 1)"
echo "  7. Mensual - día 1, 9 AM (0 9 1 * *)"
echo "  8. Personalizado (cron expression)"
echo ""

SCHEDULE_PRESETS=(
    "*/30 * * * *"
    "0 * * * *"
    "0 */6 * * *"
    "0 */12 * * *"
    "0 9 * * *"
    "0 9 * * 1"
    "0 9 1 * *"
)

read -p "  Elige (1-8) [5]: " SCHED_CHOICE
SCHED_CHOICE="${SCHED_CHOICE:-5}"

if [[ "$SCHED_CHOICE" =~ ^[0-9]+$ ]] && [ "$SCHED_CHOICE" -ge 1 ] && [ "$SCHED_CHOICE" -le 7 ]; then
    SELECTED_SCHEDULE="${SCHEDULE_PRESETS[$((SCHED_CHOICE-1))]}"
elif [ "$SCHED_CHOICE" = "8" ]; then
    read -p "  Cron expression: " SELECTED_SCHEDULE
    if [ -z "$SELECTED_SCHEDULE" ]; then
        SELECTED_SCHEDULE="0 9 * * *"
    fi
else
    SELECTED_SCHEDULE="0 9 * * *"
fi

log_ok "Schedule: ${BOLD}$SELECTED_SCHEDULE${NC}"
```

#### Paso 5: Añadir configuración de Delivery

```bash
# ──────────────────────────────────────────────
#  Paso 2f: Configurar Delivery
# ──────────────────────────────────────────────
log_step "Paso 2f: Delivery"

CHANNELS_RESP=$(hc "$EXPLORE_URL/api/system/channels")
CHANNELS_BODY=$(echo "$CHANNELS_RESP" | sed '$d')
CHANNELS_CODE=$(echo "$CHANNELS_RESP" | tail -1)

SELECTED_DELIVERY="local"
CHAT_ID=""
THREAD_ID=""

if [ "$CHANNELS_CODE" = "200" ]; then
    CHANNELS=$(echo "$CHANNELS_BODY" | jq -c '.')
    CH_COUNT=$(echo "$CHANNELS" | jq '. | length')

    if [ "$CH_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Canales de delivery:${NC}"
        echo ""

        for i in $(seq 0 $((CH_COUNT - 1))); do
            C_ID=$(echo "$CHANNELS" | jq -r ".[$i].id")
            C_NAME=$(echo "$CHANNELS" | jq -r ".[$i].name")
            C_DESC=$(echo "$CHANNELS" | jq -r ".[$i].description")
            DEFAULT_MARK=""
            [ "$C_ID" = "local" ] && DEFAULT_MARK=" ${GREEN}(por defecto)${NC}"
            echo -e "  ${BOLD}$((i+1)).${NC} $C_NAME$DEFAULT_MARK"
            echo -e "     $C_DESC"
            echo ""
        done

        read -p "  Elige canal (1-$CH_COUNT) [1]: " DEL_CHOICE
        DEL_CHOICE="${DEL_CHOICE:-1}"

        if [[ "$DEL_CHOICE" =~ ^[0-9]+$ ]] && [ "$DEL_CHOICE" -ge 1 ] && [ "$DEL_CHOICE" -le "$CH_COUNT" ]; then
            SELECTED_DELIVERY=$(echo "$CHANNELS" | jq -r ".[$((DEL_CHOICE-1))].id")
            SUPPORTS_CHAT_ID=$(echo "$CHANNELS" | jq -r ".[$((DEL_CHOICE-1))].supports_chat_id // false")

            if [ "$SUPPORTS_CHAT_ID" = "true" ]; then
                echo ""
                read -p "  Chat ID (ej: -1001234567890): " CHAT_ID
                read -p "  Thread ID (opcional, Enter para omitir): " THREAD_ID
            fi
        fi
    fi
fi

log_ok "Delivery: ${BOLD}$SELECTED_DELIVERY${NC}"
[ -n "$CHAT_ID" ] && log_ok "Chat ID: ${BOLD}$CHAT_ID${NC}"
```

#### Paso 6: Actualizar payload de creación

```bash
# ──────────────────────────────────────────────
#  Paso 4: Crear (ACTUALIZADO)
# ──────────────────────────────────────────────
log_step "Paso 4: Creando agente..."

# Construir delivery format
DELIVERY_VALUE="$SELECTED_DELIVERY"
if [ "$SELECTED_DELIVERY" = "telegram" ] && [ -n "$CHAT_ID" ]; then
    DELIVERY_VALUE="telegram:$CHAT_ID"
    [ -n "$THREAD_ID" ] && DELIVERY_VALUE="$DELIVERY_VALUE:$THREAD_ID"
fi

CREATE_RESP=$(hc -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$AGENT_NAME\",
        \"template\": \"$SELECTED_ID\",
        \"config\": $CONFIG_JSON,
        \"prompt\": $(echo "$PROMPT" | jq -Rs .),
        \"provider\": \"$SELECTED_PROVIDER\",
        \"model\": \"$SELECTED_MODEL\",
        \"skills\": $SELECTED_SKILLS,
        \"toolsets\": $SELECTED_TOOLSETS,
        \"schedule\": \"$SELECTED_SCHEDULE\",
        \"deliver\": \"$DELIVERY_VALUE\"
    }" \
    "$EXPLORE_URL/api/jobs")
```

### Verificación del CLI wizard
```bash
# Ejecutar el wizard completo
bash scripts/wizard.sh

# Verificar que:
# 1. Lista providers y permite elegir
# 2. Lista skills y permite multi-select
# 3. Lista toolsets y permite multi-select
# 4. Muestra presets de schedule + opción custom
# 5. Muestra canales (incluyendo Telegram si está habilitado)
# 6. El payload de creación incluye todos los campos
```

---

## Orden de ejecución recomendado

| Paso | Tarea | Dependencias | Estimación |
|------|-------|--------------|------------|
| 1 | Fix `props is not defined` (línea 757) | Ninguna | 5 min |
| 2 | Fix `#f5f5f5` → CSS variables (líneas 52, 656) | Ninguna | 10 min |
| 3 | Fix navegación: quitar tab "Create" | Ninguna | 15 min |
| 4 | Fix Telegram channels (config.yaml) | Ninguna | 5 min |
| 5 | Investigar fix 401 Unauthorized | Requiere acceso al browser | 20 min |
| 6 | CLI wizard: Provider/Model | Backend ya listo | 30 min |
| 7 | CLI wizard: Skills + Toolsets | Backend ya listo | 30 min |
| 8 | CLI wizard: Schedule + Delivery | Backend ya listo | 30 min |
| 9 | Tests end-to-end | Todo lo anterior | 20 min |

**Total estimado: ~2.5 horas**

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `plugin/agenthub/dashboard/dist/index.js` | Fix props (L757), fix colors (L52, L656), fix navigation (L802-804, L786-795) |
| `~/.hermes/config.yaml` | Añadir `enabled: true` en `gateway.platforms.telegram` |
| `explore-api/routers/system.py` | (Opcional) Mejorar detección de canales |
| `scripts/wizard.sh` | Añadir pasos 2b-2f (provider, skills, toolsets, schedule, delivery) |

---

## Notas técnicas

### Plugin SDK Auth (para investigar el 401)
El plugin usa `window.__HERMES_PLUGIN_SDK__.fetchJSON` que debería manejar auth automáticamente. Si no lo hace, revisar:
- `SDK.fetchJSON` implementation en el bundle del plugin SDK
- Si el SDK espera un token en `localStorage` o cookie
- Si las rutas `/api/plugins/*` requieren un header especial

### Backend channels detection
El plugin API (`plugin_api.py` L324-340) tiene una detección más robusta que el Exploration API — detecta cualquier plataforma con configuración, no solo las que tienen `enabled: true`. Considerar unificar la lógica.
