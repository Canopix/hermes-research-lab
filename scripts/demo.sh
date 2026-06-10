#!/usr/bin/env bash
# =============================================================================
# AgentHub — Demo Script
# =============================================================================
# Runs a comprehensive demo against the Exploration API.
# Shows system status, profiles, templates, hooks, and activity.
#
# Usage:
#   bash scripts/demo.sh              # Run full demo
#   bash scripts/demo.sh --quick      # Run quick health-check only
#   bash scripts/demo.sh --help       # Show this help
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Help ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" ]]; then
    sed -n '2,12p' "$0"
    exit 0
fi

QUICK_MODE=false
[[ "${1:-}" == "--quick" ]] && QUICK_MODE=true

# ── Config ──────────────────────────────────────────────────────────────────
EXPLORE_URL="${NEXT_PUBLIC_EXPLORE_URL:-http://localhost:8643}"
FRONTEND_URL="${NEXT_PUBLIC_HERMES_URL:-http://localhost:8642}"

header()  { echo -e "\n${BOLD}${BLUE}═══ $* ═══${NC}" ; }
success() { echo -e "  ${GREEN}✓${NC} $*" ; }
info()    { echo -e "  ${CYAN}→${NC} $*" ; }
warn()    { echo -e "  ${YELLOW}⚠${NC} $*" ; }
fail()    { echo -e "  ${RED}✕${NC} $*" ; }

call_api() {
    local url="$1" label="${2:-}"
    local result
    result=$(curl -sS --max-time 5 "$url" 2>&1) || {
        fail "${label:-$url} — $result"
        return 1
    }
    echo "$result"
    return 0
}

# ── Startup ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "    _          _   _           _    _           _   "
echo "   / \   Usage | | | |_ __ ___| |__| |__  _   _| |_ "
echo "  / _ \  | |  | | | '__/ _ \ '_ \ '_ \| | | | __|"
echo " / ___ \ |_|  |_| | | |  __/ | | |_) | |_| | |_ "
echo "/_/   \_\__,_|\__,_|_|  \___|_| |_.__/ \__,_|\__|"
echo -e "${NC}"
echo -e "  ${BOLD}AgentHub${NC} — ${YELLOW}Demo Mode${NC}"
echo ""

# ── Health check ────────────────────────────────────────────────────────────
header "1. Health Check"
EXPLORE_HEALTH=$(call_api "${EXPLORE_URL}/health" "Exploration API") && {
    echo "   $EXPLORE_HEALTH" | python3 -m json.tool 2>/dev/null || echo "   $EXPLORE_HEALTH"
    success "Exploration API is running on ${EXPLORE_URL}"
} || {
    warn "Exploration API not running at ${EXPLORE_URL}"
    warn "Start it with: bash scripts/start.sh"
}

HERMES_HEALTH=$(call_api "${FRONTEND_URL}/health/detailed" "Hermes API" 2>/dev/null) && {
    success "Hermes API is running on ${FRONTEND_URL}"
} || {
    warn "Hermes API not running at ${FRONTEND_URL}"
}

if $QUICK_MODE; then
    echo ""
    echo -e "${BOLD}${GREEN}Quick check complete.${NC}"
    exit 0
fi

# ── System Overview ─────────────────────────────────────────────────────────
header "2. System Overview"
OVERVIEW=$(call_api "${EXPLORE_URL}/api/system/overview" "System Overview") || true
if [[ -n "$OVERVIEW" ]]; then
    echo "$OVERVIEW" | python3 -m json.tool
    PROFILES_COUNT=$(echo "$OVERVIEW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('profiles',[])))" 2>/dev/null || echo "?")
    TEMPLATES_COUNT=$(echo "$OVERVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('templates_count','?'))" 2>/dev/null || echo "?")
    SKILLS_COUNT=$(echo "$OVERVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_skills','?'))" 2>/dev/null || echo "?")
    echo ""
    info "Profiles: ${PROFILES_COUNT}  |  Templates: ${TEMPLATES_COUNT}  |  Skills: ${SKILLS_COUNT}"
fi

# ── Profiles ────────────────────────────────────────────────────────────────
header "3. Profiles"
PROFILES=$(call_api "${EXPLORE_URL}/api/system/profiles" "Profiles") || true
if [[ -n "$PROFILES" ]]; then
    COUNT=$(echo "$PROFILES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    if [[ "$COUNT" -gt 0 ]]; then
        echo "$PROFILES" | python3 -m json.tool | head -60
        info "Displaying profiles (${COUNT} total)"
    else
        info "No Hermes profiles configured yet."
        info "Create one with Hermes CLI, then profiles will appear here."
    fi
fi

# ── Templates ───────────────────────────────────────────────────────────────
header "4. Agent Templates"
TEMPLATES=$(call_api "${EXPLORE_URL}/api/templates" "Templates") || true
if [[ -n "$TEMPLATES" ]]; then
    COUNT=$(echo "$TEMPLATES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
    if [[ "$COUNT" -gt 0 ]]; then
        echo "$TEMPLATES" | python3 -m json.tool
        info "Available templates: ${COUNT}"

        # Show first template detail
        FIRST_ID=$(echo "$TEMPLATES" | python3 -c "
import sys,json
t=json.load(sys.stdin)
if t: print(t[0]['id'])
" 2>/dev/null || echo "")
        if [[ -n "$FIRST_ID" ]]; then
            header "4b. Template Detail: ${FIRST_ID}"
            DETAIL=$(call_api "${EXPLORE_URL}/api/templates/${FIRST_ID}" "${FIRST_ID}") || true
            [[ -n "$DETAIL" ]] && echo "$DETAIL" | python3 -m json.tool

            header "4c. Template Preview: ${FIRST_ID}"
            PREVIEW=$(call_api "${EXPLORE_URL}/api/templates/${FIRST_ID}/preview?topics=LLM%2C+agents&sources=all&max_results=5" "Preview") || true
            [[ -n "$PREVIEW" ]] && echo "$PREVIEW" | python3 -m json.tool
        fi
    else
        info "No templates loaded. Templates are bundled as SKILL.md files in templates/"
    fi
fi

# ── Hooks ───────────────────────────────────────────────────────────────────
header "5. Gateway Hooks"
HOOKS=$(call_api "${EXPLORE_URL}/api/system/hooks" "Hooks") || true
if [[ -n "$HOOKS" ]]; then
    echo "$HOOKS" | python3 -m json.tool
fi

# ── MCP Servers ─────────────────────────────────────────────────────────────
header "6. MCP Servers"
MCP=$(call_api "${EXPLORE_URL}/api/system/mcp-servers" "MCP Servers") || true
if [[ -n "$MCP" ]]; then
    echo "$MCP" | python3 -m json.tool
fi

# ── Activity ────────────────────────────────────────────────────────────────
header "7. Recent Activity"
ACTIVITY=$(call_api "${EXPLORE_URL}/api/system/activity?limit=5" "Activity") || true
if [[ -n "$ACTIVITY" ]]; then
    echo "$ACTIVITY" | python3 -m json.tool
fi

# ── Frontend check ──────────────────────────────────────────────────────────
header "8. Frontend"
FRONTEND_BUILD_DIR="${ROOT_DIR}/frontend/.next"
if [[ -d "$FRONTEND_BUILD_DIR" ]]; then
    success "Frontend built (production build available in frontend/.next)"
    info "Start with: cd frontend && npm run start"
    info "Dev mode:   cd frontend && npm run dev"
else
    warn "Frontend not built yet. Build it: cd frontend && npm run build"
fi

# ── Summary ─────────────────────────────────────────────────────────────────
header "Demo Complete"
echo ""
echo -e "  ${BOLD}Key URLs:${NC}"
echo -e "    ${CYAN}Exploration API:${NC}  ${EXPLORE_URL}"
echo -e "    ${CYAN}API Docs:${NC}         ${EXPLORE_URL}/docs"
echo -e "    ${CYAN}Frontend:${NC}         http://localhost:3000"
echo -e "    ${CYAN}Hermes API:${NC}       ${FRONTEND_URL}"
echo ""
echo -e "  ${BOLD}Quick Links:${NC}"
echo -e "    ${BLUE}Health:${NC}           ${EXPLORE_URL}/health"
echo -e "    ${BLUE}Overview:${NC}         ${EXPLORE_URL}/api/system/overview"
echo -e "    ${BLUE}Templates:${NC}        ${EXPLORE_URL}/api/templates"
echo ""

if ! command -v python3 &>/dev/null; then
    echo -e "  ${YELLOW}Note:${NC} Install python3 for pretty-printed JSON output."
fi
echo -e "${GREEN}AgentHub is ready.${NC}"