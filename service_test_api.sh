#!/bin/bash

# =============================================================================
# Service Records API - cURL Test Suite
# Tests all service management endpoints with comprehensive scenarios
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/bikes"

# Test data
MOCK_USER_ID="550e8400-e29b-41d4-a716-446655440000"
MOCK_TOKEN="test-token"
TEST_BIKE_ID=""
TEST_SERVICE_ID=""

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

# Test helper - check HTTP status and response
test_request() {
    local description="$1"
    local expected_status="$2"
    local response="$3"
    
    local actual_status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$actual_status" = "$expected_status" ]; then
        print_success "$description (Status: $actual_status)"
        if [ -n "$4" ]; then
            # Additional validation
            if echo "$body" | grep -q "$4"; then
                print_success "  → Response contains expected content"
            else
                print_error "  → Response missing expected content: $4"
            fi
        fi
    else
        print_error "$description (Expected: $expected_status, Got: $actual_status)"
        echo "Response body: $body"
    fi
}

# =============================================================================
# Setup - Create test bike for service tests
# =============================================================================

setup_test_bike() {
    print_header "Setup - Creating Test Bike"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Service Test Bike",
            "type": "szosowy",
            "current_mileage": 1000,
            "notes": "Test bike for service API testing"
        }' \
        "$API_BASE")
    
    local status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$status" = "201" ]; then
        TEST_BIKE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Test bike created with ID: $TEST_BIKE_ID"
    else
        print_error "Failed to create test bike (Status: $status)"
        echo "Response: $body"
        exit 1
    fi
}

# =============================================================================
# Test Authentication
# =============================================================================

test_authentication() {
    print_header "Authentication Tests"
    
    print_test "GET services without token"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 401 for missing token" "401" "$response" "Unauthorized"
    
    print_test "GET services with invalid token"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer invalid-token" \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 401 for invalid token" "401" "$response"
}

# =============================================================================
# Test GET /api/bikes/{bikeId}/services
# =============================================================================

test_get_services() {
    print_header "GET Services Tests"
    
    print_test "GET services with valid token (empty list)"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 200 with empty services list" "200" "$response" '"services":\[\]'
    
    print_test "GET services with invalid bike ID"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/invalid-uuid/services")
    test_request "Should return 400 for invalid UUID" "400" "$response" "INVALID_UUID"
    
    print_test "GET services with non-existent bike ID"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/550e8400-0000-0000-0000-446655440000/services")
    test_request "Should return 404 for non-existent bike" "404" "$response" "BIKE_NOT_FOUND"
    
    print_test "GET services with query parameters"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services?limit=10&offset=0&sort=service_date_desc")
    test_request "Should return 200 with query parameters" "200" "$response" '"total":0'
    
    print_test "GET services with invalid query parameters"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services?limit=999&service_type=invalid")
    test_request "Should return 400 for invalid query params" "400" "$response" "VALIDATION_ERROR"
}

# =============================================================================
# Test POST /api/bikes/{bikeId}/services
# =============================================================================

test_create_service() {
    print_header "POST Create Service Tests"
    
    print_test "Create service with valid data"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_date": "2025-01-01T10:00:00Z",
            "mileage_at_service": 1200,
            "service_type": "lancuch",
            "service_location": "warsztat",
            "cost": 120.50,
            "notes": "Chain replacement and cleaning"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    
    local status=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    if [ "$status" = "201" ]; then
        TEST_SERVICE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        print_success "Service created with ID: $TEST_SERVICE_ID"
        test_request "Should return created service" "201" "$response" '"service_type":"lancuch"'
    else
        print_error "Failed to create service (Status: $status)"
        echo "Response: $body"
    fi
    
    print_test "Create service with reminder"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_date": "2025-01-05T10:00:00Z",
            "mileage_at_service": 1300,
            "service_type": "kaseta",
            "service_location": "samodzielnie",
            "cost": 200.00,
            "create_reminder": true,
            "reminder_interval_km": 3000
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should create service with reminder" "201" "$response" '"service_type":"kaseta"'
    
    print_test "Create service with invalid data - missing required fields"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_type": "lancuch"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 400 for missing required fields" "400" "$response" "VALIDATION_ERROR"
    
    print_test "Create service with future date"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_date": "2026-01-01T10:00:00Z",
            "mileage_at_service": 1400,
            "service_type": "lancuch"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 400 for future date" "400" "$response" "service_date cannot be in the future"
    
    print_test "Create service with lower mileage"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_date": "2025-01-02T10:00:00Z",
            "mileage_at_service": 1100,
            "service_type": "lancuch"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 422 for lower mileage" "422" "$response" "MILEAGE_LOWER_THAN_PREVIOUS"
    
    print_test "Create service with reminder but missing interval"
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "service_date": "2025-01-10T10:00:00Z",
            "mileage_at_service": 1500,
            "service_type": "opony",
            "create_reminder": true
        }' \
        "$API_BASE/$TEST_BIKE_ID/services")
    test_request "Should return 400 for missing reminder interval" "400" "$response" "reminder_interval_km is required"
}

# =============================================================================
# Test PUT /api/bikes/{bikeId}/services/{id}
# =============================================================================

test_update_service() {
    print_header "PUT Update Service Tests"
    
    if [ -z "$TEST_SERVICE_ID" ]; then
        print_error "No service ID available for update tests"
        return
    fi
    
    print_test "Update service with valid data"
    local response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "cost": 150.00,
            "notes": "Updated: Chain replacement with full cleaning"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services/$TEST_SERVICE_ID")
    test_request "Should update service successfully" "200" "$response" '"cost":150'
    
    print_test "Update service with invalid service ID"
    local response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"cost": 100.00}' \
        "$API_BASE/$TEST_BIKE_ID/services/550e8400-0000-0000-0000-446655440000")
    test_request "Should return 404 for non-existent service" "404" "$response" "SERVICE_NOT_FOUND"
    
    print_test "Update service with empty body"
    local response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "$API_BASE/$TEST_BIKE_ID/services/$TEST_SERVICE_ID")
    test_request "Should return 400 for empty update" "400" "$response" "At least one field must be provided"
    
    print_test "Update service with invalid data"
    local response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "cost": -50.00,
            "service_date": "2026-01-01T10:00:00Z"
        }' \
        "$API_BASE/$TEST_BIKE_ID/services/$TEST_SERVICE_ID")
    test_request "Should return 400 for invalid data" "400" "$response" "VALIDATION_ERROR"
}

# =============================================================================
# Test GET /api/bikes/{bikeId}/services/stats
# =============================================================================

test_service_stats() {
    print_header "GET Service Stats Tests"
    
    print_test "Get service stats - all time"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/stats")
    test_request "Should return stats successfully" "200" "$response" '"total_services":'
    
    print_test "Get service stats with period filter"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/stats?period=month")
    test_request "Should return monthly stats" "200" "$response" '"period":'
    
    print_test "Get service stats with custom date range"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/stats?from_date=2025-01-01T00:00:00Z&to_date=2025-01-31T23:59:59Z")
    test_request "Should return custom range stats" "200" "$response" '"from":"2025-01-01"'
    
    print_test "Get service stats with invalid date range"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/stats?from_date=2025-01-31T00:00:00Z&to_date=2025-01-01T00:00:00Z")
    test_request "Should return 400 for invalid date range" "400" "$response" "from_date must be before"
}

# =============================================================================
# Test DELETE /api/bikes/{bikeId}/services/{id}
# =============================================================================

test_delete_service() {
    print_header "DELETE Service Tests"
    
    if [ -z "$TEST_SERVICE_ID" ]; then
        print_error "No service ID available for delete tests"
        return
    fi
    
    print_test "Delete service with invalid service ID"
    local response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/550e8400-0000-0000-0000-446655440000")
    test_request "Should return 404 for non-existent service" "404" "$response" "SERVICE_NOT_FOUND"
    
    print_test "Delete service successfully"
    local response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services/$TEST_SERVICE_ID")
    test_request "Should delete service successfully" "204" "$response"
    
    print_test "Verify service was deleted"
    local response=$(curl -s -w "\n%{http_code}" \
        -X GET \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID/services")
    
    local body=$(echo "$response" | head -n -1)
    local service_count=$(echo "$body" | grep -o '"total":[0-9]*' | cut -d':' -f2)
    
    if [ "$service_count" = "1" ]; then
        print_success "Service was deleted (1 remaining service)"
    else
        print_error "Service deletion verification failed (Expected 1 service, got $service_count)"
    fi
}

# =============================================================================
# Cleanup
# =============================================================================

cleanup_test_data() {
    print_header "Cleanup"
    
    print_test "Delete test bike"
    local response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/$TEST_BIKE_ID")
    
    local status=$(echo "$response" | tail -n1)
    if [ "$status" = "204" ]; then
        print_success "Test bike deleted successfully"
    else
        print_error "Failed to delete test bike (Status: $status)"
    fi
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
    echo -e "${BLUE}Service Records API Test Suite${NC}"
    echo -e "${BLUE}================================${NC}"
    echo "Base URL: $BASE_URL"
    echo "Mock User ID: $MOCK_USER_ID"
    echo ""
    
    # Setup
    setup_test_bike
    
    # Run all tests
    test_authentication
    test_get_services
    test_create_service
    test_update_service
    test_service_stats
    test_delete_service
    
    # Cleanup
    cleanup_test_data
    
    # Summary
    print_summary
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}All tests passed! 🎉${NC}"
        exit 0
    else
        echo -e "\n${RED}Some tests failed! 😞${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
