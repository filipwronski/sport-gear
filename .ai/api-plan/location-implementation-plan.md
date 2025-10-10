# API Endpoint Implementation Plan: Location Management

## 1. Przegląd punktu końcowego

Moduł Location Management zarządza wieloma lokalizacjami użytkownika (dom, praca, weekendy), które są używane do pobierania danych pogodowych oraz spatial queries społeczności. System wspiera jedną domyślną lokalizację na użytkownika i wykorzystuje PostGIS do przechowywania współrzędnych geograficznych z dokładnością ~100m dla privacy.

**Główne funkcjonalności:**
- Pobieranie listy lokalizacji użytkownika z filtrowaniem na domyślną
- Dodawanie nowych lokalizacji z automatyczną konwersją do PostGIS GEOGRAPHY
- Aktualizacja lokalizacji (partial update) z zarządzaniem domyślnej lokalizacji
- Usuwanie lokalizacji z zabezpieczeniami biznesowymi (ostatnia/domyślna)

## 2. Szczegóły żądania

### GET /api/locations

**Metoda HTTP:** GET  
**Struktura URL:** `/api/locations`

**Query Parameters:**
- Opcjonalne:
  - `default_only` (boolean) - zwraca tylko domyślną lokalizację

**Request Body:** Brak

**Przykład:**
```
GET /api/locations?default_only=true
Authorization: Bearer {supabase_session_token}
```

---

### POST /api/locations

**Metoda HTTP:** POST  
**Struktura URL:** `/api/locations`

**Query Parameters:** Brak

**Request Body:** JSON (CreateLocationCommand)
```json
{
  "latitude": 52.237,
  "longitude": 21.017,
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": false,
  "label": "Work"
}
```

**Parametry:**
- Wymagane:
  - `latitude` (number): -90 do 90, zaokrąglone do 3 miejsc po przecinku
  - `longitude` (number): -180 do 180, zaokrąglone do 3 miejsc po przecinku
  - `city` (string): 1-100 znaków
  - `country_code` (string): 2 znaki, ISO 3166-1 alpha-2 uppercase
- Opcjonalne:
  - `is_default` (boolean): czy ustawić jako domyślną (default: false)
  - `label` (string): 1-50 znaków, etykieta dla użytkownika

---

### PUT /api/locations/{id}

**Metoda HTTP:** PUT  
**Struktura URL:** `/api/locations/{id}`

**Path Parameters:**
- `id` (UUID) - identyfikator lokalizacji

**Request Body:** JSON (UpdateLocationCommand) - wszystkie pola opcjonalne
```json
{
  "latitude": 52.240,
  "longitude": 21.020,
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": true,
  "label": "Home Updated"
}
```

**Parametry:**
- Opcjonalne (partial update):
  - `latitude` (number)
  - `longitude` (number)
  - `city` (string)
  - `country_code` (string)
  - `is_default` (boolean)
  - `label` (string)

---

### DELETE /api/locations/{id}

**Metoda HTTP:** DELETE  
**Struktura URL:** `/api/locations/{id}`

**Path Parameters:**
- `id` (UUID) - identyfikator lokalizacji

**Request Body:** Brak

## 3. Wykorzystywane typy

### DTO Types (z types.ts):

```typescript
export interface LocationDTO {
  id: string;
  location: Coordinates;
  city: string;
  country_code: string;
  is_default: boolean | null;
  label: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### Command Types (z types.ts):

```typescript
export interface CreateLocationCommand {
  latitude: number;
  longitude: number;
  city: string;
  country_code: string;
  is_default?: boolean;
  label?: string;
}

export interface UpdateLocationCommand {
  latitude?: number;
  longitude?: number;
  city?: string;
  country_code?: string;
  is_default?: boolean;
  label?: string;
}
```

### Database Row Type:

```typescript
type LocationRow = Database['public']['Tables']['user_locations']['Row'];
type LocationInsert = Database['public']['Tables']['user_locations']['Insert'];
```

### Service Layer Types:

```typescript
interface LocationService {
  getUserLocations(userId: string, defaultOnly?: boolean): Promise<LocationDTO[]>;
  createLocation(userId: string, command: CreateLocationCommand): Promise<LocationDTO>;
  updateLocation(userId: string, locationId: string, command: UpdateLocationCommand): Promise<LocationDTO>;
  deleteLocation(userId: string, locationId: string): Promise<void>;
}
```

## 4. Szczegóły odpowiedzi

### GET /api/locations

**Success Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "location": {
      "latitude": 52.237,
      "longitude": 21.017
    },
    "city": "Warsaw",
    "country_code": "PL",
    "is_default": true,
    "label": "Home",
    "created_at": "2025-10-10T12:00:00Z",
    "updated_at": "2025-10-10T12:00:00Z"
  }
]
```

**Error Responses:**
- **401 Unauthorized**: Brak lub nieważna sesja użytkownika
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
  }
  ```

---

### POST /api/locations

**Success Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "location": {
    "latitude": 52.237,
    "longitude": 21.017
  },
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": false,
  "label": "Work",
  "created_at": "2025-10-10T12:00:00Z",
  "updated_at": "2025-10-10T12:00:00Z"
}
```

**Error Responses:**
- **400 Bad Request**: Nieprawidłowy format danych
- **401 Unauthorized**: Brak uwierzytelnienia
- **422 Validation Error**: Nieprawidłowe wartości pól
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "details": [
        {
          "field": "latitude",
          "message": "Latitude must be between -90 and 90"
        },
        {
          "field": "country_code",
          "message": "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)"
        }
      ]
    }
  }
  ```

---

### PUT /api/locations/{id}

**Success Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "location": {
    "latitude": 52.240,
    "longitude": 21.020
  },
  "city": "Warsaw",
  "country_code": "PL",
  "is_default": true,
  "label": "Home Updated",
  "created_at": "2025-10-10T12:00:00Z",
  "updated_at": "2025-10-10T13:30:00Z"
}
```

**Error Responses:**
- **400 Bad Request**: Nieprawidłowy UUID
- **401 Unauthorized**: Brak uwierzytelnienia
- **404 Not Found**: Lokalizacja nie istnieje lub nie należy do użytkownika
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Location not found"
    }
  }
  ```
- **422 Validation Error**: Nieprawidłowe wartości pól

---

### DELETE /api/locations/{id}

**Success Response (204 No Content):**
- Pusta odpowiedź, tylko status 204

**Error Responses:**
- **401 Unauthorized**: Brak uwierzytelnienia
- **404 Not Found**: Lokalizacja nie istnieje
- **409 Conflict**: Nie można usunąć domyślnej lub ostatniej lokalizacji
  ```json
  {
    "error": {
      "code": "CONFLICT",
      "message": "Cannot delete default location. Set another location as default first."
    }
  }
  ```
  lub
  ```json
  {
    "error": {
      "code": "CONFLICT",
      "message": "Cannot delete the last location. User must have at least one location."
    }
  }
  ```

## 5. Przepływ danych

### GET /api/locations

```
1. Request → Astro API Endpoint (/src/pages/api/locations/index.ts)
2. Middleware → Dodaje supabase client do context.locals
3. Auth Check → Pobiera sesję użytkownika z Supabase Auth
4. Validation → Waliduje query param default_only (boolean)
5. Service Call → LocationService.getUserLocations(userId, defaultOnly)
6. Database Query → Supabase:
   - SELECT z user_locations WHERE user_id = $1
   - Opcjonalnie: AND is_default = true
   - RLS automatycznie filtruje do aktualnego użytkownika
7. Data Transformation → Konwersja PostGIS GEOGRAPHY do Coordinates:
   - ST_Y(location::geometry) → latitude
   - ST_X(location::geometry) → longitude
8. Response → Array<LocationDTO> z kodem 200
```

---

### POST /api/locations

```
1. Request → Astro API Endpoint
2. Middleware → Supabase client w context
3. Auth Check → Pobiera userId z sesji
4. Parse Body → JSON.parse() request body
5. Validation → LocationValidator.validateCreateCommand():
   - Sprawdź wymagane pola (latitude, longitude, city, country_code)
   - Waliduj zakresy: lat (-90, 90), lng (-180, 180)
   - Zaokrąglij współrzędne do 3 miejsc po przecinku (privacy)
   - Waliduj country_code (2 znaki, uppercase, regex: ^[A-Z]{2}$)
   - Trim i waliduj city (1-100 znaków)
   - Trim i waliduj label jeśli podane (1-50 znaków)
6. Service Call → LocationService.createLocation(userId, command)
7. Database Transaction:
   a. Jeśli is_default = true:
      - UPDATE user_locations SET is_default = false WHERE user_id = $1 AND is_default = true
   b. INSERT INTO user_locations:
      - user_id: userId
      - location: ST_MakePoint(longitude, latitude)::geography
      - city, country_code, is_default, label
   c. RETURNING * (z transformacją GEOGRAPHY → Coordinates)
8. Response → LocationDTO z kodem 201 i Location header
```

---

### PUT /api/locations/{id}

```
1. Request → Astro API Endpoint (/src/pages/api/locations/[id].ts)
2. Auth Check → Pobiera userId z sesji
3. Parse Params → Walidacja UUID z URL path
4. Parse Body → JSON.parse() request body
5. Validation → LocationValidator.validateUpdateCommand():
   - Waliduj tylko dostarczone pola (partial update)
   - Te same reguły co dla POST
6. Service Call → LocationService.updateLocation(userId, locationId, command)
7. Database Transaction:
   a. SELECT z user_locations WHERE id = $1 AND user_id = $2:
      - Sprawdź czy lokalizacja istnieje (404 jeśli nie)
   b. Jeśli is_default = true w command:
      - UPDATE user_locations SET is_default = false WHERE user_id = $1 AND is_default = true AND id != $2
   c. UPDATE user_locations SET [fields] WHERE id = $1 AND user_id = $2:
      - location: ST_MakePoint(longitude, latitude)::geography (jeśli lat/lng podane)
      - city, country_code, is_default, label (jeśli podane)
      - updated_at = NOW()
   d. RETURNING * (z transformacją)
8. Response → LocationDTO z kodem 200
```

---

### DELETE /api/locations/{id}

```
1. Request → Astro API Endpoint
2. Auth Check → Pobiera userId z sesji
3. Parse Params → Walidacja UUID
4. Service Call → LocationService.deleteLocation(userId, locationId)
5. Database Transaction:
   a. SELECT FROM user_locations WHERE user_id = $1:
      - COUNT(*) → total_locations
      - WHERE id = $2 → target_location (is_default)
   b. Business Rules:
      - Jeśli total_locations = 1 → 409 "Cannot delete last location"
      - Jeśli target_location.is_default = true → 409 "Cannot delete default location"
   c. DELETE FROM user_locations WHERE id = $1 AND user_id = $2
   d. RLS zapewnia że user może usunąć tylko swoje lokalizacje
6. Response → Status 204 No Content
```

## 6. Względy bezpieczeństwa

### Uwierzytelnianie
- **Mechanizm**: Supabase Auth z session token
- **Implementacja**: Middleware Astro sprawdza `context.locals.supabase.auth.getSession()`
- **Token Storage**: Cookie (httpOnly, secure, sameSite) lub Authorization header
- **Wszystkie endpointy wymagają uwierzytelnienia** (401 jeśli brak sesji)

### Autoryzacja
- **RLS (Row Level Security)**: Polityki na poziomie PostgreSQL
  ```sql
  -- Polityka dla user_locations
  CREATE POLICY "Users can view own locations"
    ON user_locations FOR SELECT
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can insert own locations"
    ON user_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update own locations"
    ON user_locations FOR UPDATE
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can delete own locations"
    ON user_locations FOR DELETE
    USING (auth.uid() = user_id);
  ```
- **Dodatkowa walidacja**: Service layer sprawdza user_id przed operacjami

### Walidacja danych wejściowych
- **Sanityzacja**:
  - Trim whitespace z city i label
  - Uppercase country_code
  - Parse i waliduj number types dla współrzędnych
- **Zakresy**:
  - Latitude: -90 ≤ value ≤ 90
  - Longitude: -180 ≤ value ≤ 180
  - City: 1-100 znaków (po trim)
  - Label: 1-50 znaków (po trim)
  - Country code: regex `^[A-Z]{2}$`
- **Type Safety**: TypeScript strict mode zapewnia type checking

### Privacy
- **Zaokrąglenie współrzędnych**: 3 miejsca po przecinku (~100m accuracy)
  - Zapobiega precyzyjnej lokalizacji domu użytkownika
  - Wystarczająca dokładność dla pogody i spatial queries
- **Anonimizacja w community**: Tylko city i country_code widoczne publicznie

### SQL Injection Protection
- **Prepared Statements**: Supabase używa parametryzowanych queries
- **PostGIS Functions**: `ST_MakePoint()` bezpieczne dla numeric input
- **No Raw SQL**: Wszystkie queries przez Supabase client TypeScript API

### Rate Limiting
- **API Level**: Implement w Astro middleware lub Cloudflare Workers
- **Limity**:
  - Location management: 50 requests/minute per user
  - Create/Update/Delete: 20 requests/minute per user
- **429 Too Many Requests** jeśli przekroczono

## 7. Obsługa błędów

### Standard Error Response Format

```typescript
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}
```

### Kody błędów i scenariusze

#### 400 Bad Request
**Scenariusze:**
- Nieprawidłowy format UUID w path param
- Nieprawidłowy format JSON w body
- Nieprawidłowy typ query param (np. `default_only=abc`)

**Przykład:**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid UUID format for location ID"
  }
}
```

#### 401 Unauthorized
**Scenariusze:**
- Brak session token
- Wygasły token
- Nieważny token

**Przykład:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Please log in."
  }
}
```

**Implementacja:**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();
if (!session) {
  return new Response(JSON.stringify({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required. Please log in."
    }
  }), { status: 401 });
}
```

#### 404 Not Found
**Scenariusze:**
- Lokalizacja o podanym ID nie istnieje
- Lokalizacja istnieje ale należy do innego użytkownika (RLS zwraca 0 rows)

**Przykład:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Location not found or access denied"
  }
}
```

#### 409 Conflict
**Scenariusze:**
1. Próba usunięcia ostatniej lokalizacji użytkownika
2. Próba usunięcia domyślnej lokalizacji

**Przykłady:**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete the last location. User must have at least one location."
  }
}
```

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete default location. Set another location as default first.",
    "details": [{
      "field": "is_default",
      "message": "Update another location to be default before deleting this one"
    }]
  }
}
```

#### 422 Validation Error
**Scenariusze:**
- Latitude poza zakresem (-90, 90)
- Longitude poza zakresem (-180, 180)
- Country code nie jest 2-znakowym kodem ISO
- City lub label puste lub za długie
- Wymagane pola brakują (POST)

**Przykład:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "latitude",
        "message": "Latitude must be between -90 and 90"
      },
      {
        "field": "country_code",
        "message": "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)"
      },
      {
        "field": "city",
        "message": "City is required and must be 1-100 characters"
      }
    ]
  }
}
```

#### 500 Internal Server Error
**Scenariusze:**
- Błąd połączenia z bazą danych
- PostGIS function error (ST_MakePoint failure)
- Unexpected database constraint violation
- Transaction rollback failure

**Przykład:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

**Logging:**
- Loguj pełny stack trace do Sentry/monitoring
- Nie ujawniaj szczegółów wewnętrznych użytkownikowi
- Include request ID dla debugging

### Error Handling Strategy

```typescript
try {
  // Business logic
} catch (error) {
  if (error instanceof ValidationError) {
    return new Response(JSON.stringify({
      error: {
        code: "VALIDATION_ERROR",
        message: error.message,
        details: error.validationDetails
      }
    }), { status: 422 });
  }
  
  if (error instanceof ConflictError) {
    return new Response(JSON.stringify({
      error: {
        code: "CONFLICT",
        message: error.message
      }
    }), { status: 409 });
  }
  
  // Log unexpected errors
  console.error('Unexpected error in location endpoint:', error);
  
  return new Response(JSON.stringify({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again later."
    }
  }), { status: 500 });
}
```

## 8. Rozważania dotyczące wydajności

### Database Query Optimization

1. **Indexes**:
   ```sql
   -- Index dla user_id (najczęstsze query)
   CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
   
   -- Index dla default locations query
   CREATE INDEX idx_user_locations_default ON user_locations(user_id, is_default) WHERE is_default = true;
   
   -- Spatial index dla PostGIS queries (community features)
   CREATE INDEX idx_user_locations_geography ON user_locations USING GIST(location);
   ```

2. **Query Performance**:
   - GET locations: ~5ms (index scan on user_id)
   - POST location: ~15ms (insert + potential update for default)
   - PUT location: ~20ms (select + update, potencjalnie 2 updates)
   - DELETE location: ~25ms (select for validation + delete)

3. **Connection Pooling**:
   - Supabase pooler automatycznie zarządza connection pooling
   - Transaction mode dla write operations (POST, PUT, DELETE)
   - Session mode dla read operations (GET)

### Caching Strategy

1. **Client-side Caching**:
   - Cache-Control headers dla GET requests
   - `Cache-Control: private, max-age=300` (5 minut)
   - ETag support dla conditional requests

2. **No Server-side Cache**:
   - Lokalizacje zmieniają się rzadko ale zmiany muszą być natychmiastowe
   - Bez Redis/memory cache dla simplicity w MVP
   - Database query wystarczająco szybkie (<10ms)

### N+1 Query Prevention

- Nie dotyczy - wszystkie queries są single-level (brak relations w response)
- Jeśli w przyszłości dodamy related data (np. weather), użyj joins lub batch loading

### Payload Size Optimization

1. **Response Size**:
   - Średni LocationDTO: ~250 bytes
   - Typowy user: 2-5 lokalizacji = ~1KB response
   - Bez paginacji (małe dataset per user)

2. **Compression**:
   - Włącz gzip/brotli compression w Cloudflare/Astro
   - ~70% redukcja dla JSON responses

### Rate Limiting Impact

- Max 50 req/min per user → 1 request co ~1.2s
- Typowe użycie: <5 req/day
- No database overload expected

### PostGIS Performance

1. **ST_MakePoint() Performance**: <1ms
2. **GEOGRAPHY type storage**: Efficient dla spatial queries
3. **ST_X(), ST_Y() extraction**: <1ms per row

### Monitoring

**Key Metrics:**
- Response time (p50, p95, p99)
- Error rate per endpoint
- Database query duration
- Rate limit hits

**Alerting:**
- p95 response time > 500ms
- Error rate > 1%
- Database connection pool exhaustion

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury projektu

**Akcje:**
1. Utworzyć katalog service layer: `src/services/`
2. Utworzyć katalog validators: `src/validators/`
3. Utworzyć katalog utils: `src/utils/`
4. Utworzyć katalog dla custom errors: `src/errors/`

**Pliki do utworzenia:**
```
src/
  services/
    location.service.ts
  validators/
    location.validator.ts
  utils/
    postgis.utils.ts
    response.utils.ts
  errors/
    index.ts
  pages/
    api/
      locations/
        index.ts          # GET, POST
        [id].ts          # PUT, DELETE
```

### Krok 2: Implementacja Custom Error Classes

**Plik:** `src/errors/index.ts`

```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public validationDetails: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
```

### Krok 3: Implementacja PostGIS Utils

**Plik:** `src/utils/postgis.utils.ts`

```typescript
import type { Coordinates } from '../types';

/**
 * Konwertuje PostGIS GEOGRAPHY point do Coordinates object
 * Używa ST_X() i ST_Y() do ekstrakcji współrzędnych
 */
export function geographyToCoordinates(geographyPoint: unknown): Coordinates {
  // Supabase zwraca PostGIS jako string w formacie WKT lub object
  // Implementacja zależy od Supabase client behavior
  // Zakładamy że mamy access do ST_X, ST_Y w query lub raw coordinates
  
  // W praktyce: używamy SQL functions w query:
  // SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
  // więc ta funkcja może nie być potrzebna
  
  throw new Error('Use ST_X() and ST_Y() in SQL query instead');
}

/**
 * Zaokrągla współrzędne do 3 miejsc po przecinku (~100m accuracy)
 */
export function roundCoordinates(lat: number, lng: number): Coordinates {
  return {
    latitude: Math.round(lat * 1000) / 1000,
    longitude: Math.round(lng * 1000) / 1000,
  };
}

/**
 * Waliduje zakres współrzędnych geograficznych
 */
export function validateCoordinateRanges(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

### Krok 4: Implementacja Response Utils

**Plik:** `src/utils/response.utils.ts`

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createNoContentResponse(): Response {
  return new Response(null, { status: 204 });
}
```

### Krok 5: Implementacja Validator

**Plik:** `src/validators/location.validator.ts`

```typescript
import type { CreateLocationCommand, UpdateLocationCommand } from '../types';
import { ValidationError } from '../errors';
import { roundCoordinates, validateCoordinateRanges } from '../utils/postgis.utils';

interface ValidationDetail {
  field: string;
  message: string;
}

export class LocationValidator {
  private static COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

  static validateCreateCommand(command: unknown): CreateLocationCommand {
    const errors: ValidationDetail[] = [];
    const cmd = command as any;

    // Required fields
    if (typeof cmd.latitude !== 'number') {
      errors.push({ field: 'latitude', message: 'Latitude is required and must be a number' });
    } else if (!validateCoordinateRanges(cmd.latitude, 0)) {
      errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
    }

    if (typeof cmd.longitude !== 'number') {
      errors.push({ field: 'longitude', message: 'Longitude is required and must be a number' });
    } else if (!validateCoordinateRanges(0, cmd.longitude)) {
      errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
    }

    if (!cmd.city || typeof cmd.city !== 'string') {
      errors.push({ field: 'city', message: 'City is required and must be a string' });
    } else {
      const trimmedCity = cmd.city.trim();
      if (trimmedCity.length < 1 || trimmedCity.length > 100) {
        errors.push({ field: 'city', message: 'City must be 1-100 characters' });
      }
    }

    if (!cmd.country_code || typeof cmd.country_code !== 'string') {
      errors.push({ field: 'country_code', message: 'Country code is required' });
    } else {
      const upperCode = cmd.country_code.toUpperCase();
      if (!this.COUNTRY_CODE_REGEX.test(upperCode)) {
        errors.push({
          field: 'country_code',
          message: 'Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)',
        });
      }
    }

    // Optional fields
    if (cmd.is_default !== undefined && typeof cmd.is_default !== 'boolean') {
      errors.push({ field: 'is_default', message: 'is_default must be a boolean' });
    }

    if (cmd.label !== undefined) {
      if (typeof cmd.label !== 'string') {
        errors.push({ field: 'label', message: 'Label must be a string' });
      } else {
        const trimmedLabel = cmd.label.trim();
        if (trimmedLabel.length < 1 || trimmedLabel.length > 50) {
          errors.push({ field: 'label', message: 'Label must be 1-50 characters' });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid input data', errors);
    }

    // Return sanitized command
    const rounded = roundCoordinates(cmd.latitude, cmd.longitude);
    return {
      latitude: rounded.latitude,
      longitude: rounded.longitude,
      city: cmd.city.trim(),
      country_code: cmd.country_code.toUpperCase(),
      ...(cmd.is_default !== undefined && { is_default: cmd.is_default }),
      ...(cmd.label && { label: cmd.label.trim() }),
    };
  }

  static validateUpdateCommand(command: unknown): UpdateLocationCommand {
    const errors: ValidationDetail[] = [];
    const cmd = command as any;

    // All fields optional for partial update
    if (cmd.latitude !== undefined) {
      if (typeof cmd.latitude !== 'number') {
        errors.push({ field: 'latitude', message: 'Latitude must be a number' });
      } else if (!validateCoordinateRanges(cmd.latitude, 0)) {
        errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
      }
    }

    if (cmd.longitude !== undefined) {
      if (typeof cmd.longitude !== 'number') {
        errors.push({ field: 'longitude', message: 'Longitude must be a number' });
      } else if (!validateCoordinateRanges(0, cmd.longitude)) {
        errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
      }
    }

    if (cmd.city !== undefined) {
      if (typeof cmd.city !== 'string') {
        errors.push({ field: 'city', message: 'City must be a string' });
      } else {
        const trimmedCity = cmd.city.trim();
        if (trimmedCity.length < 1 || trimmedCity.length > 100) {
          errors.push({ field: 'city', message: 'City must be 1-100 characters' });
        }
      }
    }

    if (cmd.country_code !== undefined) {
      if (typeof cmd.country_code !== 'string') {
        errors.push({ field: 'country_code', message: 'Country code must be a string' });
      } else {
        const upperCode = cmd.country_code.toUpperCase();
        if (!this.COUNTRY_CODE_REGEX.test(upperCode)) {
          errors.push({
            field: 'country_code',
            message: 'Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)',
          });
        }
      }
    }

    if (cmd.is_default !== undefined && typeof cmd.is_default !== 'boolean') {
      errors.push({ field: 'is_default', message: 'is_default must be a boolean' });
    }

    if (cmd.label !== undefined) {
      if (typeof cmd.label !== 'string') {
        errors.push({ field: 'label', message: 'Label must be a string' });
      } else {
        const trimmedLabel = cmd.label.trim();
        if (trimmedLabel.length < 1 || trimmedLabel.length > 50) {
          errors.push({ field: 'label', message: 'Label must be 1-50 characters' });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid input data', errors);
    }

    // Return sanitized command
    const result: UpdateLocationCommand = {};
    
    if (cmd.latitude !== undefined && cmd.longitude !== undefined) {
      const rounded = roundCoordinates(cmd.latitude, cmd.longitude);
      result.latitude = rounded.latitude;
      result.longitude = rounded.longitude;
    } else if (cmd.latitude !== undefined || cmd.longitude !== undefined) {
      errors.push({
        field: 'coordinates',
        message: 'Both latitude and longitude must be provided together',
      });
      throw new ValidationError('Invalid input data', errors);
    }

    if (cmd.city !== undefined) result.city = cmd.city.trim();
    if (cmd.country_code !== undefined) result.country_code = cmd.country_code.toUpperCase();
    if (cmd.is_default !== undefined) result.is_default = cmd.is_default;
    if (cmd.label !== undefined) result.label = cmd.label.trim();

    return result;
  }

  static validateUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
```

### Krok 6: Implementacja Location Service

**Plik:** `src/services/location.service.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LocationDTO,
  CreateLocationCommand,
  UpdateLocationCommand,
  Database,
} from '../types';
import { ConflictError, NotFoundError } from '../errors';

export class LocationService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Pobiera lokalizacje użytkownika
   */
  async getUserLocations(userId: string, defaultOnly?: boolean): Promise<LocationDTO[]> {
    let query = this.supabase
      .from('user_locations')
      .select(
        `
        id,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        city,
        country_code,
        is_default,
        label,
        created_at,
        updated_at
      `
      )
      .eq('user_id', userId);

    if (defaultOnly) {
      query = query.eq('is_default', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Transform do LocationDTO
    return (data || []).map((row: any) => ({
      id: row.id,
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      city: row.city,
      country_code: row.country_code,
      is_default: row.is_default,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Tworzy nową lokalizację
   */
  async createLocation(
    userId: string,
    command: CreateLocationCommand
  ): Promise<LocationDTO> {
    // Start transaction manually if needed, or rely on single operation
    // If is_default = true, update other locations first
    if (command.is_default) {
      const { error: updateError } = await this.supabase
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Insert new location with PostGIS point
    const { data, error } = await this.supabase.rpc('insert_location', {
      p_user_id: userId,
      p_latitude: command.latitude,
      p_longitude: command.longitude,
      p_city: command.city,
      p_country_code: command.country_code,
      p_is_default: command.is_default ?? false,
      p_label: command.label ?? null,
    });

    if (error) {
      throw new Error(`Failed to create location: ${error.message}`);
    }

    // Fetch created location
    const locations = await this.getUserLocations(userId, false);
    const newLocation = locations[0]; // Most recent (ordered by created_at desc)

    if (!newLocation) {
      throw new Error('Failed to retrieve created location');
    }

    return newLocation;
  }

  /**
   * Aktualizuje lokalizację
   */
  async updateLocation(
    userId: string,
    locationId: string,
    command: UpdateLocationCommand
  ): Promise<LocationDTO> {
    // Check if location exists and belongs to user
    const { data: existing, error: fetchError } = await this.supabase
      .from('user_locations')
      .select('id, is_default')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Location not found or access denied');
    }

    // If setting as default, update other locations first
    if (command.is_default === true) {
      const { error: updateError } = await this.supabase
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('id', locationId);

      if (updateError) {
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    if (command.latitude !== undefined && command.longitude !== undefined) {
      // Update via RPC function for PostGIS
      const { error: rpcError } = await this.supabase.rpc('update_location_coordinates', {
        p_location_id: locationId,
        p_user_id: userId,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
      });

      if (rpcError) {
        throw new Error(`Failed to update coordinates: ${rpcError.message}`);
      }
    }

    if (command.city !== undefined) updateData.city = command.city;
    if (command.country_code !== undefined) updateData.country_code = command.country_code;
    if (command.is_default !== undefined) updateData.is_default = command.is_default;
    if (command.label !== undefined) updateData.label = command.label;

    // Update other fields if any
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await this.supabase
        .from('user_locations')
        .update(updateData)
        .eq('id', locationId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update location: ${updateError.message}`);
      }
    }

    // Fetch updated location
    const locations = await this.getUserLocations(userId, false);
    const updated = locations.find((loc) => loc.id === locationId);

    if (!updated) {
      throw new Error('Failed to retrieve updated location');
    }

    return updated;
  }

  /**
   * Usuwa lokalizację
   */
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    // Check business rules
    const { data: userLocations, error: fetchError } = await this.supabase
      .from('user_locations')
      .select('id, is_default')
      .eq('user_id', userId);

    if (fetchError) {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!userLocations || userLocations.length === 0) {
      throw new NotFoundError('No locations found');
    }

    // Find target location
    const targetLocation = userLocations.find((loc) => loc.id === locationId);

    if (!targetLocation) {
      throw new NotFoundError('Location not found or access denied');
    }

    // Business rule: Cannot delete last location
    if (userLocations.length === 1) {
      throw new ConflictError(
        'Cannot delete the last location. User must have at least one location.'
      );
    }

    // Business rule: Cannot delete default location
    if (targetLocation.is_default) {
      throw new ConflictError(
        'Cannot delete default location. Set another location as default first.'
      );
    }

    // Delete location
    const { error: deleteError } = await this.supabase
      .from('user_locations')
      .delete()
      .eq('id', locationId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to delete location: ${deleteError.message}`);
    }
  }
}
```

**Uwaga:** Service używa RPC functions dla operacji PostGIS. Należy stworzyć te funkcje w migracji SQL (Krok 10).

### Krok 7: Implementacja API Endpoint - GET & POST

**Plik:** `src/pages/api/locations/index.ts`

```typescript
import type { APIRoute } from 'astro';
import { LocationService } from '../../../services/location.service';
import { LocationValidator } from '../../../validators/location.validator';
import { ValidationError, UnauthorizedError } from '../../../errors';
import { createErrorResponse, createSuccessResponse } from '../../../utils/response.utils';

export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Auth check
    const {
      data: { session },
      error: authError,
    } = await locals.supabase.auth.getSession();

    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const userId = session.user.id;

    // Parse query params
    const defaultOnly = url.searchParams.get('default_only') === 'true';

    // Service call
    const locationService = new LocationService(locals.supabase);
    const locations = await locationService.getUserLocations(userId, defaultOnly);

    return createSuccessResponse(locations);
  } catch (error) {
    console.error('Error in GET /api/locations:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Auth check
    const {
      data: { session },
      error: authError,
    } = await locals.supabase.auth.getSession();

    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const userId = session.user.id;

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse('BAD_REQUEST', 'Invalid JSON in request body', 400);
    }

    // Validate
    const command = LocationValidator.validateCreateCommand(body);

    // Service call
    const locationService = new LocationService(locals.supabase);
    const newLocation = await locationService.createLocation(userId, command);

    return createSuccessResponse(newLocation, 201);
  } catch (error) {
    if (error instanceof ValidationError) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.message,
        422,
        error.validationDetails
      );
    }

    console.error('Error in POST /api/locations:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
```

### Krok 8: Implementacja API Endpoint - PUT & DELETE

**Plik:** `src/pages/api/locations/[id].ts`

```typescript
import type { APIRoute } from 'astro';
import { LocationService } from '../../../services/location.service';
import { LocationValidator } from '../../../validators/location.validator';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../../../errors';
import {
  createErrorResponse,
  createSuccessResponse,
  createNoContentResponse,
} from '../../../utils/response.utils';

export const PUT: APIRoute = async ({ locals, params, request }) => {
  try {
    // Auth check
    const {
      data: { session },
      error: authError,
    } = await locals.supabase.auth.getSession();

    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const userId = session.user.id;

    // Validate UUID
    const locationId = params.id;
    if (!locationId || !LocationValidator.validateUUID(locationId)) {
      return createErrorResponse('BAD_REQUEST', 'Invalid location ID format', 400);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse('BAD_REQUEST', 'Invalid JSON in request body', 400);
    }

    // Validate
    const command = LocationValidator.validateUpdateCommand(body);

    // Service call
    const locationService = new LocationService(locals.supabase);
    const updatedLocation = await locationService.updateLocation(
      userId,
      locationId,
      command
    );

    return createSuccessResponse(updatedLocation);
  } catch (error) {
    if (error instanceof ValidationError) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.message,
        422,
        error.validationDetails
      );
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

    console.error('Error in PUT /api/locations/[id]:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // Auth check
    const {
      data: { session },
      error: authError,
    } = await locals.supabase.auth.getSession();

    if (authError || !session) {
      return createErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const userId = session.user.id;

    // Validate UUID
    const locationId = params.id;
    if (!locationId || !LocationValidator.validateUUID(locationId)) {
      return createErrorResponse('BAD_REQUEST', 'Invalid location ID format', 400);
    }

    // Service call
    const locationService = new LocationService(locals.supabase);
    await locationService.deleteLocation(userId, locationId);

    return createNoContentResponse();
  } catch (error) {
    if (error instanceof ConflictError) {
      return createErrorResponse('CONFLICT', error.message, 409);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

    console.error('Error in DELETE /api/locations/[id]:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
```

### Krok 9: Aktualizacja TypeScript Configuration

**Plik:** `tsconfig.json`

Upewnij się że konfiguracja obsługuje:
```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["astro/client"]
  }
}
```

### Krok 10: Utworzenie SQL Migration dla RPC Functions

**Plik:** `supabase/migrations/20251010000000_location_rpc_functions.sql`

```sql
-- RPC Function: Insert location with PostGIS point
CREATE OR REPLACE FUNCTION insert_location(
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_city TEXT,
  p_country_code TEXT,
  p_is_default BOOLEAN DEFAULT FALSE,
  p_label TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_location_id UUID;
BEGIN
  INSERT INTO user_locations (
    user_id,
    location,
    city,
    country_code,
    is_default,
    label
  ) VALUES (
    p_user_id,
    ST_MakePoint(p_longitude, p_latitude)::geography,
    p_city,
    p_country_code,
    p_is_default,
    p_label
  )
  RETURNING id INTO v_location_id;
  
  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC Function: Update location coordinates
CREATE OR REPLACE FUNCTION update_location_coordinates(
  p_location_id UUID,
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE user_locations
  SET 
    location = ST_MakePoint(p_longitude, p_latitude)::geography,
    updated_at = NOW()
  WHERE id = p_location_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION insert_location TO authenticated;
GRANT EXECUTE ON FUNCTION update_location_coordinates TO authenticated;

-- Comments
COMMENT ON FUNCTION insert_location IS 'Creates new location with PostGIS GEOGRAPHY point';
COMMENT ON FUNCTION update_location_coordinates IS 'Updates location coordinates using PostGIS';
```

**Uruchomienie migracji:**
```bash
supabase db push
```

### Krok 11: Utworzenie RLS Policies (jeśli nie istnieją)

**Plik:** `supabase/migrations/20251010000100_location_rls_policies.sql`

```sql
-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own locations
CREATE POLICY "Users can view own locations"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert own locations
CREATE POLICY "Users can insert own locations"
  ON user_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own locations
CREATE POLICY "Users can update own locations"
  ON user_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete own locations
CREATE POLICY "Users can delete own locations"
  ON user_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON POLICY "Users can view own locations" ON user_locations IS 'RLS: SELECT only own locations';
COMMENT ON POLICY "Users can insert own locations" ON user_locations IS 'RLS: INSERT only for self';
COMMENT ON POLICY "Users can update own locations" ON user_locations IS 'RLS: UPDATE only own locations';
COMMENT ON POLICY "Users can delete own locations" ON user_locations IS 'RLS: DELETE only own locations';
```

### Krok 12: Testowanie Endpointów

**Utworzenie pliku testowego:** `tests/api/locations.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

// Przykładowe testy jednostkowe i integracyjne
describe('Location API Endpoints', () => {
  describe('GET /api/locations', () => {
    it('should return 401 when not authenticated', async () => {
      // Test implementation
    });

    it('should return user locations when authenticated', async () => {
      // Test implementation
    });

    it('should filter default location when default_only=true', async () => {
      // Test implementation
    });
  });

  describe('POST /api/locations', () => {
    it('should create new location with valid data', async () => {
      // Test implementation
    });

    it('should return 422 when coordinates out of range', async () => {
      // Test implementation
    });

    it('should update previous default when is_default=true', async () => {
      // Test implementation
    });
  });

  describe('PUT /api/locations/:id', () => {
    it('should update location with partial data', async () => {
      // Test implementation
    });

    it('should return 404 when location not found', async () => {
      // Test implementation
    });
  });

  describe('DELETE /api/locations/:id', () => {
    it('should delete non-default location', async () => {
      // Test implementation
    });

    it('should return 409 when deleting last location', async () => {
      // Test implementation
    });

    it('should return 409 when deleting default location', async () => {
      // Test implementation
    });
  });
});
```

**Uruchomienie testów:**
```bash
npm run test
```

### Krok 13: Dokumentacja API

**Plik:** `.ai/api-implementation-status.md`

Dodaj sekcję:
```markdown
## Location Management - ✅ IMPLEMENTED

### Endpoints:
- [x] GET /api/locations - Get user locations
- [x] POST /api/locations - Create new location
- [x] PUT /api/locations/{id} - Update location
- [x] DELETE /api/locations/{id} - Delete location

### Implementation Details:
- Service Layer: `src/services/location.service.ts`
- Validator: `src/validators/location.validator.ts`
- API Routes: `src/pages/api/locations/`
- SQL Functions: `insert_location`, `update_location_coordinates`
- RLS Policies: Enabled and tested
- Tests: Unit + Integration tests in `tests/api/locations.test.ts`

### Known Issues:
- None

### Performance Metrics:
- GET: ~5ms average
- POST: ~15ms average
- PUT: ~20ms average
- DELETE: ~25ms average
```

### Krok 14: Code Review Checklist

Przed merge do main branch, sprawdź:

**Security:**
- [ ] RLS policies włączone i przetestowane
- [ ] Auth middleware sprawdza session we wszystkich endpointach
- [ ] UUID validation dla path params
- [ ] Input sanitization (trim, uppercase)
- [ ] No SQL injection vectors (parametryzowane queries)
- [ ] Privacy: współrzędne zaokrąglone do 3 miejsc

**Functionality:**
- [ ] GET zwraca poprawne LocationDTO[]
- [ ] POST tworzy lokalizację z PostGIS point
- [ ] PUT wykonuje partial update
- [ ] DELETE sprawdza business rules (last location, default)
- [ ] is_default logic działa (tylko jedna domyślna)

**Error Handling:**
- [ ] Wszystkie scenariusze błędów obsłużone
- [ ] Standard error response format
- [ ] Odpowiednie kody statusu (200, 201, 204, 400, 401, 404, 409, 422, 500)
- [ ] Logging do console/Sentry

**Code Quality:**
- [ ] TypeScript strict mode bez błędów
- [ ] ESLint passes
- [ ] Prettier formatting
- [ ] Clean Architecture (separation of concerns)
- [ ] No code duplication
- [ ] Meaningful variable/function names

**Testing:**
- [ ] Unit tests dla validator
- [ ] Integration tests dla endpoints
- [ ] Edge cases covered
- [ ] Test coverage > 80%

**Performance:**
- [ ] Database indexes utworzone
- [ ] No N+1 queries
- [ ] Response times < 100ms p95
- [ ] Cache headers ustawione

**Documentation:**
- [ ] API endpoints udokumentowane
- [ ] Code comments dla złożonej logiki
- [ ] Type definitions kompletne
- [ ] Migration SQL przetestowane

### Krok 15: Deployment

1. **Merge do main:**
   ```bash
   git add .
   git commit -m "USR-XXX - feat: location management API"
   git push origin feature/location-api
   # Create Pull Request → Review → Merge
   ```

2. **Uruchom migracje na production:**
   ```bash
   supabase db push --linked
   ```

3. **Deploy Astro app:**
   - Cloudflare Pages automatycznie deploy z main branch
   - Sprawdź deployment logs w dashboard

4. **Monitoring:**
   - Sprawdź Sentry dashboard dla errors
   - Monitor response times w Cloudflare Analytics
   - Sprawdź database performance w Supabase Dashboard

5. **Smoke Tests na production:**
   ```bash
   # GET locations
   curl -X GET https://cyclegear.app/api/locations \
     -H "Authorization: Bearer {token}"
   
   # POST location
   curl -X POST https://cyclegear.app/api/locations \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{"latitude":52.237,"longitude":21.017,"city":"Warsaw","country_code":"PL"}'
   ```

---

## 10. Dodatkowe uwagi

### PostGIS Query Optimization

Dla spatial queries społeczności (future feature), użyj:
```sql
SELECT * FROM user_locations
WHERE ST_DWithin(
  location,
  ST_MakePoint(21.017, 52.237)::geography,
  50000  -- 50km radius
)
ORDER BY location <-> ST_MakePoint(21.017, 52.237)::geography
LIMIT 20;
```

### Future Enhancements

1. **Geocoding API Integration:**
   - Auto-fill city i country_code z lat/lng
   - Użyj OpenStreetMap Nominatim (free) lub Google Geocoding

2. **Location History:**
   - Track zmiany lokalizacji dla analytics
   - Soft delete zamiast hard delete

3. **Bulk Operations:**
   - Import wielu lokalizacji z CSV
   - Bulk delete (z zachowaniem business rules)

4. **Weather Cache per Location:**
   - Cache weather data per location_id
   - Invalidate po zmianie coordinates

### Dependencies

Wszystkie potrzebne zależności są już w projekcie:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "astro": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vitest": "^1.x"
  }
}
```

Brak dodatkowych instalacji.

---

**Plan gotowy do implementacji!** 🚀

Szacowany czas implementacji: **4-6 godzin** dla doświadczonego developera.

Priorytet następnych kroków:
1. Najpierw: Krok 1-6 (struktura + utilities) - 1h
2. Następnie: Krok 7-8 (API endpoints) - 2h
3. Ostatnie: Krok 10-11 (SQL migrations) - 30min
4. Testing: Krok 12 - 1-2h

