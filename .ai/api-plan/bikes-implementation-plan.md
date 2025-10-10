# API Endpoint Implementation Plan: Bike Management

## 1. Przegląd punktu końcowego

Moduł Bike Management odpowiada za zarządzanie rowerami użytkownika w aplikacji CycleGear. Implementacja obejmuje pięć endpointów RESTful umożliwiających pełne operacje CRUD oraz szybką aktualizację przebiegu z dashboardu.

**Główne funkcjonalności:**
- Przeglądanie listy rowerów z filtrami (status, typ)
- Dodawanie nowego roweru
- Aktualizacja danych roweru
- Szybka aktualizacja przebiegu (PATCH endpoint dla UX)
- Usuwanie roweru (hard delete z cascade)

**Computed Fields:**
Każdy rower zawiera dynamicznie wyliczane pola:
- `next_service`: Najbliższy serwis (z service_reminders)
- `active_reminders_count`: Liczba aktywnych przypomnień
- `total_cost`: Suma kosztów wszystkich serwisów

**Row Level Security:**
Wszystkie operacje są chronione przez RLS policies (user_id = auth.uid()), co gwarantuje izolację danych między użytkownikami.

---

## 2. Szczegóły żądania

### GET /api/bikes

**Metoda HTTP:** GET  
**Struktura URL:** `/api/bikes?status={status}&type={type}`

**Query Parameters:**
- `status` (optional): enum - `active` | `archived` | `sold`
  - Domyślnie: wszystkie statusy
- `type` (optional): enum - `szosowy` | `gravelowy` | `mtb` | `czasowy`
  - Domyślnie: wszystkie typy

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request Body:** Brak

---

### POST /api/bikes

**Metoda HTTP:** POST  
**Struktura URL:** `/api/bikes`

**Headers:**
- `Authorization: Bearer {token}` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Trek Domane",           // REQUIRED: string, 1-50 chars
  "type": "szosowy",               // REQUIRED: enum
  "purchase_date": "2023-05-15",   // OPTIONAL: ISO date
  "current_mileage": 0,            // OPTIONAL: number >= 0, default: 0
  "notes": "Main training bike"    // OPTIONAL: string
}
```

**Walidacja:**
- `name`: NOT NULL, LENGTH(1-50)
- `type`: IN ('szosowy', 'gravelowy', 'mtb', 'czasowy')
- `purchase_date`: Valid ISO date or null
- `current_mileage`: >= 0
- `status`: Auto-set to 'active'

---

### PUT /api/bikes/{id}

**Metoda HTTP:** PUT  
**Struktura URL:** `/api/bikes/{id}`

**Path Parameters:**
- `id` (required): UUID roweru

**Headers:**
- `Authorization: Bearer {token}` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Trek Domane SL7",       // OPTIONAL
  "type": "szosowy",               // OPTIONAL
  "purchase_date": "2023-05-15",   // OPTIONAL
  "current_mileage": 5420,         // OPTIONAL
  "status": "active",              // OPTIONAL: active|archived|sold
  "notes": "Updated notes"         // OPTIONAL
}
```

**Walidacja:**
- Wszystkie pola opcjonalne (partial update)
- Walidacja jak w POST dla podanych pól
- `id` must exist and belong to user (RLS)

---

### PATCH /api/bikes/{id}/mileage

**Metoda HTTP:** PATCH  
**Struktura URL:** `/api/bikes/{id}/mileage`

**Path Parameters:**
- `id` (required): UUID roweru

**Headers:**
- `Authorization: Bearer {token}` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "current_mileage": 5650  // REQUIRED: number >= current_mileage
}
```

**Walidacja:**
- `current_mileage`: REQUIRED, must be >= existing value
- Zabroniona jest zmiana przebiegu w dół (business rule)

---

### DELETE /api/bikes/{id}

**Metoda HTTP:** DELETE  
**Struktura URL:** `/api/bikes/{id}`

**Path Parameters:**
- `id` (required): UUID roweru

**Headers:**
- `Authorization: Bearer {token}` (required)

**Request Body:** Brak

**Note:** Hard delete. Cascade usunie powiązane service_records i service_reminders (ON DELETE CASCADE w DB).

---

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

#### BikeDTO
```typescript
interface BikeDTO {
  id: string;
  name: string;
  type: BikeTypeEnum;
  purchase_date: string | null;
  current_mileage: number | null;
  status: BikeStatusEnum | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  next_service: NextServiceInfo | null;  // Computed
  active_reminders_count: number;        // Computed
  total_cost: number;                    // Computed
}
```

#### BikesListDTO
```typescript
interface BikesListDTO {
  bikes: BikeDTO[];
  total: number;
}
```

#### NextServiceInfo
```typescript
interface NextServiceInfo {
  service_type: ServiceTypeEnum;
  target_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
}
```

#### UpdateBikeMileageResponse
```typescript
interface UpdateBikeMileageResponse {
  id: string;
  current_mileage: number;
  updated_at: string;
}
```

### Command Models

#### CreateBikeCommand
```typescript
interface CreateBikeCommand {
  name: string;                  // REQUIRED
  type: BikeTypeEnum;           // REQUIRED
  purchase_date?: string;
  current_mileage?: number;
  notes?: string;
}
```

#### UpdateBikeCommand
```typescript
interface UpdateBikeCommand {
  name?: string;
  type?: BikeTypeEnum;
  purchase_date?: string;
  current_mileage?: number;
  status?: BikeStatusEnum;
  notes?: string;
}
```

#### UpdateBikeMileageCommand
```typescript
interface UpdateBikeMileageCommand {
  current_mileage: number;  // REQUIRED
}
```

### Query Parameters

#### GetBikesParams
```typescript
interface GetBikesParams {
  status?: BikeStatusEnum;
  type?: BikeTypeEnum;
}
```

### Enums

```typescript
type BikeTypeEnum = 'szosowy' | 'gravelowy' | 'mtb' | 'czasowy';
type BikeStatusEnum = 'active' | 'archived' | 'sold';
type ServiceTypeEnum = 'lancuch' | 'kaseta' | 'klocki_przod' | 'klocki_tyl' 
  | 'opony' | 'przerzutki' | 'hamulce' | 'przeglad_ogolny' | 'inne';
type ReminderStatusEnum = 'active' | 'completed' | 'overdue' | 'upcoming';
```

---

## 4. Szczegóły odpowiedzi

### GET /api/bikes

**Success Response (200 OK):**
```json
{
  "bikes": [
    {
      "id": "uuid",
      "name": "Trek Domane",
      "type": "szosowy",
      "purchase_date": "2023-05-15",
      "current_mileage": 5420,
      "status": "active",
      "notes": "Main training bike",
      "created_at": "2023-05-15T12:00:00Z",
      "updated_at": "2025-10-01T14:30:00Z",
      "next_service": {
        "service_type": "lancuch",
        "target_mileage": 6000,
        "km_remaining": 580,
        "status": "upcoming"
      },
      "active_reminders_count": 3,
      "total_cost": 1250.50
    }
  ],
  "total": 2
}
```

**Pusta lista (200 OK):**
```json
{
  "bikes": [],
  "total": 0
}
```

**Error Responses:**
- `401 Unauthorized`: Brak lub nieprawidłowy token

---

### POST /api/bikes

**Success Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Trek Domane",
  "type": "szosowy",
  "purchase_date": "2023-05-15",
  "current_mileage": 0,
  "status": "active",
  "notes": "Main training bike",
  "created_at": "2023-05-15T12:00:00Z",
  "updated_at": "2023-05-15T12:00:00Z",
  "next_service": null,
  "active_reminders_count": 0,
  "total_cost": 0
}
```

**Error Responses:**
- `400 Bad Request`: Nieprawidłowy format danych
- `401 Unauthorized`: Brak autoryzacji
- `422 Validation Error`: 
  ```json
  {
    "error": "Validation failed",
    "details": {
      "name": "Name is required and must be 1-50 characters",
      "type": "Type must be one of: szosowy, gravelowy, mtb, czasowy"
    }
  }
  ```

---

### PUT /api/bikes/{id}

**Success Response (200 OK):**
Identyczna struktura jak w POST (zaktualizowany obiekt BikeDTO)

**Error Responses:**
- `400 Bad Request`: Nieprawidłowy format danych
- `401 Unauthorized`: Brak autoryzacji
- `404 Not Found`: Rower nie istnieje lub nie należy do użytkownika
- `422 Validation Error`: Naruszenie constraintów

---

### PATCH /api/bikes/{id}/mileage

**Success Response (200 OK):**
```json
{
  "id": "uuid",
  "current_mileage": 5650,
  "updated_at": "2025-10-10T15:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: 
  ```json
  {
    "error": "Invalid mileage",
    "message": "New mileage (5000) cannot be less than current mileage (5420)"
  }
  ```
- `401 Unauthorized`: Brak autoryzacji
- `404 Not Found`: Rower nie istnieje

---

### DELETE /api/bikes/{id}

**Success Response (204 No Content):**
Brak body, tylko status code.

**Error Responses:**
- `401 Unauthorized`: Brak autoryzacji
- `404 Not Found`: Rower nie istnieje lub nie należy do użytkownika

---

## 5. Przepływ danych

### Architektura warstw (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                    API Route Handler                         │
│              (src/pages/api/bikes/[...].ts)                  │
│  - Request parsing & validation                              │
│  - Authentication check (middleware)                         │
│  - Call service layer                                        │
│  - Response formatting                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   BikeService Layer                          │
│              (src/services/bike.service.ts)                  │
│  - Business logic                                            │
│  - Data transformation (DB → DTO)                            │
│  - Computed fields calculation                               │
│  - Validation (business rules)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Client                             │
│            (src/db/supabase.client.ts)                       │
│  - Database queries                                          │
│  - RLS enforcement (automatic)                               │
│  - Type-safe operations                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL (Supabase)                         │
│  Tables:                                                     │
│  - bikes                                                     │
│  - service_records (for total_cost)                          │
│  - service_reminders (for next_service)                      │
│                                                              │
│  RLS Policies: bikes_select_own, bikes_insert_own, etc.     │
└─────────────────────────────────────────────────────────────┘
```

### Przepływ dla GET /api/bikes

1. **Request**: GET /api/bikes?status=active&type=szosowy
2. **Middleware**: Weryfikacja JWT token (Astro middleware)
3. **Route Handler**: Parse query params → GetBikesParams
4. **Service Layer**:
   - `BikeService.getBikes(userId, params)`
   - Query bikes table with filters
   - For each bike:
     - Fetch next_service (subquery na service_reminders)
     - Count active_reminders_count
     - Sum total_cost (aggregate z service_records)
   - Transform DB rows → BikeDTO[]
5. **Response**: BikesListDTO (200 OK)

**Optymalizacja:** Użyj JOINs i agregacji w jednym query zamiast N+1 queries.

---

### Przepływ dla POST /api/bikes

1. **Request**: POST /api/bikes + CreateBikeCommand body
2. **Middleware**: Weryfikacja JWT + extract userId
3. **Route Handler**: 
   - Parse & validate body
   - Check required fields (name, type)
4. **Service Layer**:
   - `BikeService.createBike(userId, command)`
   - Validate enums
   - Insert into bikes table
   - Return new bike (bez computed fields - są zerowe)
5. **Database**:
   - RLS check: user_id = auth.uid()
   - Trigger: update_updated_at_column
   - Insert successful
6. **Response**: BikeDTO (201 Created)

---

### Przepływ dla PATCH /api/bikes/{id}/mileage

1. **Request**: PATCH /api/bikes/{id}/mileage + UpdateBikeMileageCommand
2. **Middleware**: Weryfikacja JWT
3. **Route Handler**: 
   - Extract bikeId from path
   - Parse body
4. **Service Layer**:
   - `BikeService.updateMileage(userId, bikeId, command)`
   - Fetch current bike (check ownership via RLS)
   - Validate: new_mileage >= current_mileage
   - Update bike.current_mileage
5. **Side Effects (Automatic via Triggers)**:
   - `update_service_reminder_status()`: Recalculate reminder statuses
   - Reminders mogą zmienić status na 'overdue' lub 'upcoming'
6. **Response**: UpdateBikeMileageResponse (200 OK)

**Critical Business Rule:** Przebieg nie może się zmniejszać (zabezpieczenie przed błędami użytkownika).

---

### Przepływ dla DELETE /api/bikes/{id}

1. **Request**: DELETE /api/bikes/{id}
2. **Middleware**: Weryfikacja JWT
3. **Route Handler**: Extract bikeId
4. **Service Layer**:
   - `BikeService.deleteBike(userId, bikeId)`
   - Delete from bikes table
5. **Database Cascade**:
   - ON DELETE CASCADE → service_records deleted
   - ON DELETE CASCADE → service_reminders deleted
   - RLS check: user_id = auth.uid()
6. **Response**: 204 No Content

---

## 6. Względy bezpieczeństwa

### 1. Uwierzytelnianie (Authentication)

**Mechanizm:** Supabase Auth + JWT
- Token w header: `Authorization: Bearer {jwt}`
- Middleware Astro sprawdza token przed każdym request
- Extrahuje `userId` z `auth.uid()`

**Implementacja:**
```typescript
// src/middleware/index.ts
export const onRequest = async ({ request, locals, redirect }, next) => {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  locals.userId = user.id;
  return next();
};
```

---

### 2. Autoryzacja (Authorization)

**Row Level Security (RLS):**
Wszystkie operacje na tabeli `bikes` są automatycznie filtrowane przez RLS:

```sql
-- SELECT: User widzi tylko swoje rowery
CREATE POLICY bikes_select_own ON bikes
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: User może dodać rower tylko dla siebie
CREATE POLICY bikes_insert_own ON bikes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: User może edytować tylko swoje rowery
CREATE POLICY bikes_update_own ON bikes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: User może usunąć tylko swoje rowery
CREATE POLICY bikes_delete_own ON bikes
  FOR DELETE
  USING (user_id = auth.uid());
```

**Zalety:**
- Brak możliwości omijania autoryzacji (enforced na poziomie DB)
- Automatyczna ochrona przed błędami w application code
- Eliminuje SQL injection

---

### 3. Walidacja danych wejściowych

#### Request Body Validation (Zod)

```typescript
import { z } from 'zod';

const BikeTypeSchema = z.enum(['szosowy', 'gravelowy', 'mtb', 'czasowy']);
const BikeStatusSchema = z.enum(['active', 'archived', 'sold']);

const CreateBikeSchema = z.object({
  name: z.string().min(1).max(50),
  type: BikeTypeSchema,
  purchase_date: z.string().datetime().optional(),
  current_mileage: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const UpdateBikeSchema = CreateBikeSchema.partial().extend({
  status: BikeStatusSchema.optional(),
});

const UpdateMileageSchema = z.object({
  current_mileage: z.number().int().min(0),
});

// Użycie w route handler:
const validated = CreateBikeSchema.safeParse(body);
if (!validated.success) {
  return new Response(JSON.stringify({
    error: 'Validation failed',
    details: validated.error.flatten()
  }), { status: 422 });
}
```

#### Query Parameters Validation

```typescript
const GetBikesQuerySchema = z.object({
  status: BikeStatusSchema.optional(),
  type: BikeTypeSchema.optional(),
});
```

---

### 4. Ochrona przed atakami

#### SQL Injection
✅ **Mitigated:** Supabase client używa prepared statements

#### Mass Assignment
✅ **Mitigated:** Używamy Command Models (tylko dozwolone pola)

```typescript
// ❌ BAD - przyjmuje wszystkie pola z body
const bike = await supabase.from('bikes').insert(req.body);

// ✅ GOOD - tylko zdefiniowane pola
const command: CreateBikeCommand = {
  name: validated.data.name,
  type: validated.data.type,
  purchase_date: validated.data.purchase_date,
  current_mileage: validated.data.current_mileage ?? 0,
  notes: validated.data.notes,
};
```

#### CSRF
✅ **Mitigated:** Token-based auth (no cookies for API)

#### Rate Limiting
⚠️ **To Implement:** Cloudflare Pages rate limiting lub custom middleware

```typescript
// Przykład: max 100 requests/min per user
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => req.locals.userId,
});
```

---

### 5. Sensitive Data Handling

- ❌ **Nie loguj** tokenów JWT
- ❌ **Nie zwracaj** user_id w response (tylko w locals)
- ✅ **Loguj** tylko: bikeId, operation, timestamp, status code
- ✅ **Używaj** environment variables dla secrets (OpenWeather API key, Supabase keys)

---

## 7. Obsługa błędów

### Struktura odpowiedzi błędu

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  message?: string;        // Detailed explanation
  details?: Record<string, string>;  // Validation errors
  code?: string;           // Error code dla frontend (np. 'MILEAGE_DECREASE')
}
```

---

### Katalog błędów

#### 400 Bad Request

**Przykłady:**
1. **Mileage decrease attempt**
   ```json
   {
     "error": "Invalid mileage",
     "message": "New mileage (5000) cannot be less than current mileage (5420)",
     "code": "MILEAGE_DECREASE"
   }
   ```

2. **Invalid JSON**
   ```json
   {
     "error": "Bad request",
     "message": "Invalid JSON format"
   }
   ```

3. **Missing required fields**
   ```json
   {
     "error": "Bad request",
     "message": "Missing required fields: name, type"
   }
   ```

**Handling:**
```typescript
if (newMileage < currentMileage) {
  return new Response(JSON.stringify({
    error: 'Invalid mileage',
    message: `New mileage (${newMileage}) cannot be less than current mileage (${currentMileage})`,
    code: 'MILEAGE_DECREASE'
  }), { status: 400 });
}
```

---

#### 401 Unauthorized

**Przykłady:**
1. **Missing token**
2. **Invalid token**
3. **Expired token**

```json
{
  "error": "Unauthorized",
  "message": "Valid authentication token required"
}
```

**Handling:** W middleware (automatyczne)

---

#### 404 Not Found

**Przykłady:**
1. **Bike doesn't exist**
2. **Bike belongs to another user** (RLS returns empty result)

```json
{
  "error": "Not found",
  "message": "Bike not found or you don't have permission to access it"
}
```

**Handling:**
```typescript
const bike = await BikeService.getBikeById(userId, bikeId);
if (!bike) {
  return new Response(JSON.stringify({
    error: 'Not found',
    message: 'Bike not found or you don\'t have permission to access it'
  }), { status: 404 });
}
```

---

#### 422 Validation Error

**Przykłady:**
1. **Invalid enum values**
2. **Constraint violations**
3. **Type mismatches**

```json
{
  "error": "Validation failed",
  "details": {
    "name": "Name must be 1-50 characters",
    "type": "Type must be one of: szosowy, gravelowy, mtb, czasowy",
    "current_mileage": "Mileage must be a non-negative integer"
  }
}
```

**Handling:** Zod `.safeParse()` z `.flatten()`

---

#### 500 Internal Server Error

**Przykłady:**
1. **Database connection error**
2. **Unexpected exceptions**
3. **Trigger failures**

```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

**Handling:**
```typescript
try {
  // ... operation
} catch (error) {
  console.error('[BikeAPI] Error:', {
    operation: 'createBike',
    userId,
    error: error.message,
    stack: error.stack,
  });
  
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.'
  }), { status: 500 });
}
```

**Note:** W production **nie** ujawniaj stack traces ani DB error messages.

---

### Centralized Error Handler

```typescript
// src/lib/error-handler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: Record<string, string>
  ) {
    super(message);
  }
}

export function handleError(error: unknown): Response {
  if (error instanceof ApiError) {
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code,
      details: error.details,
    }), { status: error.statusCode });
  }
  
  // Unknown error
  console.error('[API] Unexpected error:', error);
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  }), { status: 500 });
}
```

---

## 8. Rozważania dotyczące wydajności

### 1. Database Query Optimization

#### Problem: N+1 Queries

**❌ Nieefektywne (N+1):**
```typescript
// Fetch bikes
const bikes = await supabase.from('bikes').select('*');

// For each bike, fetch computed fields (N queries)
for (const bike of bikes) {
  const nextService = await getNextService(bike.id);
  const remindersCount = await getRemindersCount(bike.id);
  const totalCost = await getTotalCost(bike.id);
}
```

**✅ Efektywne (1 query with JOINs):**
```typescript
const { data: bikes } = await supabase
  .from('bikes')
  .select(`
    *,
    service_records!bikes_id_fkey (
      cost
    ),
    service_reminders!bikes_id_fkey (
      id,
      service_type,
      target_mileage,
      status,
      triggered_at_mileage,
      interval_km
    )
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Compute fields in-memory (fast)
const bikesDTO = bikes.map(bike => ({
  ...bike,
  next_service: findNextService(bike.service_reminders),
  active_reminders_count: bike.service_reminders.filter(r => r.status === 'active').length,
  total_cost: bike.service_records.reduce((sum, r) => sum + (r.cost || 0), 0),
}));
```

**Poprawa:** O(N) → O(1) database queries

---

### 2. Caching Strategy

#### GET /api/bikes
**Cache:** Brak (dane często się zmieniają przez PATCH mileage)
**Optymalizacja:** Używaj HTTP Cache-Control headers

```typescript
return new Response(JSON.stringify(response), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=60', // 1 min cache w przeglądarce
  },
});
```

#### Computed Fields
**Nie** cachuj next_service ani total_cost (wymagają świeżych danych).

---

### 3. Index Optimization

**Wymagane indeksy (zdefiniowane w migrations):**

```sql
-- Primary operations (existing)
CREATE INDEX idx_bikes_user_id ON bikes(user_id);
CREATE INDEX idx_bikes_status ON bikes(status);
CREATE INDEX idx_bikes_type ON bikes(type);

-- Composite index dla częstych filtrów
CREATE INDEX idx_bikes_user_status_type ON bikes(user_id, status, type);

-- Service records dla total_cost aggregate
CREATE INDEX idx_service_records_bike_id ON service_records(bike_id);

-- Service reminders dla next_service query
CREATE INDEX idx_service_reminders_bike_status ON service_reminders(bike_id, status)
  WHERE status = 'active';
```

**Szacowany czas query:**
- GET /api/bikes: < 50ms (10 bikes, includes JOINs)
- POST /api/bikes: < 20ms
- PATCH mileage: < 30ms (includes trigger execution)
- DELETE: < 40ms (cascade deletion)

---

### 4. Payload Size Optimization

#### Response Compression
```typescript
// Cloudflare Pages automatycznie kompresuje responses (gzip/brotli)
// Brak dodatkowych działań
```

#### Pagination
Dla użytkowników z >20 rowerami (edge case):
```typescript
// Opcjonalne query params (future enhancement)
interface GetBikesParams {
  status?: BikeStatusEnum;
  type?: BikeTypeEnum;
  limit?: number;    // default: 50
  offset?: number;   // default: 0
}
```

**MVP:** Brak paginacji (user ma max 2-5 rowerów)

---

### 5. Database Connection Pooling

**Supabase:** Built-in connection pooling (max 15 connections w free tier)

**Best Practice:**
```typescript
// ✅ Reuse single Supabase client instance
// src/db/supabase.client.ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ❌ Don't create new client per request
```

---

### 6. Monitoring & Alerts

**Metryki do monitorowania:**
1. **Response Time:**
   - p50: < 100ms
   - p95: < 300ms
   - p99: < 500ms

2. **Error Rate:**
   - 4xx: < 5% (user errors)
   - 5xx: < 0.1% (server errors)

3. **Database Metrics:**
   - Query time: < 50ms average
   - Connection pool usage: < 70%

**Narzędzia:**
- Sentry: Error tracking + performance monitoring
- Supabase Dashboard: Database metrics
- Cloudflare Analytics: Request stats

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska i typów

**Pliki do utworzenia/zmodyfikowania:**
- ✅ `src/types.ts` (już istnieje - verify types)
- ✅ `src/db/database.types.ts` (już istnieje - Supabase generated)
- ✅ `src/db/supabase.client.ts` (już istnieje)

**Zadania:**
1. Verify all bike-related types exist in `types.ts`:
   - ✅ BikeDTO
   - ✅ CreateBikeCommand
   - ✅ UpdateBikeCommand
   - ✅ UpdateBikeMileageCommand
   - ✅ UpdateBikeMileageResponse
   - ✅ BikesListDTO
   - ✅ GetBikesParams

2. Install dependencies (if missing):
   ```bash
   npm install zod
   ```

---

### Krok 2: Utworzenie warstwy serwisowej (BikeService)

**Plik:** `src/services/bike.service.ts`

**Odpowiedzialności:**
- Transformacja DB rows → DTOs
- Wyliczanie computed fields (next_service, active_reminders_count, total_cost)
- Business logic validation
- Reusable query logic

**Główne metody:**
```typescript
class BikeService {
  // GET /api/bikes
  async getBikes(userId: string, params: GetBikesParams): Promise<BikesListDTO>
  
  // GET /api/bikes/{id}
  async getBikeById(userId: string, bikeId: string): Promise<BikeDTO | null>
  
  // POST /api/bikes
  async createBike(userId: string, command: CreateBikeCommand): Promise<BikeDTO>
  
  // PUT /api/bikes/{id}
  async updateBike(userId: string, bikeId: string, command: UpdateBikeCommand): Promise<BikeDTO | null>
  
  // PATCH /api/bikes/{id}/mileage
  async updateMileage(userId: string, bikeId: string, command: UpdateBikeMileageCommand): Promise<UpdateBikeMileageResponse | null>
  
  // DELETE /api/bikes/{id}
  async deleteBike(userId: string, bikeId: string): Promise<boolean>
  
  // Helper: Transform DB row to DTO with computed fields
  private transformToDTO(bikeRow: any): BikeDTO
}
```

**Implementacja computed fields:**
```typescript
private transformToDTO(bikeRow: any): BikeDTO {
  // Calculate next_service from service_reminders
  const activeReminders = bikeRow.service_reminders?.filter(r => r.status === 'active') || [];
  const nextService = activeReminders.length > 0
    ? this.findNextService(activeReminders, bikeRow.current_mileage)
    : null;
  
  // Count active reminders
  const activeRemindersCount = activeReminders.length;
  
  // Sum total cost from service_records
  const totalCost = bikeRow.service_records?.reduce(
    (sum, record) => sum + (record.cost || 0), 
    0
  ) || 0;
  
  return {
    id: bikeRow.id,
    name: bikeRow.name,
    type: bikeRow.type,
    purchase_date: bikeRow.purchase_date,
    current_mileage: bikeRow.current_mileage,
    status: bikeRow.status,
    notes: bikeRow.notes,
    created_at: bikeRow.created_at,
    updated_at: bikeRow.updated_at,
    next_service: nextService,
    active_reminders_count: activeRemindersCount,
    total_cost: totalCost,
  };
}

private findNextService(reminders: any[], currentMileage: number): NextServiceInfo | null {
  // Sort by km_remaining ASC
  const sorted = reminders
    .map(r => ({
      service_type: r.service_type,
      target_mileage: r.target_mileage,
      km_remaining: r.target_mileage - currentMileage,
      status: this.calculateReminderStatus(r, currentMileage),
    }))
    .sort((a, b) => a.km_remaining - b.km_remaining);
  
  return sorted[0] || null;
}
```

---

### Krok 3: Walidacja danych wejściowych (Zod schemas)

**Plik:** `src/lib/validation/bike.schemas.ts`

**Schemas:**
```typescript
import { z } from 'zod';

export const BikeTypeSchema = z.enum(['szosowy', 'gravelowy', 'mtb', 'czasowy']);
export const BikeStatusSchema = z.enum(['active', 'archived', 'sold']);

export const CreateBikeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be max 50 characters'),
  type: BikeTypeSchema,
  purchase_date: z.string().datetime().optional().nullable(),
  current_mileage: z.number().int().min(0, 'Mileage must be non-negative').optional(),
  notes: z.string().max(500, 'Notes must be max 500 characters').optional().nullable(),
});

export const UpdateBikeSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  type: BikeTypeSchema.optional(),
  purchase_date: z.string().datetime().optional().nullable(),
  current_mileage: z.number().int().min(0).optional(),
  status: BikeStatusSchema.optional(),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const UpdateMileageSchema = z.object({
  current_mileage: z.number().int().min(0, 'Mileage must be non-negative'),
});

export const GetBikesQuerySchema = z.object({
  status: BikeStatusSchema.optional(),
  type: BikeTypeSchema.optional(),
});
```

---

### Krok 4: Implementacja middleware uwierzytelniania

**Plik:** `src/middleware/index.ts` (już istnieje, verify implementation)

**Wymagana funkcjonalność:**
```typescript
import type { MiddlewareHandler } from 'astro';
import { supabase } from '../db/supabase.client';

export const onRequest: MiddlewareHandler = async ({ request, locals, redirect }, next) => {
  // Skip middleware for public routes
  if (!request.url.includes('/api/')) {
    return next();
  }
  
  // Extract token from Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Authentication token required'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Store userId in locals for route handlers
  locals.userId = user.id;
  
  return next();
};
```

**Type definition:**
```typescript
// src/env.d.ts
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    userId: string;
  }
}
```

---

### Krok 5: Implementacja route handlers

**Struktura plików:**
```
src/pages/api/bikes/
  ├── index.ts           # GET /api/bikes, POST /api/bikes
  ├── [id].ts            # PUT /api/bikes/{id}, DELETE /api/bikes/{id}
  └── [id]/mileage.ts    # PATCH /api/bikes/{id}/mileage
```

---

#### 5.1. GET /api/bikes + POST /api/bikes

**Plik:** `src/pages/api/bikes/index.ts`

```typescript
import type { APIRoute } from 'astro';
import { BikeService } from '../../../services/bike.service';
import { CreateBikeSchema, GetBikesQuerySchema } from '../../../lib/validation/bike.schemas';
import { handleError } from '../../../lib/error-handler';

const bikeService = new BikeService();

// GET /api/bikes
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const userId = locals.userId!;
    
    // Parse query params
    const queryParams = {
      status: url.searchParams.get('status'),
      type: url.searchParams.get('type'),
    };
    
    // Validate query params
    const validated = GetBikesQuerySchema.safeParse(queryParams);
    if (!validated.success) {
      return new Response(JSON.stringify({
        error: 'Invalid query parameters',
        details: validated.error.flatten().fieldErrors,
      }), { status: 400 });
    }
    
    // Fetch bikes
    const result = await bikeService.getBikes(userId, validated.data);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

// POST /api/bikes
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = locals.userId!;
    
    // Parse body
    const body = await request.json();
    
    // Validate body
    const validated = CreateBikeSchema.safeParse(body);
    if (!validated.success) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validated.error.flatten().fieldErrors,
      }), { status: 422 });
    }
    
    // Create bike
    const bike = await bikeService.createBike(userId, validated.data);
    
    return new Response(JSON.stringify(bike), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
};
```

---

#### 5.2. PUT /api/bikes/{id} + DELETE /api/bikes/{id}

**Plik:** `src/pages/api/bikes/[id].ts`

```typescript
import type { APIRoute } from 'astro';
import { BikeService } from '../../../services/bike.service';
import { UpdateBikeSchema } from '../../../lib/validation/bike.schemas';
import { handleError } from '../../../lib/error-handler';

const bikeService = new BikeService();

// PUT /api/bikes/{id}
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = locals.userId!;
    const bikeId = params.id!;
    
    // Parse body
    const body = await request.json();
    
    // Validate body
    const validated = UpdateBikeSchema.safeParse(body);
    if (!validated.success) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validated.error.flatten().fieldErrors,
      }), { status: 422 });
    }
    
    // Update bike
    const bike = await bikeService.updateBike(userId, bikeId, validated.data);
    
    if (!bike) {
      return new Response(JSON.stringify({
        error: 'Not found',
        message: 'Bike not found or you don\'t have permission to access it',
      }), { status: 404 });
    }
    
    return new Response(JSON.stringify(bike), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
};

// DELETE /api/bikes/{id}
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const userId = locals.userId!;
    const bikeId = params.id!;
    
    // Delete bike
    const success = await bikeService.deleteBike(userId, bikeId);
    
    if (!success) {
      return new Response(JSON.stringify({
        error: 'Not found',
        message: 'Bike not found or you don\'t have permission to access it',
      }), { status: 404 });
    }
    
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
};
```

---

#### 5.3. PATCH /api/bikes/{id}/mileage

**Plik:** `src/pages/api/bikes/[id]/mileage.ts`

```typescript
import type { APIRoute } from 'astro';
import { BikeService } from '../../../../services/bike.service';
import { UpdateMileageSchema } from '../../../../lib/validation/bike.schemas';
import { handleError, ApiError } from '../../../../lib/error-handler';

const bikeService = new BikeService();

// PATCH /api/bikes/{id}/mileage
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = locals.userId!;
    const bikeId = params.id!;
    
    // Parse body
    const body = await request.json();
    
    // Validate body
    const validated = UpdateMileageSchema.safeParse(body);
    if (!validated.success) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validated.error.flatten().fieldErrors,
      }), { status: 422 });
    }
    
    // Update mileage
    const result = await bikeService.updateMileage(userId, bikeId, validated.data);
    
    if (!result) {
      return new Response(JSON.stringify({
        error: 'Not found',
        message: 'Bike not found or you don\'t have permission to access it',
      }), { status: 404 });
    }
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return handleError(error);
  }
};
```

---

### Krok 6: Error handler utility

**Plik:** `src/lib/error-handler.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleError(error: unknown): Response {
  console.error('[API Error]', error);
  
  if (error instanceof ApiError) {
    return new Response(JSON.stringify({
      error: error.message,
      code: error.code,
      details: error.details,
    }), { 
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // PostgreSQL errors
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string };
    
    // Handle common PostgreSQL errors
    switch (pgError.code) {
      case '23505': // unique_violation
        return new Response(JSON.stringify({
          error: 'Duplicate entry',
          message: 'A bike with this name already exists',
        }), { status: 400 });
      
      case '23503': // foreign_key_violation
        return new Response(JSON.stringify({
          error: 'Invalid reference',
          message: 'Referenced resource does not exist',
        }), { status: 400 });
      
      default:
        console.error('[PostgreSQL Error]', pgError);
    }
  }
  
  // Unknown error
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
  }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

### Krok 7: Testing

#### 7.1. Unit Tests (BikeService)

**Plik:** `src/services/bike.service.test.ts`

**Test cases:**
```typescript
describe('BikeService', () => {
  describe('getBikes', () => {
    it('should return all user bikes', async () => {});
    it('should filter by status', async () => {});
    it('should filter by type', async () => {});
    it('should include computed fields', async () => {});
    it('should return empty array for user with no bikes', async () => {});
  });
  
  describe('createBike', () => {
    it('should create bike with required fields only', async () => {});
    it('should create bike with all fields', async () => {});
    it('should default status to active', async () => {});
    it('should default mileage to 0', async () => {});
  });
  
  describe('updateMileage', () => {
    it('should update mileage successfully', async () => {});
    it('should throw error when mileage decreases', async () => {});
    it('should return null for non-existent bike', async () => {});
  });
  
  describe('deleteBike', () => {
    it('should delete bike successfully', async () => {});
    it('should cascade delete service records', async () => {});
    it('should return false for non-existent bike', async () => {});
  });
});
```

---

#### 7.2. Integration Tests (API Routes)

**Plik:** `tests/api/bikes.test.ts`

**Test cases:**
```typescript
describe('GET /api/bikes', () => {
  it('should return 401 without auth token', async () => {});
  it('should return user bikes', async () => {});
  it('should filter by status', async () => {});
  it('should return 200 with empty array for new user', async () => {});
});

describe('POST /api/bikes', () => {
  it('should create bike with required fields', async () => {});
  it('should return 422 for invalid type', async () => {});
  it('should return 422 for missing name', async () => {});
  it('should return 422 for name > 50 chars', async () => {});
});

describe('PATCH /api/bikes/{id}/mileage', () => {
  it('should update mileage', async () => {});
  it('should return 400 when mileage decreases', async () => {});
  it('should return 404 for non-existent bike', async () => {});
  it('should return 404 for other user bike', async () => {});
});

describe('DELETE /api/bikes/{id}', () => {
  it('should delete bike', async () => {});
  it('should return 404 for non-existent bike', async () => {});
  it('should cascade delete related records', async () => {});
});
```

---

#### 7.3. E2E Tests (Playwright)

**Plik:** `tests/e2e/bikes.spec.ts`

**Scenarios:**
1. User creates first bike → sees it in list
2. User updates bike mileage → sees updated value
3. User archives bike → bike shows "archived" status
4. User deletes bike → bike disappears from list

---

### Krok 8: Documentation

#### 8.1. API Documentation (OpenAPI/Swagger)

**Plik:** `docs/api/bikes.yaml` (optional, dla Swagger UI)

#### 8.2. Code Comments

Dodać JSDoc comments do wszystkich public methods w BikeService:

```typescript
/**
 * Fetches all bikes for a user with optional filtering
 * 
 * @param userId - Authenticated user ID
 * @param params - Query parameters for filtering
 * @returns List of bikes with computed fields
 * @throws {ApiError} If database query fails
 * 
 * @example
 * const bikes = await bikeService.getBikes(userId, { status: 'active' });
 */
async getBikes(userId: string, params: GetBikesParams): Promise<BikesListDTO>
```

---

### Krok 9: Deployment

#### 9.1. Environment Variables

**Required:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (dla admin operations)

**Cloudflare Pages:**
```bash
wrangler pages secret put SUPABASE_URL
wrangler pages secret put SUPABASE_ANON_KEY
```

#### 9.2. Database Migrations

Verify migrations są applied:
```bash
supabase db push
```

#### 9.3. Deploy to Production

```bash
npm run build
npm run deploy  # lub git push (auto-deploy via GitHub Actions)
```

---

### Krok 10: Monitoring & Maintenance

#### 10.1. Sentry Setup

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,
});
```

#### 10.2. Logging

```typescript
// Log successful operations
console.log('[BikeAPI] Bike created', { 
  bikeId: bike.id, 
  userId, 
  type: bike.type 
});

// Log errors (już w error-handler.ts)
console.error('[BikeAPI] Error creating bike', {
  userId,
  error: error.message,
  stack: error.stack,
});
```

#### 10.3. Alerts

**Setup alerts for:**
- Error rate > 1% (5xx errors)
- Response time p95 > 500ms
- Database connection pool > 80%

---

## 10. Podsumowanie

### Kluczowe punkty implementacji:

1. ✅ **Clean Architecture**: Route handlers → Service layer → Database
2. ✅ **Type Safety**: Zod validation + TypeScript strict mode
3. ✅ **Security**: RLS policies + JWT auth + input validation
4. ✅ **Performance**: Single query with JOINs, no N+1
5. ✅ **Error Handling**: Centralized error handler z proper status codes
6. ✅ **Testing**: Unit + Integration + E2E coverage
7. ✅ **Monitoring**: Sentry + structured logging

### Szacowany czas implementacji:

- **Krok 1-3** (Setup + Service + Validation): 4h
- **Krok 4-5** (Middleware + Routes): 4h
- **Krok 6** (Error handling): 1h
- **Krok 7** (Testing): 6h
- **Krok 8-9** (Docs + Deploy): 2h
- **Krok 10** (Monitoring): 1h

**Total:** ~18h (2-3 dni robocze)

### Gotowy do implementacji! 🚀

