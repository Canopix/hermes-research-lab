#!/usr/bin/env bash
# Shared paths for AgentHub scripts — source from any script in this directory.

_common_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$_common_dir/.." && pwd)"
EXPLORE_API_DIR="$PROJECT_DIR/explore-api"
FRONTEND_DIR="$PROJECT_DIR/frontend"
TEMPLATES_DIR="$PROJECT_DIR/templates"
HOOKS_DIR="$PROJECT_DIR/hooks"
SKILLS_DIR="${HOME}/.hermes/skills/agenthub-templates"
HOOK_DIR="${HOME}/.hermes/hooks/agent-monitor"

HERMES_PORT=8642
EXPLORE_PORT=8643
FRONTEND_PORT=3000
HERMES_CONFIG="${HOME}/.hermes/config.yaml"
HERMES_API_KEY_DEFAULT="agenthub-local"

# Install agenthub CLI symlink (prefers ~/.local/bin, falls back to /usr/local/bin)
install_agenthub_cli() {
    local cli="$PROJECT_DIR/scripts/agenthub.py"
    chmod +x "$cli"

    if mkdir -p "${HOME}/.local/bin" 2>/dev/null; then
        ln -sf "$cli" "${HOME}/.local/bin/agenthub"
        echo "${HOME}/.local/bin/agenthub"
        return 0
    fi

    if [ -d /usr/local/bin ] && [ -w /usr/local/bin ]; then
        ln -sf "$cli" /usr/local/bin/agenthub
        echo "/usr/local/bin/agenthub"
        return 0
    fi

    return 1
}

# True if something is listening on the given port
port_in_use() {
    lsof -ti:"$1" &>/dev/null
}

# True when Hermes API Server responds on /health
hermes_api_health_ok() {
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${HERMES_PORT}/health" 2>/dev/null || echo "000")
    [ "$code" = "200" ]
}

# Read API_SERVER_ENABLED from ~/.hermes/config.yaml
hermes_api_enabled_in_config() {
    [ -f "$HERMES_CONFIG" ] && grep -qE '^API_SERVER_ENABLED:\s*(true|True|yes|1)' "$HERMES_CONFIG" 2>/dev/null
}

# Ensure Hermes API Server is enabled and responding.
# Prints status lines to stdout; returns 0 on success.
ensure_hermes_api_server() {
    if ! command -v hermes &>/dev/null; then
        echo "Hermes CLI no encontrado — instala Hermes Agent primero"
        return 1
    fi

    if hermes_api_health_ok; then
        return 0
    fi

    if hermes_api_enabled_in_config; then
        echo "API Server habilitado en config pero no responde en :${HERMES_PORT}"
    else
        echo "API Server deshabilitado — habilitando en ~/.hermes/config.yaml..."
        hermes config set API_SERVER_ENABLED true 2>/dev/null || {
            echo "No se pudo habilitar API_SERVER_ENABLED"
            return 1
        }
        hermes config set API_SERVER_PORT "$HERMES_PORT" 2>/dev/null || true
        hermes config set API_SERVER_KEY "$HERMES_API_KEY_DEFAULT" 2>/dev/null || true
        hermes config set API_SERVER_CORS_ORIGINS "http://localhost:${FRONTEND_PORT}" 2>/dev/null || true
    fi

    if ! grep -qE '^API_SERVER_KEY:' "$HERMES_CONFIG" 2>/dev/null; then
        hermes config set API_SERVER_KEY "$HERMES_API_KEY_DEFAULT" 2>/dev/null || true
    fi

    echo "Reiniciando Hermes gateway para activar API Server..."
    hermes gateway restart 2>/dev/null || hermes gateway start 2>/dev/null || {
        echo "No se pudo reiniciar el gateway — ejecuta: hermes gateway restart"
        return 1
    }

    local attempt
    for attempt in 1 2 3 4 5 6; do
        sleep 2
        if hermes_api_health_ok; then
            return 0
        fi
    done

    echo "Gateway reiniciado pero :${HERMES_PORT}/health sigue sin responder"
    echo "Revisa: hermes gateway status  |  tail -f ~/.hermes/logs/gateway.log"
    return 1
}

explore_api_deps_ready() {
    [ -f "$EXPLORE_API_DIR/.venv/bin/python" ] && \
        "$EXPLORE_API_DIR/.venv/bin/python" -c "import uvicorn, fastapi" 2>/dev/null
}

frontend_deps_ready() {
    [ -f "$FRONTEND_DIR/package.json" ] && \
        [ -x "$FRONTEND_DIR/node_modules/.bin/next" ]
}

project_deps_ready() {
    explore_api_deps_ready && frontend_deps_ready
}

# Install Python + Node deps if missing (runs setup.sh)
ensure_project_deps() {
    if project_deps_ready && [ -f "$PROJECT_DIR/.env" ]; then
        return 0
    fi

    echo "Dependencias de AgentHub no instaladas — ejecutando setup..."
    bash "$PROJECT_DIR/scripts/setup.sh" || return 1

    if ! project_deps_ready; then
        echo "Setup terminó pero faltan dependencias — revisa los errores arriba"
        return 1
    fi
    return 0
}

log_file_tail() {
    local file="$1"
    local lines="${2:-3}"
    if [ -f "$file" ]; then
        tail -n "$lines" "$file" | sed 's/^/      /'
    fi
}
