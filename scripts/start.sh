#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="/root/agenthub"
EXPLORE_API_DIR="$BASE_DIR/explore-api"
FRONTEND_DIR="$BASE_DIR/frontend"
VENV="$EXPLORE_API_DIR/.venv/bin/python"

HERMES_PORT=8642
EXPLORE_PORT=8643
FRONTEND_PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_ok()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERR]${NC} $1" >&2; }
log_info(){ echo -e "[INFO] $1"; }

echo "=============================================="
echo "  AgentHub - Starting Services"
echo "=============================================="
echo ""

log_info "Verificando Hermes API Server ($HERMES_PORT)..."
HERMES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$HERMES_PORT/health 2>/dev/null || echo "000")
if [ "$HERMES_STATUS" = "200" ]; then
    log_ok "Hermes API Server corriendo en :$HERMES_PORT"
else
    log_err "Hermes API Server no responde en :$HERMES_PORT"
    log_info "Ejecuta: hermes start"
    exit 1
fi

if [ ! -f "$BASE_DIR/.env" ]; then
    log_warn ".env no encontrado, copiando desde .env.example..."
    if [ -f "$BASE_DIR/.env.example" ]; then
        cp "$BASE_DIR/.env.example" "$BASE_DIR/.env"
    fi
fi

log_info "Arrancando Exploration API en :$EXPLORE_PORT..."
if kill $(lsof -ti:$EXPLORE_PORT 2>/dev/null) &>/dev/null; then
    log_ok "Exploration API ya corriendo en :$EXPLORE_PORT"
else
    cd "$EXPLORE_API_DIR"
    HERMES_API_URL=http://localhost:$HERMES_PORT \
    HERMES_API_KEY=agenthub-local \
    EXPLORE_API_URL=http://localhost:$EXPLORE_PORT \
    $VENV -m uvicorn main:app --host 0.0.0.0 --port $EXPLORE_PORT --app-dir . --reload > /tmp/explore-api.log 2>&1 &
    EXPLORE_PID=$!
    echo "$EXPLORE_PID" > /tmp/agenthub-explore.pid
    log_ok "Exploration API arrancando en :$EXPLORE_PORT (PID: $EXPLORE_PID)"
fi

log_info "Arrancando Frontend en :$FRONTEND_PORT..."
if kill $(lsof -ti:$FRONTEND_PORT 2>/dev/null) &>/dev/null; then
    log_ok "Frontend ya corriendo en :$FRONTEND_PORT"
else
    cd "$FRONTEND_DIR"
    HERMES_API_URL=http://localhost:$HERMES_PORT \
    NEXT_PUBLIC_HERMES_API=http://localhost:$HERMES_PORT \
    NEXT_PUBLIC_EXPLORE_API=http://localhost:$EXPLORE_PORT \
    npm run dev > /tmp/agenthub-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > /tmp/agenthub-frontend.pid
    log_ok "Frontend arrancando en :$FRONTEND_PORT (PID: $FRONTEND_PID)"
fi

echo ""
log_info "Esperando a que los servicios estén listos..."

MAX_WAIT=30
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$EXPLORE_PORT/health 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        log_ok "Exploration API lista en :$EXPLORE_PORT"
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warn "Exploration API no respondió en ${MAX_WAIT}s"
fi

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$FRONTEND_PORT 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "307" ]; then
        log_ok "Frontend listo en :$FRONTEND_PORT"
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warn "Frontend no respondió en ${MAX_WAIT}s"
fi

echo ""
echo "=============================================="
echo -e "  ${GREEN}AgentHub corriendo${NC}"
echo "=============================================="
echo ""
echo "  Hermes API Server:    http://localhost:$HERMES_PORT"
echo "  Exploration API:      http://localhost:$EXPLORE_PORT"
echo "  Frontend (Dashboard): http://localhost:$FRONTEND_PORT"
echo ""
echo "  agenthub status   # Verificar servicios"
echo "  agenthub demo     # Ejecutar demo"
echo "  agenthub stop     # Detener servicios"
echo ""
