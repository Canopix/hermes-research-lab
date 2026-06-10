#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting AgentHub ==="

# Ensure the Hermes API Server (:8642) is enabled. NOTE: the api_server platform
# is enabled via env vars at `hermes gateway run` time, not config keys.
if command -v hermes >/dev/null 2>&1; then
    if ! curl -fsS http://localhost:8642/health >/dev/null 2>&1; then
        echo "  Hermes API Server not running. Start it with:"
        echo "    API_SERVER_ENABLED=true API_SERVER_KEY=<key> API_SERVER_PORT=8642 \\"
        echo "      API_SERVER_CORS_ORIGINS=http://localhost:3000 hermes gateway run"
    fi
fi

echo ""
echo "AgentHub is being re-platformed as a Hermes dashboard plugin."
echo "See docs/hermes-ui-integration.md. Open the dashboard with: hermes dashboard"
