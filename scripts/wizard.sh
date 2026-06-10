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
    log_info "Arranca los servicios con: bash scripts/start.sh"
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
#  Paso 3: Preview
# ──────────────────────────────────────────────
log_step "Paso 3: Preview del prompt"

# Construir JSON de config
CONFIG_JSON="{"
FIRST=true
for key in "${!CONFIG[@]}"; do
    $FIRST || CONFIG_JSON+=", "
    FIRST=false
    # Si es booleano, sin quotes
    if [ "${CONFIG[$key]}" = "true" ] || [ "${CONFIG[$key]}" = "false" ]; then
        CONFIG_JSON+="\"$key\": ${CONFIG[$key]}"
    else
        CONFIG_JSON+="\"$key\": \"${CONFIG[$key]}\""
    fi
done
CONFIG_JSON+="}"

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
# Coger deliver del hermesConfig del template
HERMES_DELIVER=$(echo "$SELECTED_TEMPLATE" | jq -r '.hermesConfig.deliver // "local"')

log_step "Paso 4: Creando agente..."

CREATE_RESP=$(hc -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$AGENT_NAME\",
        \"template\": \"$SELECTED_ID\",
        \"config\": $CONFIG_JSON,
        \"prompt\": $(echo "$PROMPT" | jq -Rs .),
        \"schedule\": \"0 */6 * * *\",
        \"deliver\": \"$HERMES_DELIVER\"
    }" \
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