#!/usr/bin/env bash
set -euo pipefail

HERMES_URL="http://localhost:8642"
EXPLORE_URL="http://localhost:8643"
FRONTEND_URL="http://localhost:3000"
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

# Helper: curl with API key, return body + HTTP code on last line
hc() {
    curl -s -w "\n%{http_code}" \
        -H "X-API-Key: $API_KEY" \
        "$@" 2>/dev/null
}

# Helper: pretty-print JSON from a variable
pp() {
    echo "$1" | jq . 2>/dev/null || echo "  $1"
}

echo "=============================================="
echo "  AgentHub - Demo for Jury"
echo "=============================================="
echo ""

# Health checks
log_step "Health Checks"

HERMES_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$HERMES_URL/health" 2>/dev/null || echo "000")
EXPLORE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$EXPLORE_URL/health" 2>/dev/null || echo "000")

if [ "$HERMES_HTTP" = "200" ]; then
    log_ok "Hermes API Server ($HERMES_URL) is UP"
else
    log_err "Hermes API Server ($HERMES_URL) is DOWN (HTTP $HERMES_HTTP)"
    log_info "Some steps may show empty data (Exploration API proxies to Hermes)"
fi

if [ "$EXPLORE_HTTP" = "200" ]; then
    log_ok "Exploration API ($EXPLORE_URL) is UP"
else
    log_err "Exploration API ($EXPLORE_URL) is DOWN (HTTP $EXPLORE_HTTP)"
    echo -e "${RED}Cannot continue without Exploration API.${NC}"
    exit 1
fi

# Paso 1: System Overview
log_step "Paso 1: System Overview"
echo "  GET $EXPLORE_URL/api/system/overview"
OVERVIEW=$(hc "$EXPLORE_URL/api/system/overview")
OVERVIEW_BODY=$(echo "$OVERVIEW" | sed '$d')
OVERVIEW_CODE=$(echo "$OVERVIEW" | tail -1)
echo "  HTTP $OVERVIEW_CODE"
pp "$OVERVIEW_BODY"

# Paso 2: List Templates
log_step "Paso 2: Available Templates"
echo "  GET $EXPLORE_URL/api/templates"
TEMPLATES=$(hc "$EXPLORE_URL/api/templates")
TEMPLATES_BODY=$(echo "$TEMPLATES" | sed '$d')
TEMPLATES_CODE=$(echo "$TEMPLATES" | tail -1)
echo "  HTTP $TEMPLATES_CODE"
pp "$TEMPLATES_BODY"

# Paso 3: Template Preview (ai-researcher)
log_step "Paso 3: Template Preview - ai-researcher"
echo "  POST $EXPLORE_URL/api/templates/ai-researcher/preview"
PREVIEW=$(hc -X POST \
    -H "Content-Type: application/json" \
    -d '{"keywords":["LLM","RAG","multimodal"],"max_results":10}' \
    "$EXPLORE_URL/api/templates/ai-researcher/preview")
PREVIEW_BODY=$(echo "$PREVIEW" | sed '$d')
PREVIEW_CODE=$(echo "$PREVIEW" | tail -1)
echo "  HTTP $PREVIEW_CODE"
pp "$PREVIEW_BODY"

# Paso 4: List Jobs / Executions
log_step "Paso 4: Active Jobs / Executions"
echo "  GET $EXPLORE_URL/api/executions"
JOBS=$(hc "$EXPLORE_URL/api/executions")
JOBS_BODY=$(echo "$JOBS" | sed '$d')
JOBS_CODE=$(echo "$JOBS" | tail -1)
echo "  HTTP $JOBS_CODE"
pp "$JOBS_BODY"

# Paso 5: List Profiles
log_step "Paso 5: Profiles with Skills"
echo "  GET $EXPLORE_URL/api/system/profiles"
PROFILES=$(hc "$EXPLORE_URL/api/system/profiles")
PROFILES_BODY=$(echo "$PROFILES" | sed '$d')
PROFILES_CODE=$(echo "$PROFILES" | tail -1)
echo "  HTTP $PROFILES_CODE"
pp "$PROFILES_BODY"

# Resumen final
echo ""
echo "=============================================="
echo -e "  ${GREEN}Demo completada${NC}"
echo "=============================================="
echo ""
echo -e "  ${BOLD}Servicios:${NC}"
echo -e "    Hermes API Server:    ${CYAN}$HERMES_URL${NC}  (HTTP $HERMES_HTTP)"
echo -e "    Exploration API:      ${CYAN}$EXPLORE_URL${NC}  (HTTP $EXPLORE_HTTP)"
echo -e "    Frontend (Dashboard): ${CYAN}$FRONTEND_URL${NC}"
echo ""
echo -e "  ${BOLD}Endpoints usados:${NC}"
echo -e "    GET  $EXPLORE_URL/api/system/overview"
echo -e "    GET  $EXPLORE_URL/api/templates"
echo -e "    POST $EXPLORE_URL/api/templates/ai-researcher/preview"
echo -e "    GET  $EXPLORE_URL/api/executions"
echo -e "    GET  $EXPLORE_URL/api/system/profiles"
echo ""
echo -e "  ${BOLD}Acciones:${NC}"
echo -e "    agenthub status   # Verificar servicios"
echo -e "    agenthub stop     # Detener servicios"
echo ""
