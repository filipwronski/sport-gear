# Quick API Test Commands

## Bike Management API - cURL Test Commands

### Base Configuration
```bash
BASE_URL="http://localhost:3000"
API_BASE="${BASE_URL}/api/bikes"

# Note: Replace with real JWT token from Supabase
TOKEN="your-jwt-token-here"
AUTH_HEADER="Authorization: Bearer ${TOKEN}"
```

### 1. Authentication Tests

**Test without auth token (should return 401):**
```bash
curl -i "${API_BASE}"
```

**Test with invalid token (should return 401):**
```bash
curl -i -H "Authorization: Bearer invalid-token" "${API_BASE}"
```

### 2. CRUD Operations

**GET /api/bikes - List all bikes:**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}"
```

**POST /api/bikes - Create new bike:**
```bash
curl -i -X POST \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trek Domane Test",
    "type": "szosowy",
    "purchase_date": "2023-05-15T12:00:00Z",
    "current_mileage": 1000,
    "notes": "Test bike from cURL"
  }' \
  "${API_BASE}"
```

**PUT /api/bikes/{id} - Update bike (replace {id} with actual bike ID):**
```bash
BIKE_ID="your-bike-id-here"
curl -i -X PUT \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trek Domane Updated",
    "current_mileage": 1500,
    "notes": "Updated from cURL test"
  }' \
  "${API_BASE}/${BIKE_ID}"
```

**PATCH /api/bikes/{id}/mileage - Update mileage:**
```bash
BIKE_ID="your-bike-id-here"
curl -i -X PATCH \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"current_mileage": 2000}' \
  "${API_BASE}/${BIKE_ID}/mileage"
```

**DELETE /api/bikes/{id} - Delete bike:**
```bash
BIKE_ID="your-bike-id-here"
curl -i -X DELETE \
  -H "${AUTH_HEADER}" \
  "${API_BASE}/${BIKE_ID}"
```

### 3. Query Parameters

**Filter by status:**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}?status=active"
```

**Filter by type:**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}?type=szosowy"
```

**Combined filters:**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}?status=active&type=mtb"
```

### 4. Validation Tests

**Missing required field (should return 422):**
```bash
curl -i -X POST \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"type": "szosowy"}' \
  "${API_BASE}"
```

**Invalid bike type (should return 422):**
```bash
curl -i -X POST \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Bike",
    "type": "invalid-type"
  }' \
  "${API_BASE}"
```

**Mileage decrease (should return 400):**
```bash
BIKE_ID="your-bike-id-here"
# First set mileage to higher value, then try to decrease
curl -i -X PATCH \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"current_mileage": 1000}' \
  "${API_BASE}/${BIKE_ID}/mileage"
```

### 5. Error Handling Tests

**Invalid UUID format (should return 400):**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}/invalid-uuid"
```

**Non-existent bike (should return 404):**
```bash
curl -i -H "${AUTH_HEADER}" "${API_BASE}/123e4567-e89b-12d3-a456-426614174000"
```

**Invalid JSON (should return 400):**
```bash
curl -i -X POST \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d 'invalid-json' \
  "${API_BASE}"
```

## Expected Response Formats

### Success Responses

**GET /api/bikes (200 OK):**
```json
{
  "bikes": [
    {
      "id": "uuid",
      "name": "Trek Domane",
      "type": "szosowy",
      "purchase_date": "2023-05-15T12:00:00Z",
      "current_mileage": 1000,
      "status": "active",
      "notes": "Test bike",
      "created_at": "2023-05-15T12:00:00Z",
      "updated_at": "2023-05-15T12:00:00Z",
      "next_service": null,
      "active_reminders_count": 0,
      "total_cost": 0
    }
  ],
  "total": 1
}
```

**POST /api/bikes (201 Created):**
```json
{
  "id": "uuid",
  "name": "Trek Domane",
  "type": "szosowy",
  "purchase_date": "2023-05-15T12:00:00Z",
  "current_mileage": 1000,
  "status": "active",
  "notes": "Test bike",
  "created_at": "2023-05-15T12:00:00Z",
  "updated_at": "2023-05-15T12:00:00Z",
  "next_service": null,
  "active_reminders_count": 0,
  "total_cost": 0
}
```

**PATCH /api/bikes/{id}/mileage (200 OK):**
```json
{
  "id": "uuid",
  "current_mileage": 2000,
  "updated_at": "2023-05-15T14:30:00Z"
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication token required"
}
```

**400 Bad Request (Mileage Decrease):**
```json
{
  "error": "Invalid mileage",
  "message": "New mileage (1000) cannot be less than current mileage (2000)",
  "code": "MILEAGE_DECREASE"
}
```

**422 Validation Error:**
```json
{
  "error": "Validation failed",
  "details": {
    "name": ["Name is required and must be 1-50 characters"],
    "type": ["Type must be one of: szosowy, gravelowy, mtb, czasowy"]
  }
}
```

**404 Not Found:**
```json
{
  "error": "Not found",
  "message": "Bike not found or you don't have permission to access it"
}
```

## Setup for Real Testing

### 1. Get JWT Token from Supabase

```bash
# Using Supabase CLI
supabase auth login

# Or create test user and get token programmatically
# Check Supabase docs for your specific setup
```

### 2. Set Environment Variables

```bash
export JWT_TOKEN="your-real-jwt-token"
export BASE_URL="http://localhost:3000"
export API_BASE="${BASE_URL}/api/bikes"
export AUTH_HEADER="Authorization: Bearer ${JWT_TOKEN}"
```

### 3. Run Automated Test Script

```bash
chmod +x test_api.sh
./test_api.sh
```
