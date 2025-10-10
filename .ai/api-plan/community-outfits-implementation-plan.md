# API Endpoint Implementation Plan: GET /api/community/outfits

## 1. Przegląd punktu końcowego

**Cel**: Umożliwienie użytkownikom przeglądania anonimowych zestawów ubioru udostępnionych przez społeczność, z wykorzystaniem zaawansowanych zapytań przestrzennych (PostGIS) do wyszukiwania w określonym promieniu od wybranej lokalizacji użytkownika.

**Funkcjonalność**:
- Wyszukiwanie zestawów w promieniu 50-100km od lokalizacji użytkownika
- Filtrowanie po warunkach pogodowych (temperatura ±3°C)
- Filtrowanie po typie aktywności, ocenie, reputacji użytkownika
- Sortowanie według: reputacji, odległości, daty utworzenia, oceny
- Paginacja wyników (limit 10-50, offset)
- Zwracanie odległości w km dla każdego zestawu

**Technologia kluczowa**: PostGIS GEOGRAPHY(POINT) + ST_DWithin dla spatial queries

---

## 2. Szczegóły żądania

### HTTP Method
`GET`

### Struktura URL
```
GET /api/community/outfits
```

### Query Parameters

#### Wymagane:
| Parameter | Type | Description | Validation |
|-----------|------|-------------|------------|
| `location_id` | UUID | ID lokalizacji użytkownika (centrum dla radius search) | UUID format, must exist in user_locations |

#### Opcjonalne:
| Parameter | Type | Default | Max | Description | Validation |
|-----------|------|---------|-----|-------------|------------|
| `radius_km` | integer | 50 | 100 | Promień wyszukiwania w km | 1-100 |
| `temperature` | number | - | - | Filtruj po temperaturze ±temperature_range | -50 to 50 |
| `temperature_range` | integer | 3 | - | Tolerancja temperatury w °C | 0-10 |
| `activity_type` | enum | - | - | Typ aktywności | recovery\|spokojna\|tempo\|interwaly |
| `min_rating` | integer | - | - | Minimalna ocena zestawu | 1-5 |
| `reputation_filter` | enum | - | - | Filtruj po reputacji użytkownika | nowicjusz\|regularny\|ekspert\|mistrz |
| `time_range` | integer | 24 | 168 | Zakres czasowy wstecz w godzinach | 1-168 |
| `sort` | string | reputation | - | Sortowanie | reputation\|distance\|created_at\|rating |
| `limit` | integer | 10 | 50 | Liczba wyników na stronę | 1-50 |
| `offset` | integer | 0 | - | Offset paginacji | >= 0 |

### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body
Brak (GET request)

---

## 3. Wykorzystywane typy

### Z src/types.ts:

**Query Parameters Interface:**
```typescript
export interface GetCommunityOutfitsParams {
  location_id: string;
  radius_km?: number;
  temperature?: number;
  temperature_range?: number;
  activity_type?: ActivityTypeEnum;
  min_rating?: number;
  reputation_filter?: ReputationBadgeEnum;
  time_range?: number;
  sort?: 'reputation' | 'distance' | 'created_at' | 'rating';
  limit?: number;
  offset?: number;
}
```

**Response DTO:**
```typescript
export interface CommunityOutfitDTO {
  id: string;
  user_pseudonym: string;
  reputation_badge: ReputationBadgeEnum;
  feedback_count: number;
  distance_km: number;
  weather_conditions: {
    temperature: number;
    feels_like: number;
    wind_speed: number;
    humidity: number;
    rain_mm: number;
  };
  activity_type: ActivityTypeEnum;
  outfit: OutfitDTO;
  overall_rating: number;
  created_at: string | null;
}

export interface CommunityOutfitsListDTO {
  outfits: CommunityOutfitDTO[];
  total: number;
  has_more: boolean;
}
```

**Supporting Types:**
```typescript
export type ActivityTypeEnum = 'recovery' | 'spokojna' | 'tempo' | 'interwaly';
export type ReputationBadgeEnum = 'nowicjusz' | 'regularny' | 'ekspert' | 'mistrz';

export interface Coordinates {
  latitude: number;
  longitude: number;
}
```

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

```json
{
  "outfits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_pseudonym": "kolarz_xyz789",
      "reputation_badge": "ekspert",
      "feedback_count": 67,
      "distance_km": 15.2,
      "weather_conditions": {
        "temperature": 12.0,
        "feels_like": 10.5,
        "wind_speed": 8.0,
        "humidity": 70,
        "rain_mm": 0
      },
      "activity_type": "tempo",
      "outfit": {
        "head": "opaska",
        "torso": {
          "base": "koszulka_dl",
          "mid": "nic",
          "outer": "nic"
        },
        "arms": "nic",
        "hands": "rekawiczki_letnie",
        "legs": "krotkie",
        "feet": {
          "socks": "letnie",
          "covers": "nic"
        },
        "neck": "nic"
      },
      "overall_rating": 5,
      "created_at": "2025-10-10T08:30:00Z"
    }
  ],
  "total": 8,
  "has_more": false
}
```

### Error Responses

**400 Bad Request:**
```json
{
  "error": "Validation Error",
  "details": {
    "location_id": "Must be a valid UUID",
    "radius_km": "Must be between 1 and 100"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

**404 Not Found:**
```json
{
  "error": "Location Not Found",
  "message": "Location with id {location_id} does not exist or does not belong to the user"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 5. Przepływ danych

### 5.1 High-Level Flow

```
1. Request arrives → Middleware extracts auth.uid()
2. Validate query parameters → Return 400 if invalid
3. Fetch location coordinates from user_locations table
4. If location not found → Return 404
5. Build PostGIS spatial query with all filters
6. Execute query with ST_DWithin for radius search
7. Calculate total count (for has_more flag)
8. Transform database rows to CommunityOutfitDTO[]
9. Calculate distance_km from meters
10. Return CommunityOutfitsListDTO
```

### 5.2 Database Query Flow

```sql
-- Step 1: Get user location coordinates
SELECT ST_X(location::geometry) as longitude, 
       ST_Y(location::geometry) as latitude
FROM user_locations
WHERE id = $1 AND user_id = auth.uid();

-- Step 2: Query shared outfits with spatial filter
SELECT 
  so.id,
  so.user_pseudonym,
  so.reputation_badge,
  so.feedback_count,
  ST_Distance(so.location, ST_MakePoint($2, $3)::geography) / 1000 as distance_km,
  so.weather_conditions,
  so.activity_type,
  so.outfit,
  so.overall_rating,
  so.created_at
FROM shared_outfits so
WHERE 
  -- Spatial filter (primary)
  ST_DWithin(
    so.location, 
    ST_MakePoint($2, $3)::geography, 
    $4 * 1000  -- radius_km to meters
  )
  -- Time range filter
  AND so.created_at > NOW() - INTERVAL '$5 hours'
  -- Temperature filter (if provided)
  AND (
    $6::numeric IS NULL OR 
    (so.weather_conditions->>'temperature')::numeric 
      BETWEEN $6 - $7 AND $6 + $7
  )
  -- Activity type filter (if provided)
  AND ($8::text IS NULL OR so.activity_type = $8)
  -- Min rating filter (if provided)
  AND ($9::integer IS NULL OR so.overall_rating >= $9)
  -- Reputation filter (if provided)
  AND ($10::text IS NULL OR so.reputation_badge = $10)
ORDER BY 
  CASE 
    WHEN $11 = 'reputation' THEN 
      CASE so.reputation_badge
        WHEN 'mistrz' THEN 1
        WHEN 'ekspert' THEN 2
        WHEN 'regularny' THEN 3
        WHEN 'nowicjusz' THEN 4
      END
    WHEN $11 = 'distance' THEN distance_km
    WHEN $11 = 'rating' THEN -so.overall_rating
    ELSE NULL
  END,
  so.created_at DESC
LIMIT $12 OFFSET $13;

-- Step 3: Get total count (without limit/offset)
SELECT COUNT(*) FROM shared_outfits so
WHERE [same filters as above without ORDER BY, LIMIT, OFFSET];
```

### 5.3 Service Layer Structure

**File: `src/services/community.service.ts`**

```typescript
export async function getCommunityOutfits(
  userId: string,
  params: GetCommunityOutfitsParams
): Promise<CommunityOutfitsListDTO> {
  // 1. Get location coordinates
  const location = await getUserLocation(userId, params.location_id);
  
  // 2. Build query with filters
  const query = buildCommunityOutfitsQuery(location, params);
  
  // 3. Execute query with Supabase
  const { data, error } = await supabase.rpc('get_community_outfits', query);
  
  // 4. Get total count
  const total = await getCommunityOutfitsCount(location, params);
  
  // 5. Transform to DTOs
  return {
    outfits: data.map(row => transformToCommunityOutfitDTO(row)),
    total,
    has_more: params.offset + params.limit < total
  };
}
```

### 5.4 Indexes Used

**Spatial Index (GIST):**
```sql
CREATE INDEX idx_shared_outfits_geography ON shared_outfits USING GIST(location);
```

**Composite Index:**
```sql
CREATE INDEX idx_shared_outfits_community 
ON shared_outfits(reputation_badge, created_at DESC);
```

**Partial Index (recent only):**
```sql
CREATE INDEX idx_shared_outfits_recent 
ON shared_outfits(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie
- **Wymagane**: JWT token w Authorization header
- **Provider**: Supabase Auth
- **Middleware**: `src/middleware/index.ts` - weryfikuje `auth.uid()`
- **Error**: 401 Unauthorized jeśli token brak/invalid

### 6.2 Autoryzacja
- **RLS Policy**: shared_outfits ma publiczny SELECT dla authenticated users
- **Zasada**: Użytkownik może widzieć wszystkie shared outfits (community feature)
- **Ograniczenie**: Tylko outfits z `shared_with_community = true` są w tabeli

```sql
-- RLS Policy dla shared_outfits
CREATE POLICY "Public read access for authenticated users"
ON shared_outfits FOR SELECT
TO authenticated
USING (true);
```

### 6.3 Walidacja lokalizacji
- **Sprawdzenie**: location_id musi należeć do auth.uid()
- **Query**: `WHERE id = $1 AND user_id = auth.uid()`
- **Error**: 404 Not Found jeśli nie ma dostępu

### 6.4 Zapobieganie SQL Injection
- **Supabase**: Używa prepared statements automatycznie
- **PostGIS**: Wszystkie parametry przekazywane jako $1, $2, etc.
- **JSONB**: Bezpieczne parsowanie z `->` i `->>` operatorami

### 6.5 Privacy & Anonymization
- **Pseudonym**: Zamiast display_name
- **No PII**: Tabela shared_outfits nie zawiera email, phone, itp.
- **Location**: Tylko coordinates (bez adresu)
- **GDPR**: user_id SET NULL on delete (pseudonym pozostaje)

### 6.6 Rate Limiting (Post-MVP)
**Rekomendacja dla produkcji:**
```typescript
// Cloudflare Pages Rate Limiting
// Limit: 100 requests per 10 minutes per user
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 10 * 60 * 1000
};
```

### 6.7 Input Sanitization
- **UUID**: Walidacja formatu UUID v4
- **Numbers**: Parse + range validation
- **Enums**: Strict whitelist check
- **Strings**: Trim + max length (sort parameter)

---

## 7. Obsługa błędów

### 7.1 Validation Errors (400)

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| Missing location_id | `{"error": "Validation Error", "details": {"location_id": "Required"}}` | 400 |
| Invalid UUID format | `{"error": "Validation Error", "details": {"location_id": "Must be valid UUID"}}` | 400 |
| radius_km > 100 | `{"error": "Validation Error", "details": {"radius_km": "Must be between 1 and 100"}}` | 400 |
| Invalid activity_type | `{"error": "Validation Error", "details": {"activity_type": "Must be one of: recovery, spokojna, tempo, interwaly"}}` | 400 |
| min_rating out of range | `{"error": "Validation Error", "details": {"min_rating": "Must be between 1 and 5"}}` | 400 |
| Invalid sort value | `{"error": "Validation Error", "details": {"sort": "Must be one of: reputation, distance, created_at, rating"}}` | 400 |
| limit > 50 | `{"error": "Validation Error", "details": {"limit": "Must be between 1 and 50"}}` | 400 |

**Implementation:**
```typescript
function validateQueryParams(params: any): GetCommunityOutfitsParams | Error {
  const errors: Record<string, string> = {};
  
  // Validate location_id
  if (!params.location_id) {
    errors.location_id = "Required";
  } else if (!isValidUUID(params.location_id)) {
    errors.location_id = "Must be valid UUID";
  }
  
  // Validate radius_km
  if (params.radius_km !== undefined) {
    const radius = parseInt(params.radius_km);
    if (isNaN(radius) || radius < 1 || radius > 100) {
      errors.radius_km = "Must be between 1 and 100";
    }
  }
  
  // ... more validations
  
  if (Object.keys(errors).length > 0) {
    return new ValidationError(errors);
  }
  
  return normalizeParams(params);
}
```

### 7.2 Authentication Errors (401)

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| No Authorization header | `{"error": "Unauthorized", "message": "Authentication required"}` | 401 |
| Invalid JWT token | `{"error": "Unauthorized", "message": "Invalid token"}` | 401 |
| Expired token | `{"error": "Unauthorized", "message": "Token expired"}` | 401 |

**Implementation:**
```typescript
// Middleware handles automatically via Supabase
if (!context.locals.user) {
  return new Response(
    JSON.stringify({ error: "Unauthorized", message: "Authentication required" }),
    { status: 401 }
  );
}
```

### 7.3 Not Found Errors (404)

| Scenario | Response | HTTP Code |
|----------|----------|-----------|
| location_id doesn't exist | `{"error": "Location Not Found", "message": "Location with id {id} does not exist or does not belong to the user"}` | 404 |

**Implementation:**
```typescript
const location = await getUserLocation(userId, locationId);
if (!location) {
  return new Response(
    JSON.stringify({
      error: "Location Not Found",
      message: `Location with id ${locationId} does not exist or does not belong to the user`
    }),
    { status: 404 }
  );
}
```

### 7.4 Server Errors (500)

| Scenario | Response | HTTP Code | Logging |
|----------|----------|-----------|---------|
| Database connection error | `{"error": "Internal Server Error", "message": "Database error"}` | 500 | ERROR level + stack trace |
| PostGIS query error | `{"error": "Internal Server Error", "message": "Spatial query failed"}` | 500 | ERROR level + query details |
| Unexpected error | `{"error": "Internal Server Error", "message": "An unexpected error occurred"}` | 500 | ERROR level + full context |

**Implementation:**
```typescript
try {
  // ... endpoint logic
} catch (error) {
  console.error('Community outfits endpoint error:', {
    error,
    userId,
    params,
    stack: error.stack
  });
  
  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    }),
    { status: 500 }
  );
}
```

### 7.5 Error Logging Strategy

**Log Levels:**
- **INFO**: Validation errors (400) - expected user errors
- **WARN**: Not found (404), unauthorized (401) - potential issues
- **ERROR**: Server errors (500) - requires investigation

**Log Format:**
```typescript
{
  timestamp: "2025-10-10T10:30:00Z",
  level: "ERROR",
  endpoint: "GET /api/community/outfits",
  userId: "uuid",
  params: { location_id: "...", radius_km: 50 },
  error: {
    message: "Database connection failed",
    code: "PGRST116",
    stack: "..."
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Query Performance

**Expected Query Time:**
- **Target p50**: < 100ms
- **Target p95**: < 300ms
- **Target p99**: < 500ms

**Optimization Strategies:**

1. **Spatial Index (GIST)**: 
   - `idx_shared_outfits_geography` - kluczowy dla ST_DWithin
   - Czas wykonania: 10-50ms dla 50km radius

2. **Composite Index**:
   - `idx_shared_outfits_community (reputation_badge, created_at DESC)`
   - Wspiera sortowanie bez Seq Scan

3. **Partial Index**:
   - Only index recent 7 days (covers 95% of queries)
   - Smaller index = faster queries

4. **Query Optimization**:
   ```sql
   -- Use covering index hint
   SET enable_seqscan = off; -- Force index usage
   
   -- Limit spatial search area first (most selective)
   WHERE ST_DWithin(...) -- 1000 rows → 50 rows
   AND created_at > ... -- 50 rows → 30 rows
   AND temperature ... -- 30 rows → 15 rows
   ```

### 8.2 Database Load

**Concurrent Users:**
- Free tier Supabase: 60 max connections
- Expected load: 5-10 concurrent requests (MVP)
- Connection pooling: Transaction mode (default)

**Query Frequency:**
- Community feed: High frequency (every page load)
- Cache strategy: Application-level caching (5 min TTL)

### 8.3 Response Size Optimization

**Average Response Size:**
- 10 outfits × ~1.5KB = ~15KB
- Gzip compression: ~5KB (67% reduction)
- Transfer time (3G): ~50ms

**Optimization:**
```typescript
// Cloudflare Pages automatic gzip for > 1KB
// Astro also compresses automatically
// No additional configuration needed
```

### 8.4 Caching Strategy

**Application-Level Cache (Redis-like):**
```typescript
// Cache key format
const cacheKey = `community:${location_id}:${radius_km}:${temperature}:${filters_hash}`;

// TTL: 5 minutes (balance freshness vs load)
const CACHE_TTL = 5 * 60;

// Implementation
const cached = await cache.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const result = await getCommunityOutfits(...);
await cache.set(cacheKey, JSON.stringify(result), CACHE_TTL);
return result;
```

**Cache Invalidation:**
- TTL-based (simple, effective)
- Optional: Invalidate on new shared outfit (post-MVP)

### 8.5 N+1 Query Prevention

**Current Design: Zero N+1 Issues**
- All data denormalized in shared_outfits table
- Single query returns all needed data
- No JOIN required (by design)

### 8.6 Pagination Performance

**Offset-based Pagination:**
- Works well for small offsets (< 100)
- Degrades for large offsets (> 500)

**Future Optimization (Post-MVP):**
- Cursor-based pagination using created_at + id
```typescript
// Next page: ?cursor=2025-10-10T10:30:00Z_uuid
WHERE (created_at, id) < ($cursor_timestamp, $cursor_id)
ORDER BY created_at DESC, id DESC
```

### 8.7 Monitoring & Alerts

**Key Metrics to Track:**
```typescript
// Query duration
histogram('community_outfits_query_duration_ms', {
  p50: 100,
  p95: 300,
  p99: 500
});

// Result count distribution
histogram('community_outfits_result_count', {
  avg: 10,
  max: 50
});

// Cache hit rate
counter('community_outfits_cache_hit_rate', {
  target: 80
});
```

**Alerts:**
- Query duration p99 > 500ms → Investigate indexes
- Error rate > 1% → Check database connection
- No results for popular locations → Check data integrity

### 8.8 Load Testing Recommendations

**Before Production:**
```bash
# k6 load test
k6 run --vus 50 --duration 30s community-outfits-load-test.js

# Expected results:
# - 95% success rate
# - p95 response time < 500ms
# - No database connection errors
```

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska
- [ ] Sprawdź, czy PostGIS extension jest włączone w Supabase
- [ ] Zweryfikuj istnienie indexes: `idx_shared_outfits_geography`, `idx_shared_outfits_community`
- [ ] Zweryfikuj RLS policy dla shared_outfits (public SELECT for authenticated)

### Krok 2: Implementacja validation layer
**Plik: `src/lib/validation/community.validation.ts`**
- [ ] Utwórz funkcję `validateGetCommunityOutfitsParams()`
- [ ] Zaimplementuj walidację wszystkich query parameters
- [ ] Dodaj testy jednostkowe dla walidacji
- [ ] Dodaj custom error class `ValidationError`

```typescript
// Example structure
export function validateGetCommunityOutfitsParams(raw: any): GetCommunityOutfitsParams {
  const errors: Record<string, string> = {};
  
  // Validate all params
  // ...
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
  
  return normalizedParams;
}
```

### Krok 3: Implementacja service layer
**Plik: `src/services/community.service.ts`**
- [ ] Utwórz funkcję `getUserLocation(userId, locationId)`
- [ ] Utwórz funkcję `buildSpatialQuery(location, params)`
- [ ] Utwórz funkcję `getCommunityOutfits(userId, params)`
- [ ] Utwórz funkcję `getCommunityOutfitsCount(location, params)`
- [ ] Dodaj funkcję transformacji: `transformToCommunityOutfitDTO(row)`

```typescript
// Key functions
export async function getUserLocation(
  userId: string, 
  locationId: string
): Promise<Coordinates | null>;

export async function getCommunityOutfits(
  userId: string,
  params: GetCommunityOutfitsParams
): Promise<CommunityOutfitsListDTO>;
```

### Krok 4: Implementacja Astro API endpoint
**Plik: `src/pages/api/community/outfits.ts`**
- [ ] Utwórz GET handler
- [ ] Dodaj middleware authentication check
- [ ] Wywołaj validation layer
- [ ] Wywołaj service layer
- [ ] Obsłuż wszystkie error cases (400, 401, 404, 500)
- [ ] Zwróć JSON response z odpowiednim status code

```typescript
// Structure
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Auth check
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401 
      });
    }
    
    // 2. Parse & validate params
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = validateGetCommunityOutfitsParams(rawParams);
    
    // 3. Call service
    const result = await getCommunityOutfits(locals.user.id, params);
    
    // 4. Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    // Handle errors
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({
        error: "Validation Error",
        details: error.details
      }), { status: 400 });
    }
    
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({
        error: "Location Not Found",
        message: error.message
      }), { status: 404 });
    }
    
    // Log and return 500
    console.error('Community outfits error:', error);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      message: "An unexpected error occurred"
    }), { status: 500 });
  }
};
```

### Krok 5: Implementacja PostGIS query
**W `community.service.ts`:**
- [ ] Zaimplementuj PostGIS ST_DWithin dla radius search
- [ ] Dodaj ST_Distance dla obliczenia distance_km
- [ ] Zaimplementuj wszystkie filtry (temperature, activity_type, etc.)
- [ ] Dodaj sortowanie (ORDER BY z CASE statement)
- [ ] Dodaj paginację (LIMIT, OFFSET)

```typescript
const { data, error } = await supabase.rpc('get_community_outfits', {
  center_lng: location.longitude,
  center_lat: location.latitude,
  radius_meters: params.radius_km * 1000,
  time_range_hours: params.time_range || 24,
  temperature: params.temperature,
  temperature_range: params.temperature_range || 3,
  activity_type: params.activity_type,
  min_rating: params.min_rating,
  reputation_filter: params.reputation_filter,
  sort_by: params.sort || 'reputation',
  result_limit: params.limit || 10,
  result_offset: params.offset || 0
});
```

### Krok 6: Utworzenie Supabase RPC function
**Migration file: `supabase/migrations/YYYYMMDD_community_outfits_function.sql`**
- [ ] Utwórz PostgreSQL function `get_community_outfits()`
- [ ] Zaimplementuj logikę query z parametrami
- [ ] Zwróć SETOF record z wszystkimi kolumnami
- [ ] Dodaj computed column distance_km
- [ ] Przetestuj function w Supabase SQL Editor

```sql
CREATE OR REPLACE FUNCTION get_community_outfits(
  center_lng numeric,
  center_lat numeric,
  radius_meters integer,
  time_range_hours integer,
  temperature numeric DEFAULT NULL,
  temperature_range integer DEFAULT 3,
  activity_type text DEFAULT NULL,
  min_rating integer DEFAULT NULL,
  reputation_filter text DEFAULT NULL,
  sort_by text DEFAULT 'reputation',
  result_limit integer DEFAULT 10,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_pseudonym text,
  reputation_badge text,
  feedback_count integer,
  distance_km numeric,
  weather_conditions jsonb,
  activity_type text,
  outfit jsonb,
  overall_rating integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.user_pseudonym,
    so.reputation_badge,
    so.feedback_count,
    ROUND((ST_Distance(
      so.location, 
      ST_MakePoint(center_lng, center_lat)::geography
    ) / 1000)::numeric, 1) as distance_km,
    so.weather_conditions,
    so.activity_type,
    so.outfit,
    so.overall_rating,
    so.created_at
  FROM shared_outfits so
  WHERE 
    ST_DWithin(
      so.location, 
      ST_MakePoint(center_lng, center_lat)::geography, 
      radius_meters
    )
    AND so.created_at > NOW() - (time_range_hours || ' hours')::interval
    AND (
      temperature IS NULL OR 
      (so.weather_conditions->>'temperature')::numeric 
        BETWEEN temperature - temperature_range AND temperature + temperature_range
    )
    AND (activity_type IS NULL OR so.activity_type = activity_type)
    AND (min_rating IS NULL OR so.overall_rating >= min_rating)
    AND (reputation_filter IS NULL OR so.reputation_badge = reputation_filter)
  ORDER BY 
    CASE 
      WHEN sort_by = 'reputation' THEN 
        CASE so.reputation_badge
          WHEN 'mistrz' THEN 1
          WHEN 'ekspert' THEN 2
          WHEN 'regularny' THEN 3
          WHEN 'nowicjusz' THEN 4
        END
      WHEN sort_by = 'distance' THEN distance_km::integer
      WHEN sort_by = 'rating' THEN -so.overall_rating
      ELSE NULL
    END,
    so.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Krok 7: Implementacja count query
**W `community.service.ts`:**
- [ ] Utwórz osobną funkcję RPC dla count
- [ ] Użyj tych samych filtrów co main query
- [ ] Return total count (dla has_more flag)

```sql
CREATE OR REPLACE FUNCTION get_community_outfits_count(
  -- same params as above without limit/offset
)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM shared_outfits so
    WHERE [same filters as main query]
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### Krok 8: Testy jednostkowe
**Plik: `src/services/__tests__/community.service.test.ts`**
- [ ] Test: `getUserLocation()` - success case
- [ ] Test: `getUserLocation()` - not found
- [ ] Test: `getUserLocation()` - wrong user
- [ ] Test: `getCommunityOutfits()` - basic query
- [ ] Test: `getCommunityOutfits()` - with all filters
- [ ] Test: `getCommunityOutfits()` - pagination
- [ ] Test: `getCommunityOutfits()` - sorting variants
- [ ] Test: DTO transformation

### Krok 9: Testy integracyjne
**Plik: `src/pages/api/community/__tests__/outfits.test.ts`**
- [ ] Test: GET 200 - successful query
- [ ] Test: GET 400 - invalid parameters
- [ ] Test: GET 401 - no authentication
- [ ] Test: GET 404 - location not found
- [ ] Test: GET 200 - empty results
- [ ] Test: GET 200 - pagination
- [ ] Test: GET 200 - filtering by temperature
- [ ] Test: GET 200 - sorting variants

### Krok 10: Performance testing
- [ ] EXPLAIN ANALYZE dla main query
- [ ] Zweryfikuj użycie indexes (GIST + composite)
- [ ] Test z 1000+ rows w shared_outfits
- [ ] Benchmark query time (target: p95 < 300ms)
- [ ] Test concurrent requests (50 users)

### Krok 11: Dokumentacja
- [ ] Dodaj JSDoc comments do wszystkich funkcji
- [ ] Utwórz przykłady użycia w komentarzach
- [ ] Zaktualizuj API documentation
- [ ] Dodaj przykłady cURL requests

### Krok 12: Code review & deployment
- [ ] Self-review kodu
- [ ] Sprawdź zgodność z CLEAN_ARCHITECTURE guidelines
- [ ] Sprawdź error handling we wszystkich edge cases
- [ ] Merge do main branch
- [ ] Deploy to staging
- [ ] Smoke tests na staging
- [ ] Deploy to production
- [ ] Monitor logs i performance metrics

---

## 10. Checklist przed produkcją

### Bezpieczeństwo
- [ ] RLS policies aktywne i przetestowane
- [ ] JWT validation działa poprawnie
- [ ] Input validation kompletna
- [ ] SQL injection protection (parametrized queries)
- [ ] CORS headers skonfigurowane
- [ ] Rate limiting plan (post-MVP)

### Performance
- [ ] GIST spatial index istnieje i jest używany
- [ ] Composite indexes używane w sortowaniu
- [ ] Query time p95 < 300ms
- [ ] Response gzip compression aktywna
- [ ] Caching strategy zdefiniowana

### Monitoring
- [ ] Logging dla wszystkich error cases
- [ ] Performance metrics zbierane
- [ ] Alert setup dla query duration > 500ms
- [ ] Database connection pool monitoring

### Dokumentacja
- [ ] API endpoint documentation complete
- [ ] Type definitions eksportowane
- [ ] Service layer functions documented
- [ ] Error codes documented

---

## 11. Potencjalne rozszerzenia (Post-MVP)

1. **Cursor-based Pagination**: Dla lepszej performance z dużymi offsetami
2. **Redis Caching**: Application-level cache dla popularnych queries
3. **Advanced Filtering**: Filtrowanie po wind_speed, rain_mm
4. **Recommendations**: "Similar outfits to yours"
5. **Favorites**: Users can save favorite community outfits
6. **Comments**: Simple rating/comments on community outfits
7. **Geohash Clustering**: Group nearby outfits for map display
8. **Real-time Updates**: WebSocket dla live feed

---

## 12. Znane ograniczenia

1. **Offset Pagination**: Performance degraduje dla offset > 500 (mitigation: cursor-based w przyszłości)
2. **Eventual Consistency**: Denormalized data w shared_outfits (reputation_badge może być stale max 1 min)
3. **No Caching**: MVP nie ma application-level cache (add Redis post-MVP)
4. **Spatial Precision**: Geography type ma precision ~1m (sufficient dla MVP)
5. **Time Range Max**: 168h (7 dni) limit (balance między relevance a results count)

---

## 13. FAQ dla deweloperów

**Q: Dlaczego używamy RPC function zamiast bezpośredniego query?**
A: PostGIS spatial queries są złożone i wymagają SECURITY DEFINER permissions. RPC function pozwala na enkapsulację logiki i optymalizację.

**Q: Czy potrzebujemy osobnego count query?**
A: Tak, dla performance. COUNT(*) z LIMIT jest szybkie, a pozwala obliczyć `has_more` flag.

**Q: Co jeśli radius search nie zwróci wyników?**
A: Zwracamy pustą tablicę `[]` ze statusem 200. To nie jest error.

**Q: Jak obsługujemy multiple sort criteria?**
A: Primary sort według parametru `sort`, secondary sort zawsze po `created_at DESC`.

**Q: Co z cache invalidation?**
A: MVP używa TTL-based (5 min). Post-MVP: invalidate on INSERT do shared_outfits.

**Q: Czy user może widzieć własne shared outfits?**
A: Tak, RLS policy pozwala SELECT all authenticated users.

---

**Ostatnia aktualizacja:** 2025-10-10  
**Status:** Ready for Implementation  
**Estymowany czas implementacji:** 8-12 godzin

