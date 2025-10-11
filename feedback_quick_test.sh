#!/bin/bash

# =============================================================================
# Feedback API - Quick Availability Test
# =============================================================================

# Configuration
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/feedbacks"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Mock data
MOCK_TOKEN="test-token"
MOCK_LOCATION_ID="660e8400-e29b-41d4-a716-446655440000"

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_summary() {
    echo -e "\n${BLUE}=== Quick Test Summary ===${NC}"
    echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
    echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"
    echo -e "Total: $((TESTS_PASSED + TESTS_FAILED))"
}

# Quick test function
quick_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_command="$3"
    
    echo -n "Testing $test_name... "
    
    actual_status=$(eval "$curl_command -w '%{http_code}'" -o /dev/null 2>/dev/null)
    
    if [ "$actual_status" = "$expected_status" ]; then
        print_success "OK ($actual_status)"
    else
        print_error "FAIL (got $actual_status, expected $expected_status)"
    fi
}

# =============================================================================
# Main Tests
# =============================================================================

main() {
    print_header "Feedback API Quick Availability Test"
    echo "Testing: $API_BASE"
    
    # Check if server is running
    echo -n "Checking server availability... "
    if curl -s "$BASE_URL" > /dev/null 2>&1; then
        print_success "Server is running"
    else
        print_error "Server is not running at $BASE_URL"
        exit 1
    fi
    
    # Test authentication requirement
    quick_test "GET /api/feedbacks (no auth)" "401" \
        "curl -s '$API_BASE'"
    
    # Test authenticated GET
    quick_test "GET /api/feedbacks (with auth)" "200" \
        "curl -s '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN'"
    
    # Test POST with minimal valid data
    local minimal_feedback='{
        "location_id": "'$MOCK_LOCATION_ID'",
        "temperature": 15,
        "feels_like": 12,
        "wind_speed": 10,
        "humidity": 65,
        "activity_type": "spokojna",
        "duration_minutes": 60,
        "actual_outfit": {
            "head": "nic",
            "torso": {"base": "koszulka_kr", "mid": "nic", "outer": "nic"},
            "arms": "nic",
            "hands": "nic",
            "legs": "krotkie",
            "feet": {"socks": "letnie", "covers": "nic"},
            "neck": "nic"
        },
        "overall_rating": 3
    }'
    
    quick_test "POST /api/feedbacks (valid data)" "201" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '$minimal_feedback'"
    
    # Test POST validation
    quick_test "POST /api/feedbacks (invalid data)" "422" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '{}'"
    
    # Test DELETE with invalid UUID
    quick_test "DELETE /api/feedbacks/invalid-uuid" "400" \
        "curl -s -X DELETE '$API_BASE/invalid-uuid' -H 'Authorization: Bearer $MOCK_TOKEN'"
    
    # Test DELETE with valid UUID (non-existent)
    quick_test "DELETE /api/feedbacks/550e8400-e29b-41d4-a716-446655440999" "404" \
        "curl -s -X DELETE '$API_BASE/550e8400-e29b-41d4-a716-446655440999' -H 'Authorization: Bearer $MOCK_TOKEN'"
    
    print_summary
    
    if [ $TESTS_FAILED -gt 0 ]; then
        echo -e "\n${RED}Some tests failed. Check the implementation.${NC}"
        exit 1
    else
        echo -e "\n${GREEN}All quick tests passed! API is available and working.${NC}"
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required${NC}"
    exit 1
fi

# Run tests
main "$@"
