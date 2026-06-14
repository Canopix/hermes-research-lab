#!/usr/bin/env bash
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────
DASHBOARD_URL="http://localhost:9119"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[✓]${NC} $1"; }
log_info(){ echo -e "${CYAN}[i]${NC} $1"; }
log_step(){ echo -e "\n${BOLD}${YELLOW}▸ $1${NC}"; }
log_err() { echo -e "${RED}[✗]${NC} $1" >&2; }

# ── Token ────────────────────────────────────────────────────────────
get_token() {
    curl -s "$DASHBOARD_URL/" 2>/dev/null | grep -oP '__HERMES_SESSION_TOKEN__="\K[^"]*'
}

TOKEN=$(get_token)
if [ -z "$TOKEN" ]; then
    log_err "No se pudo obtener el token del dashboard"
    log_info "¿Está el dashboard corriendo? Ejecuta: hermes dashboard"
    exit 1
fi

# Helper: API call
api() {
    local method="$1" path="$2" data="${3:-}"
    if [ "$method" = "GET" ]; then
        curl -s -H "Authorization: Bearer $TOKEN" "$DASHBOARD_URL$path" 2>/dev/null
    else
        curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" "$DASHBOARD_URL$path" 2>/dev/null
    fi
}

# ── Header ───────────────────────────────────────────────────────────
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🤖 AgentHub — Crear Agente CLI        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Health check ─────────────────────────────────────────────────────
HEALTH=$(api GET "/api/plugins/agenthub/health")
if ! echo "$HEALTH" | grep -q '"ok":true'; then
    log_err "El plugin AgentHub no responde"
    log_info "Verifica que el dashboard está corriendo: hermes dashboard"
    exit 1
fi
log_ok "Plugin AgentHub conectado"

# ── Paso 1: Seleccionar template ─────────────────────────────────────
log_step "Paso 1: Selecciona un template"

TEMPLATES=$(api GET "/api/plugins/agenthub/templates")
TEMPLATE_COUNT=$(echo "$TEMPLATES" | jq 'length')

if [ "$TEMPLATE_COUNT" -eq 0 ]; then
    log_err "No hay templates disponibles"
    exit 1
fi

echo ""
for i in $(seq 0 $((TEMPLATE_COUNT - 1))); do
    NAME=$(echo "$TEMPLATES" | jq -r ".[$i].name")
    DESC=$(echo "$TEMPLATES" | jq -r ".[$i].description")
    CAT=$(echo "$TEMPLATES" | jq -r ".[$i].categoryLabel // \"\"")
    echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$NAME${NC}"
    echo -e "     $DESC"
    [ -n "$CAT" ] && echo -e "     ${CYAN}$CAT${NC}"
    echo ""
done

echo ""
read -p "  Selecciona (1-$TEMPLATE_COUNT): " TPL_CHOICE

if ! [[ "$TPL_CHOICE" =~ ^[0-9]+$ ]] || [ "$TPL_CHOICE" -lt 1 ] || [ "$TPL_CHOICE" -gt "$TEMPLATE_COUNT" ]; then
    log_err "Opción inválida"
    exit 1
fi

SELECTED_TPL=$(echo "$TEMPLATES" | jq ".[$((TPL_CHOICE-1))]")
TPL_ID=$(echo "$SELECTED_TPL" | jq -r '.id')
TPL_NAME=$(echo "$SELECTED_TPL" | jq -r '.name')
log_ok "Template: ${BOLD}$TPL_NAME${NC}"

# ── Paso 2: Configurar ──────────────────────────────────────────────
log_step "Paso 2: Configura tu agente"

echo ""
read -p "  Nombre del agente [$TPL_NAME]: " AGENT_NAME
AGENT_NAME="${AGENT_NAME:-$TPL_NAME}"

# Build config JSON using jq (more reliable than bash associative arrays)
CONFIG_JSON="{}"

# Parámetros dinámicos
PARAMS_COUNT=$(echo "$SELECTED_TPL" | jq '.params | length')

if [ "$PARAMS_COUNT" -gt 0 ]; then
    echo ""
    echo -e "  ${BOLD}Parámetros del template:${NC}"
    echo ""

    for i in $(seq 0 $((PARAMS_COUNT - 1))); do
        P_NAME=$(echo "$SELECTED_TPL" | jq -r ".params[$i].name")
        P_LABEL=$(echo "$SELECTED_TPL" | jq -r ".params[$i].label // .params[$i].description")
        P_TYPE=$(echo "$SELECTED_TPL" | jq -r ".params[$i].type")
        P_REQUIRED=$(echo "$SELECTED_TPL" | jq -r ".params[$i].required // false")
        P_DEFAULT=$(echo "$SELECTED_TPL" | jq -r ".params[$i].default // \"\"")
        P_OPTIONS=$(echo "$SELECTED_TPL" | jq -c ".params[$i].options // []" 2>/dev/null)

        REQUIRED_MARK=""
        [ "$P_REQUIRED" = "true" ] && REQUIRED_MARK=" ${RED}*${NC}"

        if [ "$P_TYPE" = "select" ]; then
            OPTIONS_COUNT=$(echo "$P_OPTIONS" | jq '. | length')
            echo -e "  ${BOLD}$P_LABEL${NC}$REQUIRED_MARK"
            for j in $(seq 0 $((OPTIONS_COUNT - 1))); do
                OPT=$(echo "$P_OPTIONS" | jq -r ".[$j]")
                DEFAULT_MARK=""
                [ "$OPT" = "$P_DEFAULT" ] && DEFAULT_MARK=" ${GREEN}(default)${NC}"
                echo -e "     $((j+1)). $OPT$DEFAULT_MARK"
            done
            read -p "  Elige (1-$OPTIONS_COUNT) [$P_DEFAULT]: " OPT_CHOICE
            if [ -z "$OPT_CHOICE" ]; then
                CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "$P_DEFAULT" '.[$k] = $v')
            elif [[ "$OPT_CHOICE" =~ ^[0-9]+$ ]] && [ "$OPT_CHOICE" -ge 1 ] && [ "$OPT_CHOICE" -le "$OPTIONS_COUNT" ]; then
                VAL=$(echo "$P_OPTIONS" | jq -r ".[$((OPT_CHOICE-1))]")
                CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "$VAL" '.[$k] = $v')
            else
                CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "$OPT_CHOICE" '.[$k] = $v')
            fi
        elif [ "$P_TYPE" = "toggle" ]; then
            DEFAULT_BOOL="no"
            [ "$P_DEFAULT" = "true" ] && DEFAULT_BOOL="sí"
            read -p "  $P_LABEL? (sí/no) [$DEFAULT_BOOL]: " TOGGLE
            TOGGLE="${TOGGLE:-$DEFAULT_BOOL}"
            if [[ "$TOGGLE" =~ ^(s|sí|si|yes|y)$ ]]; then
                CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "true" '.[$k] = $v')
            else
                CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "false" '.[$k] = $v')
            fi
        elif [ "$P_TYPE" = "number" ]; then
            if [ -n "$P_DEFAULT" ]; then
                read -p "  $P_LABEL [$P_DEFAULT]: " VAL
                VAL="${VAL:-$P_DEFAULT}"
            else
                read -p "  $P_LABEL$REQUIRED_MARK: " VAL
                if [ "$P_REQUIRED" = "true" ] && [ -z "$VAL" ]; then
                    log_err "$P_LABEL es obligatorio"
                    exit 1
                fi
            fi
            CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "$VAL" '.[$k] = $v')
        else
            if [ -n "$P_DEFAULT" ]; then
                read -p "  $P_LABEL [$P_DEFAULT]: " VAL
                VAL="${VAL:-$P_DEFAULT}"
            else
                read -p "  $P_LABEL$REQUIRED_MARK: " VAL
                if [ "$P_REQUIRED" = "true" ] && [ -z "$VAL" ]; then
                    log_err "$P_LABEL es obligatorio"
                    exit 1
                fi
            fi
            CONFIG_JSON=$(echo "$CONFIG_JSON" | jq --arg k "$P_NAME" --arg v "$VAL" '.[$k] = $v')
        fi
        echo ""
    done
fi

# ── Paso 2b: Provider / Modelo ──────────────────────────────────────
log_step "Paso 2b: Provider / Modelo"

PROV_DATA=$(api GET "/api/plugins/agenthub/providers")
PROV_OPTIONS=$(echo "$PROV_DATA" | jq -c '.options // []')
PROV_DEFAULT=$(echo "$PROV_DATA" | jq -r '.default_provider // ""')
PROV_DEFAULT_MODEL=$(echo "$PROV_DATA" | jq -r '.default_model // ""')
PROV_COUNT=$(echo "$PROV_OPTIONS" | jq '. | length')

SELECTED_PROVIDER=""
SELECTED_MODEL=""

if [ "$PROV_COUNT" -gt 0 ]; then
    echo ""
    for i in $(seq 0 $((PROV_COUNT - 1))); do
        PID=$(echo "$PROV_OPTIONS" | jq -r ".[$i].id")
        PNAME=$(echo "$PROV_OPTIONS" | jq -r ".[$i].name")
        PMODEL=$(echo "$PROV_OPTIONS" | jq -r ".[$i].model")
        PISDEFAULT=$(echo "$PROV_OPTIONS" | jq -r ".[$i].is_default")
        DEFAULT_MARK=""
        [ "$PISDEFAULT" = "true" ] && DEFAULT_MARK=" ${GREEN}(default)${NC}"
        echo -e "  ${BOLD}$((i+1)).${NC} ${BOLD}$PNAME${NC} → $PMODEL$DEFAULT_MARK"
    done
    echo ""
    read -p "  Provider (1-$PROV_COUNT) [1]: " PROV_CHOICE
    PROV_CHOICE="${PROV_CHOICE:-1}"
    [[ "$PROV_CHOICE" =~ ^[0-9]+$ ]] && [ "$PROV_CHOICE" -ge 1 ] && [ "$PROV_CHOICE" -le "$PROV_COUNT" ] || PROV_CHOICE=1

    SELECTED_PROVIDER=$(echo "$PROV_OPTIONS" | jq -r ".[$((PROV_CHOICE-1))].id")
    SELECTED_MODEL=$(echo "$PROV_OPTIONS" | jq -r ".[$((PROV_CHOICE-1))].model")
    log_ok "Provider: ${BOLD}$SELECTED_PROVIDER${NC} → $SELECTED_MODEL"
else
    log_info "Usando provider por defecto"
fi
echo ""

# ── Paso 2c: Schedule ───────────────────────────────────────────────
log_step "Paso 2c: Schedule"

echo ""
echo -e "  ${BOLD}1.${NC}  Cada 30 minutos"
echo -e "  ${BOLD}2.${NC}  Cada hora"
echo -e "  ${BOLD}3.${NC}  Cada 6 horas"
echo -e "  ${BOLD}4.${NC}  Cada 12 horas"
echo -e "  ${BOLD}5.${NC}  Diario a las 9:00 AM ${GREEN}(default)${NC}"
echo -e "  ${BOLD}6.${NC}  Semanal (Lunes 9:00 AM)"
echo -e "  ${BOLD}7.${NC}  Mensual (1°, 9:00 AM)"
echo -e "  ${BOLD}8.${NC}  Cron personalizado"
echo ""

SCHEDULE_PRESETS=("*/30 * * * *" "0 * * * *" "0 */6 * * *" "0 */12 * * *" "0 9 * * *" "0 9 * * 1" "0 9 1 * *" "CUSTOM")

read -p "  Elige (1-8) [5]: " SCHED_CHOICE
SCHED_CHOICE="${SCHED_CHOICE:-5}"
[[ "$SCHED_CHOICE" =~ ^[0-9]+$ ]] && [ "$SCHED_CHOICE" -ge 1 ] && [ "$SCHED_CHOICE" -le 8 ] || SCHED_CHOICE=5

if [ "$SCHED_CHOICE" = "8" ]; then
    read -p "  Cron expression: " CUSTOM_CRON
    SELECTED_SCHEDULE="${CUSTOM_CRON:-0 9 * * *}"
else
    SELECTED_SCHEDULE="${SCHEDULE_PRESETS[$((SCHED_CHOICE-1))]}"
fi
log_ok "Schedule: ${BOLD}$SELECTED_SCHEDULE${NC}"
echo ""

# ── Paso 2d: Delivery ───────────────────────────────────────────────
log_step "Paso 2d: Delivery"

DEL_DATA=$(api GET "/api/plugins/agenthub/channels")
DEL_COUNT=$(echo "$DEL_DATA" | jq 'length')
SELECTED_DELIVERY="local"
CHAT_ID=""
THREAD_ID=""

if [ "$DEL_COUNT" -gt 0 ]; then
    echo ""
    for i in $(seq 0 $((DEL_COUNT - 1))); do
        DID=$(echo "$DEL_DATA" | jq -r ".[$i].id")
        DNAME=$(echo "$DEL_DATA" | jq -r ".[$i].name")
        DICON=$(echo "$DEL_DATA" | jq -r ".[$i].icon // \"\"")
        echo -e "  ${BOLD}$((i+1)).${NC} ${DICON} ${BOLD}$DNAME${NC}"
    done
    echo ""
    read -p "  Canal (1-$DEL_COUNT) [1]: " DEL_CHOICE
    DEL_CHOICE="${DEL_CHOICE:-1}"
    [[ "$DEL_CHOICE" =~ ^[0-9]+$ ]] && [ "$DEL_CHOICE" -ge 1 ] && [ "$DEL_CHOICE" -le "$DEL_COUNT" ] || DEL_CHOICE=1

    SELECTED_DELIVERY=$(echo "$DEL_DATA" | jq -r ".[$((DEL_CHOICE-1))].id")

    SUPPORTS_CHAT=$(echo "$DEL_DATA" | jq -r ".[$((DEL_CHOICE-1))].supports_chat_id // false")
    SUPPORTS_THREAD=$(echo "$DEL_DATA" | jq -r ".[$((DEL_CHOICE-1))].supports_thread_id // false")

    if [ "$SUPPORTS_CHAT" = "true" ]; then
        read -p "  Chat ID: " CHAT_ID
        if [ "$SUPPORTS_THREAD" = "true" ]; then
            read -p "  Thread ID (opcional): " THREAD_ID
        fi
    fi
    log_ok "Delivery: ${BOLD}$SELECTED_DELIVERY${NC}"
else
    log_info "Usando local por defecto"
fi
echo ""

# ── Paso 3: Preview ─────────────────────────────────────────────────
log_step "Paso 3: Preview del prompt"

PREVIEW_PAYLOAD=$(jq -n \
    --arg name "$AGENT_NAME" \
    --arg template "$TPL_ID" \
    --argjson config "$CONFIG_JSON" \
    --arg provider "$SELECTED_PROVIDER" \
    --arg model "$SELECTED_MODEL" \
    '{name: $name, template_id: $template, config: $config, provider: $provider, model: $model}')

PREVIEW=$(api POST "/api/plugins/agenthub/preview" "$PREVIEW_PAYLOAD")
PROMPT=$(echo "$PREVIEW" | jq -r '.rendered_prompt // "Error al generar preview"')

echo ""
echo -e "  ${BOLD}Prompt generado:${NC}"
echo -e "  ${YELLOW}────────────────────────────────────────${NC}"
echo "$PROMPT" | sed 's/^/  /'
echo -e "  ${YELLOW}────────────────────────────────────────${NC}"
echo ""

# ── Resumen ─────────────────────────────────────────────────────────
log_step "Resumen"

echo -e "  Template:   ${BOLD}$TPL_NAME${NC}"
echo -e "  Agente:     ${BOLD}$AGENT_NAME${NC}"
echo -e "  Schedule:   ${BOLD}$SELECTED_SCHEDULE${NC}"
echo -e "  Provider:   ${BOLD}${SELECTED_PROVIDER:-default}${NC}"
echo -e "  Model:      ${BOLD}${SELECTED_MODEL:-default}${NC}"
echo -e "  Delivery:   ${BOLD}$SELECTED_DELIVERY${NC}"
echo ""

read -p "  ¿Crear agente? (s/n): " CONFIRM
if [[ ! "$CONFIRM" =~ ^(s|sí|si|yes|y)$ ]]; then
    log_info "Cancelado"
    exit 0
fi

# ── Paso 4: Crear ───────────────────────────────────────────────────
log_step "Paso 4: Creando agente..."

CREATE_PAYLOAD=$(jq -n \
    --arg name "$AGENT_NAME" \
    --arg template "$TPL_ID" \
    --argjson config "$CONFIG_JSON" \
    --arg provider "$SELECTED_PROVIDER" \
    --arg model "$SELECTED_MODEL" \
    --arg schedule "$SELECTED_SCHEDULE" \
    --arg delivery "$SELECTED_DELIVERY" \
    --arg chat_id "$CHAT_ID" \
    --arg thread_id "$THREAD_ID" \
    '{name: $name, template_id: $template, config: $config, provider: $provider, model: $model, schedule: $schedule, delivery: $delivery} +
     (if $chat_id != "" then {chat_id: $chat_id} else {} end) +
     (if $thread_id != "" then {thread_id: $thread_id} else {} end)')

RESULT=$(api POST "/api/plugins/agenthub/create-agent" "$CREATE_PAYLOAD")
JOB_CREATED=$(echo "$RESULT" | jq -r '.job_created // false')
PROFILE=$(echo "$RESULT" | jq -r '.profile // "unknown"')

if [ "$JOB_CREATED" = "true" ]; then
    echo ""
    echo -e "  ${GREEN}✓${NC} ${BOLD}Agente creado con éxito${NC}"
    echo -e "    Profile:  ${CYAN}$PROFILE${NC}"
    echo -e "    Nombre:   ${BOLD}$AGENT_NAME${NC}"
    echo -e "    Schedule: $SELECTED_SCHEDULE"
    echo ""
    echo -e "  Ver agentes: ${CYAN}hermes -p $PROFILE cron list${NC}"
    echo -e "  Dashboard:   ${CYAN}http://localhost:9119${NC}"
else
    ERROR=$(echo "$RESULT" | jq -r '.error // "unknown"')
    log_err "Error al crear: $ERROR"
    exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ¡Wizard completado!                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
