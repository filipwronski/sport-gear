# API Endpoint Implementation Plan: Profile Management

## 1. Przegląd punktów końcowych

Ten dokument zawiera szczegółowy plan implementacji czterech endpointów REST API dla zarządzania profilem użytkownika w aplikacji CycleGear MVP:

- **GET /api/profile** - Pobieranie profilu zalogowanego użytkownika
- **PUT /api/profile** - Aktualizacja profilu użytkownika (partial updates)
- **GET /api/profile/export** - Eksport wszystkich danych użytkownika (GDPR - Right to Data Portability)
- **DELETE /api/profile** - Usunięcie konta i wszystkich powiązanych danych (GDPR - Right to Erasure)

**Cel biznesowy:**
- Umożliwienie użytkownikom zarządzania swoim profilem i preferencjami termicznymi
- Compliance z GDPR (prawo do przenoszenia danych i prawo do bycia zapomnianym)
- Personalizacja rekomendacji ubioru na podstawie preferencji użytkownika

**Stack technologiczny:**
- Framework: Astro (Server Endpoints)
- BaaS: Supabase (PostgreSQL + Auth + RLS)
- TypeScript: strict mode
- Walidacja: Zod (do zaimplementowania)

---

## 2. Szczegóły żądań

### 2.1 GET /api/profile

**Metoda HTTP:** GET  
**Struktura URL:** `/api/profile`  
**Content-Type:** application/json

**Parametry:**
- **Wymagane:** Brak (userId pobierany z sesji Supabase Auth)
- **Opcjonalne:** Brak

**Headers:**
- `Authorization: Bearer <supabase_access_token>` (przekazywany automatycznie przez Supabase client)
- `Cookie: sb-<project-ref>-auth-token` (session cookie)

**Request Body:** Brak

---

### 2.2 PUT /api/profile

**Metoda HTTP:** PUT  
**Struktura URL:** `/api/profile`  
**Content-Type:** application/json

**Parametry:**
- **Wymagane:** Brak
- **Opcjonalne:** Brak (userId z sesji)

**Headers:**
- `Authorization: Bearer <supabase_access_token>`
- `Content-Type: application/json`

**Request Body:**
```typescript
{
  display_name?: string;
  thermal_preferences?: {
    general_feeling: 'marzlak' | 'neutralnie' | 'szybko_mi_goraco';
    cold_hands: boolean;
    cold_feet: boolean;
    cap_threshold_temp: number; // 0-30
  };
  share_with_community?: boolean;
  units?: 'metric' | 'imperial';
}
```

**Przykład request body:**
```json
{
  "display_name": "Jan Kowalski",
  "thermal_preferences": {
    "general_feeling": "neutralnie",
    "cold_hands": false,
    "cold_feet": true,
    "cap_threshold_temp": 15
  },
  "share_with_community": true,
  "units": "metric"
}
```

**Walidacja:**
- Wszystkie pola opcjonalne (partial update)
- `display_name`: max 100 znaków, trimmed, nie może być pustym stringiem
- `thermal_preferences.general_feeling`: enum validation
- `thermal_preferences.cold_hands/cold_feet`: boolean
- `thermal_preferences.cap_threshold_temp`: number 0-30
- `units`: enum validation
- `share_with_community`: boolean

---

### 2.3 GET /api/profile/export

**Metoda HTTP:** GET  
**Struktura URL:** `/api/profile/export`  
**Content-Type:** application/json

**Parametry:**
- **Wymagane:** Brak (userId z sesji)
- **Opcjonalne:** Brak

**Headers:**
- `Authorization: Bearer <supabase_access_token>`

**Request Body:** Brak

**Uwagi:**
- Endpoint może zwrócić duże ilości danych
- Rozważyć implementację Content-Disposition header dla download: `Content-Disposition: attachment; filename="cyclegear-export-{timestamp}.json"`

---

### 2.4 DELETE /api/profile

**Metoda HTTP:** DELETE  
**Struktura URL:** `/api/profile`  
**Content-Type:** application/json

**Parametry:**
- **Wymagane:** Brak (userId z sesji)
- **Opcjonalne:** Brak

**Headers:**
- `Authorization: Bearer <supabase_access_token>`

**Request Body:** Brak

**Uwagi:**
- Operacja nieodwracalna
- Rozważyć wymóg confirmation token (opcjonalnie dla MVP)
- W przyszłości: wysyłka email potwierdzającego przed/po usunięciu

---

## 3. Wykorzystywane typy

### 3.1 Request Types

```typescript
// src/types.ts (już istniejący)

export interface UpdateProfileCommand {
  display_name?: string;
  thermal_preferences?: ThermalPreferences;
  share_with_community?: boolean;
  units?: UnitsEnum;
}

export interface ThermalPreferences {
  general_feeling: ThermalFeelingEnum;
  cold_hands: boolean;
  cold_feet: boolean;
  cap_threshold_temp: number;
}

export type ThermalFeelingEnum = 'marzlak' | 'neutralnie' | 'szybko_mi_goraco';
export type UnitsEnum = 'metric' | 'imperial';
```

### 3.2 Response Types

```typescript
// src/types.ts (już istniejący)

export interface ProfileDTO {
  id: string;
  display_name: string | null;
  thermal_preferences: ThermalPreferences | null;
  thermal_adjustment: number | null;
  feedback_count: number | null;
  pseudonym: string | null;
  reputation_badge: ReputationBadgeEnum | null;
  share_with_community: boolean | null;
  units: UnitsEnum | null;
  default_location_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileExportDTO {
  profile: ProfileDTO;
  locations: LocationDTO[];
  bikes: BikeDTO[];
  service_records: ServiceRecordDTO[];
  service_reminders: ServiceReminderDTO[];
  outfit_feedbacks: FeedbackDTO[];
  shared_outfits: CommunityOutfitDTO[];
  export_timestamp: string;
}

export type ReputationBadgeEnum = 'nowicjusz' | 'regularny' | 'ekspert' | 'mistrz';
```

### 3.3 Error Response Type

```typescript
// src/types.ts (do dodania)

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // dla błędów walidacji
  };
}
```

### 3.4 Validation Schemas (Zod)

```typescript
// src/lib/validation/profile.schema.ts (nowy plik)

import { z } from 'zod';

export const thermalPreferencesSchema = z.object({
  general_feeling: z.enum(['marzlak', 'neutralnie', 'szybko_mi_goraco']),
  cold_hands: z.boolean(),
  cold_feet: z.boolean(),
  cap_threshold_temp: z.number().min(0).max(30),
});

export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(100).optional(),
  thermal_preferences: thermalPreferencesSchema.optional(),
  share_with_community: z.boolean().optional(),
  units: z.enum(['metric', 'imperial']).optional(),
}).strict(); // nie pozwalaj na dodatkowe pola

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/profile

**Success Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "display_name": "Jan Kowalski",
  "thermal_preferences": {
    "general_feeling": "neutralnie",
    "cold_hands": false,
    "cold_feet": true,
    "cap_threshold_temp": 15
  },
  "thermal_adjustment": 0.5,
  "feedback_count": 15,
  "pseudonym": "kolarz_abc123",
  "reputation_badge": "regularny",
  "share_with_community": true,
  "units": "metric",
  "default_location_id": "223e4567-e89b-12d3-a456-426614174001",
  "created_at": "2025-10-01T10:00:00Z",
  "updated_at": "2025-10-10T12:30:00Z"
}
```

**Error Responses:**
- **401 Unauthorized:**
  ```json
  {
    "error": {
      "code": "UNAUTHORIZED",
      "message": "Authentication required"
    }
  }
  ```

- **404 Not Found:**
  ```json
  {
    "error": {
      "code": "PROFILE_NOT_FOUND",
      "message": "User profile does not exist"
    }
  }
  ```

---

### 4.2 PUT /api/profile

**Success Response (200 OK):**
- Zwraca zaktualizowany ProfileDTO (identyczna struktura jak GET)

**Error Responses:**
- **400 Bad Request:**
  ```json
  {
    "error": {
      "code": "BAD_REQUEST",
      "message": "Invalid request body"
    }
  }
  ```

- **422 Unprocessable Entity:**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": {
        "thermal_preferences.general_feeling": [
          "Must be one of: marzlak, neutralnie, szybko_mi_goraco"
        ],
        "thermal_preferences.cap_threshold_temp": [
          "Must be between 0 and 30"
        ]
      }
    }
  }
  ```

---

### 4.3 GET /api/profile/export

**Success Response (200 OK):**
```json
{
  "profile": { /* ProfileDTO */ },
  "locations": [ /* LocationDTO[] */ ],
  "bikes": [ /* BikeDTO[] */ ],
  "service_records": [ /* ServiceRecordDTO[] */ ],
  "service_reminders": [ /* ServiceReminderDTO[] */ ],
  "outfit_feedbacks": [ /* FeedbackDTO[] */ ],
  "shared_outfits": [ /* CommunityOutfitDTO[] */ ],
  "export_timestamp": "2025-10-10T12:00:00Z"
}
```

**Headers:**
```
Content-Type: application/json
Content-Disposition: attachment; filename="cyclegear-export-20251010.json"
```

---

### 4.4 DELETE /api/profile

**Success Response (204 No Content):**
- Brak response body
- Status code: 204

**Error Responses:**
- **403 Forbidden:**
  ```json
  {
    "error": {
      "code": "DELETION_FORBIDDEN",
      "message": "Account deletion is not allowed at this time"
    }
  }
  ```

---

## 5. Przepływ danych

### 5.1 GET /api/profile

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/profile
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────┐
│  Astro Endpoint     │
│  /pages/api/        │
│  profile.ts         │
└──────┬──────────────┘
       │ 1. Extract session from headers
       │ 2. Verify authentication
       ▼
┌─────────────────────┐
│  Supabase Auth      │
│  getUser()          │
└──────┬──────────────┘
       │ userId
       ▼
┌─────────────────────┐
│  ProfileService     │
│  getProfile(userId) │
└──────┬──────────────┘
       │ Query profiles table
       ▼
┌─────────────────────┐
│  Supabase DB        │
│  SELECT * FROM      │
│  profiles           │
│  WHERE id = $1      │
└──────┬──────────────┘
       │ ProfileRow
       ▼
┌─────────────────────┐
│  Transform Row      │
│  to ProfileDTO      │
└──────┬──────────────┘
       │ ProfileDTO
       ▼
┌─────────────────────┐
│  Return Response    │
│  200 OK + JSON      │
└─────────────────────┘
```

### 5.2 PUT /api/profile

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ PUT /api/profile
       │ Body: UpdateProfileCommand
       ▼
┌─────────────────────┐
│  Astro Endpoint     │
│  profile.ts         │
└──────┬──────────────┘
       │ 1. Parse request body
       │ 2. Validate with Zod schema
       ▼
┌─────────────────────┐
│  Zod Validation     │
│  updateProfileSchema│
└──────┬──────────────┘
       │ Valid data
       ▼
┌─────────────────────┐
│  Supabase Auth      │
│  Verify session     │
└──────┬──────────────┘
       │ userId
       ▼
┌─────────────────────┐
│  ProfileService     │
│  updateProfile()    │
└──────┬──────────────┘
       │ 1. Check if sharing changed
       │ 2. Generate pseudonym if needed
       │ 3. Update profiles table
       ▼
┌─────────────────────┐
│  Supabase DB        │
│  UPDATE profiles    │
│  SET ...            │
│  WHERE id = $1      │
│  RETURNING *        │
└──────┬──────────────┘
       │ Updated ProfileRow
       ▼
┌─────────────────────┐
│  Transform & Return │
│  200 OK + ProfileDTO│
└─────────────────────┘
```

### 5.3 GET /api/profile/export

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/profile/export
       ▼
┌─────────────────────┐
│  Astro Endpoint     │
│  profile/export.ts  │
└──────┬──────────────┘
       │ Verify auth
       ▼
┌─────────────────────┐
│  ProfileService     │
│  exportUserData()   │
└──────┬──────────────┘
       │ Parallel queries:
       │ ┌─────────────────┐
       │ │ 1. Profile      │
       │ │ 2. Locations    │
       │ │ 3. Bikes        │
       │ │ 4. Services     │
       │ │ 5. Reminders    │
       │ │ 6. Feedbacks    │
       │ │ 7. Shared Outfits│
       │ └─────────────────┘
       ▼
┌─────────────────────┐
│  Supabase DB        │
│  Multiple SELECT    │
│  queries with RLS   │
└──────┬──────────────┘
       │ All user data
       ▼
┌─────────────────────┐
│  Aggregate Export   │
│  ProfileExportDTO   │
└──────┬──────────────┘
       │ Complete export
       ▼
┌─────────────────────┐
│  Return Response    │
│  200 OK + JSON      │
│  + Download header  │
└─────────────────────┘
```

### 5.4 DELETE /api/profile

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ DELETE /api/profile
       ▼
┌─────────────────────┐
│  Astro Endpoint     │
│  profile.ts         │
└──────┬──────────────┘
       │ Verify auth
       ▼
┌─────────────────────┐
│  ProfileService     │
│  deleteAccount()    │
└──────┬──────────────┘
       │ 1. Log deletion attempt
       │ 2. Delete profile (CASCADE)
       ▼
┌─────────────────────┐
│  Supabase DB        │
│  DELETE FROM        │
│  profiles           │
│  WHERE id = $1      │
└──────┬──────────────┘
       │ Cascade triggers:
       │ - auth.users deleted
       │ - user_locations deleted
       │ - bikes deleted
       │ - service_records deleted
       │ - service_reminders deleted
       │ - outfit_feedbacks deleted
       │ - shared_outfits kept (anonymized)
       ▼
┌─────────────────────┐
│  Return Response    │
│  204 No Content     │
└─────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie (Authentication)

**Mechanizm:**
- Supabase Auth z JWT tokens
- Session cookie: `sb-<project-ref>-auth-token`
- Access token w Authorization header

**Implementacja:**
```typescript
// src/lib/auth/getAuthenticatedUser.ts

import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';

export async function getAuthenticatedUser(
  context: APIContext
): Promise<{ user: User; error: null } | { user: null; error: string }> {
  const supabase = context.locals.supabase;
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      error: 'Unauthorized: Invalid or missing authentication token',
    };
  }

  return { user, error: null };
}
```

**Wymagania:**
- Wszystkie 4 endpointy wymagają uwierzytelnienia
- Brak valid session → 401 Unauthorized
- Expired token → 401 Unauthorized + komunikat o relogin

### 6.2 Autoryzacja (Authorization)

**Row Level Security (RLS):**
```sql
-- supabase/migrations/20251009000600_rls_policies.sql

-- Profile: User can read/update only their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Profile: Cannot be created manually (trigger creates on signup)
-- Profile: Delete handled by CASCADE from auth.users
```

**Dodatkowa walidacja na poziomie service:**
```typescript
// Zawsze sprawdzaj userId z sesji vs userId w operacji
if (authenticatedUserId !== targetUserId) {
  throw new ForbiddenError('Cannot access another user\'s profile');
}
```

### 6.3 Walidacja danych wejściowych

**Zod schema validation:**
- Wszystkie dane z request body muszą przejść przez Zod schema
- Reject unknown fields (`.strict()`)
- Sanitize string inputs (trim, max length)
- Validate enums strictly

**SQL Injection prevention:**
- Używaj parametryzowanych zapytań (Supabase używa domyślnie)
- Nigdy nie interpoluj user input bezpośrednio do SQL

**XSS prevention:**
- Escape HTML w `display_name` przed zapisem (opcjonalnie)
- Content-Type: application/json zawsze

### 6.4 Rate Limiting

**Priorytet dla DELETE endpoint:**
```typescript
// src/middleware/rateLimit.ts (do implementacji w przyszłości)

// DELETE /api/profile: 1 request per hour per user
// PUT /api/profile: 10 requests per minute per user
// GET endpoints: 100 requests per minute per user
```

**Implementacja w MVP:**
- Cloudflare Rate Limiting (poziom infrastruktury)
- Lub middleware w Astro dla custom rules

### 6.5 CORS

**Konfiguracja:**
```typescript
// astro.config.mjs

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    headers: {
      'Access-Control-Allow-Origin': process.env.PUBLIC_APP_URL || 'http://localhost:4321',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  },
});
```

### 6.6 Sensitive Data Handling

**Nie logować:**
- Pełny request body (może zawierać PII)
- thermal_preferences (preferencje użytkownika)
- Session tokens

**Logować:**
- userId (hashed lub uuid)
- Endpoint
- Timestamp
- Error codes (bez stack trace w production)

**Export endpoint:**
- Zawiera wszystkie dane użytkownika → dodatkowa weryfikacja sesji
- Rozważyć 2FA w przyszłości dla wrażliwych operacji

### 6.7 Pseudonymization (GDPR)

**DELETE endpoint:**
- Usunięcie profilu NIE usuwa anonimizowanych wpisów w shared_outfits
- Pseudonym pozostaje dla integralności danych społeczności
- Dokumentacja dla użytkownika: "Twoje anonimowe zestawy pozostaną widoczne"

---

## 7. Obsługa błędów

### 7.1 Hierarchia błędów

```typescript
// src/lib/errors/ApiError.ts

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>) {
    super(422, 'VALIDATION_ERROR', 'Validation failed', details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
```

### 7.2 Error Handler Middleware

```typescript
// src/lib/errors/errorHandler.ts

import type { APIContext } from 'astro';
import { ApiError } from './ApiError';

export function handleApiError(error: unknown, context: APIContext): Response {
  // Known ApiError
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Zod validation error
  if (error instanceof ZodError) {
    const details = error.errors.reduce((acc, err) => {
      const path = err.path.join('.');
      if (!acc[path]) acc[path] = [];
      acc[path].push(err.message);
      return acc;
    }, {} as Record<string, string[]>);

    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // PostgrestError (Supabase)
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string; details: string };
    
    // Map PostgreSQL errors
    if (pgError.code === '23505') {
      // Unique constraint violation
      return new Response(
        JSON.stringify({
          error: {
            code: 'CONFLICT',
            message: 'Resource already exists',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Unknown error
  console.error('Unhandled error:', error);
  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

### 7.3 Scenariusze błędów dla każdego endpointu

#### GET /api/profile

| Status | Code | Scenariusz | Rozwiązanie |
|--------|------|------------|-------------|
| 401 | UNAUTHORIZED | Brak session token | Przekieruj na /login |
| 401 | UNAUTHORIZED | Expired token | Odśwież token lub relogin |
| 404 | PROFILE_NOT_FOUND | Profil nie istnieje | Auto-create profil (trigger) lub błąd |
| 500 | INTERNAL_SERVER_ERROR | Błąd DB | Log error, zwróć generic message |

#### PUT /api/profile

| Status | Code | Scenariusz | Rozwiązanie |
|--------|------|------------|-------------|
| 400 | BAD_REQUEST | Nieprawidłowy JSON | Walidacja Content-Type |
| 401 | UNAUTHORIZED | Brak autentykacji | Wymagaj ponownego logowania |
| 422 | VALIDATION_ERROR | Zły enum value | Zwróć szczegóły walidacji |
| 422 | VALIDATION_ERROR | cap_threshold_temp < 0 | Zwróć range error |
| 500 | INTERNAL_SERVER_ERROR | DB update failed | Rollback, log error |

#### GET /api/profile/export

| Status | Code | Scenariusz | Rozwiązanie |
|--------|------|------------|-------------|
| 401 | UNAUTHORIZED | Brak autentykacji | Wymagaj logowania |
| 500 | INTERNAL_SERVER_ERROR | Timeout przy dużym exporcie | Zwiększ timeout, optymalizuj query |
| 500 | INTERNAL_SERVER_ERROR | Błąd przy agregacji | Log error, zwróć partial data? |

#### DELETE /api/profile

| Status | Code | Scenariusz | Rozwiązanie |
|--------|------|------------|-------------|
| 401 | UNAUTHORIZED | Brak autentykacji | Wymagaj logowania |
| 403 | DELETION_FORBIDDEN | Rate limit exceeded | Wymóż 1h cooldown |
| 500 | INTERNAL_SERVER_ERROR | CASCADE delete failed | Transaction rollback, alert admin |

---

## 8. Rozważania dotyczące wydajności

### 8.1 Database Queries

**GET /api/profile:**
- Single SELECT query
- Index na `profiles.id` (PRIMARY KEY)
- Czas wykonania: <10ms
- Brak potrzeby cachowania (dane użytkownika)

**PUT /api/profile:**
- Single UPDATE query z RETURNING clause
- Potential bottleneck: update_updated_at trigger
- Czas wykonania: <20ms
- Brak cachowania (zawsze fresh data)

**GET /api/profile/export:**
- **7 SELECT queries** (profile + 6 related tables)
- Potencjalne wąskie gardło dla użytkowników z dużą ilością danych
- Optymalizacja:
  - Parallel queries: `Promise.all()`
  - Limit wyników per tabela (np. ostatnie 1000 feedbacks)
  - Pagination w przyszłości dla bardzo dużych exportów
- Expected time: 50-200ms (zależnie od wielkości danych)

```typescript
// Optymalizacja: Parallel queries
const [profile, locations, bikes, services, reminders, feedbacks, outfits] = 
  await Promise.all([
    getProfile(userId),
    getLocations(userId),
    getBikes(userId),
    getServiceRecords(userId),
    getReminders(userId),
    getFeedbacks(userId),
    getSharedOutfits(userId),
  ]);
```

**DELETE /api/profile:**
- Single DELETE query
- CASCADE triggers on 6+ related tables
- Potential long transaction for users with lots of data
- Czas wykonania: 100-500ms (zależnie od danych)
- Consider: Async job queue dla bardzo dużych kont (post-MVP)

### 8.2 Database Indexes

**Wymagane indexes (powinny już istnieć):**
```sql
-- profiles
CREATE INDEX idx_profiles_pseudonym ON profiles(pseudonym); -- dla uniqueness check
CREATE INDEX idx_profiles_default_location ON profiles(default_location_id);

-- Nie potrzeba dodatkowych indexów dla profile endpoints
-- (id jest PRIMARY KEY)
```

### 8.3 Connection Pooling

**Supabase obsługuje connection pooling:**
- Max connections: 60 (Free tier Supabase)
- Pooler mode: Transaction mode (default)
- Brak dodatkowej konfiguracji potrzebnej dla MVP

### 8.4 Response Size Optimization

**GET /api/profile:**
- Rozmiar: ~1-2 KB
- Brak potrzeby kompresji

**PUT /api/profile:**
- Rozmiar: ~1-2 KB
- Brak potrzeby kompresji

**GET /api/profile/export:**
- Rozmiar: 10 KB - 5 MB (zależnie od użytkownika)
- **Wymagana kompresja GZIP:**
  ```typescript
  // Astro automatycznie kompresuje response > 1KB
  // Cloudflare Pages też kompresuje automatycznie
  ```
- Rozważyć limit wielkości exportu (np. max 10 MB)

### 8.5 Caching Strategy

**Profile endpoints: BRAK cachowania**
- Dane użytkownika muszą być zawsze aktualne
- Cache-Control headers:
  ```typescript
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  }
  ```

**Export endpoint:**
- Rozważyć tymczasowy cache (5 min) dla powtarzających się exportów
- Lub rate limiting zamiast cachowania

### 8.6 Monitoring

**Metryki do śledzenia:**
- Response time per endpoint (p50, p95, p99)
- Error rate (4xx, 5xx)
- DB query time
- Export size distribution
- Delete operation duration

**Tools:**
- Supabase Dashboard (query performance)
- Sentry (error tracking)
- Cloudflare Analytics (request metrics)

---

## 9. Etapy wdrożenia

### Phase 1: Przygotowanie infrastruktury (1-2h)

#### 1.1 Utworzenie struktury plików

```bash
# Service layer
src/services/
  └── ProfileService.ts

# Validation schemas
src/lib/validation/
  └── profile.schema.ts

# Error handling
src/lib/errors/
  ├── ApiError.ts
  └── errorHandler.ts

# Auth helper
src/lib/auth/
  └── getAuthenticatedUser.ts

# API endpoints
src/pages/api/
  ├── profile.ts
  └── profile/
      └── export.ts
```

#### 1.2 Instalacja zależności

```bash
pnpm add zod
```

#### 1.3 Aktualizacja types.ts

```typescript
// Dodać ApiErrorResponse type (jeśli nie istnieje)
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

---

### Phase 2: Implementacja warstwy błędów i walidacji (2-3h)

#### 2.1 Implementacja ApiError classes

**Plik:** `src/lib/errors/ApiError.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends ApiError {
  constructor(details: Record<string, string[]>) {
    super(422, 'VALIDATION_ERROR', 'Validation failed', details);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad request') {
    super(400, 'BAD_REQUEST', message);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_SERVER_ERROR', message);
  }
}
```

#### 2.2 Implementacja Error Handler

**Plik:** `src/lib/errors/errorHandler.ts`

```typescript
import type { APIContext } from 'astro';
import { ZodError } from 'zod';
import { ApiError } from './ApiError';

export function handleApiError(error: unknown): Response {
  console.error('API Error:', error);

  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      }),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error instanceof ZodError) {
    const details = error.errors.reduce((acc, err) => {
      const path = err.path.join('.');
      if (!acc[path]) acc[path] = [];
      acc[path].push(err.message);
      return acc;
    }, {} as Record<string, string[]>);

    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        },
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // PostgrestError handling
  if (error && typeof error === 'object' && 'code' in error) {
    const pgError = error as { code: string; message: string };
    if (pgError.code === '23505') {
      return new Response(
        JSON.stringify({
          error: {
            code: 'CONFLICT',
            message: 'Resource already exists',
          },
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

#### 2.3 Implementacja Zod schemas

**Plik:** `src/lib/validation/profile.schema.ts`

```typescript
import { z } from 'zod';

export const thermalPreferencesSchema = z.object({
  general_feeling: z.enum(['marzlak', 'neutralnie', 'szybko_mi_goraco'], {
    errorMap: () => ({ message: 'Must be one of: marzlak, neutralnie, szybko_mi_goraco' }),
  }),
  cold_hands: z.boolean({
    errorMap: () => ({ message: 'Must be a boolean value' }),
  }),
  cold_feet: z.boolean({
    errorMap: () => ({ message: 'Must be a boolean value' }),
  }),
  cap_threshold_temp: z.number()
    .min(0, 'Must be at least 0')
    .max(30, 'Must be at most 30'),
});

export const updateProfileSchema = z.object({
  display_name: z.string()
    .trim()
    .min(1, 'Display name cannot be empty')
    .max(100, 'Display name must be at most 100 characters')
    .optional(),
  thermal_preferences: thermalPreferencesSchema.optional(),
  share_with_community: z.boolean({
    errorMap: () => ({ message: 'Must be a boolean value' }),
  }).optional(),
  units: z.enum(['metric', 'imperial'], {
    errorMap: () => ({ message: 'Must be either metric or imperial' }),
  }).optional(),
}).strict(); // Reject unknown fields

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

---

### Phase 3: Implementacja Auth Helper (1h)

**Plik:** `src/lib/auth/getAuthenticatedUser.ts`

```typescript
import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';
import { UnauthorizedError } from '../errors/ApiError';

export async function getAuthenticatedUser(
  context: APIContext
): Promise<User> {
  const supabase = context.locals.supabase;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError('Invalid or missing authentication token');
  }

  return user;
}
```

---

### Phase 4: Implementacja ProfileService (3-4h)

**Plik:** `src/services/ProfileService.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types';
import type {
  ProfileDTO,
  UpdateProfileCommand,
  ProfileExportDTO,
  LocationDTO,
  BikeDTO,
  ServiceRecordDTO,
  ServiceReminderDTO,
  FeedbackDTO,
  CommunityOutfitDTO,
  ThermalPreferences,
  ReputationBadgeEnum,
} from '../types';
import { NotFoundError, InternalServerError } from '../lib/errors/ApiError';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export class ProfileService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Get user profile by userId
   */
  async getProfile(userId: string): Promise<ProfileDTO> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('User profile not found');
      }
      console.error('Error fetching profile:', error);
      throw new InternalServerError('Failed to fetch profile');
    }

    return this.transformRowToDTO(data);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    command: UpdateProfileCommand
  ): Promise<ProfileDTO> {
    // Prepare update data
    const updateData: Partial<ProfileRow> = {};

    if (command.display_name !== undefined) {
      updateData.display_name = command.display_name;
    }

    if (command.thermal_preferences !== undefined) {
      updateData.thermal_preferences = command.thermal_preferences as any;
    }

    if (command.units !== undefined) {
      updateData.units = command.units;
    }

    // Handle share_with_community change (may need pseudonym generation)
    if (command.share_with_community !== undefined) {
      updateData.share_with_community = command.share_with_community;

      // If enabling sharing and no pseudonym exists, generate one
      if (command.share_with_community) {
        const { data: currentProfile } = await this.supabase
          .from('profiles')
          .select('pseudonym')
          .eq('id', userId)
          .single();

        if (!currentProfile?.pseudonym) {
          updateData.pseudonym = await this.generatePseudonym();
        }
      }
    }

    // Execute update
    const { data, error } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw new InternalServerError('Failed to update profile');
    }

    return this.transformRowToDTO(data);
  }

  /**
   * Export all user data (GDPR)
   */
  async exportUserData(userId: string): Promise<ProfileExportDTO> {
    try {
      // Parallel queries for all user data
      const [
        profile,
        locations,
        bikes,
        serviceRecords,
        serviceReminders,
        feedbacks,
        sharedOutfits,
      ] = await Promise.all([
        this.getProfile(userId),
        this.getLocations(userId),
        this.getBikes(userId),
        this.getServiceRecords(userId),
        this.getServiceReminders(userId),
        this.getFeedbacks(userId),
        this.getSharedOutfits(userId),
      ]);

      return {
        profile,
        locations,
        bikes,
        service_records: serviceRecords,
        service_reminders: serviceReminders,
        outfit_feedbacks: feedbacks,
        shared_outfits: sharedOutfits,
        export_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new InternalServerError('Failed to export user data');
    }
  }

  /**
   * Delete user account (GDPR)
   */
  async deleteAccount(userId: string): Promise<void> {
    // Log deletion attempt (audit trail)
    console.info(`Account deletion requested for user: ${userId}`);

    // Delete profile (CASCADE will handle related records)
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting account:', error);
      throw new InternalServerError('Failed to delete account');
    }

    // Note: shared_outfits with pseudonym will remain (anonymized)
  }

  // ========================================
  // Helper methods
  // ========================================

  private transformRowToDTO(row: ProfileRow): ProfileDTO {
    return {
      id: row.id,
      display_name: row.display_name,
      thermal_preferences: row.thermal_preferences as ThermalPreferences | null,
      thermal_adjustment: row.thermal_adjustment,
      feedback_count: row.feedback_count,
      pseudonym: row.pseudonym,
      reputation_badge: row.reputation_badge as ReputationBadgeEnum | null,
      share_with_community: row.share_with_community,
      units: row.units as 'metric' | 'imperial' | null,
      default_location_id: row.default_location_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async generatePseudonym(): Promise<string> {
    const adjectives = ['szybki', 'wolny', 'dzielny', 'silny', 'zwinny'];
    const nouns = ['kolarz', 'rowerzysta', 'pedał', 'jeździec', 'rajdowiec'];
    
    let pseudonym: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      pseudonym = `${adj}_${noun}_${randomNum}`;

      // Check uniqueness
      const { data } = await this.supabase
        .from('profiles')
        .select('pseudonym')
        .eq('pseudonym', pseudonym)
        .maybeSingle();

      if (!data) {
        return pseudonym;
      }

      attempts++;
    } while (attempts < maxAttempts);

    // Fallback: UUID-based pseudonym
    return `kolarz_${crypto.randomUUID().slice(0, 8)}`;
  }

  private async getLocations(userId: string): Promise<LocationDTO[]> {
    const { data, error } = await this.supabase
      .from('user_locations')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    // Transform geometry to coordinates (implement based on PostGIS format)
    return (data || []).map(row => ({
      id: row.id,
      location: this.parseGeometry(row.location),
      city: row.city,
      country_code: row.country_code,
      is_default: row.is_default,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  private async getBikes(userId: string): Promise<BikeDTO[]> {
    // Implement bike fetching with aggregations
    // (Details depend on bike service implementation)
    const { data, error } = await this.supabase
      .from('bikes')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private async getServiceRecords(userId: string): Promise<ServiceRecordDTO[]> {
    // Join with bikes to filter by user
    const { data, error } = await this.supabase
      .from('service_records')
      .select('*, bikes!inner(user_id)')
      .eq('bikes.user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private async getServiceReminders(userId: string): Promise<ServiceReminderDTO[]> {
    const { data, error } = await this.supabase
      .from('service_reminders')
      .select('*, bikes!inner(user_id)')
      .eq('bikes.user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private async getFeedbacks(userId: string): Promise<FeedbackDTO[]> {
    const { data, error } = await this.supabase
      .from('outfit_feedbacks')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private async getSharedOutfits(userId: string): Promise<CommunityOutfitDTO[]> {
    // Fetch from shared_outfits view
    const { data, error } = await this.supabase
      .from('shared_outfits')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  private parseGeometry(geometry: any): { latitude: number; longitude: number } {
    // Parse PostGIS geometry format
    // Implementation depends on exact DB format
    // Placeholder:
    return {
      latitude: 0,
      longitude: 0,
    };
  }
}
```

---

### Phase 5: Implementacja API Endpoints (3-4h)

#### 5.1 GET, PUT, DELETE /api/profile

**Plik:** `src/pages/api/profile.ts`

```typescript
import type { APIRoute } from 'astro';
import { ProfileService } from '../../services/ProfileService';
import { getAuthenticatedUser } from '../../lib/auth/getAuthenticatedUser';
import { handleApiError } from '../../lib/errors/errorHandler';
import { updateProfileSchema } from '../../lib/validation/profile.schema';
import { BadRequestError } from '../../lib/errors/ApiError';

// GET /api/profile
export const GET: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const profileService = new ProfileService(context.locals.supabase);
    
    const profile = await profileService.getProfile(user.id);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};

// PUT /api/profile
export const PUT: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    // Parse and validate request body
    let body;
    try {
      body = await context.request.json();
    } catch {
      throw new BadRequestError('Invalid JSON in request body');
    }

    const validatedData = updateProfileSchema.parse(body);

    // Update profile
    const profileService = new ProfileService(context.locals.supabase);
    const updatedProfile = await profileService.updateProfile(user.id, validatedData);

    return new Response(JSON.stringify(updatedProfile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};

// DELETE /api/profile
export const DELETE: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const profileService = new ProfileService(context.locals.supabase);
    await profileService.deleteAccount(user.id);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

#### 5.2 GET /api/profile/export

**Plik:** `src/pages/api/profile/export.ts`

```typescript
import type { APIRoute } from 'astro';
import { ProfileService } from '../../../services/ProfileService';
import { getAuthenticatedUser } from '../../../lib/auth/getAuthenticatedUser';
import { handleApiError } from '../../../lib/errors/errorHandler';

export const GET: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const profileService = new ProfileService(context.locals.supabase);
    const exportData = await profileService.exportUserData(user.id);

    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `cyclegear-export-${timestamp}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};
```

---

### Phase 6: Testy (3-4h)

#### 6.1 Unit testy dla ProfileService

**Plik:** `src/services/ProfileService.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from './ProfileService';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('ProfileService', () => {
  let mockSupabase: any;
  let profileService: ProfileService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };

    profileService = new ProfileService(mockSupabase as unknown as SupabaseClient);
  });

  describe('getProfile', () => {
    it('should return profile DTO when profile exists', async () => {
      const mockProfile = {
        id: 'user-123',
        display_name: 'Test User',
        thermal_preferences: {
          general_feeling: 'neutralnie',
          cold_hands: false,
          cold_feet: false,
          cap_threshold_temp: 15,
        },
        units: 'metric',
      };

      mockSupabase.single.mockResolvedValue({ data: mockProfile, error: null });

      const result = await profileService.getProfile('user-123');

      expect(result.id).toBe('user-123');
      expect(result.display_name).toBe('Test User');
    });

    it('should throw NotFoundError when profile does not exist', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      });

      await expect(profileService.getProfile('user-123')).rejects.toThrow('User profile not found');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateCommand = {
        display_name: 'Updated Name',
      };

      const updatedProfile = {
        id: 'user-123',
        display_name: 'Updated Name',
      };

      mockSupabase.single.mockResolvedValue({ data: updatedProfile, error: null });

      const result = await profileService.updateProfile('user-123', updateCommand);

      expect(result.display_name).toBe('Updated Name');
    });
  });

  // More tests...
});
```

#### 6.2 Integration testy dla API endpoints

**Plik:** `src/pages/api/profile.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('GET /api/profile', () => {
  it('should return 401 when not authenticated', async () => {
    const response = await fetch('http://localhost:4321/api/profile');
    expect(response.status).toBe(401);
  });

  it('should return profile when authenticated', async () => {
    // Mock authentication
    const response = await fetch('http://localhost:4321/api/profile', {
      headers: {
        'Authorization': 'Bearer mock-token',
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('display_name');
  });
});

describe('PUT /api/profile', () => {
  it('should update profile with valid data', async () => {
    const updateData = {
      display_name: 'New Name',
      units: 'imperial',
    };

    const response = await fetch('http://localhost:4321/api/profile', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.display_name).toBe('New Name');
    expect(data.units).toBe('imperial');
  });

  it('should return 422 for invalid data', async () => {
    const invalidData = {
      thermal_preferences: {
        general_feeling: 'invalid_value',
      },
    };

    const response = await fetch('http://localhost:4321/api/profile', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData),
    });

    expect(response.status).toBe(422);
    const error = await response.json();
    expect(error.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

### Phase 7: Dokumentacja i finalizacja (1-2h)

#### 7.1 API Documentation

Zaktualizować dokumentację API (OpenAPI/Swagger lub markdown):
- Request/response schemas
- Error codes
- Authentication requirements
- Rate limits

#### 7.2 README Updates

Dodać do README:
```markdown
## Profile Management API

### Endpoints

- `GET /api/profile` - Get current user profile
- `PUT /api/profile` - Update user profile
- `GET /api/profile/export` - Export all user data (GDPR)
- `DELETE /api/profile` - Delete account (GDPR)

See [API Documentation](./docs/api/profile.md) for details.
```

#### 7.3 Deployment Checklist

- [ ] Environment variables configured (SUPABASE_URL, SUPABASE_KEY)
- [ ] RLS policies deployed to production Supabase
- [ ] Database migrations applied
- [ ] Error tracking configured (Sentry)
- [ ] Rate limiting configured (Cloudflare)
- [ ] CORS headers verified
- [ ] Smoke tests passed on staging

---

## 10. Podsumowanie

### Kluczowe punkty implementacji:

1. **Bezpieczeństwo first**: Authentication, authorization, RLS, input validation
2. **GDPR compliance**: Export and delete endpoints fully implemented
3. **Clean Architecture**: Service layer separation, error handling, validation schemas
4. **Performance**: Parallel queries for export, proper indexing, no unnecessary caching
5. **Developer Experience**: Type-safe TypeScript, comprehensive error messages, clear documentation

### Szacowany czas implementacji:
- **Total: 14-20 godzin** (spread over 2-3 days for one developer)

### Zależności od innych endpointów:
- Wymaga działającej autentykacji Supabase
- Export endpoint wymaga implementacji DTO transformers dla related tables
- Shared outfits dependency w delete (anonimizacja)

### Następne kroki po implementacji:
1. Implementacja remainig API endpoints (locations, bikes, recommendations, etc.)
2. Frontend integration (React islands dla profile management)
3. E2E testy z Playwright
4. Performance monitoring i optimization
5. Rate limiting fine-tuning

---

**Plan stworzony:** 10 października 2025  
**Wersja:** 1.0  
**Status:** Ready for implementation

