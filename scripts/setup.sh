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

# Copy hook to Hermes
echo "[1/1] Installing monitor hook..."
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
