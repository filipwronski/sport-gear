#!/bin/bash

# =============================================================================
# Profile Management API - cURL Test Suite
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/profile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Mock user data (from .ai/rules/general.md)
MOCK_USER_ID="550e8400-e29b-41d4-a716-446655440000"
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
    print_header "Server Health Check"
    
    if curl -s "$BASE_URL" > /dev/null; then
        print_success "Server is running on $BASE_URL"
    else
        print_error "Server is not running on $BASE_URL"
        echo "Please start the development server with: npm run dev"
        exit 1
    fi
}

# =============================================================================
# Authentication Tests
# =============================================================================

test_auth_required() {
    print_header "Authentication Tests"
    
    print_test "GET /api/profile without auth token"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$API_BASE")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized without token"
    else
        print_error "Expected 401, got $response"
    fi
    
    print_test "PUT /api/profile without auth token"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Content-Type: application/json" \
        -d '{"display_name": "Test"}' \
        "$API_BASE")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized without token"
    else
        print_error "Expected 401, got $response"
    fi
    
    print_test "DELETE /api/profile without auth token"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X DELETE \
        "$API_BASE")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized without token"
    else
        print_error "Expected 401, got $response"
    fi
    
    print_test "GET /api/profile/export without auth token"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$API_BASE/export")
    if [ "$response" = "401" ]; then
        print_success "Returns 401 Unauthorized without token"
    else
        print_error "Expected 401, got $response"
    fi
}

# =============================================================================
# GET Profile Tests
# =============================================================================

test_get_profile() {
    print_header "GET /api/profile Tests"
    
    print_test "GET profile with valid auth token"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE")
    
    if [ "$response" = "200" ]; then
        # Check if response contains expected fields
        if grep -q '"id"' /tmp/response.json && \
           grep -q '"display_name"' /tmp/response.json && \
           grep -q '"thermal_preferences"' /tmp/response.json; then
            print_success "Returns 200 with valid profile structure"
        else
            print_error "Response missing required profile fields"
            echo "Response: $(cat /tmp/response.json)"
        fi
    elif [ "$response" = "404" ]; then
        print_error "Profile not found - mock user might not exist in database"
        echo "Response: $(cat /tmp/response.json)"
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Check Cache-Control headers"
    headers=$(curl -s -I -H "Authorization: Bearer $MOCK_TOKEN" "$API_BASE")
    if echo "$headers" | grep -i "cache-control.*no-store" > /dev/null; then
        print_success "Profile has proper no-cache headers"
    else
        print_error "Missing or incorrect cache headers"
    fi
}

# =============================================================================
# PUT Profile Tests
# =============================================================================

test_update_profile() {
    print_header "PUT /api/profile Tests"
    
    print_test "Update display_name"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"display_name": "Updated Test User"}' \
        "$API_BASE")
    
    if [ "$response" = "200" ]; then
        if grep -q '"display_name":"Updated Test User"' /tmp/response.json; then
            print_success "Successfully updated display_name"
        else
            print_error "display_name not updated in response"
            echo "Response: $(cat /tmp/response.json)"
        fi
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Update thermal preferences"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "thermal_preferences": {
                "general_feeling": "neutralnie",
                "cold_hands": false,
                "cold_feet": true,
                "cap_threshold_temp": 15
            }
        }' \
        "$API_BASE")
    
    if [ "$response" = "200" ]; then
        if grep -q '"general_feeling":"neutralnie"' /tmp/response.json; then
            print_success "Successfully updated thermal preferences"
        else
            print_error "thermal_preferences not updated in response"
            echo "Response: $(cat /tmp/response.json)"
        fi
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Update units preference"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"units": "imperial"}' \
        "$API_BASE")
    
    if [ "$response" = "200" ]; then
        if grep -q '"units":"imperial"' /tmp/response.json; then
            print_success "Successfully updated units preference"
        else
            print_error "units not updated in response"
            echo "Response: $(cat /tmp/response.json)"
        fi
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Enable community sharing (should generate pseudonym)"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"share_with_community": true}' \
        "$API_BASE")
    
    if [ "$response" = "200" ]; then
        if grep -q '"share_with_community":true' /tmp/response.json && \
           grep -q '"pseudonym":"' /tmp/response.json; then
            print_success "Successfully enabled community sharing with pseudonym"
        else
            print_error "Community sharing not properly enabled or pseudonym missing"
            echo "Response: $(cat /tmp/response.json)"
        fi
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
}

# =============================================================================
# Validation Tests
# =============================================================================

test_validation_errors() {
    print_header "Validation Error Tests"
    
    print_test "Invalid JSON body"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d 'invalid json' \
        "$API_BASE")
    
    if [ "$response" = "400" ]; then
        print_success "Returns 400 for invalid JSON"
    else
        print_error "Expected 400, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Invalid thermal_preferences.general_feeling"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "thermal_preferences": {
                "general_feeling": "invalid_value",
                "cold_hands": false,
                "cold_feet": false,
                "cap_threshold_temp": 15
            }
        }' \
        "$API_BASE")
    
    if [ "$response" = "422" ]; then
        if grep -q '"code":"VALIDATION_ERROR"' /tmp/response.json; then
            print_success "Returns 422 with validation error for invalid general_feeling"
        else
            print_error "422 response but wrong error format"
            echo "Response: $(cat /tmp/response.json)"
        fi
    else
        print_error "Expected 422, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Invalid cap_threshold_temp (out of range)"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "thermal_preferences": {
                "general_feeling": "neutralnie",
                "cold_hands": false,
                "cold_feet": false,
                "cap_threshold_temp": 50
            }
        }' \
        "$API_BASE")
    
    if [ "$response" = "422" ]; then
        print_success "Returns 422 for cap_threshold_temp out of range"
    else
        print_error "Expected 422, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Empty display_name (should fail)"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"display_name": "   "}' \
        "$API_BASE")
    
    if [ "$response" = "422" ]; then
        print_success "Returns 422 for empty display_name"
    else
        print_error "Expected 422, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
    
    print_test "Unknown field (should fail with strict validation)"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X PUT \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"unknown_field": "value", "display_name": "Test"}' \
        "$API_BASE")
    
    if [ "$response" = "422" ]; then
        print_success "Returns 422 for unknown fields (strict validation)"
    else
        print_error "Expected 422, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
}

# =============================================================================
# Export Tests
# =============================================================================

test_export_profile() {
    print_header "GET /api/profile/export Tests"
    
    print_test "Export user data"
    response=$(curl -s -w "%{http_code}" -o /tmp/export.json \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE/export")
    
    if [ "$response" = "200" ]; then
        # Check if export contains expected structure
        if grep -q '"profile"' /tmp/export.json && \
           grep -q '"locations"' /tmp/export.json && \
           grep -q '"bikes"' /tmp/export.json && \
           grep -q '"export_timestamp"' /tmp/export.json; then
            print_success "Export contains expected data structure"
        else
            print_error "Export missing required data sections"
            echo "Export structure: $(jq -r 'keys[]' /tmp/export.json 2>/dev/null || echo 'Invalid JSON')"
        fi
    else
        print_error "Expected 200, got $response"
        echo "Response: $(cat /tmp/export.json)"
    fi
    
    print_test "Check Content-Disposition header for download"
    headers=$(curl -s -I -H "Authorization: Bearer $MOCK_TOKEN" "$API_BASE/export")
    if echo "$headers" | grep -i "content-disposition.*attachment" > /dev/null; then
        print_success "Export has proper download headers"
    else
        print_error "Missing Content-Disposition header for download"
    fi
    
    print_test "Check export file naming"
    headers=$(curl -s -I -H "Authorization: Bearer $MOCK_TOKEN" "$API_BASE/export")
    if echo "$headers" | grep -i "filename.*cyclegear-export.*json" > /dev/null; then
        print_success "Export filename follows expected pattern"
    else
        print_error "Export filename doesn't match expected pattern"
    fi
}

# =============================================================================
# Delete Profile Tests (WARNING: Destructive)
# =============================================================================

test_delete_profile() {
    print_header "DELETE /api/profile Tests (WARNING: DESTRUCTIVE)"
    
    echo -e "${YELLOW}⚠️  WARNING: The following tests are destructive and will delete the mock user profile!${NC}"
    echo -e "${YELLOW}   Only run these tests if you can recreate the mock user afterwards.${NC}"
    read -p "Do you want to run destructive delete tests? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_test "Skipping delete tests (user choice)"
        print_success "Delete tests skipped"
        return
    fi
    
    print_test "Delete user profile"
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json \
        -X DELETE \
        -H "Authorization: Bearer $MOCK_TOKEN" \
        "$API_BASE")
    
    if [ "$response" = "204" ]; then
        print_success "Profile deleted successfully (204 No Content)"
        
        # Verify profile is actually deleted
        print_test "Verify profile is deleted"
        verify_response=$(curl -s -w "%{http_code}" -o /tmp/verify.json \
            -H "Authorization: Bearer $MOCK_TOKEN" \
            "$API_BASE")
        
        if [ "$verify_response" = "404" ]; then
            print_success "Profile confirmed deleted (404 Not Found)"
        else
            print_error "Profile still exists after deletion (got $verify_response)"
        fi
    else
        print_error "Expected 204, got $response"
        echo "Response: $(cat /tmp/response.json)"
    fi
}

# =============================================================================
# Main Test Runner
# =============================================================================

main() {
    echo -e "${BLUE}Profile Management API Test Suite${NC}"
    echo -e "${BLUE}Base URL: $BASE_URL${NC}"
    echo -e "${BLUE}Mock User ID: $MOCK_USER_ID${NC}"
    
    check_server
    test_auth_required
    test_get_profile
    test_update_profile
    test_validation_errors
    test_export_profile
    test_delete_profile
    
    print_summary
    
    # Clean up temp files
    rm -f /tmp/response.json /tmp/export.json /tmp/verify.json
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Check the output above.${NC}"
        exit 1
    fi
}

# Run tests if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
