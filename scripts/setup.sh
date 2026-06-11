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
log_err() { echo -e "${RED}[ERR]${NC} $1" >&2; }
log_info(){ echo -e "[INFO] $1"; }

echo "=============================================="
echo "  AgentHub Setup"
echo "  Project: $PROJECT_DIR"
echo "=============================================="
echo ""

log_info "Verificando dependencias del sistema..."
for cmd in python3 pip3 node npm curl; do
    if command -v "$cmd" &>/dev/null; then
        log_ok "$cmd $( $cmd --version 2>&1 | head -1 )"
    else
        log_err "$cmd no encontrado. Instálalo primero."
        exit 1
    fi
done

log_info "Verificando Hermes..."
if command -v hermes &>/dev/null; then
    HERMES_VER=$(hermes --version 2>&1 | head -1)
    log_ok "Hermes $HERMES_VER"
else
    log_err "Hermes CLI no encontrado"
    exit 1
fi

HERMES_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HERMES_PORT}/health" 2>/dev/null || echo "000")
if [ "$HERMES_HEALTH" = "200" ]; then
    log_ok "Hermes API Server corriendo en :${HERMES_PORT}"
else
    log_warn "Hermes API Server no responde en :${HERMES_PORT}"
    while IFS= read -r line; do
        log_info "$line"
    done < <(ensure_hermes_api_server)
    if hermes_api_health_ok; then
        log_ok "Hermes API Server habilitado y corriendo en :${HERMES_PORT}"
    else
        log_warn "Hermes API Server aún no disponible. Verifica con: hermes gateway status"
    fi
fi

log_info "Configurando entorno Python en explore-api/..."
if [ -d "$EXPLORE_API_DIR/.venv" ] && [ -f "$EXPLORE_API_DIR/.venv/bin/python" ]; then
    log_ok "Entorno virtual ya existe en $EXPLORE_API_DIR/.venv"
else
    log_info "Creando entorno virtual..."
    python3 -m venv "$EXPLORE_API_DIR/.venv"
    log_ok "Entorno virtual creado"
fi

PIP="$EXPLORE_API_DIR/.venv/bin/pip"

if [ -f "$EXPLORE_API_DIR/requirements.txt" ]; then
    log_info "Instalando requirements.txt..."
    "$PIP" install -r "$EXPLORE_API_DIR/requirements.txt" --quiet 2>/dev/null || {
        log_warn "Algunos paquetes fallaron. Reintentando..."
        "$PIP" install fastapi uvicorn httpx pyyaml --quiet 2>/dev/null || true
    }
    log_ok "Dependencias Python instaladas"
else
    log_warn "requirements.txt no encontrado. Instalando paquetes base..."
    "$PIP" install fastapi uvicorn httpx pyyaml --quiet 2>/dev/null || true
fi

log_info "Configurando frontend/..."
if [ -d "$FRONTEND_DIR/node_modules" ]; then
    log_ok "node_modules ya existe en frontend/"
else
    log_info "Instalando dependencias Node..."
    (cd "$FRONTEND_DIR" && npm install --silent 2>/dev/null) || {
        log_warn "npm install falló. Intentando con npm ci..."
        (cd "$FRONTEND_DIR" && npm ci --silent 2>/dev/null) || true
    }
    log_ok "Dependencias Node instaladas"
fi

log_info "Instalando templates como skills de Hermes..."
if [ -d "$SKILLS_DIR" ] && [ "$(ls -A "$SKILLS_DIR" 2>/dev/null)" ]; then
    log_ok "Templates ya instalados en $SKILLS_DIR"
else
    mkdir -p "$SKILLS_DIR"
    if [ -d "$TEMPLATES_DIR" ]; then
        cp -r "$TEMPLATES_DIR/"* "$SKILLS_DIR/" 2>/dev/null || true
    fi
    log_ok "Templates instalados en $SKILLS_DIR"
fi

log_info "Verificando hook agent-monitor..."
if [ -f "$HOOK_DIR/HOOK.yaml" ]; then
    log_ok "Hook agent-monitor ya instalado en $HOOK_DIR"
else
    mkdir -p "$HOOK_DIR"
    if [ -d "$HOOKS_DIR/agent-monitor" ]; then
        cp -r "$HOOKS_DIR/agent-monitor/"* "$HOOK_DIR/" 2>/dev/null || true
    fi
    log_ok "Hook agent-monitor instalado"
fi

log_info "Configurando CLI agenthub..."
CLI_PATH=$(install_agenthub_cli) && log_ok "CLI agenthub instalado en $CLI_PATH" || log_warn "No se pudo instalar el CLI en PATH — usa: python3 $PROJECT_DIR/scripts/agenthub.py"
if [[ ":$PATH:" != *":${HOME}/.local/bin:"* ]]; then
    log_warn "Asegúrate de tener ~/.local/bin en PATH"
fi

if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        log_ok ".env creado desde .env.example"
    else
        log_warn "No se encontró .env.example"
    fi
else
    log_ok ".env ya existe"
fi

echo ""
echo "=============================================="
echo -e "  ${GREEN}Setup completado${NC}"
echo "=============================================="
echo ""
echo "  Siguientes pasos:"
echo "    cd $PROJECT_DIR"
echo "    agenthub start    # Levanta Exploration API + Frontend"
echo "    agenthub status   # Verifica que todo esté corriendo"
echo "    agenthub wizard   # Crear un agente por CLI"
echo "    agenthub demo     # Demo automatizada"
echo ""
