#!/usr/bin/env bash
set -euo pipefail

PLUGIN_SRC="$(cd "$(dirname "$0")/../plugin/agenthub" && pwd)"
PLUGIN_DST="$HOME/.hermes/plugins/agenthub"

mkdir -p "$PLUGIN_DST"
cp -r "$PLUGIN_SRC/"* "$PLUGIN_DST/"
echo "Installed. Run: hermes dashboard"
