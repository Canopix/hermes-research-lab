#!/usr/bin/env bash
set -euo pipefail

EXPLORE_URL="http://localhost:8643"
API_KEY="agenthub-local"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_info(){ echo -e "${CYAN}[INFO]${NC} $1"; }
log_step(){ echo -e "\n${BOLD}${YELLOW}>>> $1${NC}"; }
log_err() { echo -e "${RED}[ERR]${NC} $1" >&2; }

# Helper: curl con API key
hc() {
    curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        "$@" 2>/dev/null
}

# Helper: leer JSON field
jq_field() {
    echo "$1" | jq -r "$2" 2>/dev/null || echo ""
}

# Helper: leer JSON array como líneas
jq_lines() {
    echo "$1" | jq -r "$2" 2>/dev/null || echo ""
}

# ──────────────────────────────────────────────
#  Health check
# ──────────────────────────────────────────────
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   AgentHub — Wizard de Creación CLI  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

EXPLORE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$EXPLORE_URL/health" 2>/dev/null || echo "000")
if [ "$EXPLORE_HTTP" != "200" ]; then
    log_err "Exploration API ($EXPLORE_URL) no responde (HTTP $EXPLORE_HTTP)"
    log_info "Arranca los servicios con: agenthub start"
    exit 1
fi
log_ok "Exploration API conectada"

# ──────────────────────────────────────────────
#  Paso 1: Elegir template
# ──────────────────────────────────────────────
log_step "Paso 1: Selecciona un template"

TEMPLATES_RESP=$(hc "$EXPLORE_URL/api/templates")
TEMPLATES_CODE=$(echo "$TEMPLATES_RESP" | tail -1)
TEMPLATES_BODY=$(echo "$TEMPLATES_RESP" | sed '$d')

if [ "$TEMPLATES_CODE" != "200" ]; then
    log_err "Error al cargar templates (HTTP $TEMPLATES_CODE)"
    exit 1
fi

TEMPLATE_COUNT=$(echo "$TEMPLATES_BODY" | jq '. | length')
if [ "$TEMPLATE_COUNT" -eq 0 ]; then
    log_err "No hay templates disponibles"
    exit 1
fi

echo ""
echo -e "  ${BOLD}Templates disponibles:${NC}"
echo ""

declare -a TEMPLATE_IDS
for i in $(seq 0 $((TEMPLATE_COUNT - 1))); do
    ID=$(echo "$TEMPLATES_BODY" | jq -r ".[$i].id")
    NAME=$(echo "$TEMPLATES_BODY" | jq -r ".[$i].name")
    DESC=$(echo "$TEMPLATES_BODY" | jq -r ".[$i].description")
    ICON=$(echo "$TEMPLATES_BODY" | jq -r ".[$i].icon // \"\"")

    TEMPLATE_IDS[$i]="$ID"
    echo -e "  ${BOLD}$((i+1)).${NC} ${ICON} ${BOLD}$NAME${NC}"
    echo -e "     $DESC"
    echo ""
done

echo ""
read -p "  Elige un template (1-$TEMPLATE_COUNT): " TEMPLATE_CHOICE

if ! [[ "$TEMPLATE_CHOICE" =~ ^[0-9]+$ ]] || [ "$TEMPLATE_CHOICE" -lt 1 ] || [ "$TEMPLATE_CHOICE" -gt "$TEMPLATE_COUNT" ]; then
    log_err "Opción inválida"
    exit 1
fi

SELECTED_ID="${TEMPLATE_IDS[$((TEMPLATE_CHOICE-1))]}"
SELECTED_TEMPLATE=$(echo "$TEMPLATES_BODY" | jq ".[$((TEMPLATE_CHOICE-1))]")
SELECTED_NAME=$(echo "$SELECTED_TEMPLATE" | jq -r '.name')

log_ok "Template seleccionado: ${BOLD}$SELECTED_NAME${NC}"

# ──────────────────────────────────────────────
#  Paso 2: Configurar
# ──────────────────────────────────────────────
log_step "Paso 2: Configura tu agente"

echo ""
read -p "  Nombre del agente [$SELECTED_NAME]: " AGENT_NAME
AGENT_NAME="${AGENT_NAME:-$SELECTED_NAME}"

# Parámetros dinámicos del template
declare -A CONFIG
PARAMS=$(echo "$SELECTED_TEMPLATE" | jq -c '.params[]' 2>/dev/null || echo "")

if [ -n "$PARAMS" ]; then
    echo ""
    echo -e "  ${BOLD}Parámetros del template:${NC}"
    echo ""

    while IFS= read -r param; do
        [ -z "$param" ] && continue
        P_NAME=$(echo "$param" | jq -r '.name')
        P_LABEL=$(echo "$param" | jq -r '.label')
        P_TYPE=$(echo "$param" | jq -r '.type')
        P_REQUIRED=$(echo "$param" | jq -r '.required // false')
        P_DEFAULT=$(echo "$param" | jq -r '.default // ""')
        P_OPTIONS=$(echo "$param" | jq -c '.options // []' 2>/dev/null)

        REQUIRED_MARK=""
        [ "$P_REQUIRED" = "true" ] && REQUIRED_MARK="${RED}*${NC}"

        if [ "$P_TYPE" = "select" ]; then
            OPTIONS_COUNT=$(echo "$P_OPTIONS" | jq '. | length')
            echo -e "  ${BOLD}$P_LABEL${NC} $REQUIRED_MARK"
            for j in $(seq 0 $((OPTIONS_COUNT - 1))); do
                OPT=$(echo "$P_OPTIONS" | jq -r ".[$j]")
                DEFAULT_MARK=""
                [ "$OPT" = "$P_DEFAULT" ] && DEFAULT_MARK=" ${GREEN}(por defecto)${NC}"
                echo -e "     $((j+1)). $OPT$DEFAULT_MARK"
            done
            read -p "  Elige (1-$OPTIONS_COUNT) [$P_DEFAULT]: " OPT_CHOICE
            if [ -z "$OPT_CHOICE" ]; then
                CONFIG[$P_NAME]="$P_DEFAULT"
            elif [[ "$OPT_CHOICE" =~ ^[0-9]+$ ]] && [ "$OPT_CHOICE" -ge 1 ] && [ "$OPT_CHOICE" -le "$OPTIONS_COUNT" ]; then
                CONFIG[$P_NAME]=$(echo "$P_OPTIONS" | jq -r ".[$((OPT_CHOICE-1))]")
            else
                CONFIG[$P_NAME]="$OPT_CHOICE"
            fi
        elif [ "$P_TYPE" = "toggle" ]; then
            DEFAULT_BOOL="no"
            [ "$P_DEFAULT" = "true" ] && DEFAULT_BOOL="sí"
            read -p "  $P_LABEL? (sí/no) [$DEFAULT_BOOL]: " TOGGLE
            TOGGLE="${TOGGLE:-$DEFAULT_BOOL}"
            if [[ "$TOGGLE" =~ ^(s|sí|si|yes|y)$ ]]; then
                CONFIG[$P_NAME]=true
            else
                CONFIG[$P_NAME]=false
            fi
        elif [ "$P_TYPE" = "secret" ]; then
            # Leer sin mostrar en pantalla
            echo -e "  ${BOLD}$P_LABEL${NC} $REQUIRED_MARK"
            echo -e "     ${YELLOW}(no se mostrará mientras escribes)${NC}"
            if [ -n "$P_DEFAULT" ]; then
                read -s -p "  Valor [$P_DEFAULT]: " VAL
                echo ""
                CONFIG[$P_NAME]="${VAL:-$P_DEFAULT}"
            else
                read -s -p "  Valor: " VAL
                echo ""
                if [ "$P_REQUIRED" = "true" ] && [ -z "$VAL" ]; then
                    log_err "$P_LABEL es obligatorio"
                    exit 1
                fi
                CONFIG[$P_NAME]="$VAL"
            fi
        else
            if [ -n "$P_DEFAULT" ]; then
                read -p "  $P_LABEL [$P_DEFAULT]: " VAL
                CONFIG[$P_NAME]="${VAL:-$P_DEFAULT}"
            else
                read -p "  $P_LABEL $REQUIRED_MARK: " VAL
                if [ "$P_REQUIRED" = "true" ] && [ -z "$VAL" ]; then
                    log_err "$P_LABEL es obligatorio"
                    exit 1
                fi
                CONFIG[$P_NAME]="$VAL"
            fi
        fi
        echo ""
    done <<< "$PARAMS"
fi

# ──────────────────────────────────────────────
#  Advanced config defaults
# ──────────────────────────────────────────────
SELECTED_PROVIDER=""
SELECTED_MODEL=""
SELECTED_SKILLS="[]"
SELECTED_TOOLSETS="[]"
SELECTED_SCHEDULE="0 */6 * * *"
SELECTED_DELIVERY="local"
CHAT_ID=""
THREAD_ID=""

# ──────────────────────────────────────────────
#  Paso 2b: Provider / Modelo
# ──────────────────────────────────────────────
log_step "Paso 2b: Selecciona Provider / Modelo"

PROV_RESP=$(hc "$EXPLORE_URL/api/system/providers" || echo -e "\n000")
PROV_CODE=$(echo "$PROV_RESP" | tail -1)
PROV_BODY=$(echo "$PROV_RESP" | sed '$d')

if [ "$PROV_CODE" = "200" ]; then
    PROV_OPTIONS=$(echo "$PROV_BODY" | jq -c '.options // []')
    PROV_DEFAULT=$(echo "$PROV_BODY" | jq -r '.default_provider // ""')
    PROV_DEFAULT_MODEL=$(echo "$PROV_BODY" | jq -r '.default_model // ""')

    PROV_COUNT=$(echo "$PROV_OPTIONS" | jq '. | length')

    if [ "$PROV_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Providers disponibles:${NC}"
        echo ""

        declare -a PROV_IDS
        declare -a PROV_MODELS
        for i in $(seq 0 $((PROV_COUNT - 1))); do
            PID=$(echo "$PROV_OPTIONS" | jq -r ".[$i].id")
            PNAME=$(echo "$PROV_OPTIONS" | jq -r ".[$i].name")
            PMODEL=$(echo "$PROV_OPTIONS" | jq -r ".[$i].model")
            PISDEFAULT=$(echo "$PROV_OPTIONS" | jq -r ".[$i].is_default")

            PROV_IDS[$i]="$PID"
            PROV_MODELS[$i]="$PMODEL"

            DEFAULT_MARK=""
            [ "$PISDEFAULT" = "true" ] && DEFAULT_MARK=" ${GREEN}(por defecto)${NC}"
            echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$PNAME${NC} → $PMODEL$DEFAULT_MARK"
        done
        echo ""
        read -p "  Elige provider (1-$PROV_COUNT) [1]: " PROV_CHOICE
        PROV_CHOICE="${PROV_CHOICE:-1}"

        if ! [[ "$PROV_CHOICE" =~ ^[0-9]+$ ]] || [ "$PROV_CHOICE" -lt 1 ] || [ "$PROV_CHOICE" -gt "$PROV_COUNT" ]; then
            # Fall back to the default provider
            PROV_CHOICE=1
            for i in $(seq 0 $((PROV_COUNT - 1))); do
                [ "$(echo "$PROV_OPTIONS" | jq -r ".[$i].id")" = "$PROV_DEFAULT" ] && PROV_CHOICE=$((i+1))
            done
        fi

        SELECTED_PROVIDER="${PROV_IDS[$((PROV_CHOICE-1))]}"
        SELECTED_MODEL="${PROV_MODELS[$((PROV_CHOICE-1))]}"
        log_ok "Provider: ${BOLD}$SELECTED_PROVIDER${NC} → $SELECTED_MODEL"
    else
        log_info "No hay providers configurados, se usará el default"
    fi
else
    log_info "No se pudieron cargar providers, se usará el configurado por defecto"
fi

echo ""

# ──────────────────────────────────────────────
#  Paso 2c: Skills
# ──────────────────────────────────────────────
log_step "Paso 2c: Selecciona Skills"

SKILLS_RESP=$(hc "$EXPLORE_URL/api/v1/skills" || echo -e "\n000")
SKILLS_CODE=$(echo "$SKILLS_RESP" | tail -1)
SKILLS_BODY=$(echo "$SKILLS_RESP" | sed '$d')

if [ "$SKILLS_CODE" = "200" ]; then
    # Handle both {skills: [...]} and direct array
    SKILLS_RAW=$(echo "$SKILLS_BODY" | jq -c '.skills // .')
    if [ "$(echo "$SKILLS_RAW" | jq -r 'type')" != "array" ]; then
        SKILLS_RAW="[]"
    fi
    SKILLS_COUNT=$(echo "$SKILLS_RAW" | jq '. | length')

    if [ "$SKILLS_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Skills disponibles:${NC}"
        echo ""

        declare -a SKILL_NAMES
        for i in $(seq 0 $((SKILLS_COUNT - 1))); do
            SNAME=$(echo "$SKILLS_RAW" | jq -r ".[$i].name")
            SDESC=$(echo "$SKILLS_RAW" | jq -r ".[$i].description // \"\"")
            SKILL_NAMES[$i]="$SNAME"
            echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$SNAME${NC}"
            [ -n "$SDESC" ] && echo -e "     $SDESC"
        done
        echo ""
        echo -e "  ${YELLOW}Selecciona por números separados por coma (ej: 1,3,5) o Enter para omitir${NC}"
        read -p "  Skills: " SKILLS_INPUT

        if [ -n "$SKILLS_INPUT" ]; then
            SELECTED_SKILLS="["
            SK_FIRST=true
            IFS=',' read -ra SK_PARTS <<< "$SKILLS_INPUT"
            for part in "${SK_PARTS[@]}"; do
                part=$(echo "$part" | tr -d ' ')
                if [[ "$part" =~ ^[0-9]+$ ]] && [ "$part" -ge 1 ] && [ "$part" -le "$SKILLS_COUNT" ]; then
                    $SK_FIRST || SELECTED_SKILLS+=", "
                    SK_FIRST=false
                    SELECTED_SKILLS+="\"${SKILL_NAMES[$((part-1))]}\""
                fi
            done
            SELECTED_SKILLS+="]"
            SKILL_SEL_COUNT=$(echo "$SELECTED_SKILLS" | jq 'length')
            log_ok "Skills seleccionados: ${BOLD}$SKILL_SEL_COUNT${NC}"
        else
            SELECTED_SKILLS="[]"
            log_info "Sin skills seleccionados"
        fi
    else
        log_info "No hay skills disponibles"
    fi
else
    log_info "No se pudieron cargar skills"
fi

echo ""

# ──────────────────────────────────────────────
#  Paso 2d: Toolsets
# ──────────────────────────────────────────────
log_step "Paso 2d: Selecciona Toolsets"

TOOLSETS_RESP=$(hc "$EXPLORE_URL/api/v1/toolsets" || echo -e "\n000")
TOOLSETS_CODE=$(echo "$TOOLSETS_RESP" | tail -1)
TOOLSETS_BODY=$(echo "$TOOLSETS_RESP" | sed '$d')

if [ "$TOOLSETS_CODE" = "200" ]; then
    # Handle both {toolsets: [...]} and direct array
    TOOLSETS_RAW=$(echo "$TOOLSETS_BODY" | jq -c '.toolsets // .')
    if [ "$(echo "$TOOLSETS_RAW" | jq -r 'type')" != "array" ]; then
        TOOLSETS_RAW="[]"
    fi
    TOOLSETS_COUNT=$(echo "$TOOLSETS_RAW" | jq '. | length')

    if [ "$TOOLSETS_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Toolsets disponibles:${NC}"
        echo ""

        declare -a TOOLSET_IDS
        for i in $(seq 0 $((TOOLSETS_COUNT - 1))); do
            TID=$(echo "$TOOLSETS_RAW" | jq -r ".[$i].id // .[$i].name")
            TNAME=$(echo "$TOOLSETS_RAW" | jq -r ".[$i].name // .[$i].id")
            TDESC=$(echo "$TOOLSETS_RAW" | jq -r ".[$i].description // \"\"")
            TOOLSET_IDS[$i]="$TID"
            echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$TNAME${NC}"
            [ -n "$TDESC" ] && echo -e "     $TDESC"
        done
        echo ""
        echo -e "  ${YELLOW}Selecciona por números separados por coma o Enter para omitir${NC}"
        read -p "  Toolsets: " TOOLSETS_INPUT

        if [ -n "$TOOLSETS_INPUT" ]; then
            SELECTED_TOOLSETS="["
            TS_FIRST=true
            IFS=',' read -ra TS_PARTS <<< "$TOOLSETS_INPUT"
            for part in "${TS_PARTS[@]}"; do
                part=$(echo "$part" | tr -d ' ')
                if [[ "$part" =~ ^[0-9]+$ ]] && [ "$part" -ge 1 ] && [ "$part" -le "$TOOLSETS_COUNT" ]; then
                    $TS_FIRST || SELECTED_TOOLSETS+=", "
                    TS_FIRST=false
                    SELECTED_TOOLSETS+="\"${TOOLSET_IDS[$((part-1))]}\""
                fi
            done
            SELECTED_TOOLSETS+="]"
            TS_SEL_COUNT=$(echo "$SELECTED_TOOLSETS" | jq 'length')
            log_ok "Toolsets seleccionados: ${BOLD}$TS_SEL_COUNT${NC}"
        else
            SELECTED_TOOLSETS="[]"
            log_info "Sin toolsets seleccionados"
        fi
    else
        log_info "No hay toolsets disponibles"
    fi
else
    log_info "No se pudieron cargar toolsets"
fi

echo ""

# ──────────────────────────────────────────────
#  Paso 2e: Schedule
# ──────────────────────────────────────────────
log_step "Paso 2e: Configura el Schedule"

echo ""
echo -e "  ${BOLD}Presets de schedule:${NC}"
echo ""
echo -e "  ${BOLD}1.${NC}  Cada 30 minutos"
echo -e "  ${BOLD}2.${NC}  Cada hora"
echo -e "  ${BOLD}3.${NC}  Cada 6 horas"
echo -e "  ${BOLD}4.${NC}  Cada 12 horas"
echo -e "  ${BOLD}5.${NC}  Diario a las 9:00 AM ${GREEN}(por defecto)${NC}"
echo -e "  ${BOLD}6.${NC}  Semanal (Lunes 9:00 AM)"
echo -e "  ${BOLD}7.${NC}  Mensual (1° de cada mes, 9:00 AM)"
echo -e "  ${BOLD}8.${NC}  Expresión cron personalizada"
echo ""

SCHEDULE_PRESETS=(
    "*/30 * * * *"
    "0 * * * *"
    "0 */6 * * *"
    "0 */12 * * *"
    "0 9 * * *"
    "0 9 * * 1"
    "0 9 1 * *"
    "CUSTOM"
)

read -p "  Elige preset (1-8) [5]: " SCHED_CHOICE
SCHED_CHOICE="${SCHED_CHOICE:-5}"

if ! [[ "$SCHED_CHOICE" =~ ^[0-9]+$ ]] || [ "$SCHED_CHOICE" -lt 1 ] || [ "$SCHED_CHOICE" -gt 8 ]; then
    SCHED_CHOICE=5
fi

if [ "$SCHED_CHOICE" = "8" ]; then
    echo -e "  ${YELLOW}Ingresa la expresión cron (ej: 0 9 * * 1-5)${NC}"
    read -p "  Cron: " CUSTOM_CRON
    SELECTED_SCHEDULE="${CUSTOM_CRON:-0 9 * * *}"
else
    SELECTED_SCHEDULE="${SCHEDULE_PRESETS[$((SCHED_CHOICE-1))]}"
fi

log_ok "Schedule: ${BOLD}$SELECTED_SCHEDULE${NC}"

echo ""

# ──────────────────────────────────────────────
#  Paso 2f: Delivery
# ──────────────────────────────────────────────
log_step "Paso 2f: Configura la Entrega"

DELIVERY_RESP=$(hc "$EXPLORE_URL/api/system/channels" || echo -e "\n000")
DELIVERY_CODE=$(echo "$DELIVERY_RESP" | tail -1)
DELIVERY_BODY=$(echo "$DELIVERY_RESP" | sed '$d')

if [ "$DELIVERY_CODE" = "200" ]; then
    DELIVERY_RAW=$(echo "$DELIVERY_BODY" | jq -c '.')
    if [ "$(echo "$DELIVERY_RAW" | jq -r 'type')" != "array" ]; then
        DELIVERY_RAW="[]"
    fi
    DELIVERY_COUNT=$(echo "$DELIVERY_RAW" | jq '. | length')

    if [ "$DELIVERY_COUNT" -gt 0 ]; then
        echo ""
        echo -e "  ${BOLD}Canales de entrega:${NC}"
        echo ""

        declare -a DELIVERY_IDS
        for i in $(seq 0 $((DELIVERY_COUNT - 1))); do
            DID=$(echo "$DELIVERY_RAW" | jq -r ".[$i].id")
            DNAME=$(echo "$DELIVERY_RAW" | jq -r ".[$i].name")
            DICON=$(echo "$DELIVERY_RAW" | jq -r ".[$i].icon // \"\"")
            DDESC=$(echo "$DELIVERY_RAW" | jq -r ".[$i].description // \"\"")
            DELIVERY_IDS[$i]="$DID"
            echo -e "  ${BOLD}$((i+1)).${NC} ${DICON} ${BOLD}$DNAME${NC}"
            [ -n "$DDESC" ] && echo -e "     $DDESC"
        done
        echo ""
        read -p "  Elige canal (1-$DELIVERY_COUNT) [1]: " DEL_CHOICE
        DEL_CHOICE="${DEL_CHOICE:-1}"

        if ! [[ "$DEL_CHOICE" =~ ^[0-9]+$ ]] || [ "$DEL_CHOICE" -lt 1 ] || [ "$DEL_CHOICE" -gt "$DELIVERY_COUNT" ]; then
            DEL_CHOICE=1
        fi

        SELECTED_DELIVERY="${DELIVERY_IDS[$((DEL_CHOICE-1))]}"

        # Check if channel supports chat_id / thread_id
        SUPPORTS_CHAT=$(echo "$DELIVERY_RAW" | jq -r ".[$((DEL_CHOICE-1))].supports_chat_id // false")
        SUPPORTS_THREAD=$(echo "$DELIVERY_RAW" | jq -r ".[$((DEL_CHOICE-1))].supports_thread_id // false")

        if [ "$SUPPORTS_CHAT" = "true" ]; then
            echo ""
            echo -e "  ${BOLD}Configuración de Chat para $SELECTED_DELIVERY:${NC}"
            read -p "  Chat ID: " CHAT_ID
            if [ "$SUPPORTS_THREAD" = "true" ]; then
                read -p "  Thread ID (opcional, Enter para omitir): " THREAD_ID
            fi
        fi

        log_ok "Entrega: ${BOLD}$SELECTED_DELIVERY${NC}"
    else
        log_info "No hay canales disponibles, se usará local"
    fi
else
    log_info "No se pudieron cargar canales, se usará local por defecto"
fi

# ──────────────────────────────────────────────
#  Paso 3: Preview
# ──────────────────────────────────────────────
log_step "Paso 3: Preview del prompt"

# Construir JSON de config using jq to prevent injection
CONFIG_JSON="{}"
for key in "${!CONFIG[@]}"; do
    CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$key" --arg v "${CONFIG[$key]}" '.[$k] = $v')
done

PREVIEW_RESP=$(hc -X POST \
    -H "Content-Type: application/json" \
    -d "{\"config\": $CONFIG_JSON}" \
    "$EXPLORE_URL/api/templates/$SELECTED_ID/preview")
PREVIEW_CODE=$(echo "$PREVIEW_RESP" | tail -1)
PREVIEW_BODY=$(echo "$PREVIEW_RESP" | sed '$d')

if [ "$PREVIEW_CODE" != "200" ]; then
    log_err "Error al generar preview (HTTP $PREVIEW_CODE)"
    echo "$PREVIEW_BODY" | jq . 2>/dev/null || echo "$PREVIEW_BODY"
    exit 1
fi

PROMPT=$(echo "$PREVIEW_BODY" | jq -r '.prompt // . // "No se pudo generar el preview"')
echo ""
echo -e "  ${BOLD}Prompt generado:${NC}"
echo -e "  ${YELLOW}────────────────────────────────────────${NC}"
echo "$PROMPT" | sed 's/^/  /'
echo -e "  ${YELLOW}────────────────────────────────────────${NC}"

echo ""
read -p "  ¿Confirmas y creas el agente? (s/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^(s|sí|si|yes|y)$ ]]; then
    log_info "Cancelado por el usuario"
    exit 0
fi

# ──────────────────────────────────────────────
#  Paso 4: Crear
# ──────────────────────────────────────────────
# Build deliver value (object for telegram with chat_id, string otherwise)
if [ "$SELECTED_DELIVERY" = "telegram" ] && [ -n "$CHAT_ID" ]; then
    DELIVER_JSON=$(jq -n \
      --arg channel "telegram" \
      --arg chat_id "$CHAT_ID" \
      --arg thread_id "$THREAD_ID" \
      '{channel: $channel, chat_id: $chat_id} + (if $thread_id != "" then {thread_id: $thread_id} else {} end)')
else
    DELIVER_JSON="$SELECTED_DELIVERY"
fi

# Build optional provider / model fields using jq
EXTRA_FIELDS="{}"
[ -n "$SELECTED_PROVIDER" ] && EXTRA_FIELDS=$(echo "$EXTRA_FIELDS" | jq --arg p "$SELECTED_PROVIDER" '{provider: $p}')
[ -n "$SELECTED_MODEL" ] && EXTRA_FIELDS=$(echo "$EXTRA_FIELDS" | jq --arg m "$SELECTED_MODEL" '. + {model: $m}')

log_step "Paso 4: Creando agente..."

# Build full payload with jq to prevent JSON injection
PAYLOAD=$(jq -n \
  --arg name "$AGENT_NAME" \
  --arg template "$SELECTED_ID" \
  --argjson config "$CONFIG_JSON" \
  --arg prompt "$PROMPT" \
  --arg schedule "$SELECTED_SCHEDULE" \
  --argjson deliver "$(echo "$DELIVER_JSON" | jq -c . 2>/dev/null || echo "\"$DELIVER_JSON\"")" \
  --argjson skills "$SELECTED_SKILLS" \
  --argjson toolsets "$SELECTED_TOOLSETS" \
  --argjson extra "$EXTRA_FIELDS" \
  '{name: $name, template: $template, config: $config, prompt: $prompt, schedule: $schedule, deliver: $deliver, skills: $skills, toolsets: $toolsets} + $extra')

CREATE_RESP=$(hc -X POST \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    "$EXPLORE_URL/api/jobs")
CREATE_CODE=$(echo "$CREATE_RESP" | tail -1)
CREATE_BODY=$(echo "$CREATE_RESP" | sed '$d')

if [ "$CREATE_CODE" = "200" ] || [ "$CREATE_CODE" = "201" ]; then
    JOB_ID=$(echo "$CREATE_BODY" | jq -r '.id // "desconocido"')
    echo ""
    echo -e "  ${GREEN}✓${NC} ${BOLD}Agente creado con éxito${NC}"
    echo -e "    ID:     ${CYAN}$JOB_ID${NC}"
    echo -e "    Nombre: ${BOLD}$AGENT_NAME${NC}"
    echo -e "    Template: $SELECTED_NAME"
    echo ""
    echo -e "  Puedes verlo en: ${CYAN}http://localhost:3000/agents${NC}"
else
    log_err "Error al crear el agente (HTTP $CREATE_CODE)"
    echo "$CREATE_BODY" | jq . 2>/dev/null || echo "$CREATE_BODY"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ¡Wizard completado!                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"