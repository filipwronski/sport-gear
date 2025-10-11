#!/bin/bash

# =============================================================================
# Feedback Management API - cURL Test Suite
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

# Global variables for test data
FEEDBACK_ID=""
MOCK_TOKEN="test-token"
MOCK_USER_ID="550e8400-e29b-41d4-a716-446655440000"
MOCK_LOCATION_ID="660e8400-e29b-41d4-a716-446655440000"

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

# Test helper function
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_command="$3"
    local check_function="$4"
    
    print_test "$test_name"
    
    # Execute curl command and capture response
    response=$(eval "$curl_command" 2>/dev/null)
    actual_status=$(eval "$curl_command -w '%{http_code}'" -o /dev/null 2>/dev/null)
    
    # Check status code
    if [ "$actual_status" = "$expected_status" ]; then
        if [ -n "$check_function" ]; then
            $check_function "$response"
        else
            print_success "Status $actual_status (expected $expected_status)"
        fi
    else
        print_error "Status $actual_status (expected $expected_status)"
        echo "Response: $response"
    fi
}

# =============================================================================
# Test Data Validation Functions
# =============================================================================

check_feedback_structure() {
    local response="$1"
    if echo "$response" | jq -e '.id and .temperature and .feels_like and .wind_speed and .humidity and .activity_type and .duration_minutes and .actual_outfit and .overall_rating' > /dev/null 2>&1; then
        print_success "Valid feedback structure returned"
    else
        print_error "Invalid feedback structure"
        echo "Response: $response"
    fi
}

check_feedbacks_list_structure() {
    local response="$1"
    if echo "$response" | jq -e '.feedbacks and .total and .has_more' > /dev/null 2>&1; then
        print_success "Valid feedbacks list structure returned"
    else
        print_error "Invalid feedbacks list structure"
        echo "Response: $response"
    fi
}

check_validation_error() {
    local response="$1"
    if echo "$response" | jq -e '.error.code == "VALIDATION_ERROR"' > /dev/null 2>&1; then
        print_success "Validation error returned correctly"
    else
        print_error "Expected validation error"
        echo "Response: $response"
    fi
}

check_not_found_error() {
    local response="$1"
    if echo "$response" | jq -e '.error.code == "NOT_FOUND"' > /dev/null 2>&1; then
        print_success "Not found error returned correctly"
    else
        print_error "Expected not found error"
        echo "Response: $response"
    fi
}

# =============================================================================
# Test Functions
# =============================================================================

test_auth_required() {
    print_header "Authentication Tests"
    
    run_test "GET without auth token" "401" \
        "curl -s '$API_BASE'" \
        ""
    
    run_test "POST without auth token" "401" \
        "curl -s -X POST '$API_BASE' -H 'Content-Type: application/json' -d '{}'" \
        ""
}

test_get_feedbacks() {
    print_header "GET /api/feedbacks Tests"
    
    # Basic GET request
    run_test "GET feedbacks - basic request" "200" \
        "curl -s '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    # Test pagination
    run_test "GET feedbacks - with limit" "200" \
        "curl -s '$API_BASE?limit=10' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    run_test "GET feedbacks - with offset" "200" \
        "curl -s '$API_BASE?offset=5' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    # Test filtering
    run_test "GET feedbacks - filter by activity_type" "200" \
        "curl -s '$API_BASE?activity_type=spokojna' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    run_test "GET feedbacks - filter by rating" "200" \
        "curl -s '$API_BASE?rating=5' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    # Test sorting
    run_test "GET feedbacks - sort by created_at_desc" "200" \
        "curl -s '$API_BASE?sort=created_at_desc' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    run_test "GET feedbacks - sort by rating_asc" "200" \
        "curl -s '$API_BASE?sort=rating_asc' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_feedbacks_list_structure"
    
    # Test validation errors
    run_test "GET feedbacks - invalid limit (too high)" "400" \
        "curl -s '$API_BASE?limit=50' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_validation_error"
    
    run_test "GET feedbacks - invalid activity_type" "400" \
        "curl -s '$API_BASE?activity_type=invalid' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_validation_error"
    
    run_test "GET feedbacks - invalid rating" "400" \
        "curl -s '$API_BASE?rating=10' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_validation_error"
}

test_post_feedback() {
    print_header "POST /api/feedbacks Tests"
    
    # Valid feedback creation
    local valid_feedback='{
        "location_id": "'$MOCK_LOCATION_ID'",
        "temperature": 15.5,
        "feels_like": 12.3,
        "wind_speed": 10.5,
        "humidity": 65,
        "rain_mm": 0,
        "activity_type": "spokojna",
        "duration_minutes": 90,
        "actual_outfit": {
            "head": "czapka",
            "torso": {
                "base": "termo",
                "mid": "softshell", 
                "outer": "nic"
            },
            "arms": "naramienniki",
            "hands": "przejsciowe",
            "legs": "dlugie",
            "feet": {
                "socks": "zimowe",
                "covers": "ochraniacze"
            },
            "neck": "buff"
        },
        "overall_rating": 4,
        "zone_ratings": {
            "head": 3,
            "hands": 2
        },
        "notes": "Perfect conditions for this outfit",
        "shared_with_community": true
    }'
    
    run_test "POST feedback - valid data" "201" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '$valid_feedback'" \
        "check_feedback_structure"
    
    # Extract feedback ID for later tests
    FEEDBACK_ID=$(curl -s -X POST "$API_BASE" -H "Authorization: Bearer $MOCK_TOKEN" -H "Content-Type: application/json" -d "$valid_feedback" 2>/dev/null | jq -r '.id // empty')
    
    # Test validation errors
    run_test "POST feedback - missing required field" "422" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '{\"temperature\": 15}'" \
        "check_validation_error"
    
    run_test "POST feedback - invalid temperature range" "422" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '{\"location_id\": \"'$MOCK_LOCATION_ID'\", \"temperature\": -60, \"feels_like\": 10, \"wind_speed\": 5, \"humidity\": 50, \"activity_type\": \"spokojna\", \"duration_minutes\": 60, \"actual_outfit\": {\"head\": \"czapka\", \"torso\": {\"base\": \"termo\", \"mid\": \"nic\", \"outer\": \"nic\"}, \"arms\": \"nic\", \"hands\": \"nic\", \"legs\": \"dlugie\", \"feet\": {\"socks\": \"zimowe\", \"covers\": \"nic\"}, \"neck\": \"nic\"}, \"overall_rating\": 3}'" \
        "check_validation_error"
    
    run_test "POST feedback - invalid activity_type" "422" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '{\"location_id\": \"'$MOCK_LOCATION_ID'\", \"temperature\": 15, \"feels_like\": 10, \"wind_speed\": 5, \"humidity\": 50, \"activity_type\": \"invalid\", \"duration_minutes\": 60, \"actual_outfit\": {\"head\": \"czapka\", \"torso\": {\"base\": \"termo\", \"mid\": \"nic\", \"outer\": \"nic\"}, \"arms\": \"nic\", \"hands\": \"nic\", \"legs\": \"dlugie\", \"feet\": {\"socks\": \"zimowe\", \"covers\": \"nic\"}, \"neck\": \"nic\"}, \"overall_rating\": 3}'" \
        "check_validation_error"
    
    run_test "POST feedback - invalid outfit structure" "422" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '{\"location_id\": \"'$MOCK_LOCATION_ID'\", \"temperature\": 15, \"feels_like\": 10, \"wind_speed\": 5, \"humidity\": 50, \"activity_type\": \"spokojna\", \"duration_minutes\": 60, \"actual_outfit\": {\"head\": \"invalid_option\"}, \"overall_rating\": 3}'" \
        "check_validation_error"
    
    run_test "POST feedback - invalid JSON" "400" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d 'invalid json'" \
        ""
}

test_delete_feedback() {
    print_header "DELETE /api/feedbacks/{id} Tests"
    
    if [ -n "$FEEDBACK_ID" ]; then
        run_test "DELETE feedback - valid ID" "204" \
            "curl -s -X DELETE '$API_BASE/$FEEDBACK_ID' -H 'Authorization: Bearer $MOCK_TOKEN'" \
            ""
        
        # Try to delete again (should return 404)
        run_test "DELETE feedback - already deleted" "404" \
            "curl -s -X DELETE '$API_BASE/$FEEDBACK_ID' -H 'Authorization: Bearer $MOCK_TOKEN'" \
            "check_not_found_error"
    else
        print_error "No feedback ID available for delete tests"
    fi
    
    # Test invalid UUID format
    run_test "DELETE feedback - invalid UUID format" "400" \
        "curl -s -X DELETE '$API_BASE/invalid-uuid' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        ""
    
    # Test non-existent feedback
    run_test "DELETE feedback - non-existent ID" "404" \
        "curl -s -X DELETE '$API_BASE/550e8400-e29b-41d4-a716-446655440999' -H 'Authorization: Bearer $MOCK_TOKEN'" \
        "check_not_found_error"
}

test_edge_cases() {
    print_header "Edge Cases and Business Logic Tests"
    
    # Test outfit structure validation edge cases
    local minimal_outfit='{
        "location_id": "'$MOCK_LOCATION_ID'",
        "temperature": 20,
        "feels_like": 18,
        "wind_speed": 5,
        "humidity": 50,
        "activity_type": "recovery",
        "duration_minutes": 30,
        "actual_outfit": {
            "head": "nic",
            "torso": {
                "base": "koszulka_kr",
                "mid": "nic",
                "outer": "nic"
            },
            "arms": "nic",
            "hands": "nic",
            "legs": "krotkie",
            "feet": {
                "socks": "letnie",
                "covers": "nic"
            },
            "neck": "nic"
        },
        "overall_rating": 5
    }'
    
    run_test "POST feedback - minimal valid outfit" "201" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '$minimal_outfit'" \
        "check_feedback_structure"
    
    # Test maximum values
    local max_values_feedback='{
        "location_id": "'$MOCK_LOCATION_ID'",
        "temperature": 50,
        "feels_like": 50,
        "wind_speed": 200,
        "humidity": 100,
        "rain_mm": 100,
        "activity_type": "interwaly",
        "duration_minutes": 480,
        "actual_outfit": {
            "head": "czapka",
            "torso": {
                "base": "termo",
                "mid": "softshell",
                "outer": "kurtka_zimowa"
            },
            "arms": "rekawki",
            "hands": "rekawiczki_zimowe",
            "legs": "getry",
            "feet": {
                "socks": "zimowe",
                "covers": "ochraniacze"
            },
            "neck": "komin"
        },
        "overall_rating": 5,
        "zone_ratings": {
            "head": 5,
            "torso": 5,
            "arms": 5,
            "hands": 5,
            "legs": 5,
            "feet": 5,
            "neck": 5
        },
        "notes": "' + $(printf 'a%.0s' {1..500}) + '",
        "shared_with_community": false
    }'
    
    run_test "POST feedback - maximum valid values" "201" \
        "curl -s -X POST '$API_BASE' -H 'Authorization: Bearer $MOCK_TOKEN' -H 'Content-Type: application/json' -d '$max_values_feedback'" \
        "check_feedback_structure"
}

# =============================================================================
# Main Test Execution
# =============================================================================

main() {
    print_header "Feedback Management API Test Suite"
    echo "Testing endpoints: $API_BASE"
    echo "Mock User ID: $MOCK_USER_ID"
    echo "Mock Location ID: $MOCK_LOCATION_ID"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required for JSON parsing${NC}"
        exit 1
    fi
    
    # Check if server is running
    if ! curl -s "$BASE_URL" > /dev/null; then
        echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
        exit 1
    fi
    
    # Run test suites
    test_auth_required
    test_get_feedbacks
    test_post_feedback
    test_delete_feedback
    test_edge_cases
    
    # Print summary
    print_summary
    
    # Exit with error code if any tests failed
    if [ $TESTS_FAILED -gt 0 ]; then
        exit 1
    fi
}

# Run main function
main "$@"
