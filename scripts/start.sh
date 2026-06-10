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
CYAN='\033[0;36m'
NC='\033[0m'

log_ok()  { echo -e "  ${GREEN}✓${NC} $1"; }
log_warn(){ echo -e "  ${YELLOW}⚠${NC} $1"; }
log_err() { echo -e "  ${RED}✗${NC} $1" >&2; }
log_info(){ echo -e "  $1"; }

HERMES_OK=false

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         AgentHub — Starting Services     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────
# 1. Check Hermes API Server (retry up to 3x)
# ─────────────────────────────────────────────
log_info "Verificando Hermes API Server (:$HERMES_PORT)..."

for attempt in 1 2 3; do
    HERMES_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$HERMES_PORT/ 2>/dev/null || echo "000")
    if [ "$HERMES_STATUS" = "200" ] || [ "$HERMES_STATUS" = "404" ] || [ "$HERMES_STATUS" = "401" ]; then
        log_ok "Hermes API Server responde en :$HERMES_PORT"
        HERMES_OK=true
        break
    fi
    if [ "$attempt" -lt 3 ]; then
        log_warn "Hermes API Server no responde aún (intento $attempt/3) — esperando 5s..."
        sleep 5
    fi
done

if [ "$HERMES_OK" = false ]; then
    log_warn "Hermes API Server no disponible en :$HERMES_PORT"
    log_info "Los servicios de AgentHub arrancarán igualmente."
    log_info "Cuando Hermes esté disponible, el proxy se conectará automáticamente."
    log_info "Para arrancar Hermes: hermes start"
    echo ""
fi

# ─────────────────────────────────────────────
# 2. Exploration API (:8643)
# ─────────────────────────────────────────────
if [ -f "$BASE_DIR/.env" ]; then
    log_ok ".env encontrado"
else
    log_warn ".env no encontrado — usando configuración por defecto"
fi

log_info "Arrancando Exploration API en :$EXPLORE_PORT..."
if kill $(lsof -ti:$EXPLORE_PORT 2>/dev/null) &>/dev/null; then
    log_ok "Exploration API ya corriendo en :$EXPLORE_PORT"
else
    cd "$EXPLORE_API_DIR"
    source .venv/bin/activate
    HERMES_API_URL=http://localhost:$HERMES_PORT \
    HERMES_API_KEY=agenthub-local \
    EXPLORE_API_URL=http://localhost:$EXPLORE_PORT \
    python -m uvicorn main:app --host 0.0.0.0 --port $EXPLORE_PORT --app-dir . --reload > /tmp/explore-api.log 2>&1 &
    EXPLORE_PID=$!
    echo "$EXPLORE_PID" > /tmp/agenthub-explore.pid
    log_ok "Exploration API arrancando en :$EXPLORE_PORT (PID: $EXPLORE_PID)"
fi

# ─────────────────────────────────────────────
# 3. Frontend (:3000)
# ─────────────────────────────────────────────
# Kill any stale Next.js on non-standard ports
for port in 3001 3002 3003; do
    kill $(lsof -ti:$port 2>/dev/null) 2>/dev/null || true
done

log_info "Arrancando Frontend en :$FRONTEND_PORT..."
if kill $(lsof -ti:$FRONTEND_PORT 2>/dev/null) &>/dev/null; then
    log_ok "Frontend ya corriendo en :$FRONTEND_PORT"
else
    cd "$FRONTEND_DIR"
    NEXT_PUBLIC_API_KEY=agenthub-local \
    npm run dev > /tmp/agenthub-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > /tmp/agenthub-frontend.pid
    log_ok "Frontend arrancando en :$FRONTEND_PORT (PID: $FRONTEND_PID)"
fi

# ─────────────────────────────────────────────
# 4. Wait for services to be ready
# ─────────────────────────────────────────────
echo ""
log_info "Esperando a que los servicios estén listos..."

MAX_WAIT=30

# Wait for Exploration API
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
    log_warn "Exploration API no respondió en ${MAX_WAIT}s — revisa /tmp/explore-api.log"
fi

# Wait for Frontend
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
    log_warn "Frontend no respondió en ${MAX_WAIT}s — revisa /tmp/agenthub-frontend.log"
fi

# ─────────────────────────────────────────────
# 5. Summary
# ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════${NC}"

if [ "$HERMES_OK" = true ]; then
    echo -e "  ${GREEN}AgentHub corriendo — todo conectado${NC}"
else
    echo -e "  ${YELLOW}AgentHub corriendo — sin conexión a Hermes${NC}"
fi

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""
echo "  Frontend:         http://localhost:$FRONTEND_PORT"
echo "  Exploration API:  http://localhost:$EXPLORE_PORT"

if [ "$HERMES_OK" = true ]; then
    echo "  Hermes API:       http://localhost:$HERMES_PORT ✓"
else
    echo -e "  Hermes API:       http://localhost:$HERMES_PORT ${YELLOW}(no disponible)${NC}"
fi

echo ""
if [ "$HERMES_OK" = false ]; then
    echo -e "  ${YELLOW}⚠  Los agentes no funcionarán hasta que Hermes esté arriba.${NC}"
    echo -e "  ${YELLOW}   Ejecuta: hermes start${NC}"
    echo ""
fi
echo "  agenthub status   # Verificar servicios"
echo "  agenthub stop     # Detener servicios"
echo ""
