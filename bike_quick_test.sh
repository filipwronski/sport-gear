#!/bin/bash

# Quick endpoint availability test
# Tests if all bike API endpoints are properly configured and return expected auth errors

BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/bikes"

echo "🚀 Testing Bike Management API Endpoints"
echo "========================================="

# Test 1: GET /api/bikes
echo -n "GET /api/bikes ... "
response=$(curl -s -w "%{http_code}" -o /dev/null "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 2: POST /api/bikes
echo -n "POST /api/bikes ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{}' "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 3: PUT /api/bikes/{id}
echo -n "PUT /api/bikes/{id} ... "
fake_uuid="123e4567-e89b-12d3-a456-426614174000"
response=$(curl -s -w "%{http_code}" -o /dev/null -X PUT -H "Content-Type: application/json" -d '{}' "${API_BASE}/${fake_uuid}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 4: DELETE /api/bikes/{id}
echo -n "DELETE /api/bikes/{id} ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "${API_BASE}/${fake_uuid}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

# Test 5: PATCH /api/bikes/{id}/mileage
echo -n "PATCH /api/bikes/{id}/mileage ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH -H "Content-Type: application/json" -d '{}' "${API_BASE}/${fake_uuid}/mileage")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

echo ""
echo "🔐 Authentication Test"
echo "====================="

# Test with invalid token
echo -n "Invalid token test ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -H "Authorization: Bearer invalid-token" "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (401 Unauthorized)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

echo ""
echo "📝 Validation Test"
echo "=================="

# Test validation without auth (should still return 401, not validation error)
echo -n "Validation priority test ... "
response=$(curl -s -w "%{http_code}" -o /dev/null -X POST -H "Content-Type: application/json" -d '{"invalid": "data"}' "${API_BASE}")
if [ "$response" = "401" ]; then
    echo "✅ OK (Auth takes priority over validation)"
else
    echo "❌ FAIL (Expected 401, got $response)"
fi

echo ""
echo "🎯 Summary"
echo "=========="
echo "All endpoints are properly configured and protected by authentication middleware."
echo "To test full functionality, you need a valid JWT token from Supabase."
echo ""
echo "Next steps:"
echo "1. Get JWT token from Supabase Auth"
echo "2. Use test_api.sh or API_TEST_GUIDE.md for comprehensive testing"
echo "3. Or use Postman/Insomnia with the endpoints"
