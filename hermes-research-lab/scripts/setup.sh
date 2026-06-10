#!/usr/bin/env bash
set -euo pipefail

echo "=== AgentHub Setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check Python
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found"
    exit 1
fi

# Setup Exploration API
echo "[1/3] Setting up Exploration API..."
cd "$ROOT_DIR/explore-api"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
. .venv/bin/activate
pip install -r requirements.txt -q
echo "  Exploration API dependencies installed"

# Setup Frontend (if exists and has package.json)
echo "[2/3] Checking Frontend..."
if [ -f "$ROOT_DIR/frontend/package.json" ]; then
    cd "$ROOT_DIR/frontend"
    npm install --silent 2>/dev/null || echo "  WARNING: npm install failed (optional)"
else
    echo "  Frontend not yet initialized (P1 task)"
fi

# Copy hook to Hermes
echo "[3/3] Installing monitor hook..."
HERMES_HOOKS="$HOME/.hermes/hooks/agent-monitor"
mkdir -p "$HERMES_HOOKS"
cp "$ROOT_DIR/hooks/agent-monitor/HOOK.yaml" "$HERMES_HOOKS/"
cp "$ROOT_DIR/hooks/agent-monitor/handler.py" "$HERMES_HOOKS/"
echo "  Monitor hook installed to $HERMES_HOOKS"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To start AgentHub:"
echo "  bash scripts/start.sh"
