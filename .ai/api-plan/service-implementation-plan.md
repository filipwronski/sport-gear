# API Endpoint Implementation Plan: Bike Service Management

## 1. Przegląd punktów końcowych

Ten dokument zawiera szczegółowy plan implementacji pięciu endpointów REST API dla zarządzania historią serwisów rowerowych w aplikacji CycleGear MVP:

- **GET /api/bikes/{bikeId}/services** - Pobieranie historii serwisów z filtrowaniem i paginacją
- **POST /api/bikes/{bikeId}/services** - Rejestrowanie nowego serwisu + opcjonalne utworzenie przypomnienia
- **PUT /api/bikes/{bikeId}/services/{id}** - Aktualizacja rekordu serwisu
- **DELETE /api/bikes/{bikeId}/services/{id}** - Usunięcie rekordu serwisu (hard delete)
- **GET /api/bikes/{bikeId}/services/stats** - Statystyki kosztów i analiza serwisowa

**Cel biznesowy:**
- Śledzenie kosztów utrzymania rowerów
- Historia serwisów dla każdej części (łańcuch, kaseta, klocki, opony, etc.)
- Automatyczne przypomnienia o serwisach na podstawie przebiegu
- Analiza kosztów per typ serwisu, per lokalizacja (warsztat vs samodzielnie)
- Dashboard insights (cost per km, total spending, service frequency)

**Stack technologiczny:**
- Framework: Astro (Server Endpoints)
- BaaS: Supabase (PostgreSQL + Auth + RLS)
- TypeScript: strict mode
- Walidacja: Zod schemas
- Security: RLS policies + explicit ownership checks

---

## 2. Szczegóły żądań

### 2.1 GET /api/bikes/{bikeId}/services

**Metoda HTTP:** GET  
**Struktura URL:** `/api/bikes/{bikeId}/services`  
**Content-Type:** application/json

**Path Parameters:**
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `bikeId` | UUID | ID roweru | - Valid UUID format<br>- Rower należy do użytkownika (RLS) |

**Query Parameters:**

| Parametr | Typ | Wymagany | Default | Opis | Walidacja |
|----------|-----|----------|---------|------|-----------|
| `service_type` | enum | Nie | - | Filtr typu serwisu | `lancuch\|kaseta\|klocki_przod\|klocki_tyl\|opony\|przerzutki\|hamulce\|przeglad_ogolny\|inne` |
| `service_location` | enum | Nie | - | Filtr lokalizacji | `warsztat\|samodzielnie` |
| `limit` | integer | Nie | 50 | Liczba rekordów | Min: 1, Max: 100 |
| `offset` | integer | Nie | 0 | Offset paginacji | Min: 0 |
| `from_date` | string | Nie | - | Data od (ISO 8601) | Valid ISO date, <= to_date |
| `to_date` | string | Nie | - | Data do (ISO 8601) | Valid ISO date, >= from_date |
| `sort` | string | Nie | `service_date_desc` | Sortowanie | `service_date_asc\|service_date_desc\|mileage_asc\|mileage_desc\|cost_asc\|cost_desc` |

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response Body (200 OK):**
```json
{
  "services": [
    {
      "id": "uuid",
      "bike_id": "uuid",
      "service_date": "2025-10-01",
      "mileage_at_service": 5200,
      "service_type": "lancuch",
      "service_location": "warsztat",
      "cost": 120.50,
      "currency": "PLN",
      "notes": "Chain replacement with cleaning",
      "created_at": "2025-10-01T14:30:00Z",
      "updated_at": "2025-10-01T14:30:00Z"
    }
  ],
  "total": 15,
  "has_more": true
}
```

---

### 2.2 POST /api/bikes/{bikeId}/services

**Metoda HTTP:** POST  
**Struktura URL:** `/api/bikes/{bikeId}/services`  
**Content-Type:** application/json

**Path Parameters:**
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `bikeId` | UUID | ID roweru | - Valid UUID format<br>- Rower należy do użytkownika |

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  service_date: string;              // ISO 8601, required, not in future
  mileage_at_service: number;        // required, positive, >= previous service
  service_type: ServiceTypeEnum;     // required
  service_location?: ServiceLocationEnum; // optional
  cost?: number;                     // optional, >= 0
  notes?: string;                    // optional, max 1000 chars
  create_reminder?: boolean;         // optional, default: false
  reminder_interval_km?: number;     // required if create_reminder=true, range: 100-10000
}
```

**Validation Rules:**
- `service_date`:
  - Required, valid ISO 8601 format
  - Not in the future (`<= today`)
  - Reasonable range (not before bike purchase_date if available)
- `mileage_at_service`:
  - Required, positive integer
  - Must be >= bike's current_mileage (can't service bike at lower mileage than current)
  - Should be >= last service mileage (business logic validation)
- `service_type`:
  - Required, one of enum values
- `cost`:
  - Optional, if provided must be >= 0
  - Default currency: PLN (from user profile or system default)
- `notes`:
  - Optional, max length 1000 characters
  - XSS sanitization required
- `create_reminder`:
  - If true, `reminder_interval_km` is required
- `reminder_interval_km`:
  - Range: 100-10000 km (reasonable intervals)
  - Used to create service_reminder entry

**Business Logic:**
1. Verify bike ownership (explicit check + RLS)
2. Validate mileage >= last service for this bike
3. Update bike's current_mileage if mileage_at_service > current value (trigger handles this)
4. If `create_reminder=true`:
   - Create entry in `service_reminders` table
   - Set `triggered_at_mileage = mileage_at_service`
   - Set `interval_km = reminder_interval_km`
   - Calculate `target_mileage = mileage_at_service + interval_km`

**Response Body (201 Created):**
```json
{
  "id": "uuid",
  "bike_id": "uuid",
  "service_date": "2025-10-01",
  "mileage_at_service": 5200,
  "service_type": "lancuch",
  "service_location": "warsztat",
  "cost": 120.50,
  "currency": "PLN",
  "notes": "Chain replacement with cleaning",
  "created_at": "2025-10-01T14:30:00Z",
  "updated_at": "2025-10-01T14:30:00Z"
}
```

---

### 2.3 PUT /api/bikes/{bikeId}/services/{id}

**Metoda HTTP:** PUT  
**Struktura URL:** `/api/bikes/{bikeId}/services/{id}`  
**Content-Type:** application/json

**Path Parameters:**
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `bikeId` | UUID | ID roweru | Valid UUID, należy do użytkownika |
| `id` | UUID | ID serwisu | Valid UUID, należy do roweru użytkownika |

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

**Request Body:**
```typescript
{
  service_date?: string;             // ISO 8601
  mileage_at_service?: number;       // positive
  service_type?: ServiceTypeEnum;
  service_location?: ServiceLocationEnum;
  cost?: number;                     // >= 0
  notes?: string;                    // max 1000 chars
}
```

**Validation Rules:**
- All fields optional (partial update)
- Same validation rules as POST for each field
- Cannot update `create_reminder` fields (reminders created only on POST)
- If updating `mileage_at_service`, validate against other services

**Business Logic:**
1. Verify bike ownership and service belongs to this bike
2. Validate updated mileage doesn't break chronological order
3. Update only provided fields (partial update)
4. Set `updated_at = NOW()`

**Response Body (200 OK):**
Same structure as POST response

---

### 2.4 DELETE /api/bikes/{bikeId}/services/{id}

**Metoda HTTP:** DELETE  
**Struktura URL:** `/api/bikes/{bikeId}/services/{id}`

**Path Parameters:**
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `bikeId` | UUID | ID roweru | Valid UUID, należy do użytkownika |
| `id` | UUID | ID serwisu | Valid UUID, należy do roweru użytkownika |

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Business Logic:**
1. Verify bike ownership and service belongs to this bike
2. Check if service is referenced by any reminder (if yes, update reminder or prevent deletion)
3. Hard delete from `service_records` table
4. RLS ensures user can only delete own services

**Response:**
- **204 No Content** - Successful deletion (no body)

---

### 2.5 GET /api/bikes/{bikeId}/services/stats

**Metoda HTTP:** GET  
**Struktura URL:** `/api/bikes/{bikeId}/services/stats`  
**Content-Type:** application/json

**Path Parameters:**
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `bikeId` | UUID | ID roweru | Valid UUID, należy do użytkownika |

**Query Parameters:**

| Parametr | Typ | Wymagany | Default | Opis | Walidacja |
|----------|-----|----------|---------|------|-----------|
| `period` | enum | Nie | `all` | Okres analizy | `month\|quarter\|year\|all` |
| `from_date` | string | Nie | - | Data od (ISO 8601) | Valid ISO date, overrides `period` |
| `to_date` | string | Nie | - | Data do (ISO 8601) | Valid ISO date, overrides `period` |

**Logic:**
- If `from_date` and `to_date` provided → use custom range
- Else if `period` provided:
  - `month`: Last 30 days
  - `quarter`: Last 90 days
  - `year`: Last 365 days
  - `all`: All time (no filter)

**Request Headers:**
```
Authorization: Bearer <supabase_access_token>
```

**Response Body (200 OK):**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2025-10-10"
  },
  "total_cost": 2450.75,
  "total_services": 15,
  "cost_per_km": 0.45,
  "total_mileage": 5420,
  "breakdown_by_type": [
    {
      "service_type": "lancuch",
      "count": 2,
      "total_cost": 240.00,
      "avg_cost": 120.00,
      "percentage": 9.8
    },
    {
      "service_type": "kaseta",
      "count": 1,
      "total_cost": 180.00,
      "avg_cost": 180.00,
      "percentage": 7.3
    }
  ],
  "breakdown_by_location": {
    "warsztat": {
      "count": 10,
      "total_cost": 2100.50
    },
    "samodzielnie": {
      "count": 5,
      "total_cost": 350.25
    }
  },
  "timeline": [
    {
      "month": "2025-10",
      "cost": 120.50,
      "services": 1
    },
    {
      "month": "2025-09",
      "cost": 320.75,
      "services": 3
    }
  ]
}
```

**Aggregation Queries:**
- `total_cost`: SUM(cost) WHERE cost IS NOT NULL
- `total_services`: COUNT(*)
- `cost_per_km`: total_cost / (MAX(mileage_at_service) - MIN(mileage_at_service))
- `total_mileage`: MAX(mileage_at_service) - MIN(mileage_at_service) in period
- `breakdown_by_type`: GROUP BY service_type with SUM, COUNT, AVG
- `breakdown_by_location`: GROUP BY service_location with SUM, COUNT
- `timeline`: GROUP BY DATE_TRUNC('month', service_date) ORDER BY month DESC

---

## 3. Wykorzystywane typy

### Z pliku `src/types.ts`:

```typescript
// DTOs
ServiceRecordDTO
ServicesListDTO
ServiceStatsDTO
ServiceTypeBreakdown
ServiceLocationBreakdown
ServiceTimelineEntry

// Commands
CreateServiceCommand
UpdateServiceCommand

// Query Params
GetServicesParams
GetServiceStatsParams

// Enums
ServiceTypeEnum
ServiceLocationEnum
```

### Nowe typy Zod do utworzenia (`src/schemas/service.schema.ts`):

```typescript
import { z } from 'zod';

// Enum schemas
export const serviceTypeSchema = z.enum([
  'lancuch',
  'kaseta',
  'klocki_przod',
  'klocki_tyl',
  'opony',
  'przerzutki',
  'hamulce',
  'przeglad_ogolny',
  'inne'
]);

export const serviceLocationSchema = z.enum(['warsztat', 'samodzielnie']);

export const serviceSortSchema = z.enum([
  'service_date_asc',
  'service_date_desc',
  'mileage_asc',
  'mileage_desc',
  'cost_asc',
  'cost_desc'
]).default('service_date_desc');

// Query params schemas
export const getServicesParamsSchema = z.object({
  service_type: serviceTypeSchema.optional(),
  service_location: serviceLocationSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  sort: serviceSortSchema
}).refine(
  (data) => {
    if (data.from_date && data.to_date) {
      return new Date(data.from_date) <= new Date(data.to_date);
    }
    return true;
  },
  { message: 'from_date must be before or equal to to_date' }
);

export const createServiceSchema = z.object({
  service_date: z.string().datetime().refine(
    (date) => new Date(date) <= new Date(),
    { message: 'service_date cannot be in the future' }
  ),
  mileage_at_service: z.number().int().positive(),
  service_type: serviceTypeSchema,
  service_location: serviceLocationSchema.optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  create_reminder: z.boolean().optional().default(false),
  reminder_interval_km: z.number().int().min(100).max(10000).optional()
}).refine(
  (data) => {
    if (data.create_reminder) {
      return data.reminder_interval_km !== undefined;
    }
    return true;
  },
  { message: 'reminder_interval_km is required when create_reminder is true' }
);

export const updateServiceSchema = z.object({
  service_date: z.string().datetime().refine(
    (date) => new Date(date) <= new Date(),
    { message: 'service_date cannot be in the future' }
  ).optional(),
  mileage_at_service: z.number().int().positive().optional(),
  service_type: serviceTypeSchema.optional(),
  service_location: serviceLocationSchema.optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(1000).optional()
});

export const getServiceStatsParamsSchema = z.object({
  period: z.enum(['month', 'quarter', 'year', 'all']).default('all'),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.from_date && data.to_date) {
      return new Date(data.from_date) <= new Date(data.to_date);
    }
    return true;
  },
  { message: 'from_date must be before or equal to to_date' }
);
```

---

## 4. Szczegóły odpowiedzi

### Kody statusu HTTP

| Kod | Opis | Kiedy używać |
|-----|------|--------------|
| **200 OK** | Sukces | GET /services, PUT /services/{id}, GET /stats |
| **201 Created** | Zasób utworzony | POST /services |
| **204 No Content** | Sukces bez body | DELETE /services/{id} |
| **400 Bad Request** | Błędne dane wejściowe | Invalid UUID, wrong enum values, invalid dates |
| **401 Unauthorized** | Brak autoryzacji | Missing or invalid JWT token |
| **404 Not Found** | Zasób nie istnieje | Bike not found, service not found, or not owned by user |
| **422 Unprocessable Entity** | Błędy walidacji biznesowej | mileage < previous service, service_date in future, date range invalid |
| **500 Internal Server Error** | Błąd serwera | Database errors, Supabase connection issues |

### Struktura błędów

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Service date cannot be in the future",
    "details": {
      "field": "service_date",
      "provided": "2026-01-01",
      "constraint": "must be <= today"
    }
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - 401
- `BIKE_NOT_FOUND` - 404
- `SERVICE_NOT_FOUND` - 404
- `VALIDATION_ERROR` - 400, 422
- `INVALID_UUID` - 400
- `INVALID_ENUM_VALUE` - 400
- `MILEAGE_LOWER_THAN_PREVIOUS` - 422
- `DATE_IN_FUTURE` - 422
- `INVALID_DATE_RANGE` - 422
- `INTERNAL_ERROR` - 500

---

## 5. Przepływ danych

### 5.1 GET /api/bikes/{bikeId}/services

```
1. Request → Astro API Endpoint
2. Middleware: Verify JWT token (Supabase Auth)
3. Extract userId from token
4. Parse & validate query params (Zod)
5. ServiceRecordService.getServicesByBikeId(userId, bikeId, params)
   5.1. Verify bike ownership (explicit + RLS)
   5.2. Build Supabase query with filters:
        - WHERE bike_id = bikeId
        - AND service_type = ? (if provided)
        - AND service_location = ? (if provided)
        - AND service_date >= from_date (if provided)
        - AND service_date <= to_date (if provided)
        - ORDER BY sort parameter
        - LIMIT limit OFFSET offset
   5.3. Execute query with RLS (auto-filters by user ownership)
   5.4. Get total count (separate query with same filters, no limit)
   5.5. Calculate has_more = total > (offset + limit)
6. Transform DB rows → ServiceRecordDTO[]
7. Return ServicesListDTO { services, total, has_more }
8. Response 200 OK with JSON
```

### 5.2 POST /api/bikes/{bikeId}/services

```
1. Request → Astro API Endpoint
2. Middleware: Verify JWT token
3. Extract userId from token
4. Parse & validate request body (Zod createServiceSchema)
5. ServiceRecordService.createService(userId, bikeId, command)
   5.1. Verify bike ownership
   5.2. Get bike's current_mileage and last service mileage
   5.3. Validate: mileage_at_service >= last_service_mileage
   5.4. Begin transaction:
        a. INSERT INTO service_records (...)
        b. If create_reminder = true:
           - INSERT INTO service_reminders (
               bike_id,
               service_type,
               triggered_at_mileage = mileage_at_service,
               interval_km = reminder_interval_km,
               target_mileage = mileage_at_service + interval_km
             )
        c. Trigger auto-updates bike.current_mileage if needed
   5.5. Commit transaction
   5.6. Fetch created service record
6. Transform DB row → ServiceRecordDTO
7. Response 201 Created with JSON
```

### 5.3 PUT /api/bikes/{bikeId}/services/{id}

```
1. Request → Astro API Endpoint
2. Middleware: Verify JWT token
3. Extract userId from token
4. Parse & validate request body (Zod updateServiceSchema)
5. ServiceRecordService.updateService(userId, bikeId, serviceId, command)
   5.1. Verify bike ownership and service exists
   5.2. Check service belongs to specified bike
   5.3. If mileage_at_service updated:
        - Get chronological order of services
        - Validate new mileage doesn't break order
   5.4. UPDATE service_records SET ... WHERE id = serviceId
   5.5. RLS ensures user can only update own services
   5.6. Fetch updated service record
6. Transform DB row → ServiceRecordDTO
7. Response 200 OK with JSON
```

### 5.4 DELETE /api/bikes/{bikeId}/services/{id}

```
1. Request → Astro API Endpoint
2. Middleware: Verify JWT token
3. Extract userId from token
4. ServiceRecordService.deleteService(userId, bikeId, serviceId)
   5.1. Verify bike ownership and service exists
   5.2. Check if service is referenced by active reminder
        - If yes: Update reminder.completed_service_id = NULL or prevent deletion
   5.3. DELETE FROM service_records WHERE id = serviceId
   5.4. RLS ensures user can only delete own services
5. Response 204 No Content
```

### 5.5 GET /api/bikes/{bikeId}/services/stats

```
1. Request → Astro API Endpoint
2. Middleware: Verify JWT token
3. Extract userId from token
4. Parse & validate query params (Zod)
5. Calculate date range based on period or custom dates
6. ServiceRecordService.getServiceStats(userId, bikeId, dateRange)
   6.1. Verify bike ownership
   6.2. Execute aggregate queries with date filter:
        
        -- Total cost and services
        SELECT 
          COUNT(*) as total_services,
          SUM(COALESCE(cost, 0)) as total_cost,
          MAX(mileage_at_service) - MIN(mileage_at_service) as total_mileage
        FROM service_records
        WHERE bike_id = bikeId
          AND service_date BETWEEN from_date AND to_date
        
        -- Breakdown by type
        SELECT 
          service_type,
          COUNT(*) as count,
          SUM(cost) as total_cost,
          AVG(cost) as avg_cost
        FROM service_records
        WHERE bike_id = bikeId
          AND service_date BETWEEN from_date AND to_date
        GROUP BY service_type
        ORDER BY total_cost DESC
        
        -- Breakdown by location
        SELECT 
          service_location,
          COUNT(*) as count,
          SUM(cost) as total_cost
        FROM service_records
        WHERE bike_id = bikeId
          AND service_date BETWEEN from_date AND to_date
        GROUP BY service_location
        
        -- Timeline (monthly)
        SELECT 
          DATE_TRUNC('month', service_date) as month,
          SUM(cost) as cost,
          COUNT(*) as services
        FROM service_records
        WHERE bike_id = bikeId
          AND service_date BETWEEN from_date AND to_date
        GROUP BY DATE_TRUNC('month', service_date)
        ORDER BY month DESC
        LIMIT 12
   
   6.3. Calculate cost_per_km = total_cost / total_mileage (if total_mileage > 0)
   6.4. Calculate percentages for breakdown_by_type
7. Transform results → ServiceStatsDTO
8. Response 200 OK with JSON
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie (Authentication)

**Mechanizm:** Supabase JWT tokens
- Token przekazywany w header: `Authorization: Bearer <token>`
- Middleware waliduje token i ekstraktuje `userId`
- Expired tokens → 401 Unauthorized

**Implementacja:**
```typescript
// src/middleware/auth.ts
export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  const supabase = createClient(/* ... */);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new UnauthorizedError('Invalid or expired token');
  }
  
  return user.id;
}
```

### 6.2 Autoryzacja (Authorization)

**Row Level Security (RLS):** Włączone na tabeli `service_records`

**Policies:**
```sql
-- SELECT: Users can only view services for their bikes
CREATE POLICY service_records_select_own ON service_records
  FOR SELECT
  USING (is_bike_owner(bike_id));

-- INSERT: Users can only insert services for their bikes
CREATE POLICY service_records_insert_own ON service_records
  FOR INSERT
  WITH CHECK (is_bike_owner(bike_id));

-- UPDATE: Users can only update services for their bikes
CREATE POLICY service_records_update_own ON service_records
  FOR UPDATE
  USING (is_bike_owner(bike_id))
  WITH CHECK (is_bike_owner(bike_id));

-- DELETE: Users can only delete services for their bikes
CREATE POLICY service_records_delete_own ON service_records
  FOR DELETE
  USING (is_bike_owner(bike_id));
```

**Explicit ownership checks:** Dodatkowo w service layer:

```typescript
async verifyBikeOwnership(userId: string, bikeId: string): Promise<boolean> {
  const { data, error } = await this.supabase
    .from('bikes')
    .select('id')
    .eq('id', bikeId)
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Bike not found or access denied');
  }
  
  return true;
}
```

### 6.3 Walidacja danych wejściowych

**Zod schemas:** Wszystkie endpointy używają Zod do walidacji
- Type-safe validation
- Custom refinements dla business logic
- Clear error messages

**SQL Injection Prevention:**
- Supabase client używa prepared statements
- Parametry są automatycznie escapowane
- Sort parameter: whitelist tylko dozwolonych wartości

**XSS Prevention:**
- Field `notes`: max 1000 chars
- Sanitization przed zapisem do DB (opcjonalnie: DOMPurify server-side)
- Content-Type: application/json (nie HTML)

### 6.4 IDOR Protection (Insecure Direct Object Reference)

**Problem:** Użytkownik może próbować dostać się do cudzych serwisów poprzez UUID

**Ochrona:**
1. RLS policies automatycznie filtrują wyniki
2. Explicit checks w service layer przed operacjami
3. Weryfikacja `bikeId` należy do `userId` przed dostępem do `serviceId`
4. 404 zamiast 403 (nie ujawniamy czy zasób istnieje)

### 6.5 Rate Limiting

**Potencjalnie kosztowne endpointy:**
- GET /stats (agregacje)

**Strategia:**
- Cloudflare rate limiting: 100 requests/min per IP
- Supabase connection pooling
- Cache results dla popularnych okresów (opcjonalnie)

### 6.6 CORS Configuration

```typescript
// astro.config.mjs
export default defineConfig({
  // ...
  vite: {
    server: {
      cors: {
        origin: ['https://yourdomain.com'],
        credentials: true
      }
    }
  }
});
```

---

## 7. Obsługa błędów

### 7.1 Hierarchia błędów

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: any) {
    super('BAD_REQUEST', message, 400, details);
  }
}
```

### 7.2 Scenariusze błędów per endpoint

#### GET /services

| Błąd | Status | Code | Message | Kiedy |
|------|--------|------|---------|-------|
| Missing token | 401 | UNAUTHORIZED | Authorization required | Brak header Authorization |
| Invalid token | 401 | UNAUTHORIZED | Invalid or expired token | Token nieprawidłowy/wygasły |
| Bike not found | 404 | BIKE_NOT_FOUND | Bike not found | Rower nie istnieje lub nie należy do użytkownika |
| Invalid UUID | 400 | INVALID_UUID | Invalid bike ID format | bikeId nie jest UUID |
| Invalid enum | 400 | INVALID_ENUM_VALUE | Invalid service_type value | service_type nie z listy enum |
| Invalid limit | 400 | VALIDATION_ERROR | Limit must be between 1 and 100 | limit out of range |
| Invalid date range | 422 | INVALID_DATE_RANGE | from_date must be before to_date | from_date > to_date |

#### POST /services

| Błąd | Status | Code | Message | Kiedy |
|------|--------|------|---------|-------|
| Missing required field | 400 | VALIDATION_ERROR | service_date is required | Brak wymaganego pola |
| Date in future | 422 | DATE_IN_FUTURE | Service date cannot be in the future | service_date > today |
| Negative cost | 400 | VALIDATION_ERROR | Cost must be >= 0 | cost < 0 |
| Mileage too low | 422 | MILEAGE_LOWER_THAN_PREVIOUS | Mileage must be >= previous service | mileage < last service |
| Missing reminder interval | 400 | VALIDATION_ERROR | reminder_interval_km required when create_reminder=true | create_reminder=true but no interval |
| Reminder interval out of range | 400 | VALIDATION_ERROR | reminder_interval_km must be 100-10000 | interval < 100 or > 10000 |

#### PUT /services

| Błąd | Status | Code | Message | Kiedy |
|------|--------|------|---------|-------|
| Service not found | 404 | SERVICE_NOT_FOUND | Service not found | Service nie istnieje lub nie należy do użytkownika |
| Invalid service ID | 400 | INVALID_UUID | Invalid service ID format | serviceId nie jest UUID |
| Wszystkie błędy walidacji jak w POST | - | - | - | - |

#### DELETE /services

| Błąd | Status | Code | Message | Kiedy |
|------|--------|------|---------|-------|
| Service not found | 404 | SERVICE_NOT_FOUND | Service not found | Service nie istnieje lub nie należy do użytkownika |
| Service referenced | 422 | CANNOT_DELETE | Service is referenced by active reminder | Service ma active reminder (opcjonalnie) |

#### GET /stats

| Błąd | Status | Code | Message | Kiedy |
|------|--------|------|---------|-------|
| Bike not found | 404 | BIKE_NOT_FOUND | Bike not found | Rower nie istnieje lub nie należy do użytkownika |
| Invalid period | 400 | VALIDATION_ERROR | Invalid period value | period nie z listy enum |
| Invalid date range | 422 | INVALID_DATE_RANGE | from_date must be before to_date | from_date > to_date |

### 7.3 Global Error Handler

```typescript
// src/lib/error-handler.ts

export function handleApiError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors
        }
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;
    return new Response(
      JSON.stringify({
        error: {
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
          details: { code: dbError.code }
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Unknown errors
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

---

## 8. Wydajność

### 8.1 Optymalizacje bazodanowe

**Indeksy (już w schemacie):**
```sql
CREATE INDEX idx_service_records_bike_id ON service_records(bike_id);
CREATE INDEX idx_service_records_service_date ON service_records(service_date);
CREATE INDEX idx_service_records_service_type ON service_records(service_type);
CREATE INDEX idx_service_records_bike_service_date 
  ON service_records(bike_id, service_date DESC);
```

**Composite index:** `bike_id + service_date DESC` jest optymalny dla:
- Sortowania po dacie w ramach roweru
- Znajdowania ostatniego serwisu
- Paginacji wyników

### 8.2 Query Optimization

**N+1 Prevention:**
```typescript
// BAD: N+1 query
services.forEach(async (service) => {
  const bike = await getBike(service.bike_id); // N queries
});

// GOOD: Single query with join (jeśli potrzebne)
const services = await supabase
  .from('service_records')
  .select('*, bikes(name, type)')
  .eq('bike_id', bikeId);
```

**Pagination best practices:**
- Default limit: 50
- Max limit: 100
- Use offset-based pagination (acceptable dla MVP)
- W przyszłości: cursor-based pagination dla lepszej performance

**Stats endpoint optimization:**
```typescript
// Execute aggregate queries in parallel
const [totals, breakdownByType, breakdownByLocation, timeline] = 
  await Promise.all([
    getTotals(),
    getBreakdownByType(),
    getBreakdownByLocation(),
    getTimeline()
  ]);
```

### 8.3 Caching Strategy

**Client-side caching:**
```typescript
// Response headers dla GET endpoints
headers: {
  'Cache-Control': 'private, max-age=300', // 5 min for list
  'ETag': generateETag(data)
}

// Dla stats:
headers: {
  'Cache-Control': 'private, max-age=3600' // 1 hour
}
```

**Server-side caching (opcjonalnie):**
- Redis cache dla /stats za okres "all" (update on POST/PUT/DELETE)
- Key: `service_stats:${bikeId}:all`
- TTL: 1 hour lub invalidate on mutation

### 8.4 Connection Pooling

**Supabase:** Automatic connection pooling (max 15 connections na free tier)

**Best practices:**
- Reuse Supabase client instance
- Avoid creating new client per request
- Use singleton pattern

```typescript
// src/db/supabase.client.ts
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_ANON_KEY
    );
  }
  return supabaseClient;
}
```

### 8.5 Monitoring

**Metrics to track:**
- Average response time per endpoint
- P95, P99 latency
- Error rate per endpoint
- Database query time
- Number of queries per request

**Tools:**
- Supabase Dashboard: Query performance
- Sentry: Error tracking + performance monitoring
- Cloudflare Analytics: Request volume, latency

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie infrastruktury
**Czas: 30 min**

1.1. Utworzenie struktury katalogów:
```
src/
  pages/
    api/
      bikes/
        [bikeId]/
          services/
            index.ts              # GET /services, POST /services
            [id].ts               # PUT /services/{id}, DELETE /services/{id}
            stats.ts              # GET /services/stats
  services/
    service-record.service.ts     # Business logic
  schemas/
    service.schema.ts             # Zod schemas
  lib/
    errors.ts                     # Error classes
    error-handler.ts              # Global error handler
```

1.2. Instalacja dependencies:
```bash
pnpm add zod
```

### Krok 2: Utworzenie Zod schemas
**Czas: 45 min**

2.1. Utworzyć plik `src/schemas/service.schema.ts`
2.2. Zdefiniować wszystkie schemas z sekcji 3 (serviceTypeSchema, createServiceSchema, etc.)
2.3. Dodać testy jednostkowe dla schemas (opcjonalnie)

### Krok 3: Utworzenie error handling infrastructure
**Czas: 30 min**

3.1. Utworzyć `src/lib/errors.ts` z hierarchią błędów
3.2. Utworzyć `src/lib/error-handler.ts` z global error handler
3.3. Dodać utility functions do konwersji Zod/Supabase errors

### Krok 4: Implementacja Service Layer
**Czas: 3-4 godziny**

4.1. Utworzyć `src/services/service-record.service.ts`

4.2. Zaimplementować metody:
```typescript
class ServiceRecordService {
  constructor(private supabase: SupabaseClient) {}
  
  // Core CRUD
  async getServicesByBikeId(userId, bikeId, params): Promise<ServicesListDTO>
  async createService(userId, bikeId, command): Promise<ServiceRecordDTO>
  async updateService(userId, bikeId, serviceId, command): Promise<ServiceRecordDTO>
  async deleteService(userId, bikeId, serviceId): Promise<void>
  
  // Analytics
  async getServiceStats(userId, bikeId, params): Promise<ServiceStatsDTO>
  
  // Helpers
  private async verifyBikeOwnership(userId, bikeId): Promise<void>
  private async getLastServiceMileage(bikeId, serviceType?): Promise<number>
  private buildServicesQuery(bikeId, params): PostgrestFilterBuilder
  private mapToDTO(row): ServiceRecordDTO
}
```

4.3. Testy jednostkowe dla każdej metody (opcjonalnie)

### Krok 5: Implementacja API Endpoints
**Czas: 4-5 godzin**

5.1. **GET /api/bikes/[bikeId]/services (index.ts - GET handler)**
```typescript
// src/pages/api/bikes/[bikeId]/services/index.ts

import type { APIRoute } from 'astro';
import { getServicesParamsSchema } from '@/schemas/service.schema';
import { ServiceRecordService } from '@/services/service-record.service';
import { authenticateRequest } from '@/middleware/auth';
import { handleApiError } from '@/lib/error-handler';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const userId = await authenticateRequest(request);
    const { bikeId } = params;
    
    // Validate bikeId format
    if (!isValidUUID(bikeId)) {
      throw new BadRequestError('Invalid bike ID format');
    }
    
    // Parse query params
    const url = new URL(request.url);
    const queryParams = {
      service_type: url.searchParams.get('service_type'),
      service_location: url.searchParams.get('service_location'),
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      from_date: url.searchParams.get('from_date'),
      to_date: url.searchParams.get('to_date'),
      sort: url.searchParams.get('sort')
    };
    
    // Validate with Zod
    const validatedParams = getServicesParamsSchema.parse(queryParams);
    
    // Business logic
    const service = new ServiceRecordService(getSupabaseClient());
    const result = await service.getServicesByBikeId(
      userId,
      bikeId,
      validatedParams
    );
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

5.2. **POST /api/bikes/[bikeId]/services (index.ts - POST handler)**
```typescript
export const POST: APIRoute = async ({ params, request }) => {
  try {
    const userId = await authenticateRequest(request);
    const { bikeId } = params;
    
    if (!isValidUUID(bikeId)) {
      throw new BadRequestError('Invalid bike ID format');
    }
    
    // Parse request body
    const body = await request.json();
    const validatedBody = createServiceSchema.parse(body);
    
    // Business logic
    const service = new ServiceRecordService(getSupabaseClient());
    const result = await service.createService(
      userId,
      bikeId,
      validatedBody
    );
    
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

5.3. **PUT /api/bikes/[bikeId]/services/[id].ts**
```typescript
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const userId = await authenticateRequest(request);
    const { bikeId, id: serviceId } = params;
    
    if (!isValidUUID(bikeId) || !isValidUUID(serviceId)) {
      throw new BadRequestError('Invalid ID format');
    }
    
    const body = await request.json();
    const validatedBody = updateServiceSchema.parse(body);
    
    const service = new ServiceRecordService(getSupabaseClient());
    const result = await service.updateService(
      userId,
      bikeId,
      serviceId,
      validatedBody
    );
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

5.4. **DELETE /api/bikes/[bikeId]/services/[id].ts**
```typescript
export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const userId = await authenticateRequest(request);
    const { bikeId, id: serviceId } = params;
    
    if (!isValidUUID(bikeId) || !isValidUUID(serviceId)) {
      throw new BadRequestError('Invalid ID format');
    }
    
    const service = new ServiceRecordService(getSupabaseClient());
    await service.deleteService(userId, bikeId, serviceId);
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
};
```

5.5. **GET /api/bikes/[bikeId]/services/stats.ts**
```typescript
export const GET: APIRoute = async ({ params, request }) => {
  try {
    const userId = await authenticateRequest(request);
    const { bikeId } = params;
    
    if (!isValidUUID(bikeId)) {
      throw new BadRequestError('Invalid bike ID format');
    }
    
    const url = new URL(request.url);
    const queryParams = {
      period: url.searchParams.get('period'),
      from_date: url.searchParams.get('from_date'),
      to_date: url.searchParams.get('to_date')
    };
    
    const validatedParams = getServiceStatsParamsSchema.parse(queryParams);
    
    const service = new ServiceRecordService(getSupabaseClient());
    const result = await service.getServiceStats(
      userId,
      bikeId,
      validatedParams
    );
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

### Krok 6: Testy integracyjne
**Czas: 3-4 godziny**

6.1. Setup test environment z Supabase test database
6.2. Testy dla każdego endpointa:
- Happy path scenarios
- Error scenarios (401, 404, 422)
- Edge cases (empty results, boundary values)
- Authorization checks (user A can't access user B's data)

6.3. Przykładowe testy (Vitest + Supertest):
```typescript
describe('GET /api/bikes/:bikeId/services', () => {
  it('should return services for owned bike', async () => {
    const response = await request(app)
      .get(`/api/bikes/${testBikeId}/services`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    expect(response.body).toMatchObject({
      services: expect.any(Array),
      total: expect.any(Number),
      has_more: expect.any(Boolean)
    });
  });
  
  it('should return 404 for non-existent bike', async () => {
    const response = await request(app)
      .get(`/api/bikes/${nonExistentBikeId}/services`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(404);
    
    expect(response.body.error.code).toBe('BIKE_NOT_FOUND');
  });
  
  it('should filter by service_type', async () => {
    const response = await request(app)
      .get(`/api/bikes/${testBikeId}/services?service_type=lancuch`)
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);
    
    response.body.services.forEach(service => {
      expect(service.service_type).toBe('lancuch');
    });
  });
});
```

### Krok 7: Dokumentacja API
**Czas: 1 godzina**

7.1. Utworzenie OpenAPI/Swagger spec (opcjonalnie)
7.2. Aktualizacja README z przykładami użycia
7.3. Postman collection dla testowania

### Krok 8: Code Review & Refactoring
**Czas: 2 godziny**

8.1. Self code review checklist:
- [ ] Wszystkie endpointy zwracają poprawne kody HTTP
- [ ] Error handling działa dla wszystkich scenariuszy
- [ ] Walidacja Zod dla wszystkich inputów
- [ ] RLS + explicit ownership checks
- [ ] TypeScript strict mode bez błędów
- [ ] Brak hardcoded values (env variables)
- [ ] Logging dla błędów (nie PII)
- [ ] Response headers (Cache-Control, Content-Type)

8.2. Refactoring wspólnego kodu (jeśli potrzeba)

### Krok 9: Deployment Preparation
**Czas: 1 godzina**

9.1. Environment variables setup:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
```

9.2. Build test lokalnie: `pnpm build`
9.3. Sprawdzenie lintów: `pnpm lint`
9.4. Type check: `pnpm typecheck`

### Krok 10: Deployment & Monitoring
**Czas: 30 min**

10.1. Deploy to Cloudflare Pages (via CI/CD)
10.2. Smoke tests na production:
- Test GET endpoint
- Test POST endpoint (z test account)
- Verify error handling

10.3. Setup monitoring:
- Sentry error alerts
- Cloudflare analytics
- Supabase database metrics

---

## 10. Checklist końcowy

### Przed merge do main:
- [ ] Wszystkie 5 endpointów zaimplementowane i przetestowane
- [ ] Zod schemas dla walidacji
- [ ] Error handling z poprawnymi kodami HTTP
- [ ] Service layer z separation of concerns
- [ ] RLS policies zweryfikowane
- [ ] TypeScript bez błędów
- [ ] Tests coverage > 80% (opcjonalnie)
- [ ] Code review passed
- [ ] Documentation updated
- [ ] Environment variables documented

### Po deployment:
- [ ] Smoke tests passed on production
- [ ] Monitoring alerts configured
- [ ] API response times < 500ms (P95)
- [ ] No errors in Sentry first 24h
- [ ] Database query performance acceptable

---

## 11. Uwagi końcowe

### Potencjalne problemy i rozwiązania

**Problem 1: Mileage validation across concurrent requests**
- Rozwiązanie: Database constraint + transaction lock

**Problem 2: Stats endpoint slow dla dużych historii**
- Rozwiązanie: Add Redis cache lub materialized view

**Problem 3: User accidentally deletes service with active reminder**
- Rozwiązanie: Soft warning w UI lub prevent deletion (update reminder instead)

**Problem 4: Currency handling (tylko PLN w MVP)**
- Rozwiązanie: Store currency per record, w przyszłości multi-currency support

### Przyszłe rozszerzenia (post-MVP)

1. **Bulk operations**: Import historii serwisów z CSV
2. **Service templates**: Predefiniowane pakiety serwisowe
3. **Photos**: Zdjęcia przed/po serwisie
4. **Notifications**: Email/push powiadomienia dla nadchodzących serwisów
5. **Analytics dashboard**: Wizualizacje kosztów, charts
6. **Export to PDF**: Raport serwisowy dla warranty claims
7. **Service providers**: Baza warsztatów z opiniami
8. **Price comparison**: Porównanie kosztów serwisów między użytkownikami

---

**Dokument przygotowany:** Październik 2025  
**Wersja:** 1.0  
**Autor:** AI Architecture Assistant  
**Status:** Ready for Implementation

