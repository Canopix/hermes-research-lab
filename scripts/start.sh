#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting AgentHub ==="

# Ensure Hermes API Server is configured
if command -v hermes >/dev/null 2>&1; then
    if ! curl -fsS http://localhost:8642/health >/dev/null 2>&1; then
        echo "[PRE] Configuring Hermes API Server..."
        hermes config set api_server.enabled true || true
        hermes config set api_server.port 8642 || true
        hermes config set api_server.cors_origins '["http://localhost:3000"]' || true
        echo "[PRE] Hermes API Server configured. Start it in another terminal with: hermes gateway run"
    fi
fi

# Start Exploration API
echo "[1/2] Starting Exploration API on :8643..."
cd "$ROOT_DIR/explore-api"
. .venv/bin/activate
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8643 --reload \
    > /tmp/agenthub-api.log 2>&1 &
API_PID=$!
echo "  Exploration API PID: $API_PID"

# Start Frontend (if available)
if [ -f "$ROOT_DIR/frontend/package.json" ]; then
    echo "[2/2] Starting Frontend on :3000..."
    cd "$ROOT_DIR/frontend"
    nohup npm run dev > /tmp/agenthub-frontend.log 2>&1 &
    FE_PID=$!
    echo "  Frontend PID: $FE_PID"
else
    echo "[2/2] Frontend not available (P1 task pending)"
fi

echo ""
echo "=== AgentHub Running ==="
echo ""
echo "  Exploration API: http://localhost:8643"
echo "  Frontend:        http://localhost:3000 (if running)"
echo "  API docs:        http://localhost:8643/docs"
echo ""
echo "Logs:"
echo "  API:      tail -f /tmp/agenthub-api.log"
echo "  Frontend: tail -f /tmp/agenthub-frontend.log"
echo ""
echo "To stop:"
echo "  kill $API_PID"
