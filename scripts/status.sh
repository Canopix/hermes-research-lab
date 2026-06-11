#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_fail(){ echo -e "${RED}[FAIL]${NC} $1"; }
log_warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }

hermes_ok() {
    local status="$1"
    [ "$status" = "200" ] || [ "$status" = "404" ] || [ "$status" = "401" ]
}

echo "=============================================="
echo "  AgentHub - Service Status"
echo "  Project: $PROJECT_DIR"
echo "=============================================="
echo ""

echo -n "  Hermes API Server (:$HERMES_PORT)  ... "
HERMES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$HERMES_PORT/health" 2>/dev/null || echo "000")
if hermes_ok "$HERMES_STATUS"; then
    log_ok "OK (HTTP $HERMES_STATUS)"
else
    log_fail "No responde (HTTP $HERMES_STATUS)"
fi

echo -n "  Exploration API (:$EXPLORE_PORT)    ... "
EXPLORE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$EXPLORE_PORT/health" 2>/dev/null || echo "000")
if [ "$EXPLORE_STATUS" = "200" ]; then
    log_ok "OK"
else
    log_fail "No responde (HTTP $EXPLORE_STATUS)"
fi

echo -n "  Frontend (:$FRONTEND_PORT)           ... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "301" ] || [ "$FRONTEND_STATUS" = "307" ]; then
    log_ok "OK"
else
    log_fail "No responde (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "=============================================="

RUNNING=0
hermes_ok "$HERMES_STATUS" && RUNNING=$((RUNNING + 1))
[ "$EXPLORE_STATUS" = "200" ] && RUNNING=$((RUNNING + 1))
{ [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "301" ] || [ "$FRONTEND_STATUS" = "307" ]; } && RUNNING=$((RUNNING + 1))

if [ $RUNNING -eq 3 ]; then
    echo -e "  ${GREEN}Todos los servicios corriendo${NC}"
elif [ $RUNNING -gt 0 ]; then
    echo -e "  ${YELLOW}$RUNNING de 3 servicios corriendo${NC}"
else
    echo -e "  ${RED}Ningún servicio corriendo${NC}"
fi
echo "=============================================="
echo ""
