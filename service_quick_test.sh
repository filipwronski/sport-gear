#!/bin/bash

# =============================================================================
# Service Records API - Quick Test Script
# Fast availability check for service endpoints
# =============================================================================

BASE_URL="http://localhost:3000"
MOCK_TOKEN="test-token"
TEST_BIKE_ID="550e8400-e29b-41d4-a716-446655440001"  # Assume existing bike

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Service API Quick Test${NC}"
echo "======================"

# Test 1: GET services (should work even with empty list)
echo -n "GET /api/bikes/{bikeId}/services ... "
response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    "$BASE_URL/api/bikes/$TEST_BIKE_ID/services")

status="${response: -3}"
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    echo -e "${GREEN}✓ OK${NC} ($status)"
else
    echo -e "${RED}✗ FAIL${NC} ($status)"
fi

# Test 2: POST service (should validate input)
echo -n "POST /api/bikes/{bikeId}/services (validation) ... "
response=$(curl -s -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"invalid": "data"}' \
    "$BASE_URL/api/bikes/$TEST_BIKE_ID/services")

status="${response: -3}"
if [ "$status" = "400" ] || [ "$status" = "422" ] || [ "$status" = "404" ]; then
    echo -e "${GREEN}✓ OK${NC} ($status - validation working)"
else
    echo -e "${RED}✗ FAIL${NC} ($status)"
fi

# Test 3: GET service stats
echo -n "GET /api/bikes/{bikeId}/services/stats ... "
response=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $MOCK_TOKEN" \
    "$BASE_URL/api/bikes/$TEST_BIKE_ID/services/stats")

status="${response: -3}"
if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    echo -e "${GREEN}✓ OK${NC} ($status)"
else
    echo -e "${RED}✗ FAIL${NC} ($status)"
fi

# Test 4: Authentication check
echo -n "Authentication check (no token) ... "
response=$(curl -s -w "%{http_code}" \
    "$BASE_URL/api/bikes/$TEST_BIKE_ID/services")

status="${response: -3}"
if [ "$status" = "401" ]; then
    echo -e "${GREEN}✓ OK${NC} (401 - auth required)"
else
    echo -e "${RED}✗ FAIL${NC} ($status)"
fi

echo ""
echo "Quick test completed. Run './service_test_api.sh' for comprehensive tests."
