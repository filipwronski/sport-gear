#!/bin/bash

# =============================================================================
# Bike Management API - cURL Test Suite
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/bikes"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_test() {
    echo -e "\n${YELLOW}Test: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ PASS: $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ FAIL: $1${NC}"
    ((TESTS_FAILED++))
}

print_summary() {
    echo -e "\n${BLUE}=== Test Summary ===${NC}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo -e "Total: $((TESTS_PASSED + TESTS_FAILED))"
}

# =============================================================================
# Test Authentication
# =============================================================================

print_header "Authentication Tests"

print_test "GET /api/bikes without auth token"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response "${API_BASE}")
http_code="${response: -3}"
if [ "$http_code" = "401" ]; then
    print_success "Returns 401 Unauthorized without token"
else
    print_error "Expected 401, got $http_code"
fi

print_test "GET /api/bikes with invalid token"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "Authorization: Bearer invalid-token" \
    "${API_BASE}")
http_code="${response: -3}"
if [ "$http_code" = "401" ]; then
    print_success "Returns 401 Unauthorized with invalid token"
else
    print_error "Expected 401, got $http_code"
fi

# =============================================================================
# Mock Authentication Setup
# =============================================================================

print_header "Setting up Mock Authentication"

# Note: In a real scenario, you would get this token from Supabase auth
# For testing purposes, we'll use a mock token that bypasses auth
# You need to temporarily modify middleware or use a test environment

MOCK_TOKEN="test-jwt-token"
AUTH_HEADER="Authorization: Bearer ${MOCK_TOKEN}"

echo -e "${YELLOW}Note: These tests require a valid JWT token from Supabase Auth.${NC}"
echo -e "${YELLOW}To run these tests properly:${NC}"
echo -e "${YELLOW}1. Get a real JWT token from your Supabase project${NC}"
echo -e "${YELLOW}2. Replace MOCK_TOKEN variable above${NC}"
echo -e "${YELLOW}3. Or set up test user authentication${NC}"

# =============================================================================
# CRUD Operations Tests (with mock token - will fail without real auth)
# =============================================================================

print_header "CRUD Operations Tests (Mock Token)"

# Test 1: GET /api/bikes (empty list)
print_test "GET /api/bikes - should return empty list"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

# Test 2: POST /api/bikes - create new bike
print_test "POST /api/bikes - create new bike"
bike_data='{
    "name": "Trek Domane Test",
    "type": "szosowy",
    "purchase_date": "2023-05-15T12:00:00Z",
    "current_mileage": 1000,
    "notes": "Test bike from cURL"
}'

response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$bike_data" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

# Extract bike ID for subsequent tests (if creation was successful)
if [ "$http_code" = "201" ]; then
    BIKE_ID=$(cat /tmp/curl_response | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "Created bike ID: $BIKE_ID"
fi

# Test 3: GET /api/bikes - should now return the created bike
print_test "GET /api/bikes - should return created bike"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

# Test 4: PUT /api/bikes/{id} - update bike (only if we have bike ID)
if [ ! -z "$BIKE_ID" ]; then
    print_test "PUT /api/bikes/{id} - update bike"
    update_data='{
        "name": "Trek Domane Updated",
        "current_mileage": 1500,
        "notes": "Updated from cURL test"
    }'
    
    response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
        -X PUT \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$update_data" \
        "${API_BASE}/${BIKE_ID}")
    http_code="${response: -3}"
    echo "Response: $(cat /tmp/curl_response)"
    echo "HTTP Code: $http_code"
fi

# Test 5: PATCH /api/bikes/{id}/mileage - update mileage
if [ ! -z "$BIKE_ID" ]; then
    print_test "PATCH /api/bikes/{id}/mileage - update mileage"
    mileage_data='{"current_mileage": 2000}'
    
    response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
        -X PATCH \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$mileage_data" \
        "${API_BASE}/${BIKE_ID}/mileage")
    http_code="${response: -3}"
    echo "Response: $(cat /tmp/curl_response)"
    echo "HTTP Code: $http_code"
fi

# Test 6: PATCH /api/bikes/{id}/mileage - try to decrease mileage (should fail)
if [ ! -z "$BIKE_ID" ]; then
    print_test "PATCH /api/bikes/{id}/mileage - decrease mileage (should fail)"
    mileage_data='{"current_mileage": 1000}'
    
    response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
        -X PATCH \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        -d "$mileage_data" \
        "${API_BASE}/${BIKE_ID}/mileage")
    http_code="${response: -3}"
    echo "Response: $(cat /tmp/curl_response)"
    echo "HTTP Code: $http_code"
    
    if [ "$http_code" = "400" ]; then
        print_success "Correctly rejected mileage decrease"
    else
        print_error "Expected 400 for mileage decrease, got $http_code"
    fi
fi

# Test 7: DELETE /api/bikes/{id} - delete bike
if [ ! -z "$BIKE_ID" ]; then
    print_test "DELETE /api/bikes/{id} - delete bike"
    response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
        -X DELETE \
        -H "$AUTH_HEADER" \
        "${API_BASE}/${BIKE_ID}")
    http_code="${response: -3}"
    echo "Response: $(cat /tmp/curl_response)"
    echo "HTTP Code: $http_code"
    
    if [ "$http_code" = "204" ]; then
        print_success "Successfully deleted bike"
    else
        print_error "Expected 204 for successful deletion, got $http_code"
    fi
fi

# =============================================================================
# Validation Tests
# =============================================================================

print_header "Validation Tests"

print_test "POST /api/bikes - missing required fields"
invalid_data='{"type": "szosowy"}'
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$invalid_data" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "422" ]; then
    print_success "Correctly rejected missing required fields"
else
    print_error "Expected 422 for validation error, got $http_code"
fi

print_test "POST /api/bikes - invalid bike type"
invalid_data='{
    "name": "Test Bike",
    "type": "invalid-type"
}'
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$invalid_data" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "422" ]; then
    print_success "Correctly rejected invalid bike type"
else
    print_error "Expected 422 for validation error, got $http_code"
fi

print_test "POST /api/bikes - name too long"
long_name=$(printf 'A%.0s' {1..51})
invalid_data="{
    \"name\": \"$long_name\",
    \"type\": \"szosowy\"
}"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "$invalid_data" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "422" ]; then
    print_success "Correctly rejected name too long"
else
    print_error "Expected 422 for validation error, got $http_code"
fi

# =============================================================================
# Query Parameters Tests
# =============================================================================

print_header "Query Parameters Tests"

print_test "GET /api/bikes?status=active"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}?status=active")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

print_test "GET /api/bikes?type=szosowy"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}?type=szosowy")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

print_test "GET /api/bikes?status=active&type=mtb"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}?status=active&type=mtb")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

print_test "GET /api/bikes?status=invalid-status"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}?status=invalid-status")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "422" ]; then
    print_success "Correctly rejected invalid status filter"
else
    print_error "Expected 422 for invalid query param, got $http_code"
fi

# =============================================================================
# Error Handling Tests
# =============================================================================

print_header "Error Handling Tests"

print_test "GET /api/bikes/{invalid-uuid}"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}/invalid-uuid")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "400" ]; then
    print_success "Correctly rejected invalid UUID format"
else
    print_error "Expected 400 for invalid UUID, got $http_code"
fi

print_test "GET /api/bikes/{non-existent-uuid}"
fake_uuid="123e4567-e89b-12d3-a456-426614174000"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    "${API_BASE}/${fake_uuid}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "404" ]; then
    print_success "Correctly returned 404 for non-existent bike"
else
    print_error "Expected 404 for non-existent bike, got $http_code"
fi

print_test "POST /api/bikes - invalid JSON"
response=$(curl -s -w "%{http_code}" -o /tmp/curl_response \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "invalid-json" \
    "${API_BASE}")
http_code="${response: -3}"
echo "Response: $(cat /tmp/curl_response)"
echo "HTTP Code: $http_code"

if [ "$http_code" = "400" ]; then
    print_success "Correctly rejected invalid JSON"
else
    print_error "Expected 400 for invalid JSON, got $http_code"
fi

# =============================================================================
# Summary
# =============================================================================

print_summary

# Clean up
rm -f /tmp/curl_response

echo -e "\n${BLUE}=== Setup Instructions for Real Testing ===${NC}"
echo -e "${YELLOW}To test with real authentication:${NC}"
echo -e "1. Create a test user in Supabase"
echo -e "2. Get JWT token: supabase auth login"
echo -e "3. Replace MOCK_TOKEN with real token"
echo -e "4. Run: chmod +x test_api.sh && ./test_api.sh"
echo -e "\n${YELLOW}Alternative: Use Postman/Insomnia collection${NC}"
echo -e "Import the API endpoints and set up environment variables"
