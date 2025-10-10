# API Endpoint Implementation Plan: Weather Forecast

## Analysis

### Kluczowe punkty specyfikacji:
- **Endpoint:** GET /api/weather/forecast
- **Cel:** Zwrócenie 7-dniowej prognozy pogody dla określonej lokalizacji użytkownika
- **Format odpowiedzi:** JSON z tablicą `forecast` zawierającą obiekty z danymi pogodowymi dla każdego dnia
- **Integracja:** OpenWeather API (Free Tier - 1000 calls/day)
- **Caching:** 6 godzin TTL w tabeli `weather_cache` (kolumna `forecast_data`)

### Wymagane i opcjonalne parametry:
**Wymagane:**
- `location_id` (query param): UUID - identyfikator lokalizacji użytkownika

**Opcjonalne:**
- Brak

### Niezbędne typy:
Z pliku `types.ts`:
- `ForecastDTO` (lines 256-258) - główna struktura odpowiedzi
- `ForecastDayDTO` (lines 244-254) - struktura pojedynczego dnia prognozy
- Typ dla query params (do utworzenia):
  ```typescript
  export interface GetForecastParams {
    location_id: string;
  }
  ```

### Ekstrakcja logiki do serwisu:
Należy utworzyć dedykowany serwis: `src/services/weather.service.ts` z następującymi metodami:
- `getForecastByLocation(locationId: string, userId: string): Promise<ForecastDTO>`
- `fetchForecastFromAPI(lat: number, lon: number): Promise<ForecastDTO>` (private)
- `getCachedForecast(locationKey: string): Promise<ForecastDTO | null>` (private)
- `cacheForecast(locationKey: string, forecast: ForecastDTO): Promise<void>` (private)
- `generateLocationKey(city: string, countryCode: string): string` (private)

### Walidacja danych wejściowych:
1. **Autentykacja:** Weryfikacja tokenu JWT z Supabase Auth
2. **location_id:**
   - Format: Valid UUID v4
   - Przynależność: Lokalizacja musi należeć do zalogowanego użytkownika (weryfikacja przez RLS lub explicit query)
   - Istnienie: Lokalizacja musi istnieć w tabeli `user_locations`
3. **Rate limiting:** Max 50 weather queries per user per hour (zgodnie z api-plan.md)

### Potencjalne zagrożenia bezpieczeństwa:
1. **IDOR (Insecure Direct Object Reference):** Użytkownik może próbować odczytać prognozy dla lokalizacji innych użytkowników - **mitygacja:** Weryfikacja ownership przez RLS lub explicit WHERE clause
2. **DoS przez nadużycie API:** Wyczerpanie limitu OpenWeather API (1000 calls/day) - **mitygacja:** Agresywny caching (6h TTL), rate limiting per user
3. **Injection attacks:** SQL injection przez nieprawidłowo sanityzowany UUID - **mitygacja:** Używanie parametryzowanych queries przez Supabase SDK
4. **Token hijacking:** Kradzież JWT tokenu - **mitygacja:** Krótsza ważność tokenów (1h), refresh token rotation
5. **Privacy leak:** Eksponowanie dokładnych współrzędnych innych użytkowników - **mitygacja:** Shared cache używa zaokrąglonych współrzędnych lub city_country key

### Scenariusze błędów i kody statusu:
| Kod | Scenariusz | Message | Details |
|-----|-----------|---------|---------|
| 400 | Invalid UUID format | "Invalid location_id format" | `{ "field": "location_id", "message": "Must be valid UUID" }` |
| 401 | Brak tokenu JWT / wygasły token | "Authentication required" | `{ "code": "UNAUTHORIZED" }` |
| 404 | Lokalizacja nie istnieje | "Location not found" | `{ "code": "NOT_FOUND", "resource": "location" }` |
| 404 | Lokalizacja należy do innego użytkownika | "Location not found" | Nie ujawniamy że istnieje - security by obscurity |
| 429 | Rate limit exceeded | "Too many requests" | `{ "code": "RATE_LIMITED", "retry_after": 3600 }` |
| 500 | Błąd zapytania do bazy danych | "Internal server error" | `{ "code": "INTERNAL_ERROR" }` (logowane do Sentry) |
| 503 | OpenWeather API niedostępne | "Weather service unavailable" | `{ "code": "SERVICE_UNAVAILABLE", "service": "weather_api" }` |

---

## 1. Przegląd punktu końcowego

**Endpoint:** GET /api/weather/forecast

**Cel biznesowy:**
Umożliwienie użytkownikom planowania treningów rowerowych na najbliższy tydzień poprzez dostarczenie szczegółowej prognozy pogody wraz z szybkimi rekomendacjami stroju dla każdego dnia. Endpoint wspiera feature "Tygodniowego Planera Treningów" w aplikacji CycleGear MVP.

**Kluczowe funkcjonalności:**
- Zwraca prognozę pogody na 7 dni dla wybranej lokalizacji użytkownika
- Dla każdego dnia dostarcza: temperaturę min/max, wiatr, opady, opis pogody, quick recommendation
- Wykorzystuje agresywny caching (6h TTL) aby zmniejszyć użycie zewnętrznego API
- Wspiera wielolokalizacyjność użytkownika (dom, praca, weekend spots)
- Integruje się z OpenWeather API 7-Day Forecast

**Stack technologiczny:**
- **Framework:** Astro (Server Endpoints) - `src/pages/api/weather/forecast.ts`
- **BaaS:** Supabase (PostgreSQL + Auth + RLS)
- **External API:** OpenWeather API (Free Tier)
- **Caching:** PostgreSQL `weather_cache` table (JSONB column `forecast_data`)
- **TypeScript:** strict mode
- **Validation:** Zod schemas

---

## 2. Szczegóły żądania

**Metoda HTTP:** GET  
**Struktura URL:** `/api/weather/forecast`  
**Content-Type:** application/json

### Query Parameters:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| location_id | string (UUID) | ✅ Yes | Valid UUID v4 | ID lokalizacji użytkownika z tabeli `user_locations` |

### Headers:
```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

### Request Example:
```
GET /api/weather/forecast?location_id=f47ac10b-58cc-4372-a567-0e02b2c3d479
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Zod Validation Schema:
```typescript
import { z } from 'zod';

export const GetForecastParamsSchema = z.object({
  location_id: z.string().uuid({ message: "location_id must be valid UUID" })
});
```

---

## 3. Wykorzystywane typy

### Istniejące typy z `types.ts`:

```typescript
/**
 * Single day forecast data
 */
export interface ForecastDayDTO {
  date: string;                    // ISO 8601 format: "2025-10-11"
  temperature_min: number;         // Celsius (metric) or Fahrenheit (imperial)
  temperature_max: number;         // Celsius (metric) or Fahrenheit (imperial)
  wind_speed: number;              // km/h (metric) or mph (imperial)
  rain_mm: number;                 // Millimeters (always mm, not converted)
  description: string;             // Human-readable weather description
  quick_recommendation: string;    // Simple recommendation for outfit planning
}

/**
 * 7-day weather forecast
 */
export interface ForecastDTO {
  forecast: ForecastDayDTO[];      // Array of 7 days
}
```

### Nowe typy do utworzenia w `types.ts`:

```typescript
/**
 * Query parameters for GET /api/weather/forecast
 */
export interface GetForecastParams {
  location_id: string;
}
```

### Typy wewnętrzne serwisu (nie eksportowane):

```typescript
// OpenWeather API response structure (dla 7-day forecast)
interface OpenWeatherForecastResponse {
  daily: Array<{
    dt: number;                    // Unix timestamp
    temp: {
      min: number;
      max: number;
    };
    wind_speed: number;
    rain?: number;                 // Optional, may not exist
    weather: Array<{
      description: string;
    }>;
  }>;
}

// Weather cache row structure
interface WeatherCacheRow {
  id: string;
  location_key: string;
  forecast_data: ForecastDTO | null;
  expires_at: string;              // ISO timestamp
  updated_at: string;
}
```

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK):
```json
{
  "forecast": [
    {
      "date": "2025-10-11",
      "temperature_min": 5,
      "temperature_max": 15,
      "wind_speed": 10,
      "rain_mm": 2.5,
      "description": "light rain",
      "quick_recommendation": "Long sleeves, rain jacket recommended"
    },
    {
      "date": "2025-10-12",
      "temperature_min": 8,
      "temperature_max": 18,
      "wind_speed": 5,
      "rain_mm": 0,
      "description": "clear sky",
      "quick_recommendation": "Perfect conditions - short or long sleeves"
    },
    // ... 5 more days
  ]
}
```

### Error Responses:

#### 400 Bad Request - Invalid UUID:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid location_id format",
    "details": [
      {
        "field": "location_id",
        "message": "Must be valid UUID"
      }
    ]
  }
}
```

#### 401 Unauthorized:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

#### 404 Not Found - Location doesn't exist or doesn't belong to user:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Location not found",
    "resource": "location"
  }
}
```

#### 429 Too Many Requests:
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "retry_after": 3600
  }
}
```

#### 503 Service Unavailable - OpenWeather API down:
```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Weather service temporarily unavailable",
    "service": "weather_api"
  }
}
```

---

## 5. Przepływ danych

```mermaid
sequenceDiagram
    participant Client
    participant AstroEndpoint as Astro Endpoint<br/>/api/weather/forecast.ts
    participant Auth as Supabase Auth
    participant DB as Supabase DB<br/>(user_locations, weather_cache)
    participant WeatherService as WeatherService
    participant OpenWeatherAPI as OpenWeather API

    Client->>AstroEndpoint: GET /api/weather/forecast?location_id=xxx
    AstroEndpoint->>Auth: Verify JWT token
    
    alt Token invalid/expired
        Auth-->>AstroEndpoint: 401 Unauthorized
        AstroEndpoint-->>Client: 401 Error Response
    end

    Auth-->>AstroEndpoint: User authenticated (userId)
    
    AstroEndpoint->>AstroEndpoint: Validate location_id (Zod)
    
    alt Validation fails
        AstroEndpoint-->>Client: 400 Bad Request
    end

    AstroEndpoint->>DB: SELECT location FROM user_locations<br/>WHERE id = location_id AND user_id = userId
    
    alt Location not found
        DB-->>AstroEndpoint: Empty result
        AstroEndpoint-->>Client: 404 Not Found
    end

    DB-->>AstroEndpoint: Location data (lat, lon, city, country_code)
    
    AstroEndpoint->>WeatherService: getForecastByLocation(locationId, userId)
    
    WeatherService->>WeatherService: generateLocationKey(city, country_code)
    WeatherService->>DB: SELECT forecast_data, expires_at<br/>FROM weather_cache<br/>WHERE location_key = key
    
    alt Cache HIT and not expired
        DB-->>WeatherService: Cached forecast_data
        WeatherService-->>AstroEndpoint: ForecastDTO (from cache)
        AstroEndpoint-->>Client: 200 OK with forecast
    end

    alt Cache MISS or expired
        DB-->>WeatherService: No valid cache
        WeatherService->>OpenWeatherAPI: GET /data/3.0/onecall<br/>?lat={lat}&lon={lon}&exclude=current,minutely,hourly
        
        alt API call fails
            OpenWeatherAPI-->>WeatherService: Error / Timeout
            WeatherService-->>AstroEndpoint: Throw ServiceUnavailableError
            AstroEndpoint-->>Client: 503 Service Unavailable
        end
        
        OpenWeatherAPI-->>WeatherService: 7-day forecast data
        WeatherService->>WeatherService: Transform to ForecastDTO
        WeatherService->>WeatherService: Generate quick_recommendation per day
        WeatherService->>DB: UPSERT weather_cache<br/>SET forecast_data = data,<br/>expires_at = now() + 6 hours
        DB-->>WeatherService: Success
        WeatherService-->>AstroEndpoint: ForecastDTO
        AstroEndpoint-->>Client: 200 OK with forecast
    end
```

### Kluczowe kroki przepływu:

1. **Autentykacja** (Supabase Auth):
   - Weryfikacja JWT tokenu z header `Authorization`
   - Ekstrakcja `userId` z tokenu

2. **Walidacja parametrów** (Zod):
   - Sprawdzenie formatu UUID dla `location_id`

3. **Autoryzacja i pobranie lokalizacji** (Supabase DB):
   - Weryfikacja że lokalizacja należy do użytkownika (RLS lub explicit WHERE)
   - Pobranie współrzędnych (lat, lon), city, country_code

4. **Sprawdzenie cache** (Supabase DB - weather_cache):
   - Generowanie `location_key` = `${city}_${country_code.toLowerCase()}` (np. "warsaw_pl")
   - Query: `SELECT forecast_data, expires_at FROM weather_cache WHERE location_key = ? AND expires_at > NOW()`
   
5. **Cache HIT:**
   - Zwrócenie zapisanej prognozy bez wywołania external API

6. **Cache MISS / Expired:**
   - Wywołanie OpenWeather API (endpoint: `/data/3.0/onecall` lub `/data/2.5/forecast/daily`)
   - Transformacja odpowiedzi do `ForecastDTO`
   - Generowanie `quick_recommendation` dla każdego dnia (rule-based logic)
   - Zapisanie do cache z `expires_at = NOW() + INTERVAL '6 hours'`

7. **Zwrócenie odpowiedzi:**
   - Format JSON zgodny z `ForecastDTO`

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja
**Mechanizm:** Supabase Auth JWT tokens

**Implementacja:**
```typescript
// src/pages/api/weather/forecast.ts
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request, locals }) => {
  // Extract JWT token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // User authenticated, proceed...
};
```

### 6.2 Autoryzacja
**Strategia:** Row Level Security (RLS) na poziomie bazy + explicit ownership check

**RLS Policy (już wdrożona w migracji):**
```sql
-- Policy: Users can only read their own locations
CREATE POLICY "users_read_own_locations" ON user_locations
  FOR SELECT
  USING (auth.uid() = user_id);
```

**Explicit Check w serwisie:**
```typescript
// src/services/weather.service.ts
async function verifyLocationOwnership(
  supabase: SupabaseClient,
  locationId: string,
  userId: string
): Promise<LocationRow | null> {
  const { data, error } = await supabase
    .from('user_locations')
    .select('id, location, city, country_code')
    .eq('id', locationId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null; // Location not found or doesn't belong to user
  }

  return data;
}
```

### 6.3 Walidacja danych wejściowych
**Narzędzie:** Zod schemas

**Schema:**
```typescript
import { z } from 'zod';

export const GetForecastParamsSchema = z.object({
  location_id: z.string().uuid({ message: "location_id must be valid UUID" })
});

// Usage in endpoint:
const url = new URL(request.url);
const params = {
  location_id: url.searchParams.get('location_id')
};

const validation = GetForecastParamsSchema.safeParse(params);
if (!validation.success) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### 6.4 Rate Limiting
**Strategia:** Application-level rate limiting (opcjonalnie: Cloudflare Rate Limiting)

**Implementacja (opcjonalna dla MVP):**
```typescript
// src/middleware/rateLimiter.ts
import { Redis } from '@upstash/redis'; // Opcjonalnie: Upstash Redis for rate limiting

async function checkRateLimit(userId: string, endpoint: string): Promise<boolean> {
  // Simple implementation: track requests per user per hour
  // For MVP: Skip implementation, rely on OpenWeather API cache
  // For production: Use Redis with sliding window
  return true; // Allow all requests for MVP
}
```

**Limity zgodne z api-plan.md:**
- Weather queries: **50 per user per hour**
- OpenWeather API: **1000 calls per day** (shared across all users) - mitygowane przez 6h cache

### 6.5 Bezpieczeństwo danych wrażliwych
**Ochrona API Keys:**
```typescript
// .env (nigdy nie commitować!)
OPENWEATHER_API_KEY=xxx
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx

// astro.config.mjs
export default defineConfig({
  // Env vars nie są eksponowane do client-side
});
```

**Przechowywanie w cache:**
- Cache w `weather_cache` jest współdzielony per `location_key` (city_country)
- Nie zawiera user-specific data
- Nie eksponuje dokładnych współrzędnych (używamy city-level key)

### 6.6 CORS Policy
```typescript
// astro.config.mjs
export default defineConfig({
  // CORS handled by Astro + Cloudflare
  // For MVP: Same-origin only (no CORS needed)
  // For production: Whitelist specific domains
});
```

---

## 7. Obsługa błędów

### 7.1 Error Handling Strategy

**Podejście:** Centralized error handling with typed error classes

**Error Classes:**
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
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details: any[]) {
    super('VALIDATION_ERROR', 'Invalid input data', 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404, { resource });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('RATE_LIMITED', 'Too many requests', 429, { retry_after: retryAfter });
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', `${service} temporarily unavailable`, 503, { service });
    this.name = 'ServiceUnavailableError';
  }
}
```

### 7.2 Error Handling w Endpoint

```typescript
// src/pages/api/weather/forecast.ts

export const GET: APIRoute = async ({ request }) => {
  try {
    // Authentication
    const user = await authenticateRequest(request);
    if (!user) {
      throw new UnauthorizedError();
    }

    // Validation
    const params = validateQueryParams(request);

    // Business logic
    const forecast = await weatherService.getForecastByLocation(
      params.location_id,
      user.id
    );

    return new Response(
      JSON.stringify(forecast),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Handle known errors
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            ...(error.details && { details: error.details })
          }
        }),
        { 
          status: error.statusCode, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle unknown errors
    console.error('Unexpected error in /api/weather/forecast:', error);
    // TODO: Send to Sentry in production

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
};
```

### 7.3 Error Scenarios - Szczegółowa tabela

| Scenariusz | Error Class | Status | Response Code | Client Action |
|------------|-------------|--------|---------------|---------------|
| Brak header Authorization | UnauthorizedError | 401 | UNAUTHORIZED | Redirect to login |
| Wygasły JWT token | UnauthorizedError | 401 | UNAUTHORIZED | Refresh token or re-login |
| Nieprawidłowy format UUID | ValidationError | 400 | VALIDATION_ERROR | Show validation error on form |
| location_id nie istnieje | NotFoundError | 404 | NOT_FOUND | Show "Location not found" message |
| location_id należy do innego usera | NotFoundError | 404 | NOT_FOUND | Same as above (security by obscurity) |
| Rate limit exceeded (user) | RateLimitError | 429 | RATE_LIMITED | Show retry-after countdown |
| OpenWeather API down/timeout | ServiceUnavailableError | 503 | SERVICE_UNAVAILABLE | Show "Try again later" + fallback to cached data if available |
| OpenWeather API rate limit | ServiceUnavailableError | 503 | SERVICE_UNAVAILABLE | Same as above |
| Database connection error | AppError | 500 | INTERNAL_ERROR | Show generic error + log to Sentry |
| Unexpected exception | AppError | 500 | INTERNAL_ERROR | Same as above |

### 7.4 Logging Strategy

**Development:**
```typescript
console.error('Error details:', {
  error: error.message,
  stack: error.stack,
  userId,
  locationId,
  timestamp: new Date().toISOString()
});
```

**Production:**
```typescript
// Integration with Sentry (future)
import * as Sentry from '@sentry/astro';

Sentry.captureException(error, {
  tags: {
    endpoint: '/api/weather/forecast',
    userId,
    locationId
  },
  level: 'error'
});
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Caching Strategy

**Cache Level 1: Database Cache (weather_cache table)**
- **TTL:** 6 hours (zgodnie z tech-stack.md)
- **Key:** `location_key` = `${city}_${country_code}` (np. "warsaw_pl")
- **Rationale:** Pogoda dla tego samego miasta jest identyczna dla wszystkich użytkowników - shared cache
- **Savings:** Redukuje wywołania OpenWeather API z potencjalnie tysięcy do ~4 per miasto per 24h

```typescript
// src/services/weather.service.ts
async function getCachedForecast(
  supabase: SupabaseClient,
  locationKey: string
): Promise<ForecastDTO | null> {
  const { data, error } = await supabase
    .from('weather_cache')
    .select('forecast_data, expires_at')
    .eq('location_key', locationKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data || !data.forecast_data) {
    return null; // Cache MISS or expired
  }

  return data.forecast_data as ForecastDTO;
}

async function cacheForecast(
  supabase: SupabaseClient,
  locationKey: string,
  forecast: ForecastDTO
): Promise<void> {
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // +6 hours

  await supabase
    .from('weather_cache')
    .upsert({
      location_key: locationKey,
      forecast_data: forecast,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'location_key' });
}
```

**Cache Level 2: Client-side Cache (opcjonalnie)**
- **TTL:** 30 minutes
- **Storage:** localStorage or React Query cache
- **Implementation:** Client-side (poza scope tego planu)

### 8.2 Database Optimization

**Index na weather_cache:**
```sql
-- Już zaimplementowane w migracji 20251009000300_weather_cache.sql
CREATE UNIQUE INDEX idx_weather_cache_location_key ON weather_cache(location_key);
CREATE INDEX idx_weather_cache_valid ON weather_cache(location_key, expires_at);
CREATE INDEX idx_weather_cache_expires ON weather_cache(expires_at);
```

**Query Optimization:**
- **Location lookup:** Index na `user_locations(user_id, id)` - już istnieje (RLS policy)
- **Cache lookup:** Composite index `(location_key, expires_at)` - szybkie sprawdzenie ważności
- **Upsert vs Insert:** Używamy `UPSERT` z `onConflict` aby uniknąć duplicates

### 8.3 External API Call Optimization

**OpenWeather API Configuration:**
```typescript
// src/services/weather.service.ts
const OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/forecast/daily';
const OPENWEATHER_TIMEOUT = 5000; // 5 seconds

async function fetchForecastFromAPI(
  lat: number,
  lon: number
): Promise<ForecastDTO> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENWEATHER_TIMEOUT);

  try {
    const response = await fetch(
      `${OPENWEATHER_API_URL}?lat=${lat}&lon=${lon}&cnt=7&units=metric&appid=${OPENWEATHER_API_KEY}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new ServiceUnavailableError('weather_api');
    }

    const data = await response.json();
    return transformOpenWeatherToForecastDTO(data);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ServiceUnavailableError('weather_api');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Optimization techniques:**
- **Timeout:** 5s limit dla API calls
- **AbortController:** Cancel requests on timeout
- **Error handling:** Graceful degradation - return stale cache if API fails?

### 8.4 Response Size Optimization

**Current response size:** ~500 bytes (7 days × ~70 bytes per day)

**Optimization opportunities:**
- **Compression:** Astro automatically applies gzip/brotli compression
- **Field selection:** Already minimal - no room for reduction
- **Pagination:** Not applicable for 7-day forecast (always return all 7)

### 8.5 Monitoring & Alerts

**Metrics to track:**
1. **Cache hit rate:** Target >90% (indicates effective caching)
2. **Average response time:** Target <100ms (cache hit), <1500ms (cache miss)
3. **OpenWeather API usage:** Track daily calls, alert at 800/1000 (80% quota)
4. **Error rate:** Alert if >5% requests fail

**Implementation (future):**
```typescript
// src/lib/monitoring.ts (future implementation)
export async function trackMetric(metric: string, value: number, tags: Record<string, string>) {
  // Send to Plausible Analytics or custom metrics endpoint
}
```

### 8.6 Scalability Considerations

**Current limitations:**
- **OpenWeather Free Tier:** 1000 calls/day
- **Supabase Free Tier:** 500MB DB storage, 2GB bandwidth/month

**Scaling strategy:**
- **Phase 1 (MVP - 100 users):**
  - 6h cache = max 4 calls per city per day
  - 10 cities × 4 calls = 40 API calls/day ✅ Well within limits
  
- **Phase 2 (1000 users):**
  - ~50 cities × 4 calls = 200 API calls/day ✅ Still OK
  
- **Phase 3 (10K+ users):**
  - Consider paid OpenWeather plan ($40/month for 100K calls)
  - Or switch to alternative API (e.g., Tomorrow.io, Weatherbit)

---

## 9. Etapy wdrożenia

### Step 1: Setup podstawowej struktury ✅
**Files to create:**
- `src/lib/errors.ts` - Error classes
- `src/lib/validation.ts` - Zod schemas
- `src/services/weather.service.ts` - Weather service logic

**Tasks:**
1. Create error classes (ValidationError, UnauthorizedError, etc.)
2. Define Zod schema for `GetForecastParams`
3. Add type `GetForecastParams` to `src/types.ts`

**Estimated time:** 30 minutes

---

### Step 2: Implementacja Weather Service ✅
**File:** `src/services/weather.service.ts`

**Methods to implement:**
```typescript
export class WeatherService {
  constructor(private supabase: SupabaseClient, private apiKey: string) {}

  // Main public method
  async getForecastByLocation(locationId: string, userId: string): Promise<ForecastDTO>

  // Private helper methods
  private async verifyLocationOwnership(locationId: string, userId: string): Promise<LocationRow>
  private generateLocationKey(city: string, countryCode: string): string
  private async getCachedForecast(locationKey: string): Promise<ForecastDTO | null>
  private async fetchForecastFromAPI(lat: number, lon: number): Promise<ForecastDTO>
  private async cacheForecast(locationKey: string, forecast: ForecastDTO): Promise<void>
  private transformOpenWeatherResponse(apiData: any): ForecastDTO
  private generateQuickRecommendation(temp: number, rain: number, wind: number): string
}
```

**Quick Recommendation Logic (rule-based):**
```typescript
private generateQuickRecommendation(
  tempMin: number,
  tempMax: number,
  rain: number,
  wind: number
): string {
  const avgTemp = (tempMin + tempMax) / 2;
  
  let recommendation = '';

  // Temperature guidance
  if (avgTemp < 5) {
    recommendation += 'Full winter gear recommended';
  } else if (avgTemp < 10) {
    recommendation += 'Long sleeves and jacket';
  } else if (avgTemp < 15) {
    recommendation += 'Long sleeves recommended';
  } else if (avgTemp < 20) {
    recommendation += 'Short or long sleeves';
  } else {
    recommendation += 'Perfect for short sleeves';
  }

  // Rain guidance
  if (rain > 10) {
    recommendation += ', heavy rain gear required';
  } else if (rain > 2) {
    recommendation += ', rain jacket recommended';
  }

  // Wind guidance
  if (wind > 30) {
    recommendation += ', strong wind protection needed';
  } else if (wind > 20) {
    recommendation += ', windproof layer advised';
  }

  return recommendation;
}
```

**Estimated time:** 2-3 hours

---

### Step 3: Implementacja Astro Endpoint ✅
**File:** `src/pages/api/weather/forecast.ts`

**Structure:**
```typescript
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { WeatherService } from '../../../services/weather.service';
import { GetForecastParamsSchema } from '../../../lib/validation';
import { UnauthorizedError, ValidationError, NotFoundError } from '../../../lib/errors';

export const GET: APIRoute = async ({ request }) => {
  try {
    // 1. Authentication
    const user = await authenticateRequest(request);

    // 2. Validation
    const params = validateParams(request);

    // 3. Business Logic
    const weatherService = new WeatherService(supabase, import.meta.env.OPENWEATHER_API_KEY);
    const forecast = await weatherService.getForecastByLocation(params.location_id, user.id);

    // 4. Response
    return new Response(JSON.stringify(forecast), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    // Error handling (see section 7.2)
    return handleError(error);
  }
};

// Helper functions
async function authenticateRequest(request: Request) { /* ... */ }
function validateParams(request: Request) { /* ... */ }
function handleError(error: unknown) { /* ... */ }
```

**Estimated time:** 1-2 hours

---

### Step 4: Dodanie zmiennych środowiskowych ✅
**File:** `.env` (local), Cloudflare Pages dashboard (production)

```bash
# OpenWeather API
OPENWEATHER_API_KEY=your_api_key_here

# Supabase (already exists)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
```

**Update `src/env.d.ts`:**
```typescript
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly OPENWEATHER_API_KEY: string;
}
```

**Estimated time:** 15 minutes

---

### Step 5: Unit Tests (opcjonalnie dla MVP) ⚠️
**File:** `src/services/weather.service.test.ts`

**Test cases:**
- ✅ Cache HIT: Returns cached forecast without API call
- ✅ Cache MISS: Calls API and caches result
- ✅ Location ownership: Throws NotFoundError for wrong user
- ✅ Invalid UUID: Throws ValidationError
- ✅ API timeout: Throws ServiceUnavailableError
- ✅ Quick recommendation generation: Correct recommendations for various conditions

**Framework:** Vitest + MSW (Mock Service Worker) for API mocking

**Estimated time:** 2-3 hours (skip for MVP, implement in Phase 2)

---

### Step 6: Integration Testing ✅
**Manual testing checklist:**

1. **Happy path - Cache MISS:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4321/api/weather/forecast?location_id=$LOCATION_ID"
   ```
   Expected: 200 OK with 7-day forecast

2. **Happy path - Cache HIT:**
   - Run same request again within 6 hours
   - Expected: Instant response (<50ms)

3. **Error: Invalid UUID:**
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:4321/api/weather/forecast?location_id=invalid"
   ```
   Expected: 400 Bad Request with validation error

4. **Error: No auth token:**
   ```bash
   curl "http://localhost:4321/api/weather/forecast?location_id=$LOCATION_ID"
   ```
   Expected: 401 Unauthorized

5. **Error: Location not found:**
   - Use UUID that doesn't exist
   - Expected: 404 Not Found

6. **Error: Location belongs to another user:**
   - Use location ID from different user
   - Expected: 404 Not Found (not 403 - security by obscurity)

**Estimated time:** 1 hour

---

### Step 7: Documentation Updates ✅
**Files to update:**
1. **README.md:** Add section about Weather Forecast endpoint
2. **API Plan:** Already documented in `.ai/api-plan.md` lines 222-246 ✅
3. **Environment setup guide:** Document OPENWEATHER_API_KEY requirement

**Estimated time:** 30 minutes

---

### Step 8: Deployment Preparation ✅
**Pre-deployment checklist:**
- [ ] Add OPENWEATHER_API_KEY to Cloudflare Pages environment variables
- [ ] Verify Supabase RLS policies are enabled in production
- [ ] Test with production Supabase instance
- [ ] Monitor OpenWeather API usage (setup alerts at 80% quota)
- [ ] Configure Sentry error tracking (optional for MVP)
- [ ] Add endpoint to monitoring dashboard

**Deployment steps:**
1. Push to main branch
2. GitHub Actions auto-deploys to Cloudflare Pages
3. Run smoke tests on production
4. Monitor error rates for first 24h

**Estimated time:** 1 hour

---

### **Total Estimated Implementation Time:** 8-10 hours
**Priority:** High (required for Week 7-day Forecast feature)
**Dependencies:** 
- OpenWeather API account and key
- Supabase instance with migrations applied
- User locations feature implemented

---

## 10. Checklist wdrożenia

### Pre-implementation:
- [ ] OpenWeather API account created
- [ ] API key obtained and stored in .env
- [ ] Database migrations applied (weather_cache table exists)
- [ ] TypeScript types reviewed

### Implementation:
- [ ] Error classes created (`src/lib/errors.ts`)
- [ ] Zod validation schemas created (`src/lib/validation.ts`)
- [ ] Weather service implemented (`src/services/weather.service.ts`)
- [ ] Astro endpoint created (`src/pages/api/weather/forecast.ts`)
- [ ] Environment variables configured
- [ ] Type definitions updated (`src/types.ts`)

### Testing:
- [ ] Manual testing completed (all 6 scenarios)
- [ ] Cache behavior verified (HIT and MISS)
- [ ] Error responses validated
- [ ] Performance tested (response times <100ms cache, <1500ms API)

### Documentation:
- [ ] README updated with Weather Forecast section
- [ ] Environment setup documented
- [ ] API examples added

### Deployment:
- [ ] Environment variables set in Cloudflare Pages
- [ ] Production deployment successful
- [ ] Smoke tests passed
- [ ] Monitoring configured

---

## 11. Potencjalne problemy i rozwiązania

| Problem | Symptom | Solution |
|---------|---------|----------|
| **OpenWeather API quota exceeded** | 503 errors after 1000 calls | Implement user-facing message + return stale cache data (>6h old) as fallback |
| **Cache not working** | Every request calls API | Check `expires_at` logic, verify timezone handling (use UTC) |
| **Slow response times** | Consistent >2s responses | Add timeout to API calls (5s), investigate database query performance |
| **Location key collisions** | Wrong forecast for city | Review `generateLocationKey` logic - ensure uniqueness (add country code) |
| **JWT token issues in production** | 401 errors on valid tokens | Verify SUPABASE_URL and SUPABASE_ANON_KEY in Cloudflare env vars |
| **CORS errors (if adding web client)** | Blocked by browser | Configure CORS in Astro middleware for production domain |
| **High database storage usage** | Approaching 500MB limit | Implement cleanup job for expired cache (older than 7 days) |

---

## 12. Przyszłe ulepszenia (Post-MVP)

### Phase 2 (After MVP launch):
1. **Hourly Forecast:** Add endpoint for 48-hour hourly forecast
2. **Weather Alerts:** Integrate severe weather warnings (storms, heat waves)
3. **Radar/Maps:** Add precipitation radar visualization
4. **Favorite Locations:** Quick access to frequently checked locations
5. **Push Notifications:** Send alerts for significant weather changes

### Phase 3 (Scaling):
1. **Alternative Weather APIs:** Integrate backup APIs (Tomorrow.io) for redundancy
2. **Improved Recommendations:** Use ML model for more accurate outfit suggestions
3. **Historical Data:** Store historical weather for analytics
4. **API Rate Limiting:** Implement Redis-based distributed rate limiting
5. **CDN Caching:** Add Cloudflare edge caching for ultra-fast responses

---

## Appendix A: OpenWeather API Integration Details

### API Endpoint:
```
GET https://api.openweathermap.org/data/2.5/forecast/daily
```

### Parameters:
- `lat`: Latitude (required)
- `lon`: Longitude (required)
- `cnt`: Number of days (7 for our use case)
- `units`: metric (Celsius) or imperial (Fahrenheit)
- `appid`: API key (required)

### Response Structure (simplified):
```json
{
  "list": [
    {
      "dt": 1697011200,
      "temp": {
        "min": 5.2,
        "max": 15.8
      },
      "speed": 10.5,
      "rain": 2.5,
      "weather": [
        {
          "description": "light rain"
        }
      ]
    }
  ]
}
```

### Rate Limits:
- **Free Tier:** 1000 calls/day, 60 calls/minute
- **Response Time:** Typically 200-500ms
- **Availability:** 99.9% uptime SLA

### Error Responses:
- `401`: Invalid API key
- `404`: Location not found
- `429`: Rate limit exceeded
- `500`: Server error

---

## Appendix B: Quick Reference - Kody statusu

| Status | Nazwa | Kiedy używać |
|--------|-------|--------------|
| 200 | OK | Sukces - zwrócono prognozę |
| 400 | Bad Request | Nieprawidłowy format location_id |
| 401 | Unauthorized | Brak lub nieprawidłowy token JWT |
| 404 | Not Found | Lokalizacja nie istnieje lub nie należy do użytkownika |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Niespodziewany błąd serwera |
| 503 | Service Unavailable | OpenWeather API niedostępne |

---

**Document Version:** 1.0  
**Last Updated:** October 10, 2025  
**Author:** AI Architecture Assistant  
**Status:** Ready for Implementation  
**Related Documents:**
- `.ai/api-plan.md` (lines 222-246) - Original endpoint specification
- `.ai/tech-stack.md` - Technology stack overview
- `src/types.ts` - Type definitions
- `supabase/migrations/20251009000300_weather_cache.sql` - Database schema

