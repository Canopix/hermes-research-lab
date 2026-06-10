#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_fail(){ echo -e "${RED}[FAIL]${NC} $1"; }
log_warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }

echo "=============================================="
echo "  AgentHub - Service Status"
echo "=============================================="
echo ""

echo -n "  Hermes API Server (:8000)  ... "
HERMES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/ 2>/dev/null || echo "000")
if [ "$HERMES_STATUS" = "200" ]; then
    log_ok "OK"
else
    log_fail "No responde (HTTP $HERMES_STATUS)"
fi

echo -n "  Exploration API (:8643)    ... "
EXPLORE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8643/health 2>/dev/null || echo "000")
if [ "$EXPLORE_STATUS" = "200" ]; then
    log_ok "OK"
else
    log_fail "No responde (HTTP $EXPLORE_STATUS)"
fi

echo -n "  Frontend (:3000)           ... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "301" ] || [ "$FRONTEND_STATUS" = "307" ]; then
    log_ok "OK"
else
    log_fail "No responde (HTTP $FRONTEND_STATUS)"
fi

echo ""
echo "=============================================="

RUNNING=0
[ "$HERMES_STATUS" = "200" ] && RUNNING=$((RUNNING + 1))
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
