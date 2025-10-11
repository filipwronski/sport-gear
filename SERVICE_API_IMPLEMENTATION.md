# Service Management API Implementation

## Overview

This document describes the implementation of 5 REST API endpoints for bike service record management in the CycleGear MVP application.

## Implemented Endpoints

### 1. GET /api/bikes/{bikeId}/services
**Purpose**: Fetch service records with filtering, sorting and pagination

**Parameters**:
- `bikeId` (path): UUID of the bike
- `service_type` (query, optional): Filter by service type
- `service_location` (query, optional): Filter by service location  
- `limit` (query, optional): Number of records (1-100, default: 50)
- `offset` (query, optional): Pagination offset (default: 0)
- `from_date` (query, optional): Filter services from this date (ISO 8601)
- `to_date` (query, optional): Filter services until this date (ISO 8601)
- `sort` (query, optional): Sort order (default: 'service_date_desc')

**Response**: `ServicesListDTO` with services array, total count, and has_more flag

**Example**:
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/bikes/{bikeId}/services?limit=10&sort=service_date_desc"
```

### 2. POST /api/bikes/{bikeId}/services
**Purpose**: Create new service record with optional reminder

**Request Body**:
```json
{
  "service_date": "2025-01-01T10:00:00Z",
  "mileage_at_service": 1200,
  "service_type": "lancuch",
  "service_location": "warsztat",
  "cost": 120.50,
  "notes": "Chain replacement and cleaning",
  "create_reminder": true,
  "reminder_interval_km": 3000
}
```

**Response**: `ServiceRecordDTO` of created service (Status: 201)

### 3. PUT /api/bikes/{bikeId}/services/{id}
**Purpose**: Update existing service record (partial update)

**Request Body** (all fields optional):
```json
{
  "cost": 150.00,
  "notes": "Updated: Chain replacement with full cleaning"
}
```

**Response**: `ServiceRecordDTO` of updated service (Status: 200)

### 4. DELETE /api/bikes/{bikeId}/services/{id}
**Purpose**: Delete service record (hard delete)

**Response**: No content (Status: 204)

### 5. GET /api/bikes/{bikeId}/services/stats
**Purpose**: Get service statistics and cost analysis

**Parameters**:
- `period` (query, optional): 'month'|'quarter'|'year'|'all' (default: 'all')
- `from_date` (query, optional): Custom start date (overrides period)
- `to_date` (query, optional): Custom end date (overrides period)

**Response**: `ServiceStatsDTO` with comprehensive statistics

**Example Response**:
```json
{
  "period": { "from": "2024-01-01", "to": "2025-01-01" },
  "total_cost": 2450.75,
  "total_services": 15,
  "cost_per_km": 0.45,
  "total_mileage": 5420,
  "breakdown_by_type": [...],
  "breakdown_by_location": {...},
  "timeline": [...]
}
```

## Service Types

Supported service types:
- `lancuch` - Chain service
- `kaseta` - Cassette service  
- `klocki_przod` - Front brake pads
- `klocki_tyl` - Rear brake pads
- `opony` - Tires
- `przerzutki` - Derailleurs
- `hamulce` - Brakes
- `przeglad_ogolny` - General service
- `inne` - Other

## Service Locations

- `warsztat` - Bike shop
- `samodzielnie` - Self-service

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

**Common Error Codes**:
- `UNAUTHORIZED` (401) - Missing or invalid token
- `BIKE_NOT_FOUND` (404) - Bike not found or access denied
- `SERVICE_NOT_FOUND` (404) - Service record not found
- `INVALID_UUID` (400) - Invalid UUID format
- `VALIDATION_ERROR` (400/422) - Invalid request data
- `MILEAGE_LOWER_THAN_PREVIOUS` (422) - Business rule violation
- `DATE_IN_FUTURE` (422) - Service date cannot be in future

## Business Rules

1. **Mileage Validation**: Service mileage must be >= previous service mileage
2. **Date Validation**: Service date cannot be in the future
3. **Ownership**: Users can only access their own bike services
4. **Reminder Creation**: Only available during service creation (POST)
5. **Currency**: Default currency is PLN

## Database Schema

### service_records table
- `id` (uuid, primary key)
- `bike_id` (uuid, foreign key to bikes)
- `service_date` (date)
- `mileage_at_service` (integer)
- `service_type` (enum)
- `service_location` (enum, nullable)
- `cost` (decimal, nullable)
- `currency` (text, nullable)
- `notes` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### RPC Functions

#### get_service_totals(bike_id, from_date, to_date)
Calculates aggregated statistics for service records in date range.

**Returns**:
- `total_cost` - Sum of all service costs
- `total_services` - Count of service records
- `cost_per_km` - Cost per kilometer ratio
- `total_mileage` - Mileage range covered

## Security

- **Authentication**: JWT token required in Authorization header
- **Row Level Security (RLS)**: Enabled on service_records table
- **Ownership Verification**: Explicit checks in service layer
- **Input Validation**: Zod schemas for all endpoints
- **SQL Injection Prevention**: Parameterized queries via Supabase client

## Performance Optimizations

- **Database Indexes**: Composite index on (bike_id, service_date DESC)
- **Cache Headers**: 5 min for GET services, 1 hour for stats
- **Parallel Queries**: Stats aggregations run in parallel
- **RPC Functions**: Complex calculations moved to database
- **Connection Pooling**: Supabase client reuse

## Testing

### Test Scripts
- `service_test_api.sh` - Comprehensive test suite
- `service_quick_test.sh` - Quick availability check

### Test Coverage
- Authentication scenarios (401 errors)
- Validation errors (400/422 errors)
- Business logic validation (mileage, dates)
- CRUD operations (happy path)
- Edge cases (empty results, boundary values)
- Ownership verification (404 errors)

## Implementation Files

### Core Implementation
- `src/services/service-record.service.ts` - Business logic layer
- `src/lib/validation/service.schemas.ts` - Zod validation schemas
- `src/lib/errors/index.ts` - Custom error classes (extended)
- `src/lib/error-handler.ts` - Global error handling (extended)

### API Endpoints
- `src/pages/api/bikes/[bikeId]/services/index.ts` - GET/POST services
- `src/pages/api/bikes/[bikeId]/services/[id].ts` - PUT/DELETE service
- `src/pages/api/bikes/[bikeId]/services/stats.ts` - GET statistics

### Database
- `supabase/migrations/20251011000200_service_statistics_functions.sql` - RPC functions

## Usage Examples

### Create Service with Reminder
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "service_date": "2025-01-01T10:00:00Z",
    "mileage_at_service": 1200,
    "service_type": "lancuch",
    "service_location": "warsztat",
    "cost": 120.50,
    "create_reminder": true,
    "reminder_interval_km": 3000
  }' \
  "http://localhost:3000/api/bikes/{bikeId}/services"
```

### Get Filtered Services
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/bikes/{bikeId}/services?service_type=lancuch&limit=20&sort=cost_desc"
```

### Get Monthly Statistics
```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/bikes/{bikeId}/services/stats?period=month"
```

### Update Service Cost
```bash
curl -X PUT \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"cost": 150.00}' \
  "http://localhost:3000/api/bikes/{bikeId}/services/{serviceId}"
```

## Deployment Notes

1. **Environment Variables**: Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
2. **Database Migrations**: Apply migrations with `npx supabase db push --linked`
3. **RLS Policies**: Verify service_records policies are active
4. **Function Permissions**: Ensure authenticated role has EXECUTE on RPC functions
5. **Indexes**: Verify composite indexes exist for performance

## Future Enhancements

- Bulk operations (import CSV)
- Service templates and packages
- Photo attachments for services
- Email/push notifications for reminders
- Multi-currency support
- Service provider database
- Price comparison features
- PDF export for warranty claims

---

**Implementation Status**: ✅ Complete  
**Test Coverage**: ✅ Comprehensive test scripts created  
**Database**: ✅ Migrations applied  
**Documentation**: ✅ Complete API documentation  

All 5 service management endpoints have been successfully implemented according to the specification.
