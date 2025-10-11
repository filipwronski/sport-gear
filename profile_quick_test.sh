#!/bin/bash

# =============================================================================
# Profile Management API - Quick Availability Test
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/profile"
MOCK_TOKEN="test-token"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Profile API Quick Test${NC}"
echo "Testing endpoints availability..."

# Test server
echo -n "Server health: "
if curl -s "$BASE_URL" > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ FAIL${NC}"
    exit 1
fi

# Test GET /api/profile
echo -n "GET /api/profile: "
response=$(curl -s -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    "$API_BASE")
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo -e "${GREEN}✅ OK ($response)${NC}"
else
    echo -e "${RED}❌ FAIL ($response)${NC}"
fi

# Test PUT /api/profile
echo -n "PUT /api/profile: "
response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X PUT \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"display_name": "Quick Test"}' \
    "$API_BASE")
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo -e "${GREEN}✅ OK ($response)${NC}"
else
    echo -e "${RED}❌ FAIL ($response)${NC}"
fi

# Test GET /api/profile/export
echo -n "GET /api/profile/export: "
response=$(curl -s -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    "$API_BASE/export")
if [ "$response" = "200" ] || [ "$response" = "404" ]; then
    echo -e "${GREEN}✅ OK ($response)${NC}"
else
    echo -e "${RED}❌ FAIL ($response)${NC}"
fi

# Test authentication
echo -n "Auth required: "
response=$(curl -s -w "%{http_code}" -o /dev/null "$API_BASE")
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✅ OK (401)${NC}"
else
    echo -e "${RED}❌ FAIL ($response)${NC}"
fi

echo -e "\n${BLUE}Quick test completed!${NC}"
