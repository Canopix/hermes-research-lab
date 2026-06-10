#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BASE_DIR="/root/agenthub"
EXPLORE_API_DIR="$BASE_DIR/explore-api"
FRONTEND_DIR="$BASE_DIR/frontend"
SKILLS_DIR="$HOME/.hermes/skills/agenthub-templates"
HOOK_DIR="$HOME/.hermes/hooks/agent-monitor"

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

HERMES_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8642/health 2>/dev/null || echo "000")
if [ "$HERMES_HEALTH" = "200" ]; then
    log_ok "Hermes API Server corriendo en :8642"
else
    log_warn "Hermes API Server no responde en :8642"
    log_info "Intentando habilitarlo..."
    hermes config set api_server.enabled true 2>/dev/null || true
    sleep 1
    HERMES_HEALTH2=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8642/health 2>/dev/null || echo "000")
    if [ "$HERMES_HEALTH2" = "200" ]; then
        log_ok "Hermes API Server habilitado y corriendo"
    else
        log_warn "Hermes API Server no disponible. Los scripts seguirán pero algunos features pueden fallar."
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
if [ -d "$SKILLS_DIR" ]; then
    log_ok "Templates ya instalados en $SKILLS_DIR"
else
    mkdir -p "$SKILLS_DIR"
    if [ -d "$BASE_DIR/templates" ]; then
        cp -r "$BASE_DIR/templates/"* "$SKILLS_DIR/" 2>/dev/null || true
    fi
    log_ok "Templates instalados en $SKILLS_DIR"
fi

log_info "Verificando hook agent-monitor..."
if [ -f "$HOOK_DIR/HOOK.yaml" ]; then
    log_ok "Hook agent-monitor ya instalado en $HOOK_DIR"
else
    mkdir -p "$HOOK_DIR"
    if [ -d "$BASE_DIR/hooks" ]; then
        cp -r "$BASE_DIR/hooks/"* "$HOOK_DIR/" 2>/dev/null || true
    fi
    log_ok "Hook agent-monitor instalado"
fi

log_info "Configurando CLI agenthub..."
chmod +x "$BASE_DIR/scripts/agenthub.py"
ln -sf "$BASE_DIR/scripts/agenthub.py" /usr/local/bin/agenthub
log_ok "CLI agenthub instalado en /usr/local/bin/agenthub"

if [ ! -f "$BASE_DIR/.env" ]; then
    if [ -f "$BASE_DIR/.env.example" ]; then
        cp "$BASE_DIR/.env.example" "$BASE_DIR/.env"
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
echo "    cd $BASE_DIR"
echo "    agenthub start    # Levanta Exploration API + Frontend"
echo "    agenthub status   # Verifica que todo esté corriendo"
echo "    agenthub demo     # Ejecuta demo para el jurado"
echo ""
