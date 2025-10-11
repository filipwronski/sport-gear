#!/bin/bash

echo "🚀 TESTOWANIE LOCATION API PO UTWORZENIU MOCK PROFILU"
echo "=================================================="
echo ""

echo "1. 📋 GET /api/locations (powinien zwrócić [])"
curl -s -w "HTTP Code: %{http_code}\n" -H "Authorization: Bearer test-token" "http://localhost:3000/api/locations"
echo ""

echo "2. 📝 POST /api/locations (powinien utworzyć lokalizację)"
curl -s -w "HTTP Code: %{http_code}\n" -X POST -H "Authorization: Bearer test-token" -H "Content-Type: application/json" -d '{"latitude": 52.237, "longitude": 21.017, "city": "Warsaw", "country_code": "PL", "is_default": true, "label": "Test Location"}' "http://localhost:3000/api/locations"
echo ""

echo "3. 📋 GET /api/locations (powinien zwrócić utworzoną lokalizację)"
curl -s -w "HTTP Code: %{http_code}\n" -H "Authorization: Bearer test-token" "http://localhost:3000/api/locations"
echo ""

echo "4. 🧪 Test RPC funkcji"
curl -s -w "HTTP Code: %{http_code}\n" -H "Authorization: Bearer test-token" "http://localhost:3000/api/test-rpc"
