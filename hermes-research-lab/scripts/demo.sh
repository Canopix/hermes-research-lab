#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== AgentHub Demo ==="
echo ""

# Check if API is running
if ! curl -s http://localhost:8643/health > /dev/null 2>&1; then
    echo "Exploration API not running. Starting..."
    bash "$SCRIPT_DIR/start.sh"
    sleep 3
fi

echo "=== System Overview ==="
curl -s http://localhost:8643/api/system/overview | python3 -m json.tool
echo ""

echo "=== Profiles ==="
curl -s http://localhost:8643/api/system/profiles | python3 -m json.tool
echo ""

echo "=== Templates ==="
curl -s http://localhost:8643/api/templates | python3 -m json.tool
echo ""

echo "=== Hooks ==="
curl -s http://localhost:8643/api/system/hooks | python3 -m json.tool
echo ""

echo "=== MCP Servers ==="
curl -s http://localhost:8643/api/system/mcp-servers | python3 -m json.tool
echo ""

echo "=== Demo Complete ==="
