#!/usr/bin/env bash
set -euo pipefail

HERMES_URL="http://localhost:8642"
EXPLORE_URL="http://localhost:8643"
FRONTEND_URL="http://localhost:3000"
API_KEY="agenthub-local"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_info(){ echo -e "[INFO] $1"; }
log_step(){ echo -e "\n${YELLOW}>>> $1${NC}"; }

echo "=============================================="
echo "  AgentHub - Demo for Jury"
echo "=============================================="
echo ""

for url in "$HERMES_URL" "$EXPLORE_URL"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" 2>/dev/null || echo "000")
    if [ "$STATUS" != "200" ]; then
        echo -e "${RED}[ERR] Servicio no disponible: $url${NC}"
        echo "Ejecuta: agenthub start"
        exit 1
    fi
done

log_step "Paso 1: Dashboard vacio - lista de agentes"
echo "  GET $EXPLORE_URL/api/agents"
curl -s "$EXPLORE_URL/api/agents" 2>/dev/null || echo "  (no data or API not responding)"
echo ""

log_step "Paso 2: Crear agente AI Researcher"
AGENT_JSON='{"name":"AI Researcher","description":"Investigador de papers y tendencias en IA","template":"ai-researcher","config":{"search_interval_minutes":60,"keywords":["transformer","multimodal","RLHF"],"max_results":5}}'

echo "  POST $EXPLORE_URL/api/agents"
echo "  Body: $AGENT_JSON"
CREATE_RESPONSE=$(curl -s -X POST "$EXPLORE_URL/api/agents" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "$AGENT_JSON" 2>/dev/null)
echo "  Response: $CREATE_RESPONSE"
echo ""

# Extract agent ID using grep/sed instead of python
AGENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$AGENT_ID" ]; then
    AGENT_ID=$(echo "$CREATE_RESPONSE" | grep -o '"agent_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "" ]; then
    AGENT_ID="demo-agent-001"
fi

log_step "Paso 3: Ejecutar agente ahora"
echo "  POST $EXPLORE_URL/api/agents/$AGENT_ID/trigger"
TRIGGER_RESPONSE=$(curl -s -X POST "$EXPLORE_URL/api/agents/$AGENT_ID/trigger" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d '{"mode":"now"}' 2>/dev/null)
echo "  Response: $TRIGGER_RESPONSE"
echo ""

log_step "Paso 4: Output generado"
echo "  GET $EXPLORE_URL/api/agents/$AGENT_ID/output"
OUTPUT=$(curl -s "$EXPLORE_URL/api/agents/$AGENT_ID/output" 2>/dev/null)
echo "  $OUTPUT"
echo ""

log_step "Paso 5: Historial de ejecuciones"
echo "  GET $EXPLORE_URL/api/agents/$AGENT_ID/history"
HISTORY=$(curl -s "$EXPLORE_URL/api/agents/$AGENT_ID/history" 2>/dev/null)
echo "  $HISTORY"
echo ""

echo "=============================================="
echo -e "  ${GREEN}Demo completada${NC}"
echo "=============================================="
echo ""
echo "  Acciones disponibles:"
echo "    Frontend: $FRONTEND_URL"
echo "    API:      $EXPLORE_URL"
echo "    Status:   agenthub status"
echo "    Stop:     agenthub stop"
echo ""
