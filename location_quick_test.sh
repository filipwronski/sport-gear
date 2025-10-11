#!/bin/bash

# Quick Location API endpoint availability test
# Tests if all location API endpoints are properly configured and return expected auth errors

BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/locations"

echo "🏠 Testing Location Management API Endpoints"
echo "============================================="

# Test 1: GET /api/locations
echo -n "GET /api/locations ... "
response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 2: GET /api/locations with query param
echo -n "GET /api/locations?default_only=true ... "
response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}?default_only=true")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 3: POST /api/locations
echo -n "POST /api/locations ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{}' "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 4: PUT /api/locations/{id}
echo -n "PUT /api/locations/{id} ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X PUT -H "Content-Type: application/json" -d '{}' "${API_BASE}/550e8400-e29b-41d4-a716-446655440000")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 5: DELETE /api/locations/{id}
echo -n "DELETE /api/locations/{id} ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "${API_BASE}/550e8400-e29b-41d4-a716-446655440000")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

echo ""
echo "📝 Notes:"
echo "- All endpoints should return 401 Unauthorized without proper auth token"
echo "- If you see other errors, check server logs for details"
echo "- Run 'location_test_api.sh' for comprehensive testing with authentication"
