#!/bin/bash
# EdgeMind InfluxDB Database Administration Script
# Quick admin commands for the conference demo InfluxDB instance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_URL="${EDGEMIND_URL:-https://edge-mind.concept-reply-sandbox.com}"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
confirm() {
    local prompt="$1"
    echo ""
    echo -e "${RED}  WARNING: $prompt${NC}"
    echo ""
    read -p "  Type 'yes' to confirm: " response
    if [ "$response" != "yes" ]; then
        echo -e "${YELLOW}  Aborted.${NC}"
        exit 0
    fi
}

api_get() {
    local endpoint="$1"
    local response
    response=$(curl -s -w "\n%{http_code}" "${BASE_URL}${endpoint}")
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "$body"
    else
        echo -e "${RED}  ERROR: HTTP $http_code from ${endpoint}${NC}" >&2
        echo "$body" >&2
        return 1
    fi
}

api_post() {
    local endpoint="$1"
    local data="$2"
    local response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${endpoint}")
    fi
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "$body"
    else
        echo -e "${RED}  ERROR: HTTP $http_code from ${endpoint}${NC}" >&2
        echo "$body" >&2
        return 1
    fi
}

# -----------------------------------------------------------------------------
# Commands
# -----------------------------------------------------------------------------
cmd_info() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}  EdgeMind DB Info${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}  Target: ${BASE_URL}${NC}"
    echo ""

    echo -e "${YELLOW}  Fetching database info...${NC}"
    local result
    if result=$(api_get "/api/admin/db-info"); then
        echo ""
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        echo ""
        echo -e "${GREEN}  Done.${NC}"
    fi
}

cmd_clear() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}  EdgeMind DB Clear${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}  Target: ${BASE_URL}${NC}"

    confirm "This will DELETE ALL DATA from InfluxDB."

    echo ""
    echo -e "${YELLOW}  Clearing database...${NC}"
    local result
    if result=$(api_post "/api/admin/clear-db"); then
        echo ""
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        echo ""
        echo -e "${GREEN}  Database cleared.${NC}"
    fi
}

cmd_retention() {
    local hours="$1"

    if [ -z "$hours" ]; then
        echo -e "${RED}  ERROR: Specify retention hours. Usage: $0 retention <hours>${NC}"
        exit 1
    fi

    echo ""
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}  EdgeMind DB Retention${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}  Target: ${BASE_URL}${NC}"
    echo -e "${YELLOW}  Setting retention to ${hours} hours...${NC}"
    echo ""

    local result
    if result=$(api_post "/api/admin/set-retention" "{\"hours\": $hours}"); then
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
        echo ""
        echo -e "${GREEN}  Retention updated to ${hours}h.${NC}"
    fi
}

cmd_fix_prod() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}  EdgeMind Fix Production DB${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}  Target: ${BASE_URL}${NC}"
    echo ""
    echo "  This will:"
    echo "    1. Set retention to 48 hours"
    echo "    2. Clear all existing data"
    echo "    3. Show final DB status"

    confirm "This will SET RETENTION and DELETE ALL DATA."

    echo ""
    echo -e "${YELLOW}  [1/3] Setting retention to 48h...${NC}"
    if api_post "/api/admin/set-retention" '{"hours": 48}' > /dev/null; then
        echo -e "${GREEN}    OK${NC}"
    else
        echo -e "${RED}    Failed to set retention. Aborting.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}  [2/3] Clearing database...${NC}"
    if api_post "/api/admin/clear-db" > /dev/null; then
        echo -e "${GREEN}    OK${NC}"
    else
        echo -e "${RED}    Failed to clear database. Aborting.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}  [3/3] Fetching final status...${NC}"
    echo ""
    local result
    if result=$(api_get "/api/admin/db-info"); then
        echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
    fi

    echo ""
    echo -e "${GREEN}  Production DB fixed. 48h retention, clean slate.${NC}"
}

usage() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${BLUE}  EdgeMind DB Admin${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo "  Usage: $0 <command> [args]"
    echo ""
    echo "  Commands:"
    echo "    info              Show DB bucket info & retention"
    echo "    clear             Clear all data (with confirmation)"
    echo "    retention <hrs>   Set retention period in hours"
    echo "    fix-prod          One-shot: 48h retention + clear + status"
    echo ""
    echo "  Environment:"
    echo "    EDGEMIND_URL      Override base URL (default: ${BASE_URL})"
    echo ""
    echo "  Examples:"
    echo "    $0 info"
    echo "    $0 clear"
    echo "    $0 retention 48"
    echo "    $0 fix-prod"
    echo "    EDGEMIND_URL=http://localhost:3000 $0 info"
    echo ""
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
case "${1:-}" in
    info)       cmd_info ;;
    clear)      cmd_clear ;;
    retention)  cmd_retention "$2" ;;
    fix-prod)   cmd_fix_prod ;;
    *)          usage ;;
esac
