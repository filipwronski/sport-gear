#!/bin/bash

# Weather Forecast API Test Script
# Tests the GET /api/weather/forecast endpoint

set -e

BASE_URL="http://localhost:3000"
ENDPOINT="/api/weather/forecast"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0

echo -e "${BLUE}=== Weather Forecast API Test Suite ===${NC}"
echo "Testing endpoint: ${BASE_URL}${ENDPOINT}"
echo ""

# Helper function to run test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_args="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Test $TOTAL_TESTS: $test_name${NC}"
    
    # Run curl and capture status code
    response=$(curl -s -w "\n%{http_code}" $curl_args "${BASE_URL}${ENDPOINT}" || true)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    echo "Status Code: $status_code"
    echo "Response: $body" | head -c 200
    if [ ${#body} -gt 200 ]; then echo "..."; fi
    echo ""
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED (expected $expected_status, got $status_code)${NC}"
    fi
    echo "----------------------------------------"
}

# Test 1: Missing Authorization header
run_test "Missing Authorization header" "401" ""

# Test 2: Invalid token
run_test "Invalid Authorization token" "401" "-H 'Authorization: Bearer invalid-token'"

# Test 3: Missing location_id parameter (with mock token)
run_test "Missing location_id parameter" "400" "-H 'Authorization: Bearer mock-jwt-token'"

# Test 4: Invalid UUID format (with mock token)
run_test "Invalid UUID format" "400" "-H 'Authorization: Bearer mock-jwt-token' -G -d 'location_id=invalid-uuid'"

# Test 5: Valid request with mock data (with mock token and mock location)
# Note: This will likely fail with 404 unless mock location exists
run_test "Valid request with mock location" "200" "-H 'Authorization: Bearer mock-jwt-token' -G -d 'location_id=550e8400-e29b-41d4-a716-446655440000'"

# Test 6: Method not allowed - POST
run_test "POST method not allowed" "405" "-X POST -H 'Authorization: Bearer mock-jwt-token'"

# Test 7: Method not allowed - PUT  
run_test "PUT method not allowed" "405" "-X PUT -H 'Authorization: Bearer mock-jwt-token'"

# Test 8: Method not allowed - DELETE
run_test "DELETE method not allowed" "405" "-X DELETE -H 'Authorization: Bearer mock-jwt-token'"

echo ""
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Total tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}$((TOTAL_TESTS - PASSED_TESTS))${NC}"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    exit 1
fi
