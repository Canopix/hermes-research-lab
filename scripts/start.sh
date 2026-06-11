#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

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
log_info "Project: $PROJECT_DIR"
echo ""

# ─────────────────────────────────────────────
# 1. Hermes API Server (:8642) — validate + auto-enable
# ─────────────────────────────────────────────
log_info "Verificando Hermes API Server (:$HERMES_PORT)..."

if hermes_api_health_ok; then
    log_ok "Hermes API Server responde en :$HERMES_PORT"
    HERMES_OK=true
else
    log_warn "Hermes API Server no responde en :$HERMES_PORT"
    if hermes_api_enabled_in_config; then
        log_info "Config: API_SERVER_ENABLED=true (pero el gateway no responde)"
    else
        log_info "Config: API_SERVER_ENABLED no está activo"
    fi
    while IFS= read -r line; do
        log_info "$line"
    done < <(ensure_hermes_api_server)
    if hermes_api_health_ok; then
        log_ok "Hermes API Server activo en :$HERMES_PORT"
        HERMES_OK=true
    else
        log_warn "Hermes API Server no disponible — AgentHub arrancará sin conexión a Hermes"
        log_info "Los agentes no funcionarán hasta que :$HERMES_PORT responda"
        echo ""
    fi
fi

# ─────────────────────────────────────────────
# 2. Project dependencies (auto-setup if needed)
# ─────────────────────────────────────────────
log_info "Verificando dependencias de AgentHub..."
if ! project_deps_ready || [ ! -f "$PROJECT_DIR/.env" ]; then
    log_warn "Primera ejecución detectada — instalando dependencias..."
    if ! ensure_project_deps; then
        log_err "No se pudieron instalar las dependencias. Ejecuta: ./agenthub setup"
        exit 1
    fi
    log_ok "Dependencias listas"
else
    log_ok "Dependencias OK (venv + node_modules)"
fi

# ─────────────────────────────────────────────
# 3. Exploration API (:8643)
# ─────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
    log_ok ".env encontrado"
else
    log_warn ".env no encontrado — usando configuración por defecto"
fi

log_info "Arrancando Exploration API en :$EXPLORE_PORT..."
EXPLORE_OK=false
if port_in_use "$EXPLORE_PORT"; then
    log_ok "Exploration API ya corriendo en :$EXPLORE_PORT"
    EXPLORE_OK=true
elif ! explore_api_deps_ready; then
    log_err "uvicorn no instalado — ejecuta: ./agenthub setup"
else
    cd "$EXPLORE_API_DIR"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    HERMES_API_URL="http://localhost:$HERMES_PORT" \
    HERMES_API_KEY=agenthub-local \
    EXPLORE_API_URL="http://localhost:$EXPLORE_PORT" \
    python -m uvicorn main:app --host 0.0.0.0 --port "$EXPLORE_PORT" --app-dir . --reload > /tmp/explore-api.log 2>&1 &
    EXPLORE_PID=$!
    echo "$EXPLORE_PID" > /tmp/agenthub-explore.pid
    log_ok "Exploration API arrancando en :$EXPLORE_PORT (PID: $EXPLORE_PID)"
fi

# ─────────────────────────────────────────────
# 4. Frontend (:3000)
# ─────────────────────────────────────────────
for port in 3001 3002 3003; do
    if port_in_use "$port"; then
        kill "$(lsof -ti:"$port")" 2>/dev/null || true
    fi
done

log_info "Arrancando Frontend en :$FRONTEND_PORT..."
FRONTEND_OK=false
if port_in_use "$FRONTEND_PORT"; then
    log_ok "Frontend ya corriendo en :$FRONTEND_PORT"
    FRONTEND_OK=true
elif ! frontend_deps_ready; then
    log_err "Next.js no instalado — ejecuta: ./agenthub setup"
else
    cd "$FRONTEND_DIR"
    EXPLORE_API_URL="http://localhost:$EXPLORE_PORT" \
    NEXT_PUBLIC_API_KEY=agenthub-local \
    npm run dev > /tmp/agenthub-frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "$FRONTEND_PID" > /tmp/agenthub-frontend.pid
    log_ok "Frontend arrancando en :$FRONTEND_PORT (PID: $FRONTEND_PID)"
fi

# ─────────────────────────────────────────────
# 5. Wait for services to be ready
# ─────────────────────────────────────────────
echo ""
log_info "Esperando a que los servicios estén listos..."

MAX_WAIT=30

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$EXPLORE_PORT/health" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        log_ok "Exploration API lista en :$EXPLORE_PORT"
        EXPLORE_OK=true
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done
if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warn "Exploration API no respondió en ${MAX_WAIT}s — revisa /tmp/explore-api.log"
    log_file_tail /tmp/explore-api.log 2
fi

ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "307" ]; then
        log_ok "Frontend listo en :$FRONTEND_PORT"
        FRONTEND_OK=true
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done
if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warn "Frontend no respondió en ${MAX_WAIT}s — revisa /tmp/agenthub-frontend.log"
    log_file_tail /tmp/agenthub-frontend.log 2
fi

# ─────────────────────────────────────────────
# 6. Summary
# ─────────────────────────────────────────────
echo ""
echo -e "${CYAN}════════════════════════════════════════════${NC}"

RUNNING=0
[ "$HERMES_OK" = true ] && RUNNING=$((RUNNING + 1))
[ "$EXPLORE_OK" = true ] && RUNNING=$((RUNNING + 1))
[ "$FRONTEND_OK" = true ] && RUNNING=$((RUNNING + 1))

if [ $RUNNING -eq 3 ]; then
    echo -e "  ${GREEN}AgentHub corriendo — todo conectado${NC}"
elif [ $RUNNING -eq 2 ] && [ "$HERMES_OK" = true ]; then
    echo -e "  ${YELLOW}Hermes OK — AgentHub parcialmente arriba ($RUNNING/3)${NC}"
elif [ $RUNNING -gt 0 ]; then
    echo -e "  ${YELLOW}Servicios parcialmente arriba ($RUNNING/3)${NC}"
else
    echo -e "  ${RED}No arrancó correctamente — ejecuta ./agenthub setup${NC}"
fi

echo -e "${CYAN}════════════════════════════════════════════${NC}"
echo ""
echo "  Frontend:         http://localhost:$FRONTEND_PORT"
echo "  Wizard (web):     http://localhost:$FRONTEND_PORT/create"
echo "  Exploration API:  http://localhost:$EXPLORE_PORT"

if [ "$HERMES_OK" = true ]; then
    echo "  Hermes API:       http://localhost:$HERMES_PORT ✓"
else
    echo -e "  Hermes API:       http://localhost:$HERMES_PORT ${YELLOW}(no disponible)${NC}"
fi

echo ""
if [ "$HERMES_OK" = false ]; then
    echo -e "  ${YELLOW}⚠  Los agentes no funcionarán hasta que Hermes esté arriba.${NC}"
    echo -e "  ${YELLOW}   Ejecuta: hermes gateway restart${NC}"
    echo ""
fi
echo "  agenthub wizard   # Crear agente por CLI"
echo "  agenthub status   # Verificar servicios"
echo "  agenthub stop     # Detener servicios"
echo ""
