#!/bin/bash

# =============================================================================
# Recommendations API Test Script
# Tests the GET /api/recommendations endpoint with various scenarios
# =============================================================================

BASE_URL="http://localhost:3000"
ENDPOINT="/api/recommendations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Mock data from general.md
MOCK_USER_ID="550e8400-e29b-41d4-a716-446655440000"
MOCK_TOKEN="test-token"

echo -e "${BLUE}=== Recommendations API Test Suite ===${NC}"
echo "Testing endpoint: ${BASE_URL}${ENDPOINT}"
echo ""

# Helper function to run test
run_test() {
    local test_name="$1"
    local url="$2"
    local expected_status="$3"
    local auth_header="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}Test ${TOTAL_TESTS}: ${test_name}${NC}"
    
    if [ -n "$auth_header" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -H "$auth_header" "$url")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url")
    fi
    
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    status=$(echo "$response" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Status: $status"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Pretty print JSON response if it's valid JSON
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo "$body" | jq . | head -20
        else
            echo "$body"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $status"
        echo "Response: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# First, let's check if the server is running
echo -e "${BLUE}Checking if server is running...${NC}"
server_check=$(curl -s -w "HTTPSTATUS:%{http_code}" "${BASE_URL}/")
server_status=$(echo "$server_check" | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

if [ "$server_status" != "200" ]; then
    echo -e "${RED}❌ Server is not running on ${BASE_URL}${NC}"
    echo "Please start the development server with: npm run dev"
    exit 1
fi

echo -e "${GREEN}✓ Server is running${NC}"
echo ""

# We need to create a test location first
echo -e "${BLUE}Setting up test data...${NC}"

# Create test location (we'll assume this exists from previous tests)
# For now, we'll use a hardcoded location ID that should exist
TEST_LOCATION_ID="550e8400-e29b-41d4-a716-446655440001"

echo -e "${YELLOW}Using test location ID: ${TEST_LOCATION_ID}${NC}"
echo ""

# =============================================================================
# Test Cases
# =============================================================================

# Test 1: Missing authentication
run_test "Missing authentication" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}" \
    "401"

# Test 2: Missing required parameters
run_test "Missing location_id parameter" \
    "${BASE_URL}${ENDPOINT}" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 3: Invalid UUID format
run_test "Invalid UUID format for location_id" \
    "${BASE_URL}${ENDPOINT}?location_id=invalid-uuid" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 4: Invalid activity type
run_test "Invalid activity type" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&activity_type=invalid" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 5: Invalid duration (too low)
run_test "Invalid duration (too low)" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&duration_minutes=5" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 6: Invalid duration (too high)
run_test "Invalid duration (too high)" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&duration_minutes=700" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 7: Invalid date format
run_test "Invalid date format" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&date=2023-13-40" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 8: Date too far in future
run_test "Date too far in future" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&date=2025-12-31T12:00:00Z" \
    "400" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 9: Valid request - basic (current weather)
run_test "Valid basic request (current weather)" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}" \
    "200" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 10: Valid request with all parameters
run_test "Valid request with all parameters" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&activity_type=tempo&duration_minutes=120" \
    "200" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 11: Valid request with forecast date
tomorrow=$(date -d "tomorrow" -u +"%Y-%m-%dT12:00:00Z")
run_test "Valid request with forecast date" \
    "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&date=${tomorrow}" \
    "200" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# Test 12: Different activity types
for activity in "recovery" "spokojna" "tempo" "interwaly"; do
    run_test "Valid request with activity: ${activity}" \
        "${BASE_URL}${ENDPOINT}?location_id=${TEST_LOCATION_ID}&activity_type=${activity}" \
        "200" \
        "Authorization: Bearer ${MOCK_TOKEN}"
done

# Test 13: Non-existent location (should return 404)
run_test "Non-existent location" \
    "${BASE_URL}${ENDPOINT}?location_id=00000000-0000-0000-0000-000000000000" \
    "404" \
    "Authorization: Bearer ${MOCK_TOKEN}"

# =============================================================================
# Summary
# =============================================================================

echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Total tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi
