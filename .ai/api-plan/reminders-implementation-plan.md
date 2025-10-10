# API Endpoint Implementation Plan: Service Reminders & Default Intervals

## 1. Przegląd punktów końcowych

### Grupa endpointów: Service Reminders Management

Moduł zarządzania przypomnienkami serwisowymi dla rowerów użytkownika. System automatycznie śledzi przebieg i powiadamia o zbliżających się serwisach na podstawie zdefiniowanych interwałów kilometrowych.

**Endpoints:**
1. **GET /api/bikes/{bikeId}/reminders** - Pobieranie listy przypomnień z filtrowaniem
2. **POST /api/bikes/{bikeId}/reminders** - Tworzenie manualnego przypomnienia
3. **PUT /api/bikes/{bikeId}/reminders/{id}/complete** - Oznaczanie przypomnienia jako wykonane
4. **DELETE /api/bikes/{bikeId}/reminders/{id}** - Usuwanie przypomnienia
5. **GET /api/default-intervals** - Pobieranie domyślnych interwałów serwisowych (read-only reference data)

**Kluczowe funkcjonalności:**
- Filtrowanie po statusie (active, completed, overdue, all)
- Filtrowanie po typie serwisu
- Sortowanie (po km_remaining lub created_at)
- Automatyczne obliczanie statusu (upcoming, overdue) na podstawie current_mileage
- Conflict detection - jeden reminder na typ serwisu per rower
- Powiązanie z service_records przy oznaczaniu jako "completed"

---

## 2. Szczegóły żądań

### 2.1 GET /api/bikes/{bikeId}/reminders

**Metoda HTTP:** GET

**Struktura URL:** `/api/bikes/{bikeId}/reminders`

**Path Parameters:**
- `bikeId` (required): string (UUID) - ID roweru

**Query Parameters:**
- `status` (optional): string - enum: `all` | `active` | `completed` | `overdue`
  - Default: `active`
  - Validation: must be one of allowed values
- `service_type` (optional): string - enum: `lancuch` | `kaseta` | `klocki_przod` | `klocki_tyl` | `opony` | `przerzutki` | `hamulce` | `przeglad_ogolny` | `inne`
  - Validation: must be one of allowed values
- `sort` (optional): string - enum: `km_remaining_asc` | `km_remaining_desc` | `created_at_asc` | `created_at_desc`
  - Default: `km_remaining_asc`
  - Validation: must be one of allowed values

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request Body:** N/A (GET request)

---

### 2.2 POST /api/bikes/{bikeId}/reminders

**Metoda HTTP:** POST

**Struktura URL:** `/api/bikes/{bikeId}/reminders`

**Path Parameters:**
- `bikeId` (required): string (UUID) - ID roweru

**Headers:**
- `Authorization: Bearer {token}` (required)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  "service_type": ServiceTypeEnum, // required
  "interval_km": number             // required
}
```

**Validation Rules:**
- `service_type`: must be valid ServiceTypeEnum value
- `interval_km`:
  - Must be positive integer
  - Range: 50 - 50000 km (reasonable bounds)
  - No decimal values

---

### 2.3 PUT /api/bikes/{bikeId}/reminders/{id}/complete

**Metoda HTTP:** PUT

**Struktura URL:** `/api/bikes/{bikeId}/reminders/{id}/complete`

**Path Parameters:**
- `bikeId` (required): string (UUID) - ID roweru
- `id` (required): string (UUID) - ID przypomnienia

**Headers:**
- `Authorization: Bearer {token}` (required)
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  "completed_service_id": string // required, UUID
}
```

**Validation Rules:**
- `completed_service_id`:
  - Must be valid UUID
  - Service record must exist
  - Service record must belong to the same bike
  - Service record service_type should match reminder service_type (warning if mismatch)

---

### 2.4 DELETE /api/bikes/{bikeId}/reminders/{id}

**Metoda HTTP:** DELETE

**Struktura URL:** `/api/bikes/{bikeId}/reminders/{id}`

**Path Parameters:**
- `bikeId` (required): string (UUID) - ID roweru
- `id` (required): string (UUID) - ID przypomnienia

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request Body:** N/A

---

### 2.5 GET /api/default-intervals

**Metoda HTTP:** GET

**Struktura URL:** `/api/default-intervals`

**Query Parameters:** None

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request Body:** N/A

---

## 3. Wykorzystywane typy

### 3.1 Response DTOs

```typescript
// ServiceReminderDTO (lines 554-568 in types.ts)
interface ServiceReminderDTO {
  id: string;
  bike_id: string;
  service_type: ServiceTypeEnum;
  triggered_at_mileage: number;
  interval_km: number;
  target_mileage: number | null;        // triggered_at_mileage + interval_km
  current_mileage: number;              // from bikes table
  km_remaining: number;                 // target_mileage - current_mileage
  status: ReminderStatusEnum;           // computed: active|completed|overdue|upcoming
  completed_at: string | null;
  completed_service_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// DefaultIntervalDTO (lines 593-599 in types.ts)
interface DefaultIntervalDTO {
  service_type: ServiceTypeEnum;
  default_interval_km: number;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

### 3.2 Command Models

```typescript
// CreateReminderCommand (lines 571-576 in types.ts)
interface CreateReminderCommand {
  service_type: ServiceTypeEnum;
  interval_km: number;
}

// CompleteReminderCommand (lines 578-583 in types.ts)
interface CompleteReminderCommand {
  completed_service_id: string;
}
```

### 3.3 Query Parameters Types

```typescript
// GetRemindersParams (lines 747-752 in types.ts)
interface GetRemindersParams {
  status?: 'all' | 'active' | 'completed' | 'overdue';
  service_type?: ServiceTypeEnum;
  sort?: 'km_remaining_asc' | 'km_remaining_desc' | 'created_at_asc' | 'created_at_desc';
}
```

### 3.4 Enums

```typescript
// ServiceTypeEnum (lines 28-37 in types.ts)
type ServiceTypeEnum =
  | 'lancuch'
  | 'kaseta'
  | 'klocki_przod'
  | 'klocki_tyl'
  | 'opony'
  | 'przerzutki'
  | 'hamulce'
  | 'przeglad_ogolny'
  | 'inne';

// ReminderStatusEnum (line 43 in types.ts)
type ReminderStatusEnum = 'active' | 'completed' | 'overdue' | 'upcoming';
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/bikes/{bikeId}/reminders

**Success Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "bike_id": "123e4567-e89b-12d3-a456-426614174000",
    "service_type": "klocki_przod",
    "triggered_at_mileage": 3200,
    "interval_km": 2000,
    "target_mileage": 5200,
    "current_mileage": 5420,
    "km_remaining": -220,
    "status": "overdue",
    "completed_at": null,
    "completed_service_id": null,
    "created_at": "2025-08-15T10:00:00Z",
    "updated_at": "2025-08-15T10:00:00Z"
  }
]
```

**Error Responses:**
- **401 Unauthorized:**
  ```json
  {
    "error": "Unauthorized",
    "message": "Authentication required"
  }
  ```

- **404 Not Found:**
  ```json
  {
    "error": "Bike Not Found",
    "message": "Bike with ID {bikeId} does not exist or you don't have access"
  }
  ```

---

### 4.2 POST /api/bikes/{bikeId}/reminders

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "bike_id": "123e4567-e89b-12d3-a456-426614174000",
  "service_type": "przeglad_ogolny",
  "triggered_at_mileage": 5000,
  "interval_km": 5000,
  "target_mileage": 10000,
  "current_mileage": 5000,
  "km_remaining": 5000,
  "status": "upcoming",
  "completed_at": null,
  "completed_service_id": null,
  "created_at": "2025-10-10T12:00:00Z",
  "updated_at": "2025-10-10T12:00:00Z"
}
```

**Error Responses:**
- **400 Bad Request:**
  ```json
  {
    "error": "Bad Request",
    "message": "Invalid request body",
    "details": [
      {
        "field": "service_type",
        "message": "Must be one of: lancuch, kaseta, klocki_przod, klocki_tyl, opony, przerzutki, hamulce, przeglad_ogolny, inne"
      }
    ]
  }
  ```

- **409 Conflict:**
  ```json
  {
    "error": "Conflict",
    "message": "Active reminder for service type 'lancuch' already exists for this bike"
  }
  ```

- **422 Unprocessable Entity:**
  ```json
  {
    "error": "Validation Error",
    "message": "Invalid field values",
    "details": [
      {
        "field": "interval_km",
        "message": "Must be between 50 and 50000"
      }
    ]
  }
  ```

---

### 4.3 PUT /api/bikes/{bikeId}/reminders/{id}/complete

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "bike_id": "123e4567-e89b-12d3-a456-426614174000",
  "service_type": "lancuch",
  "triggered_at_mileage": 0,
  "interval_km": 3000,
  "target_mileage": 3000,
  "current_mileage": 3100,
  "km_remaining": -100,
  "status": "completed",
  "completed_at": "2025-10-10T14:30:00Z",
  "completed_service_id": "abc12345-1234-5678-abcd-123456789abc",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-10-10T14:30:00Z"
}
```

**Error Responses:**
- **404 Not Found:**
  ```json
  {
    "error": "Not Found",
    "message": "Reminder not found or service record does not exist"
  }
  ```

---

### 4.4 DELETE /api/bikes/{bikeId}/reminders/{id}

**Success Response (204 No Content):**
- No body, just status code 204

**Error Responses:**
- **404 Not Found:**
  ```json
  {
    "error": "Not Found",
    "message": "Reminder not found"
  }
  ```

---

### 4.5 GET /api/default-intervals

**Success Response (200 OK):**
```json
[
  {
    "service_type": "lancuch",
    "default_interval_km": 3000,
    "description": "Wymiana łańcucha co 3000 km",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  {
    "service_type": "kaseta",
    "default_interval_km": 9000,
    "description": "Wymiana kasety co 9000 km (3 łańcuchy)",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  },
  {
    "service_type": "klocki_przod",
    "default_interval_km": 2000,
    "description": "Klocki hamulcowe przód co 2000 km",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
]
```

---

## 5. Przepływ danych

### 5.1 GET /api/bikes/{bikeId}/reminders

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/bikes/{bikeId}/reminders?status=active
       ▼
┌─────────────────────┐
│  Astro API Route    │
│  (Auth Middleware)  │
└──────┬──────────────┘
       │ 1. Extract user from JWT
       │ 2. Validate query params
       ▼
┌─────────────────────┐
│ BikeReminderService │
└──────┬──────────────┘
       │ 3. Verify bike ownership
       │ 4. Build Supabase query:
       │    - JOIN bikes for current_mileage
       │    - Filter by status
       │    - Filter by service_type (if provided)
       │    - Apply sorting
       ▼
┌─────────────────────┐
│  Supabase Client    │
│  (RLS enabled)      │
└──────┬──────────────┘
       │ 5. Execute query with RLS
       │ 6. Calculate computed fields:
       │    - target_mileage
       │    - km_remaining
       │    - status (if not filtered)
       ▼
┌─────────────────────┐
│   Transform to      │
│ ServiceReminderDTO[]│
└──────┬──────────────┘
       │ 7. Return 200 with array
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

**Database Query (pseudo-SQL):**
```sql
SELECT 
  sr.*,
  b.current_mileage,
  (sr.triggered_at_mileage + sr.interval_km) as target_mileage,
  ((sr.triggered_at_mileage + sr.interval_km) - b.current_mileage) as km_remaining,
  CASE
    WHEN sr.completed_at IS NOT NULL THEN 'completed'
    WHEN ((sr.triggered_at_mileage + sr.interval_km) - b.current_mileage) < 0 THEN 'overdue'
    WHEN ((sr.triggered_at_mileage + sr.interval_km) - b.current_mileage) < 200 THEN 'active'
    ELSE 'upcoming'
  END as status
FROM service_reminders sr
JOIN bikes b ON sr.bike_id = b.id
WHERE sr.bike_id = {bikeId}
  AND b.user_id = {userId}  -- RLS handles this
  AND (status = {status} OR {status} = 'all')
  AND (service_type = {service_type} OR {service_type} IS NULL)
ORDER BY {sort_field} {sort_direction}
```

---

### 5.2 POST /api/bikes/{bikeId}/reminders

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/bikes/{bikeId}/reminders
       │ Body: { service_type, interval_km }
       ▼
┌─────────────────────┐
│  Astro API Route    │
│  (Auth Middleware)  │
└──────┬──────────────┘
       │ 1. Extract user from JWT
       │ 2. Validate request body
       ▼
┌─────────────────────┐
│ BikeReminderService │
└──────┬──────────────┘
       │ 3. Verify bike exists and user owns it
       │ 4. Check for existing active reminder
       │    for this service_type
       │ 5. Get current bike mileage
       ▼
┌─────────────────────┐
│  Supabase Client    │
└──────┬──────────────┘
       │ 6. Check conflict:
       │    SELECT FROM service_reminders
       │    WHERE bike_id = {bikeId}
       │      AND service_type = {service_type}
       │      AND completed_at IS NULL
       ▼
       │ If exists → Return 409 Conflict
       │
       │ 7. Insert reminder:
       │    INSERT INTO service_reminders
       │    (bike_id, service_type, interval_km,
       │     triggered_at_mileage)
       │    VALUES ({bikeId}, {service_type}, 
       │            {interval_km}, {current_mileage})
       ▼
┌─────────────────────┐
│   Transform to      │
│  ServiceReminderDTO │
└──────┬──────────────┘
       │ 8. Return 201 Created
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

**Business Logic:**
- `triggered_at_mileage` = current bike mileage at creation time
- `target_mileage` = triggered_at_mileage + interval_km
- Initial status = 'upcoming' (if km_remaining > 200) or 'active' (if km_remaining <= 200)

---

### 5.3 PUT /api/bikes/{bikeId}/reminders/{id}/complete

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ PUT /api/bikes/{bikeId}/reminders/{id}/complete
       │ Body: { completed_service_id }
       ▼
┌─────────────────────┐
│  Astro API Route    │
│  (Auth Middleware)  │
└──────┬──────────────┘
       │ 1. Extract user from JWT
       │ 2. Validate request body
       ▼
┌─────────────────────┐
│ BikeReminderService │
└──────┬──────────────┘
       │ 3. Verify reminder exists and user owns bike
       │ 4. Verify service record exists
       │ 5. Verify service record belongs to same bike
       ▼
┌─────────────────────┐
│  Supabase Client    │
└──────┬──────────────┘
       │ 6. Fetch service record:
       │    SELECT * FROM service_records
       │    WHERE id = {completed_service_id}
       │      AND bike_id = {bikeId}
       ▼
       │ If not found → Return 404
       │
       │ 7. Update reminder:
       │    UPDATE service_reminders
       │    SET completed_at = NOW(),
       │        completed_service_id = {completed_service_id}
       │    WHERE id = {id}
       │      AND bike_id = {bikeId}
       ▼
┌─────────────────────┐
│   Transform to      │
│  ServiceReminderDTO │
└──────┬──────────────┘
       │ 8. Return 200 OK
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

**Note:** Completing a reminder doesn't automatically create a new one. This is handled by database trigger (see migrations) when a service_record is created with `create_reminder = true`.

---

### 5.4 DELETE /api/bikes/{bikeId}/reminders/{id}

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ DELETE /api/bikes/{bikeId}/reminders/{id}
       ▼
┌─────────────────────┐
│  Astro API Route    │
│  (Auth Middleware)  │
└──────┬──────────────┘
       │ 1. Extract user from JWT
       ▼
┌─────────────────────┐
│ BikeReminderService │
└──────┬──────────────┘
       │ 2. Verify reminder exists and user owns bike
       ▼
┌─────────────────────┐
│  Supabase Client    │
│  (RLS enabled)      │
└──────┬──────────────┘
       │ 3. DELETE FROM service_reminders
       │    WHERE id = {id}
       │      AND bike_id = {bikeId}
       ▼
       │ If rowCount = 0 → Return 404
       │ If rowCount = 1 → Return 204
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

---

### 5.5 GET /api/default-intervals

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/default-intervals
       ▼
┌─────────────────────┐
│  Astro API Route    │
│  (Auth Middleware)  │
└──────┬──────────────┘
       │ 1. Extract user from JWT
       ▼
┌─────────────────────┐
│ BikeReminderService │
└──────┬──────────────┘
       │ 2. Fetch all default intervals
       ▼
┌─────────────────────┐
│  Supabase Client    │
└──────┬──────────────┘
       │ 3. SELECT * FROM default_service_intervals
       │    ORDER BY default_interval_km ASC
       ▼
┌─────────────────────┐
│   Transform to      │
│ DefaultIntervalDTO[]│
└──────┬──────────────┘
       │ 4. Return 200 with array
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

**Note:** This is reference data, potentially cacheable on client side or with short TTL.

---

## 6. Względy bezpieczeństwa

### 6.1 Authentication
- **Mechanizm:** Supabase Auth JWT
- **Implementacja:**
  - Middleware `src/middleware/index.ts` weryfikuje JWT token
  - Extract `userId` z JWT payload
  - Reject requests without valid token (401 Unauthorized)

### 6.2 Authorization
- **Row Level Security (RLS):**
  - Supabase RLS policies enforce `is_bike_owner(bike_id)` check
  - Policies defined for SELECT, INSERT, UPDATE, DELETE
  - User can only access reminders for bikes they own

- **Service Layer Verification:**
  - Additional ownership check in `BikeReminderService`
  - Verify bike exists before operations
  - Return 404 instead of 403 to prevent information disclosure

### 6.3 Input Validation
- **Path Parameters:**
  - `bikeId`: Must be valid UUID format
  - `id`: Must be valid UUID format
  - Reject malformed UUIDs with 400 Bad Request

- **Query Parameters:**
  - `status`: Whitelist validation against allowed enum
  - `service_type`: Whitelist validation against ServiceTypeEnum
  - `sort`: Whitelist validation against allowed sort options
  - Reject invalid values with 400 Bad Request

- **Request Body:**
  - `service_type`: Enum validation
  - `interval_km`: Positive integer, range 50-50000
  - `completed_service_id`: UUID format and existence check
  - Sanitize string inputs (though description fields are enum-based)

### 6.4 IDOR Prevention
- **Insecure Direct Object Reference mitigation:**
  - Always verify resource ownership before operations
  - Use compound checks: resource exists AND user owns parent bike
  - RLS policies provide database-level protection
  - Service layer provides additional application-level checks

### 6.5 SQL Injection Prevention
- **Supabase Client:** Uses parameterized queries automatically
- **Never concatenate user input into queries**
- **TypeScript types** enforce proper query structure

### 6.6 Rate Limiting
- **POST endpoint:** Implement rate limiting to prevent spam
  - Max 10 reminders per bike
  - Max 50 reminder creations per user per day
  - Could be enforced via Cloudflare or middleware

### 6.7 Data Exposure
- **Sensitive data:** None in this endpoint (no PII beyond userId ownership)
- **Error messages:** Don't leak internal details
  - Generic "Not Found" instead of "Bike doesn't exist" vs "You don't own this bike"

---

## 7. Obsługa błędów

### 7.1 Error Response Format
Standardized error response structure:

```typescript
interface ErrorResponse {
  error: string;         // Error type/title
  message: string;       // Human-readable message
  details?: Array<{      // Optional validation details
    field: string;
    message: string;
  }>;
}
```

### 7.2 Error Scenarios by Endpoint

#### GET /api/bikes/{bikeId}/reminders

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Missing/invalid JWT | 401 | `{ error: "Unauthorized", message: "Authentication required" }` |
| Invalid UUID format for bikeId | 400 | `{ error: "Bad Request", message: "Invalid bike ID format" }` |
| Bike not found or not owned | 404 | `{ error: "Bike Not Found", message: "Bike with ID {id} does not exist or you don't have access" }` |
| Invalid status param | 400 | `{ error: "Bad Request", message: "status must be one of: all, active, completed, overdue" }` |
| Invalid service_type param | 400 | `{ error: "Bad Request", message: "Invalid service type" }` |
| Invalid sort param | 400 | `{ error: "Bad Request", message: "Invalid sort option" }` |
| Database connection error | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` |

#### POST /api/bikes/{bikeId}/reminders

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Missing/invalid JWT | 401 | `{ error: "Unauthorized", message: "Authentication required" }` |
| Invalid UUID format | 400 | `{ error: "Bad Request", message: "Invalid bike ID format" }` |
| Bike not found or not owned | 404 | `{ error: "Bike Not Found", message: "Bike not found" }` |
| Missing required fields | 400 | `{ error: "Bad Request", message: "Missing required fields", details: [...] }` |
| Invalid service_type | 400 | `{ error: "Bad Request", message: "Invalid service type" }` |
| Invalid interval_km (< 50) | 422 | `{ error: "Validation Error", message: "interval_km must be at least 50" }` |
| Invalid interval_km (> 50000) | 422 | `{ error: "Validation Error", message: "interval_km must not exceed 50000" }` |
| Reminder already exists | 409 | `{ error: "Conflict", message: "Active reminder for service type '{type}' already exists" }` |
| Database error | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` |

#### PUT /api/bikes/{bikeId}/reminders/{id}/complete

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Missing/invalid JWT | 401 | `{ error: "Unauthorized", message: "Authentication required" }` |
| Invalid UUID format (bikeId or id) | 400 | `{ error: "Bad Request", message: "Invalid ID format" }` |
| Reminder not found | 404 | `{ error: "Not Found", message: "Reminder not found" }` |
| Service record not found | 404 | `{ error: "Not Found", message: "Service record not found" }` |
| Service record belongs to different bike | 400 | `{ error: "Bad Request", message: "Service record doesn't belong to this bike" }` |
| Reminder already completed | 400 | `{ error: "Bad Request", message: "Reminder already completed" }` |
| Database error | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` |

#### DELETE /api/bikes/{bikeId}/reminders/{id}

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Missing/invalid JWT | 401 | `{ error: "Unauthorized", message: "Authentication required" }` |
| Invalid UUID format | 400 | `{ error: "Bad Request", message: "Invalid ID format" }` |
| Reminder not found | 404 | `{ error: "Not Found", message: "Reminder not found" }` |
| Database error | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` |

#### GET /api/default-intervals

| Scenario | Status Code | Error Response |
|----------|-------------|----------------|
| Missing/invalid JWT | 401 | `{ error: "Unauthorized", message: "Authentication required" }` |
| Database error | 500 | `{ error: "Internal Server Error", message: "An unexpected error occurred" }` |

### 7.3 Error Logging Strategy

**Log Levels:**
- **INFO:** Validation errors (400, 422), Not Found (404), Conflict (409)
- **WARN:** Authentication errors (401)
- **ERROR:** Server errors (500), database errors, unexpected exceptions

**Log Format:**
```typescript
{
  timestamp: ISO8601,
  level: 'INFO' | 'WARN' | 'ERROR',
  endpoint: string,
  method: string,
  userId: string | null,
  bikeId: string | null,
  statusCode: number,
  error: string,
  message: string,
  stack?: string,  // Only for ERROR level
  requestId: string  // For tracing
}
```

**Log to:** Supabase Edge Functions logs / Sentry for production errors

### 7.4 Error Handling Best Practices
1. **Never expose stack traces** in production API responses
2. **Use generic messages** for security-sensitive errors (404 instead of 403)
3. **Validate early** - reject invalid input before database queries
4. **Log all 500 errors** with full context for debugging
5. **Use try-catch blocks** around database operations
6. **Set proper HTTP status codes** - be consistent with REST conventions

---

## 8. Rozważania dotyczące wydajności

### 8.1 Database Query Optimization

**Indexes Required:**
```sql
-- Already in schema (from migrations)
CREATE INDEX idx_service_reminders_bike_id ON service_reminders(bike_id);
CREATE INDEX idx_service_reminders_service_type ON service_reminders(service_type);
CREATE INDEX idx_service_reminders_completed_at ON service_reminders(completed_at);

-- Composite index for common query pattern
CREATE INDEX idx_service_reminders_bike_status 
  ON service_reminders(bike_id, completed_at) 
  WHERE completed_at IS NULL;
```

**Query Performance:**
- **JOIN with bikes table:** Essential for current_mileage, but bikes table is small per user
- **Computed fields:** Calculate status, km_remaining in application layer (not in DB) for flexibility
- **Filtering:** Use indexed columns (bike_id, service_type, completed_at)

**N+1 Query Prevention:**
- Single query with JOIN instead of fetching reminders then bikes separately
- Use Supabase `.select()` with proper joins

### 8.2 Caching Strategy

**Default Intervals (GET /api/default-intervals):**
- **TTL:** 24 hours (rarely changes)
- **Strategy:** Cache in memory or Redis
- **Invalidation:** Manual on data update (admin only)

**Bike Reminders (GET /api/bikes/{bikeId}/reminders):**
- **TTL:** 5 minutes (data changes when mileage updated)
- **Cache Key:** `reminders:bike:{bikeId}:status:{status}:sort:{sort}`
- **Invalidation:** On POST, PUT, DELETE operations for that bike
- **Trade-off:** May show slightly stale km_remaining, acceptable for MVP

### 8.3 Pagination

**Not implemented in MVP for reminders:**
- Expected max ~10-15 reminders per bike
- No pagination needed at this scale
- Future: Add `limit` and `offset` if users have many completed reminders

**Future Pagination Pattern:**
```typescript
interface GetRemindersParams {
  // ... existing params
  limit?: number;    // default: 20, max: 100
  offset?: number;   // default: 0
}

// Response with pagination meta
interface RemindersListResponse {
  reminders: ServiceReminderDTO[];
  total: number;
  has_more: boolean;
}
```

### 8.4 Response Size Optimization

**Current Response Size:**
- Single reminder: ~400 bytes
- 10 reminders: ~4 KB
- Acceptable without compression

**If needed:**
- Enable GZIP compression (Cloudflare does this by default)
- Omit null fields in JSON responses
- Use shorter field names (not recommended for readability)

### 8.5 Database Connection Pooling

**Supabase handles this automatically:**
- Connection pooling built-in
- Max connections per project: 60 (free tier)
- Use Supabase client singleton pattern

**Implementation:**
```typescript
// src/db/supabase.client.ts (already exists)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.SUPABASE_URL,
  import.meta.env.SUPABASE_ANON_KEY
);

export default supabase;
```

### 8.6 Potential Bottlenecks

**Identified Bottlenecks:**
1. **Multiple status calculations per reminder** - compute once per request
2. **Repeated bike ownership checks** - cache result within request scope
3. **JOIN with bikes table** - unavoidable, but indexed

**Mitigation:**
- Memoize computed fields
- Use database views for complex queries (future optimization)
- Consider denormalization if needed (store current_mileage in reminders - not recommended)

### 8.7 Monitoring Metrics

**Key Metrics to Track:**
- **Response time:** P50, P95, P99
  - Target: < 100ms for GET, < 200ms for POST/PUT/DELETE
- **Error rate:** 4xx and 5xx responses
  - Target: < 1% error rate
- **Query time:** Database query duration
  - Target: < 50ms per query
- **Cache hit rate:** For default-intervals endpoint
  - Target: > 90% hit rate

**Tools:**
- Supabase Dashboard - query performance
- Sentry - error tracking and performance monitoring
- Cloudflare Analytics - edge response times

---

## 9. Etapy wdrożenia

### 9.1 Prerequisites
- [x] Database schema created (migrations already exist)
- [x] RLS policies defined and applied
- [x] Type definitions in `src/types.ts` complete
- [ ] Supabase client configured
- [ ] Auth middleware implemented

### 9.2 Step-by-Step Implementation

#### Step 1: Create Service Layer (src/services/BikeReminderService.ts)

**Tasks:**
- [ ] Create `BikeReminderService` class
- [ ] Implement `getReminders(userId, bikeId, params)` method
  - Build Supabase query with filters
  - JOIN with bikes table for current_mileage
  - Calculate computed fields (target_mileage, km_remaining, status)
  - Apply sorting
  - Transform to ServiceReminderDTO[]
- [ ] Implement `createReminder(userId, bikeId, command)` method
  - Validate bike ownership
  - Check for existing reminder conflict
  - Get current bike mileage
  - Insert reminder with triggered_at_mileage = current_mileage
  - Return ServiceReminderDTO
- [ ] Implement `completeReminder(userId, bikeId, reminderId, command)` method
  - Validate reminder exists and ownership
  - Validate service record exists and belongs to bike
  - Update reminder (completed_at, completed_service_id)
  - Return ServiceReminderDTO
- [ ] Implement `deleteReminder(userId, bikeId, reminderId)` method
  - Validate reminder exists and ownership
  - Delete reminder
  - Return success/failure
- [ ] Implement `getDefaultIntervals()` method
  - Fetch all from default_service_intervals table
  - Transform to DefaultIntervalDTO[]
- [ ] Add error handling with custom exceptions

**Estimated Time:** 4-6 hours

---

#### Step 2: Create API Routes (Astro Server Endpoints)

**File Structure:**
```
src/pages/api/bikes/[bikeId]/
  - reminders/
    - index.ts          # GET, POST
    - [id].ts           # DELETE
    - [id]/complete.ts  # PUT
src/pages/api/
  - default-intervals.ts # GET
```

**Tasks:**

**File: src/pages/api/bikes/[bikeId]/reminders/index.ts**
- [ ] Implement `GET` handler
  - Extract userId from middleware
  - Extract bikeId from path params
  - Parse and validate query params
  - Call `BikeReminderService.getReminders()`
  - Return 200 with JSON array
  - Handle errors (401, 404, 400, 500)
- [ ] Implement `POST` handler
  - Extract userId from middleware
  - Extract bikeId from path params
  - Parse and validate request body
  - Call `BikeReminderService.createReminder()`
  - Return 201 with created reminder
  - Handle errors (401, 404, 400, 409, 422, 500)

**File: src/pages/api/bikes/[bikeId]/reminders/[id]/complete.ts**
- [ ] Implement `PUT` handler
  - Extract userId from middleware
  - Extract bikeId and id from path params
  - Parse and validate request body
  - Call `BikeReminderService.completeReminder()`
  - Return 200 with updated reminder
  - Handle errors (401, 404, 400, 500)

**File: src/pages/api/bikes/[bikeId]/reminders/[id].ts**
- [ ] Implement `DELETE` handler
  - Extract userId from middleware
  - Extract bikeId and id from path params
  - Call `BikeReminderService.deleteReminder()`
  - Return 204 No Content
  - Handle errors (401, 404, 500)

**File: src/pages/api/default-intervals.ts**
- [ ] Implement `GET` handler
  - Extract userId from middleware (auth check only)
  - Call `BikeReminderService.getDefaultIntervals()`
  - Return 200 with JSON array
  - Handle errors (401, 500)

**Estimated Time:** 4-5 hours

---

#### Step 3: Input Validation Utilities

**File: src/utils/validation.ts**

**Tasks:**
- [ ] Create `validateUUID(value: string): boolean`
- [ ] Create `validateServiceType(value: string): boolean`
- [ ] Create `validateReminderStatus(value: string): boolean`
- [ ] Create `validateReminderSort(value: string): boolean`
- [ ] Create `validateIntervalKm(value: number): { valid: boolean, error?: string }`
- [ ] Create `validateQueryParams(params: GetRemindersParams): ValidationResult`
- [ ] Create `validateCreateReminderCommand(command: CreateReminderCommand): ValidationResult`
- [ ] Create `validateCompleteReminderCommand(command: CompleteReminderCommand): ValidationResult`

**Estimated Time:** 2-3 hours

---

#### Step 4: Error Handling Utilities

**File: src/utils/errors.ts**

**Tasks:**
- [ ] Create custom error classes:
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `UnprocessableEntityError` (422)
- [ ] Create `formatErrorResponse(error: Error): ErrorResponse`
- [ ] Create `logError(error: Error, context: object): void`
- [ ] Create error handler middleware wrapper

**Estimated Time:** 2 hours

---

#### Step 5: Testing

**Unit Tests (Vitest):**
- [ ] Test `BikeReminderService.getReminders()` with various filters
- [ ] Test `BikeReminderService.createReminder()` happy path
- [ ] Test `BikeReminderService.createReminder()` conflict detection
- [ ] Test `BikeReminderService.completeReminder()` validations
- [ ] Test `BikeReminderService.deleteReminder()`
- [ ] Test validation utilities
- [ ] Test computed fields calculations (status, km_remaining)

**Integration Tests (Playwright E2E):**
- [ ] Test GET reminders endpoint with auth
- [ ] Test POST reminder creation flow
- [ ] Test PUT complete reminder flow
- [ ] Test DELETE reminder
- [ ] Test GET default intervals
- [ ] Test error scenarios (401, 404, 409, 422)

**Estimated Time:** 6-8 hours

---

#### Step 6: Documentation

**Tasks:**
- [ ] Add JSDoc comments to service methods
- [ ] Create API documentation in README or separate docs file
- [ ] Add example requests/responses
- [ ] Document error codes and messages
- [ ] Add architecture diagram (optional)

**Estimated Time:** 2-3 hours

---

#### Step 7: Performance Testing & Optimization

**Tasks:**
- [ ] Profile database queries with `EXPLAIN ANALYZE`
- [ ] Verify indexes are being used
- [ ] Test with realistic data volumes (100+ reminders per bike)
- [ ] Measure response times (aim for < 100ms)
- [ ] Implement caching for default-intervals (if needed)
- [ ] Add monitoring/logging hooks

**Estimated Time:** 3-4 hours

---

#### Step 8: Code Review & Deployment

**Tasks:**
- [ ] Code review with team
- [ ] Address review comments
- [ ] Merge to main branch
- [ ] Deploy to staging environment
- [ ] Run smoke tests on staging
- [ ] Deploy to production
- [ ] Monitor error rates and performance

**Estimated Time:** 2-3 hours

---

### 9.3 Total Estimated Time
**25-34 hours** (3-4 days for single developer)

### 9.4 Dependencies and Blockers
- **Dependency:** Auth middleware must be complete before API routes
- **Dependency:** Database migrations must be applied
- **Blocker:** Supabase project must be provisioned and accessible
- **Blocker:** Environment variables must be configured

---

## 10. Additional Considerations

### 10.1 Future Enhancements
- **Pagination:** Add limit/offset to GET reminders endpoint
- **Bulk operations:** Mark multiple reminders as completed
- **Notifications:** Email/push notifications when reminder becomes overdue
- **Smart reminders:** Predict completion date based on riding patterns
- **Recurring reminders:** Auto-create new reminder after completion

### 10.2 Edge Cases to Handle
- **Bike deleted:** Cascade delete reminders or handle orphaned records
- **Mileage decreased:** Negative km_remaining calculation (bike odometer rolled back)
- **Duplicate service types:** User tries to create multiple active reminders for same service_type
- **Completed reminder deletion:** Allow or prevent? (Currently allow)
- **Zero or negative interval_km:** Validate and reject

### 10.3 Accessibility
- N/A for backend API

### 10.4 Localization
- **Messages:** Currently in English/Polish mix
- **Future:** Extract error messages to i18n files
- **Date formats:** Return ISO 8601 strings, let frontend handle formatting

### 10.5 GDPR Compliance
- **Data export:** Include reminders in `ProfileExportDTO` (already defined in types.ts)
- **Data deletion:** Cascade delete when user deletes account
- **Data retention:** No special rules, reminders tied to bikes

---

## 11. Success Criteria

**Definition of Done:**
- ✅ All 5 endpoints implemented and functional
- ✅ RLS policies enforced and tested
- ✅ Input validation prevents invalid data
- ✅ Error handling covers all scenarios
- ✅ Unit tests pass with > 80% coverage
- ✅ E2E tests pass for critical flows
- ✅ Response times < 100ms (P95)
- ✅ Error rate < 1% in production
- ✅ Documentation complete
- ✅ Code reviewed and approved
- ✅ Deployed to production

---

**Plan wdrożenia zakończony. Gotowy do implementacji przez zespół deweloperski.**

