#!/bin/bash

# =============================================================================
# Location Management API - cURL Test Suite
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/locations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Global variables for test data
LOCATION_ID=""
MOCK_TOKEN="test-token"

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

# Check if server is running
check_server() {
    print_header "Server Availability Check"
    response=$(curl -s -w "%{http_code}" -o /dev/null "${BASE_URL}")
    if [ "$response" = "200" ] || [ "$response" = "404" ]; then
        print_success "Server is running at ${BASE_URL}"
    else
        print_error "Server is not accessible (HTTP $response)"
        echo "Please start the development server with: npm run dev"
        exit 1
    fi
}

# =============================================================================
# Test Authentication
# =============================================================================

test_auth_required() {
    print_header "Authentication Tests"
    
    print_test "GET /api/locations without auth token"
    response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized"
    else
        print_error "Expected 401, got $response"
    fi
    
    print_test "POST /api/locations without auth token"
    response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{}' "${API_BASE}")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized"
    else
        print_error "Expected 401, got $response"
    fi
}

# =============================================================================
# Test GET /api/locations
# =============================================================================

test_get_locations() {
    print_header "GET /api/locations Tests"
    
    print_test "GET all locations"
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "Returns 200 OK"
        echo "Response: $body"
    else
        print_error "Expected 200, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "GET default location only"
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}?default_only=true")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "Returns 200 OK with default_only filter"
        echo "Response: $body"
    else
        print_error "Expected 200, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "GET with invalid query parameter"
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}?default_only=invalid")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "422" ]; then
        print_success "Returns 422 for invalid query parameter"
        echo "Response: $body"
    else
        print_error "Expected 422, got $http_code"
        echo "Response: $body"
    fi
}

# =============================================================================
# Test POST /api/locations
# =============================================================================

test_create_location() {
    print_header "POST /api/locations Tests"
    
    print_test "Create valid location"
    payload='{
        "latitude": 52.237,
        "longitude": 21.017,
        "city": "Warsaw",
        "country_code": "PL",
        "is_default": true,
        "label": "Home"
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "201" ]; then
        print_success "Creates location successfully (201 Created)"
        echo "Response: $body"
        # Extract location ID for later tests
        LOCATION_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "Extracted Location ID: $LOCATION_ID"
    else
        print_error "Expected 201, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Create location with invalid latitude"
    payload='{
        "latitude": 95.0,
        "longitude": 21.017,
        "city": "Warsaw",
        "country_code": "PL"
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "422" ]; then
        print_success "Returns 422 for invalid latitude"
        echo "Response: $body"
    else
        print_error "Expected 422, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Create location with missing required fields"
    payload='{
        "latitude": 52.237
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "422" ]; then
        print_success "Returns 422 for missing required fields"
        echo "Response: $body"
    else
        print_error "Expected 422, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Create location with invalid JSON"
    response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "invalid json" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "400" ]; then
        print_success "Returns 400 for invalid JSON"
        echo "Response: $body"
    else
        print_error "Expected 400, got $http_code"
        echo "Response: $body"
    fi
}

# =============================================================================
# Test PUT /api/locations/{id}
# =============================================================================

test_update_location() {
    print_header "PUT /api/locations/{id} Tests"
    
    if [ -z "$LOCATION_ID" ]; then
        print_error "No location ID available for update tests. Skipping..."
        return
    fi
    
    print_test "Update location with valid data"
    payload='{
        "city": "Kraków",
        "country_code": "PL",
        "label": "Updated Home"
    }'
    
    response=$(curl -s -w "%{http_code}" -X PUT -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}/${LOCATION_ID}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "Updates location successfully (200 OK)"
        echo "Response: $body"
    else
        print_error "Expected 200, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Update location with coordinates"
    payload='{
        "latitude": 50.0647,
        "longitude": 19.9450
    }'
    
    response=$(curl -s -w "%{http_code}" -X PUT -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}/${LOCATION_ID}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        print_success "Updates coordinates successfully"
        echo "Response: $body"
    else
        print_error "Expected 200, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Update location with invalid UUID"
    response=$(curl -s -w "%{http_code}" -X PUT -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d '{}' "${API_BASE}/invalid-uuid")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "400" ]; then
        print_success "Returns 400 for invalid UUID"
        echo "Response: $body"
    else
        print_error "Expected 400, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Update non-existent location"
    fake_uuid="550e8400-e29b-41d4-a716-446655440000"
    response=$(curl -s -w "%{http_code}" -X PUT -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d '{"city":"Test"}' "${API_BASE}/${fake_uuid}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "404" ]; then
        print_success "Returns 404 for non-existent location"
        echo "Response: $body"
    else
        print_error "Expected 404, got $http_code"
        echo "Response: $body"
    fi
}

# =============================================================================
# Test DELETE /api/locations/{id}
# =============================================================================

test_delete_location() {
    print_header "DELETE /api/locations/{id} Tests"
    
    print_test "Delete location with invalid UUID"
    response=$(curl -s -w "%{http_code}" -X DELETE -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}/invalid-uuid")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "400" ]; then
        print_success "Returns 400 for invalid UUID"
        echo "Response: $body"
    else
        print_error "Expected 400, got $http_code"
        echo "Response: $body"
    fi
    
    print_test "Delete non-existent location"
    fake_uuid="550e8400-e29b-41d4-a716-446655440000"
    response=$(curl -s -w "%{http_code}" -X DELETE -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}/${fake_uuid}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "404" ]; then
        print_success "Returns 404 for non-existent location"
        echo "Response: $body"
    else
        print_error "Expected 404, got $http_code"
        echo "Response: $body"
    fi
    
    # Note: We skip deleting the actual location to avoid conflicts with business rules
    # In a real test, you'd create multiple locations and test the business rules
    print_test "Delete location (skipped - would test business rules)"
    echo "⚠️  Business rule tests (last location, default location) require database setup"
}

# =============================================================================
# Test Business Rules
# =============================================================================

test_business_rules() {
    print_header "Business Rules Tests"
    
    print_test "Create second location to test business rules"
    payload='{
        "latitude": 50.0647,
        "longitude": 19.9450,
        "city": "Kraków",
        "country_code": "PL",
        "is_default": false,
        "label": "Work"
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST -H "Authorization: Bearer ${MOCK_TOKEN}" -H "Content-Type: application/json" -d "$payload" "${API_BASE}")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "201" ]; then
        print_success "Creates second location for business rule testing"
        SECOND_LOCATION_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "Second Location ID: $SECOND_LOCATION_ID"
    else
        print_error "Failed to create second location for testing"
        echo "Response: $body"
    fi
    
    print_test "Verify only one default location exists"
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer ${MOCK_TOKEN}" "${API_BASE}?default_only=true")
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        # Count locations in response (basic check)
        location_count=$(echo "$body" | grep -o '"id":' | wc -l)
        if [ "$location_count" = "1" ]; then
            print_success "Only one default location exists"
        else
            print_error "Expected 1 default location, found $location_count"
        fi
        echo "Response: $body"
    else
        print_error "Failed to fetch default locations"
    fi
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
    echo "🏠 Location Management API Test Suite"
    echo "======================================"
    echo "Base URL: ${BASE_URL}"
    echo "API Base: ${API_BASE}"
    echo "Mock Token: ${MOCK_TOKEN}"
    
    check_server
    test_auth_required
    test_get_locations
    test_create_location
    test_update_location
    test_delete_location
    test_business_rules
    
    print_summary
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}💥 Some tests failed. Check the output above.${NC}"
        exit 1
    fi
}

# Run tests
main "$@"
