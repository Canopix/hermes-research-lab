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
log_warn(){ echo -e "${YELLOW}[WARN]${NC} $1"; }
log_info(){ echo -e "[INFO] $1"; }

# Kill every process listening on a port (graceful, then -9).
kill_port() {
    local port="$1"
    local label="$2"
    local pids

    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -z "$pids" ]; then
        log_info "$label no está corriendo en :$port"
        return 0
    fi

    log_info "Matando $label en :$port (PID: $(echo "$pids" | tr '\n' ' '))..."
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1

    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
    fi

    if port_in_use "$port"; then
        log_warn "$label aún responde en :$port"
    else
        log_ok "$label detenido (:$port)"
    fi
}

# Stop a process recorded in a pidfile (e.g. uvicorn parent not bound to port).
stop_pidfile() {
    local pidfile="$1"
    local label="$2"

    if [ ! -f "$pidfile" ]; then
        return 0
    fi

    local pid
    pid=$(cat "$pidfile" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        log_info "Matando $label (pidfile PID: $pid)..."
        kill "$pid" 2>/dev/null || true
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
        log_ok "$label detenido (pidfile)"
    fi
    rm -f "$pidfile"
}

echo "=============================================="
echo "  AgentHub - Stopping Services"
echo "  (Hermes :$HERMES_PORT no se toca)"
echo "=============================================="
echo ""

kill_port "$EXPLORE_PORT" "Exploration API"
kill_port "$FRONTEND_PORT" "Frontend"

stop_pidfile /tmp/agenthub-explore.pid "Exploration API"
stop_pidfile /tmp/agenthub-frontend.pid "Frontend"

echo ""
echo "=============================================="
echo -e "  ${GREEN}AgentHub detenido${NC} (Frontend + Exploration API)"
echo -e "  ${YELLOW}Hermes sigue corriendo en :$HERMES_PORT${NC}"
echo "=============================================="
echo ""
