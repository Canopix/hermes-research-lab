#!/usr/bin/env bash
set -euo pipefail

EXPLORE_PORT=8643
FRONTEND_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
log_info(){ echo -e "[INFO] $1"; }

echo "=============================================="
echo "  AgentHub - Stopping Services"
echo "=============================================="
echo ""

if kill $(lsof -ti:$EXPLORE_PORT 2>/dev/null) &>/dev/null; then
    PIDS=$(lsof -ti:$EXPLORE_PORT)
    log_info "Matando Exploration API (PID: $PIDS)..."
    kill $PIDS 2>/dev/null || true
    sleep 1
    kill -9 $PIDS 2>/dev/null || true
    log_ok "Exploration API detenida en :$EXPLORE_PORT"
else
    log_info "Exploration API no está corriendo en :$EXPLORE_PORT"
fi

if kill $(lsof -ti:$FRONTEND_PORT 2>/dev/null) &>/dev/null; then
    PIDS=$(lsof -ti:$FRONTEND_PORT)
    log_info "Matando Frontend (PID: $PIDS)..."
    kill $PIDS 2>/dev/null || true
    sleep 1
    kill -9 $PIDS 2>/dev/null || true
    log_ok "Frontend detenido en :$FRONTEND_PORT"
else
    log_info "Frontend no está corriendo en :$FRONTEND_PORT"
fi

for pidfile in /tmp/agenthub-explore.pid /tmp/agenthub-frontend.pid; do
    if [ -f "$pidfile" ]; then
        rm -f "$pidfile"
    fi
done

echo ""
echo "=============================================="
echo -e "  ${GREEN}Servicios detenidos${NC}"
echo "=============================================="
echo ""
