#!/usr/bin/env bash
set -euo pipefail

PLUGIN_SRC="$(cd "$(dirname "$0")/../plugin/agenthub" && pwd)"

# Resolve HERMES_HOME: use env var, then active_profile, then default
if [ -z "${HERMES_HOME:-}" ]; then
  ACTIVE_PROFILE_FILE="$HOME/.hermes/active_profile"
  if [ -f "$ACTIVE_PROFILE_FILE" ]; then
    PROFILE_NAME="$(cat "$ACTIVE_PROFILE_FILE" | tr -d '[:space:]')"
    if [ -n "$PROFILE_NAME" ] && [ "$PROFILE_NAME" != "default" ]; then
      HERMES_HOME="$HOME/.hermes/profiles/$PROFILE_NAME"
    fi
  fi
fi
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"

PLUGIN_DST="$HERMES_HOME/plugins/agenthub"

# Idempotent install: wipe any previous copy so re-installs / upgrades don't
# fail with "cp: cannot create directory ... File exists" and never leave a
# mix of stale + new files behind.
rm -rf "$PLUGIN_DST"
mkdir -p "$PLUGIN_DST"
cp -r "$PLUGIN_SRC/"* "$PLUGIN_DST/"
echo "Installed to: $PLUGIN_DST"
echo "Run: hermes dashboard"
