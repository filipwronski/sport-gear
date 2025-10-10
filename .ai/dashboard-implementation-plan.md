# API Endpoint Implementation Plan: GET /api/dashboard

## 1. Przegląd punktu końcowego

Endpoint `GET /api/dashboard` dostarcza zagregowane dane podsumowujące aktualny stan aplikacji dla zalogowanego użytkownika. Służy jako główne źródło danych dla ekranu głównego aplikacji (dashboard view).

**Zakres funkcjonalności:**
- Podsumowanie pogody dla wybranej lub domyślnej lokalizacji użytkownika
- Status sprzętu (liczba aktywnych rowerów, nadchodzące serwisy, przeterminowane serwisy)
- Aktywność społeczności (liczba ostatnich zestawów, podobne warunki)
- Status personalizacji (liczba feedbacków, aktywna personalizacja, dostrojenie termiczne)

**Kluczowe cechy:**
- Agreguje dane z wielu źródeł (pogoda, rowery, serwisy, społeczność, profil)
- Optymalizowany pod kątem wydajności (minimalna liczba zapytań)
- Wymaga uwierzytelnienia użytkownika
- Wspiera wybór lokalizacji lub używa domyślnej

---

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/dashboard
```

### Query Parameters

| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `location_id` | UUID | Nie | ID lokalizacji użytkownika dla danych pogodowych. Jeśli nie podano, używana jest domyślna lokalizacja z profilu użytkownika. |

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Przykładowe żądania

**Z określoną lokalizacją:**
```
GET /api/dashboard?location_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Bez parametrów (domyślna lokalizacja):**
```
GET /api/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Wykorzystywane typy

### DTOs (Response Types)

Z pliku `src/types.ts`:

```typescript
// Główny typ odpowiedzi
DashboardDTO {
  weather_summary: WeatherSummaryDTO;
  equipment_status: EquipmentStatusDTO;
  community_activity: CommunityActivityDTO;
  personalization_status: PersonalizationStatusDTO;
}

// Komponenty odpowiedzi
WeatherSummaryDTO {
  location_id: string;
  current_temperature: number;
  feels_like: number;
  description: string;
  quick_recommendation: string;
}

EquipmentStatusDTO {
  active_bikes_count: number;
  upcoming_services: UpcomingServiceDTO[];
  overdue_services_count: number;
}

UpcomingServiceDTO {
  bike_id: string;
  bike_name: string;
  service_type: ServiceTypeEnum;
  target_mileage: number;
  current_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
}

CommunityActivityDTO {
  recent_outfits_count: number;
  similar_conditions_count: number;
}

PersonalizationStatusDTO {
  feedback_count: number;
  personalization_active: boolean;
  thermal_adjustment: number;
  next_personalization_at: number;
}
```

### Database Types

Z pliku `src/db/database.types.ts`:
- `profiles` table row
- `user_locations` table row
- `bikes` table row
- `service_reminders` table row
- `shared_outfits` view

### Enums

```typescript
ServiceTypeEnum = 'lancuch' | 'kaseta' | 'klocki_przod' | 'klocki_tyl' | 'opony' | 'przerzutki' | 'hamulce' | 'przeglad_ogolny' | 'inne'
ReminderStatusEnum = 'active' | 'completed' | 'overdue' | 'upcoming'
BikeStatusEnum = 'active' | 'archived' | 'sold'
```

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

```json
{
  "weather_summary": {
    "location_id": "550e8400-e29b-41d4-a716-446655440000",
    "current_temperature": 12.5,
    "feels_like": 10.2,
    "description": "scattered clouds",
    "quick_recommendation": "Long sleeves recommended"
  },
  "equipment_status": {
    "active_bikes_count": 2,
    "upcoming_services": [
      {
        "bike_id": "660e8400-e29b-41d4-a716-446655440001",
        "bike_name": "Trek Domane",
        "service_type": "lancuch",
        "target_mileage": 6000,
        "current_mileage": 5420,
        "km_remaining": 580,
        "status": "upcoming"
      }
    ],
    "overdue_services_count": 1
  },
  "community_activity": {
    "recent_outfits_count": 5,
    "similar_conditions_count": 3
  },
  "personalization_status": {
    "feedback_count": 15,
    "personalization_active": true,
    "thermal_adjustment": 0.5,
    "next_personalization_at": 20
  }
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

#### 404 Not Found (Location)
```json
{
  "error": "Location Not Found",
  "message": "Location with id '550e8400-e29b-41d4-a716-446655440000' not found or does not belong to user"
}
```

#### 404 Not Found (Default Location)
```json
{
  "error": "Location Not Found",
  "message": "User has no default location configured. Please set up a location first."
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred while processing the request"
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
Client Request
      ↓
[Authentication Middleware] → 401 if invalid
      ↓
[Route Handler: GET /api/dashboard]
      ↓
[Validate & Resolve Location ID]
      ├─ If location_id provided → Validate ownership
      └─ If not provided → Get default from profile
      ↓
[Parallel Data Fetching] ← Optymalizacja: wszystkie zapytania równolegle
      ├─ [Weather Service]
      │   └─ Check cache → API call if expired → Store in cache
      ├─ [Bike Service]
      │   ├─ Count active bikes
      │   └─ Get upcoming services (top 3, sorted by km_remaining)
      ├─ [Service Reminder Service]
      │   └─ Count overdue services
      ├─ [Community Service]
      │   ├─ Count recent outfits (24h, 50km radius)
      │   └─ Count similar conditions (±3°C, same radius)
      └─ [Profile Service]
          └─ Get personalization status
      ↓
[Aggregate Results into DashboardDTO]
      ↓
[Return 200 OK with JSON]
```

### Szczegółowy przepływ krok po kroku

#### Krok 1: Uwierzytelnienie
- Middleware weryfikuje JWT token z headera Authorization
- Pobiera `user_id` z `auth.uid()`
- Jeśli token nieprawidłowy → 401

#### Krok 2: Walidacja i rozwiązanie location_id
```typescript
// Pseudokod
let locationId: string;

if (query.location_id) {
  // Walidacja UUID
  if (!isValidUUID(query.location_id)) {
    return 400; // Bad Request
  }
  
  // Sprawdź czy lokalizacja należy do użytkownika
  const location = await supabase
    .from('user_locations')
    .select('id')
    .eq('id', query.location_id)
    .eq('user_id', user_id)
    .single();
  
  if (!location) {
    return 404; // Location Not Found
  }
  
  locationId = query.location_id;
} else {
  // Pobierz domyślną lokalizację z profilu
  const profile = await supabase
    .from('profiles')
    .select('default_location_id')
    .eq('id', user_id)
    .single();
  
  if (!profile.default_location_id) {
    return 404; // No default location
  }
  
  locationId = profile.default_location_id;
}
```

#### Krok 3: Równoległe pobieranie danych

```typescript
const [
  weatherSummary,
  equipmentStatus,
  communityActivity,
  personalizationStatus
] = await Promise.all([
  getWeatherSummary(locationId),
  getEquipmentStatus(user_id),
  getCommunityActivity(locationId),
  getPersonalizationStatus(user_id)
]);
```

##### 3.1 Weather Summary
```sql
-- 1. Pobierz współrzędne lokalizacji
SELECT location, city FROM user_locations WHERE id = $1;

-- 2. Pobierz pogodę (z cache lub API)
SELECT * FROM weather_cache 
WHERE ST_DWithin(location, $1::geography, 1000)
AND cached_at > NOW() - INTERVAL '1 hour'
LIMIT 1;

-- Jeśli cache miss → wywołaj OpenWeather API → zapisz do cache
```

Quick recommendation logic (rule-based):
```typescript
function getQuickRecommendation(temp: number): string {
  if (temp < 0) return "Winter gear required";
  if (temp < 5) return "Thermal layers recommended";
  if (temp < 10) return "Long sleeves recommended";
  if (temp < 15) return "Light jacket recommended";
  if (temp < 20) return "Short sleeves with arm warmers";
  return "Summer gear suitable";
}
```

##### 3.2 Equipment Status
```sql
-- Zapytanie zoptymalizowane (jedno query z CTEs)
WITH active_bikes AS (
  SELECT COUNT(*) as count
  FROM bikes
  WHERE user_id = $1 AND status = 'active'
),
upcoming_services AS (
  SELECT 
    sr.id,
    b.id as bike_id,
    b.name as bike_name,
    sr.service_type,
    sr.target_mileage,
    b.current_mileage,
    (sr.target_mileage - b.current_mileage) as km_remaining,
    CASE 
      WHEN sr.target_mileage - b.current_mileage <= 0 THEN 'overdue'
      WHEN sr.target_mileage - b.current_mileage <= 100 THEN 'upcoming'
      ELSE 'active'
    END as status
  FROM service_reminders sr
  JOIN bikes b ON sr.bike_id = b.id
  WHERE b.user_id = $1 
    AND b.status = 'active'
    AND sr.completed_at IS NULL
  ORDER BY km_remaining ASC
  LIMIT 5
),
overdue_count AS (
  SELECT COUNT(*) as count
  FROM service_reminders sr
  JOIN bikes b ON sr.bike_id = b.id
  WHERE b.user_id = $1 
    AND b.status = 'active'
    AND sr.completed_at IS NULL
    AND (sr.target_mileage - b.current_mileage) <= 0
)
SELECT 
  (SELECT count FROM active_bikes) as active_bikes_count,
  (SELECT json_agg(us.*) FROM upcoming_services us) as upcoming_services,
  (SELECT count FROM overdue_count) as overdue_services_count;
```

##### 3.3 Community Activity
```sql
-- Wykorzystuje spatial index idx_shared_outfits_geography
WITH user_location AS (
  SELECT location FROM user_locations WHERE id = $1
),
current_weather AS (
  SELECT temperature FROM weather_cache 
  WHERE location = (SELECT location FROM user_location)
  ORDER BY cached_at DESC LIMIT 1
)
SELECT 
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_outfits_count,
  COUNT(*) FILTER (
    WHERE temperature BETWEEN 
      (SELECT temperature FROM current_weather) - 3 
      AND 
      (SELECT temperature FROM current_weather) + 3
  ) as similar_conditions_count
FROM shared_outfits
WHERE ST_DWithin(
  location, 
  (SELECT location FROM user_location)::geography, 
  50000  -- 50km radius
)
AND created_at > NOW() - INTERVAL '7 days';
```

##### 3.4 Personalization Status
```sql
SELECT 
  feedback_count,
  thermal_adjustment,
  CASE 
    WHEN feedback_count >= 5 THEN true
    ELSE false
  END as personalization_active,
  CASE 
    WHEN feedback_count < 5 THEN 5 - feedback_count
    ELSE feedback_count + 5 - (feedback_count % 5)
  END as next_personalization_at
FROM profiles
WHERE id = $1;
```

#### Krok 4: Agregacja i zwrócenie odpowiedzi

```typescript
const dashboard: DashboardDTO = {
  weather_summary: weatherSummary,
  equipment_status: equipmentStatus,
  community_activity: communityActivity,
  personalization_status: personalizationStatus
};

return res.status(200).json(dashboard);
```

---

## 6. Względy bezpieczeństwa

### Uwierzytelnienie
- **Metoda:** Supabase Auth z tokenami JWT
- **Header:** `Authorization: Bearer <token>`
- **Weryfikacja:** Token musi być ważny i nie wygasły (1h TTL)
- **Implementacja:** Middleware auth sprawdza token przed dostępem do route handlera

### Autoryzacja
- **RLS (Row Level Security):** Włączone na wszystkich tabelach
- **Polityki RLS:**
  ```sql
  -- profiles: użytkownik widzi tylko swój profil
  CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
  
  -- user_locations: użytkownik widzi tylko swoje lokalizacje
  CREATE POLICY "Users can read own locations"
    ON user_locations FOR SELECT
    USING (auth.uid() = user_id);
  
  -- bikes: użytkownik widzi tylko swoje rowery
  CREATE POLICY "Users can read own bikes"
    ON bikes FOR SELECT
    USING (auth.uid() = user_id);
  
  -- service_reminders: przez JOIN z bikes
  CREATE POLICY "Users can read own reminders"
    ON service_reminders FOR SELECT
    USING (bike_id IN (
      SELECT id FROM bikes WHERE user_id = auth.uid()
    ));
  
  -- shared_outfits: publiczny widok (anonimizowany)
  CREATE POLICY "Anyone can read shared outfits"
    ON shared_outfits FOR SELECT
    USING (true);
  ```

### Walidacja danych wejściowych

```typescript
// Walidacja query parameters
const validateDashboardQuery = (query: any) => {
  const errors: string[] = [];
  
  // location_id (opcjonalny)
  if (query.location_id !== undefined) {
    if (typeof query.location_id !== 'string') {
      errors.push('location_id must be a string');
    } else if (!UUID_REGEX.test(query.location_id)) {
      errors.push('location_id must be a valid UUID');
    }
  }
  
  return errors;
};
```

### Zapobieganie atakom

#### SQL Injection
- ✅ Wszystkie zapytania używają parametryzowanych queries (Supabase client)
- ✅ Nigdy nie interpolujemy wartości użytkownika bezpośrednio do SQL

#### Authorization Bypass
- ✅ RLS wymuszane na poziomie bazy danych
- ✅ Podwójna weryfikacja właściciela zasobu w kodzie aplikacji
- ✅ Brak możliwości dostępu do danych innych użytkowników

#### Information Disclosure
- ✅ Komunikaty błędów nie ujawniają szczegółów implementacji
- ✅ Community data jest anonimizowana (pseudonimy zamiast prawdziwych nazw)
- ✅ Nie zwracamy szczegółów lokalizacji innych użytkowników

### Rate Limiting
**Rekomendacja:** Implementacja rate limiting na poziomie middleware lub Cloudflare
```typescript
// Przykładowa konfiguracja
{
  windowMs: 60000, // 1 minuta
  max: 30, // 30 requestów na okno
  message: 'Too many dashboard requests, please try again later'
}
```

### CORS
```typescript
// Konfiguracja dla Astro endpoint lub Express
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET']
}
```

---

## 7. Obsługa błędów

### Macierz błędów

| Kod | Scenariusz | Przyczyna | Komunikat | Akcja programisty |
|-----|-----------|-----------|-----------|-------------------|
| 400 | Bad Request | Nieprawidłowy format UUID | `Invalid location_id format` | Walidacja na poziomie route |
| 401 | Unauthorized | Brak tokenu | `Missing authentication token` | Middleware auth |
| 401 | Unauthorized | Nieprawidłowy token | `Invalid or expired token` | Middleware auth |
| 404 | Not Found | Lokalizacja nie istnieje | `Location not found or does not belong to user` | Query z RLS |
| 404 | Not Found | Brak domyślnej lokalizacji | `User has no default location configured` | Obsługa w service |
| 500 | Server Error | Błąd bazy danych | `Database query failed` | Try-catch + logging |
| 500 | Server Error | Błąd API pogody | `Failed to fetch weather data` | Fallback do cache |
| 503 | Service Unavailable | Supabase down | `Service temporarily unavailable` | Health check + retry |

### Implementacja obsługi błędów

```typescript
// Route handler z express-async-errors
app.get('/api/dashboard', async (req: Request, res: Response) => {
  try {
    // 1. Walidacja query params
    const errors = validateDashboardQuery(req.query);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: errors.join(', ')
      });
    }
    
    // 2. Pobierz user_id z auth
    const userId = req.user?.id; // Z middleware
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }
    
    // 3. Resolve location_id
    const locationId = await resolveLocationId(
      userId, 
      req.query.location_id as string | undefined
    );
    
    if (!locationId) {
      return res.status(404).json({
        error: 'Location Not Found',
        message: 'User has no default location configured'
      });
    }
    
    // 4. Fetch dashboard data
    const dashboard = await dashboardService.getDashboard(
      userId, 
      locationId
    );
    
    return res.status(200).json(dashboard);
    
  } catch (error) {
    // Logowanie do Sentry lub konsoli
    console.error('Dashboard error:', error);
    
    if (error instanceof LocationNotFoundError) {
      return res.status(404).json({
        error: 'Location Not Found',
        message: error.message
      });
    }
    
    // Generic server error
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

// Error middleware (Express)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred'
  });
});
```

### Custom Error Classes

```typescript
// src/errors/index.ts
export class LocationNotFoundError extends Error {
  constructor(locationId?: string) {
    super(locationId 
      ? `Location '${locationId}' not found or does not belong to user`
      : 'User has no default location configured'
    );
    this.name = 'LocationNotFoundError';
  }
}

export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(`Weather service error: ${message}`);
    this.name = 'WeatherServiceError';
  }
}
```

### Logging Strategy

```typescript
// Struktura logu
interface DashboardErrorLog {
  timestamp: string;
  user_id: string;
  endpoint: '/api/dashboard';
  method: 'GET';
  query_params: Record<string, any>;
  error_type: string;
  error_message: string;
  stack_trace?: string;
}

// Przykład logowania
logger.error('Dashboard fetch failed', {
  user_id: userId,
  location_id: locationId,
  error: error.message,
  stack: error.stack
});
```

---

## 8. Rozważania dotyczące wydajności

### Kluczowe wąskie gardła

1. **Wielokrotne zapytania do bazy danych**
   - Problem: Sekwencyjne wykonywanie 4-5 zapytań
   - Rozwiązanie: `Promise.all()` dla równoległego wykonania

2. **Weather API call latency**
   - Problem: Zewnętrzne API może być wolne (100-500ms)
   - Rozwiązanie: Agresywny caching (1h TTL)

3. **Spatial queries na shared_outfits**
   - Problem: `ST_DWithin` na dużych zbiorach danych może być wolny
   - Rozwiązanie: GIST spatial index + partial query (7 dni)

4. **N+1 problem w upcoming_services**
   - Problem: Pobieranie bike_name dla każdego reminderu
   - Rozwiązanie: JOIN w SQL zamiast multiple queries

### Strategie optymalizacji

#### 1. Database Indexing

```sql
-- Istniejące indeksy (z db-plan.md)
CREATE INDEX idx_bikes_active 
  ON bikes(user_id) 
  WHERE status = 'active';

CREATE INDEX idx_service_reminders_active 
  ON service_reminders(bike_id) 
  WHERE completed_at IS NULL;

CREATE INDEX idx_shared_outfits_geography 
  ON shared_outfits 
  USING GIST(location);

CREATE INDEX idx_shared_outfits_community 
  ON shared_outfits(reputation_badge, created_at);

-- Dodatkowy indeks dla weather cache
CREATE INDEX idx_weather_cache_location_time
  ON weather_cache
  USING GIST(location)
  WHERE cached_at > NOW() - INTERVAL '1 hour';
```

#### 2. Query Optimization

**Przed optymalizacją (N+1):**
```typescript
// ❌ Wolne - wiele zapytań
const reminders = await supabase
  .from('service_reminders')
  .select('*')
  .eq('bike_id', bikeId);

for (const reminder of reminders) {
  const bike = await supabase
    .from('bikes')
    .select('name')
    .eq('id', reminder.bike_id)
    .single();
  // ...
}
```

**Po optymalizacji (JOIN):**
```typescript
// ✅ Szybkie - jedno zapytanie
const reminders = await supabase
  .from('service_reminders')
  .select(`
    *,
    bikes!inner(id, name, current_mileage)
  `)
  .eq('bikes.user_id', userId)
  .eq('bikes.status', 'active')
  .is('completed_at', null)
  .order('target_mileage', { ascending: true })
  .limit(5);
```

#### 3. Caching Strategy

**Multi-level caching:**

```typescript
// Level 1: In-memory cache (Node.js)
const memoryCache = new Map<string, CacheEntry>();

// Level 2: Database cache (weather_cache table)
// Level 3: External API (OpenWeather)

async function getWeather(locationId: string): Promise<WeatherDTO> {
  const cacheKey = `weather:${locationId}`;
  
  // Check memory cache (fastest)
  const memCached = memoryCache.get(cacheKey);
  if (memCached && memCached.expiresAt > Date.now()) {
    return memCached.data;
  }
  
  // Check DB cache
  const dbCached = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location_id', locationId)
    .gte('cached_at', new Date(Date.now() - 3600000)) // 1h
    .single();
  
  if (dbCached) {
    // Store in memory for next request
    memoryCache.set(cacheKey, {
      data: dbCached,
      expiresAt: Date.now() + 3600000
    });
    return transformToWeatherDTO(dbCached);
  }
  
  // Fetch from API (slowest)
  const apiData = await fetchFromOpenWeather(locationId);
  
  // Store in DB cache
  await supabase.from('weather_cache').insert({
    location_id: locationId,
    ...apiData,
    cached_at: new Date()
  });
  
  // Store in memory cache
  memoryCache.set(cacheKey, {
    data: apiData,
    expiresAt: Date.now() + 3600000
  });
  
  return apiData;
}
```

#### 4. Response Time Budget

| Komponent | Target | Max |
|-----------|--------|-----|
| Auth middleware | <5ms | 10ms |
| Location resolution | <10ms | 20ms |
| Weather fetch (cached) | <20ms | 50ms |
| Equipment status query | <30ms | 100ms |
| Community query | <50ms | 150ms |
| Personalization query | <10ms | 20ms |
| **Total endpoint** | **<150ms** | **300ms** |

#### 5. Monitoring Queries

```sql
-- Sprawdź query performance
EXPLAIN ANALYZE
SELECT /* dashboard query */;

-- Znajdź wolne zapytania
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%dashboard%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 6. Connection Pooling

```typescript
// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Dla server-side
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-application-name': 'cyclegear-api',
      },
    },
  }
);
```

### Performance Testing

```typescript
// Test performance dashboardu
async function benchmarkDashboard() {
  const iterations = 100;
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch('/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const end = performance.now();
    times.push(end - start);
  }
  
  console.log({
    mean: times.reduce((a, b) => a + b) / times.length,
    p50: times.sort()[Math.floor(times.length * 0.5)],
    p95: times.sort()[Math.floor(times.length * 0.95)],
    p99: times.sort()[Math.floor(times.length * 0.99)],
  });
}
```

---

## 9. Etapy wdrożenia

### Faza 1: Setup i typy (Day 1)

**1.1. Przygotowanie struktury plików**
```bash
src/
├── routes/
│   └── api/
│       └── dashboard.ts          # Route handler
├── services/
│   ├── dashboard.service.ts      # Główny service agregujący
│   ├── weather.service.ts        # Logika pogody
│   ├── bike.service.ts           # Logika rowerów i serwisów
│   ├── community.service.ts      # Logika społeczności
│   └── profile.service.ts        # Logika profilu
├── middleware/
│   └── auth.middleware.ts        # Uwierzytelnienie (jeśli nie istnieje)
├── errors/
│   └── dashboard.errors.ts       # Custom error classes
└── types.ts                       # Już istnieje
```

**1.2. Weryfikacja typów w `src/types.ts`**
- ✅ Sprawdź czy wszystkie typy DTO są zdefiniowane
- ✅ `DashboardDTO`, `WeatherSummaryDTO`, `EquipmentStatusDTO`, etc.

**1.3. Dodanie custom error classes**
```typescript
// src/errors/dashboard.errors.ts
export class LocationNotFoundError extends Error {
  constructor(locationId?: string) {
    super(locationId 
      ? `Location '${locationId}' not found`
      : 'No default location configured'
    );
    this.name = 'LocationNotFoundError';
  }
}

export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(`Weather service error: ${message}`);
    this.name = 'WeatherServiceError';
  }
}
```

### Faza 2: Services Layer (Day 1-2)

**2.1. Profile Service (`src/services/profile.service.ts`)**
```typescript
export class ProfileService {
  /**
   * Pobiera default_location_id dla użytkownika
   */
  async getDefaultLocation(userId: string): Promise<string | null>;
  
  /**
   * Pobiera status personalizacji
   */
  async getPersonalizationStatus(userId: string): Promise<PersonalizationStatusDTO>;
}
```

**2.2. Weather Service (`src/services/weather.service.ts`)**
```typescript
export class WeatherService {
  /**
   * Pobiera podsumowanie pogody dla lokalizacji
   * - Sprawdza cache w bazie (1h TTL)
   * - Jeśli miss, wywołuje OpenWeather API
   * - Generuje quick_recommendation
   */
  async getWeatherSummary(locationId: string): Promise<WeatherSummaryDTO>;
  
  /**
   * Helper: generuje quick recommendation na podstawie temperatury
   */
  private getQuickRecommendation(temp: number): string;
}
```

**2.3. Bike Service (`src/services/bike.service.ts`)**
```typescript
export class BikeService {
  /**
   * Pobiera equipment status (bikes + reminders)
   * - Zlicza aktywne rowery
   * - Pobiera top 5 najbliższych serwisów
   * - Zlicza przeterminowane serwisy
   */
  async getEquipmentStatus(userId: string): Promise<EquipmentStatusDTO>;
}
```

**2.4. Community Service (`src/services/community.service.ts`)**
```typescript
export class CommunityService {
  /**
   * Pobiera aktywność społeczności
   * - Recent outfits count (24h, 50km)
   * - Similar conditions count (±3°C)
   */
  async getCommunityActivity(locationId: string): Promise<CommunityActivityDTO>;
}
```

**2.5. Dashboard Service (`src/services/dashboard.service.ts`)**
```typescript
export class DashboardService {
  constructor(
    private weatherService: WeatherService,
    private bikeService: BikeService,
    private communityService: CommunityService,
    private profileService: ProfileService
  ) {}
  
  /**
   * Główna metoda agregująca wszystkie dane dashboardu
   * Wykonuje równoległe zapytania dla optymalizacji
   */
  async getDashboard(
    userId: string, 
    locationId: string
  ): Promise<DashboardDTO> {
    const [
      weatherSummary,
      equipmentStatus,
      communityActivity,
      personalizationStatus
    ] = await Promise.all([
      this.weatherService.getWeatherSummary(locationId),
      this.bikeService.getEquipmentStatus(userId),
      this.communityService.getCommunityActivity(locationId),
      this.profileService.getPersonalizationStatus(userId)
    ]);
    
    return {
      weather_summary: weatherSummary,
      equipment_status: equipmentStatus,
      community_activity: communityActivity,
      personalization_status: personalizationStatus
    };
  }
}
```

### Faza 3: Route Handler (Day 2)

**3.1. Auth Middleware (jeśli nie istnieje)**
```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase.client';

export async function authenticateUser(
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authentication token'
      });
    }
    
    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }
    
    req.user = { id: user.id }; // Attach user to request
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
}
```

**3.2. Dashboard Route Handler**
```typescript
// src/routes/api/dashboard.ts
import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth.middleware';
import { DashboardService } from '../../services/dashboard.service';
import { ProfileService } from '../../services/profile.service';
import { LocationNotFoundError } from '../../errors/dashboard.errors';

const router = Router();
const dashboardService = new DashboardService(/* inject dependencies */);
const profileService = new ProfileService();

/**
 * GET /api/dashboard
 * Pobiera zagregowane dane dla dashboard view
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { location_id } = req.query;
    
    // Walidacja location_id (jeśli podane)
    if (location_id && typeof location_id !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'location_id must be a string'
      });
    }
    
    if (location_id && !isValidUUID(location_id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'location_id must be a valid UUID'
      });
    }
    
    // Resolve location_id
    let locationId: string;
    
    if (location_id) {
      // Weryfikacja własności lokalizacji
      const location = await supabase
        .from('user_locations')
        .select('id')
        .eq('id', location_id)
        .eq('user_id', userId)
        .single();
      
      if (!location.data) {
        throw new LocationNotFoundError(location_id as string);
      }
      
      locationId = location_id as string;
    } else {
      // Pobierz domyślną lokalizację
      const defaultLocation = await profileService.getDefaultLocation(userId);
      
      if (!defaultLocation) {
        throw new LocationNotFoundError();
      }
      
      locationId = defaultLocation;
    }
    
    // Fetch dashboard data
    const dashboard = await dashboardService.getDashboard(userId, locationId);
    
    return res.status(200).json(dashboard);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    
    if (error instanceof LocationNotFoundError) {
      return res.status(404).json({
        error: 'Location Not Found',
        message: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    });
  }
});

export default router;
```

**3.3. Helper functions**
```typescript
// src/utils/validation.ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
```

### Faza 4: Database Queries (Day 2-3)

**4.1. Profile Service - implementacja zapytań**
```typescript
async getDefaultLocation(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('default_location_id')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.default_location_id;
}

async getPersonalizationStatus(userId: string): Promise<PersonalizationStatusDTO> {
  const { data, error } = await supabase
    .from('profiles')
    .select('feedback_count, thermal_adjustment')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    throw new Error('Failed to fetch personalization status');
  }
  
  const feedbackCount = data.feedback_count ?? 0;
  const thermalAdjustment = data.thermal_adjustment ?? 0;
  
  return {
    feedback_count: feedbackCount,
    personalization_active: feedbackCount >= 5,
    thermal_adjustment: thermalAdjustment,
    next_personalization_at: feedbackCount < 5 
      ? 5 
      : feedbackCount + (5 - (feedbackCount % 5))
  };
}
```

**4.2. Weather Service - implementacja z cachingiem**
```typescript
async getWeatherSummary(locationId: string): Promise<WeatherSummaryDTO> {
  // 1. Pobierz współrzędne lokalizacji
  const { data: location, error: locError } = await supabase
    .from('user_locations')
    .select('location, city')
    .eq('id', locationId)
    .single();
  
  if (locError || !location) {
    throw new WeatherServiceError('Location not found');
  }
  
  // 2. Sprawdź cache
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location_id', locationId)
    .gte('cached_at', oneHourAgo.toISOString())
    .order('cached_at', { ascending: false })
    .limit(1)
    .single();
  
  let weatherData;
  
  if (cached) {
    // Użyj cache
    weatherData = {
      temperature: cached.temperature,
      feels_like: cached.feels_like,
      description: cached.description
    };
  } else {
    // Fetch z API
    weatherData = await this.fetchFromOpenWeather(location.location);
    
    // Zapisz do cache
    await supabase.from('weather_cache').insert({
      location_id: locationId,
      ...weatherData,
      cached_at: new Date().toISOString()
    });
  }
  
  return {
    location_id: locationId,
    current_temperature: weatherData.temperature,
    feels_like: weatherData.feels_like,
    description: weatherData.description,
    quick_recommendation: this.getQuickRecommendation(weatherData.temperature)
  };
}

private getQuickRecommendation(temp: number): string {
  if (temp < 0) return "Winter gear required";
  if (temp < 5) return "Thermal layers recommended";
  if (temp < 10) return "Long sleeves recommended";
  if (temp < 15) return "Light jacket recommended";
  if (temp < 20) return "Short sleeves with arm warmers";
  return "Summer gear suitable";
}
```

**4.3. Bike Service - zoptymalizowane zapytanie**
```typescript
async getEquipmentStatus(userId: string): Promise<EquipmentStatusDTO> {
  // Query z CTE dla optymalizacji
  const { data, error } = await supabase.rpc('get_equipment_status', {
    p_user_id: userId
  });
  
  if (error) {
    throw new Error(`Failed to fetch equipment status: ${error.message}`);
  }
  
  return {
    active_bikes_count: data.active_bikes_count,
    upcoming_services: data.upcoming_services?.map(transformToUpcomingServiceDTO) ?? [],
    overdue_services_count: data.overdue_services_count
  };
}

// Alternative: Jeśli nie używamy RPC, bezpośrednie zapytania
async getEquipmentStatusDirect(userId: string): Promise<EquipmentStatusDTO> {
  // Równoległe zapytania
  const [activeBikesResult, remindersResult] = await Promise.all([
    // Count active bikes
    supabase
      .from('bikes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active'),
    
    // Get upcoming services with bike details
    supabase
      .from('service_reminders')
      .select(`
        id,
        service_type,
        target_mileage,
        bikes!inner(
          id,
          name,
          current_mileage,
          user_id,
          status
        )
      `)
      .eq('bikes.user_id', userId)
      .eq('bikes.status', 'active')
      .is('completed_at', null)
      .order('target_mileage', { ascending: true })
      .limit(10)
  ]);
  
  const activeBikesCount = activeBikesResult.count ?? 0;
  const reminders = remindersResult.data ?? [];
  
  // Calculate km_remaining and status
  const upcomingServices: UpcomingServiceDTO[] = reminders
    .map(reminder => {
      const bike = reminder.bikes as any;
      const kmRemaining = reminder.target_mileage - (bike.current_mileage ?? 0);
      
      return {
        bike_id: bike.id,
        bike_name: bike.name,
        service_type: reminder.service_type,
        target_mileage: reminder.target_mileage,
        current_mileage: bike.current_mileage ?? 0,
        km_remaining: kmRemaining,
        status: kmRemaining <= 0 ? 'overdue' 
              : kmRemaining <= 100 ? 'upcoming' 
              : 'active'
      };
    })
    .sort((a, b) => a.km_remaining - b.km_remaining)
    .slice(0, 5);
  
  const overdueCount = upcomingServices.filter(s => s.status === 'overdue').length;
  
  return {
    active_bikes_count: activeBikesCount,
    upcoming_services: upcomingServices,
    overdue_services_count: overdueCount
  };
}
```

**4.4. Community Service - spatial query**
```typescript
async getCommunityActivity(locationId: string): Promise<CommunityActivityDTO> {
  // 1. Pobierz współrzędne lokalizacji użytkownika
  const { data: location, error: locError } = await supabase
    .from('user_locations')
    .select('location')
    .eq('id', locationId)
    .single();
  
  if (locError || !location) {
    throw new Error('Location not found');
  }
  
  // 2. Pobierz aktualną temperaturę
  const { data: weather } = await supabase
    .from('weather_cache')
    .select('temperature')
    .eq('location_id', locationId)
    .order('cached_at', { ascending: false })
    .limit(1)
    .single();
  
  const currentTemp = weather?.temperature ?? 15; // fallback
  
  // 3. Query shared outfits w promieniu 50km
  const { data: outfits, error } = await supabase.rpc(
    'get_community_activity',
    {
      p_location: location.location,
      p_temperature: currentTemp,
      p_radius_m: 50000
    }
  );
  
  if (error) {
    console.error('Community activity error:', error);
    // Fallback do zerowych wartości
    return {
      recent_outfits_count: 0,
      similar_conditions_count: 0
    };
  }
  
  return {
    recent_outfits_count: outfits?.recent_count ?? 0,
    similar_conditions_count: outfits?.similar_count ?? 0
  };
}
```

### Faza 5: Database Functions (Day 3)

**5.1. RPC Function: get_equipment_status**
```sql
-- Tworzenie funkcji PostgreSQL dla optymalizacji
CREATE OR REPLACE FUNCTION get_equipment_status(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH active_bikes AS (
    SELECT COUNT(*) as count
    FROM bikes
    WHERE user_id = p_user_id AND status = 'active'
  ),
  upcoming_services AS (
    SELECT 
      sr.id,
      b.id as bike_id,
      b.name as bike_name,
      sr.service_type,
      sr.target_mileage,
      b.current_mileage,
      (sr.target_mileage - COALESCE(b.current_mileage, 0)) as km_remaining,
      CASE 
        WHEN sr.target_mileage - COALESCE(b.current_mileage, 0) <= 0 THEN 'overdue'
        WHEN sr.target_mileage - COALESCE(b.current_mileage, 0) <= 100 THEN 'upcoming'
        ELSE 'active'
      END as status
    FROM service_reminders sr
    JOIN bikes b ON sr.bike_id = b.id
    WHERE b.user_id = p_user_id 
      AND b.status = 'active'
      AND sr.completed_at IS NULL
    ORDER BY km_remaining ASC
    LIMIT 10
  ),
  overdue_count AS (
    SELECT COUNT(*) as count
    FROM upcoming_services
    WHERE status = 'overdue'
  )
  SELECT json_build_object(
    'active_bikes_count', (SELECT count FROM active_bikes),
    'upcoming_services', (
      SELECT COALESCE(json_agg(us.*), '[]'::json)
      FROM (SELECT * FROM upcoming_services LIMIT 5) us
    ),
    'overdue_services_count', (SELECT count FROM overdue_count)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION get_equipment_status(UUID) TO authenticated;
```

**5.2. RPC Function: get_community_activity**
```sql
CREATE OR REPLACE FUNCTION get_community_activity(
  p_location GEOMETRY,
  p_temperature NUMERIC,
  p_radius_m INTEGER DEFAULT 50000
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'recent_count', COUNT(*) FILTER (
      WHERE created_at > NOW() - INTERVAL '24 hours'
    ),
    'similar_count', COUNT(*) FILTER (
      WHERE temperature BETWEEN p_temperature - 3 AND p_temperature + 3
    )
  ) INTO result
  FROM shared_outfits
  WHERE ST_DWithin(
    location::geography, 
    p_location::geography, 
    p_radius_m
  )
  AND created_at > NOW() - INTERVAL '7 days';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION get_community_activity(GEOMETRY, NUMERIC, INTEGER) TO authenticated;
```

### Faza 6: Testing (Day 3-4)

**6.1. Unit Tests - Services**
```typescript
// tests/services/dashboard.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { DashboardService } from '../../src/services/dashboard.service';

describe('DashboardService', () => {
  it('should aggregate dashboard data correctly', async () => {
    const mockWeatherService = {
      getWeatherSummary: vi.fn().mockResolvedValue({
        location_id: 'loc-1',
        current_temperature: 15,
        feels_like: 13,
        description: 'clear sky',
        quick_recommendation: 'Light jacket recommended'
      })
    };
    
    // ... mock other services
    
    const service = new DashboardService(
      mockWeatherService as any,
      mockBikeService as any,
      mockCommunityService as any,
      mockProfileService as any
    );
    
    const result = await service.getDashboard('user-1', 'loc-1');
    
    expect(result).toHaveProperty('weather_summary');
    expect(result).toHaveProperty('equipment_status');
    expect(result).toHaveProperty('community_activity');
    expect(result).toHaveProperty('personalization_status');
  });
  
  it('should execute all queries in parallel', async () => {
    // Test że Promise.all jest używane
    const startTime = Date.now();
    await service.getDashboard('user-1', 'loc-1');
    const endTime = Date.now();
    
    // Powinno być szybsze niż suma czasów sekwencyjnych
    expect(endTime - startTime).toBeLessThan(500);
  });
});
```

**6.2. Integration Tests - Route**
```typescript
// tests/routes/dashboard.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/dashboard', () => {
  let authToken: string;
  let testLocationId: string;
  
  beforeAll(async () => {
    // Setup test user and get token
    authToken = await getTestAuthToken();
    testLocationId = await createTestLocation();
  });
  
  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .get('/api/dashboard');
    
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Unauthorized');
  });
  
  it('should return 200 with valid auth and default location', async () => {
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('weather_summary');
    expect(response.body).toHaveProperty('equipment_status');
    expect(response.body).toHaveProperty('community_activity');
    expect(response.body).toHaveProperty('personalization_status');
  });
  
  it('should return 200 with specific location_id', async () => {
    const response = await request(app)
      .get(`/api/dashboard?location_id=${testLocationId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.weather_summary.location_id).toBe(testLocationId);
  });
  
  it('should return 400 with invalid UUID format', async () => {
    const response = await request(app)
      .get('/api/dashboard?location_id=invalid-uuid')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Bad Request');
  });
  
  it('should return 404 with non-existent location', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app)
      .get(`/api/dashboard?location_id=${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Location Not Found');
  });
  
  it('should return 404 when user has no default location', async () => {
    // Create user without default location
    const newUserToken = await createUserWithoutLocation();
    
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${newUserToken}`);
    
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('no default location');
  });
});
```

**6.3. Performance Tests**
```typescript
// tests/performance/dashboard.bench.ts
import { describe, bench } from 'vitest';

describe('Dashboard Performance', () => {
  bench('GET /api/dashboard', async () => {
    await fetch('http://localhost:3000/api/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }, { iterations: 100 });
  
  // Target: p95 < 300ms
});
```

### Faza 7: Documentation & Monitoring (Day 4)

**7.1. API Documentation (OpenAPI/Swagger)**
```yaml
# docs/openapi.yaml
paths:
  /api/dashboard:
    get:
      summary: Get dashboard summary data
      description: Returns aggregated data for the user's dashboard view including weather, equipment status, community activity, and personalization status.
      tags:
        - Dashboard
      security:
        - BearerAuth: []
      parameters:
        - in: query
          name: location_id
          schema:
            type: string
            format: uuid
          required: false
          description: Location ID for weather data. Defaults to user's default location if not provided.
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DashboardDTO'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/LocationNotFound'
        '500':
          $ref: '#/components/responses/InternalServerError'
```

**7.2. Monitoring Setup**
```typescript
// src/middleware/monitoring.ts
import { Request, Response, NextFunction } from 'express';

export function monitorDashboard(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log to monitoring service (Sentry, Datadog, etc.)
    logger.info('Dashboard request completed', {
      user_id: req.user?.id,
      location_id: req.query.location_id,
      status_code: res.statusCode,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    });
    
    // Alert if slow
    if (duration > 500) {
      logger.warn('Slow dashboard request', {
        duration_ms: duration,
        user_id: req.user?.id
      });
    }
  });
  
  next();
}
```

**7.3. Health Check**
```typescript
// src/routes/health.ts
router.get('/health/dashboard', async (req, res) => {
  const checks = {
    database: false,
    weather_api: false,
    spatial_index: false
  };
  
  try {
    // Test DB connection
    await supabase.from('profiles').select('id').limit(1);
    checks.database = true;
    
    // Test weather cache
    await supabase.from('weather_cache').select('id').limit(1);
    checks.weather_api = true;
    
    // Test spatial query
    await supabase.rpc('get_community_activity', {
      p_location: 'POINT(0 0)',
      p_temperature: 15,
      p_radius_m: 1000
    });
    checks.spatial_index = true;
    
    return res.status(200).json({
      status: 'healthy',
      checks
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unhealthy',
      checks,
      error: error.message
    });
  }
});
```

### Faza 8: Deployment Checklist (Day 4)

**8.1. Pre-deployment**
- [ ] Wszystkie testy przechodzą (unit, integration, E2E)
- [ ] Linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`npm run build`)
- [ ] Performance testy spełniają SLA (<300ms p95)
- [ ] Code review zakończony i zatwierdzony
- [ ] Documentation zaktualizowana

**8.2. Database**
- [ ] Indeksy utworzone w Supabase:
  - `idx_bikes_active`
  - `idx_service_reminders_active`
  - `idx_shared_outfits_geography`
  - `idx_weather_cache_location_time`
- [ ] RLS policies aktywne i przetestowane
- [ ] Database functions deployed:
  - `get_equipment_status(UUID)`
  - `get_community_activity(GEOMETRY, NUMERIC, INTEGER)`

**8.3. Environment Variables**
```bash
# .env.production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
OPENWEATHER_API_KEY=xxx
NODE_ENV=production
LOG_LEVEL=info
```

**8.4. Monitoring**
- [ ] Sentry error tracking configured
- [ ] Performance monitoring active
- [ ] Alerts configured for:
  - Response time > 500ms
  - Error rate > 1%
  - 404 rate > 10%

**8.5. Rollback Plan**
```bash
# W przypadku problemu:
1. Revert deployment na Cloudflare Pages
2. Sprawdź logi w Sentry
3. Przywróć poprzednią wersję bazy (jeśli migrations)
4. Komunikat dla użytkowników (jeśli downtime > 5min)
```

---

## 10. Checklist końcowy

### ✅ Implemented
- [ ] Route handler `/api/dashboard`
- [ ] Auth middleware
- [ ] Services layer (5 services)
- [ ] Database queries optimized
- [ ] PostgreSQL functions (RPC)
- [ ] Error handling
- [ ] Validation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Documentation
- [ ] Monitoring
- [ ] Deployment configuration

### 📊 Performance Metrics
- Target: p95 < 300ms ✅
- Parallel queries: Yes ✅
- Caching: 3-level ✅
- Indexes: All created ✅

### 🔒 Security
- Authentication: JWT ✅
- Authorization: RLS ✅
- Input validation: UUID, types ✅
- Error messages: Safe ✅

### 📝 Documentation
- API spec (OpenAPI) ✅
- Code comments ✅
- README updated ✅
- Monitoring setup ✅

---

## 11. Maintenance & Future Improvements

### Monitoring Queries
```sql
-- Sprawdź wykorzystanie endpointu
SELECT COUNT(*) as requests, 
       AVG(duration_ms) as avg_duration,
       MAX(duration_ms) as max_duration
FROM api_logs
WHERE endpoint = '/api/dashboard'
  AND created_at > NOW() - INTERVAL '24 hours';

-- Znajdź wolne zapytania
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%get_equipment_status%'
ORDER BY mean_exec_time DESC;
```

### Potential Optimizations (v2)
1. **Redis caching layer** - dla in-memory cache weather data
2. **GraphQL alternative** - pozwól klientowi wybierać pola
3. **Server-Sent Events** - real-time updates dla dashboardu
4. **Materialized view** - pre-computed community stats
5. **CDN caching** - dla statycznych części odpowiedzi (z user-specific headers)

### Known Limitations
- Weather API ma limit 1000 calls/day (monitorować usage)
- Spatial queries mogą być wolne na > 100k shared_outfits (consider archiving)
- No real-time updates (requires WebSocket lub SSE)

---

**Plan gotowy do implementacji. Szacowany czas: 4 dni pracy (1 developer).**

