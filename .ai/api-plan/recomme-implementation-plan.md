# API Endpoint Implementation Plan: GET /api/recommendations

## 1. Przegląd punktu końcowego

### Cel
Endpoint zwraca spersonalizowaną rekomendację stroju dla rowerzysty na podstawie aktualnych lub prognozowanych warunków pogodowych, preferencji termicznych użytkownika oraz typu aktywności.

### Funkcjonalność
- Pobiera dane pogodowe (aktualne lub prognoza) dla wybranej lokalizacji
- Stosuje hybrydowe podejście: szybki algorytm rule-based (<10ms) + AI enhancement dla dodatkowych wskazówek
- Uwzględnia personalizację użytkownika (thermal_adjustment z feedbacków)
- Cachuje dane pogodowe (30 min dla current, 6h dla forecast)
- Generuje rekomendacje dla 7 stref ciała (głowa, tułów, ramiona, dłonie, nogi, stopy, szyja)

### Kluczowe Wymagania
- Wysoka wydajność: core recommendation <10ms
- Graceful degradation: AI tips opcjonalne (nie blokuje response)
- Rate limiting: AI tips max 100/user/day, weather API 1000/day shared
- GDPR compliant: nie loguje PII, respect user preferences

---

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
GET /api/recommendations
```

### Query Parameters

#### Wymagane:
| Parametr | Typ | Opis | Walidacja |
|----------|-----|------|-----------|
| `location_id` | UUID | Identyfikator lokalizacji użytkownika | - Valid UUID format<br>- Istnieje w `user_locations`<br>- Należy do auth user (RLS + explicit) |

#### Opcjonalne:
| Parametr | Typ | Default | Opis | Walidacja |
|----------|-----|---------|------|-----------|
| `activity_type` | enum | `spokojna` | Typ aktywności | Jeden z: `recovery`, `spokojna`, `tempo`, `interwaly` |
| `duration_minutes` | integer | `90` | Czas trwania treningu (minuty) | - Positive integer<br>- Range: 10-600<br>- Wpływa na intensywność rekomendacji |
| `date` | string | `null` | Data (ISO 8601) dla prognozy | - Valid ISO 8601 format<br>- Nie wcześniej niż dziś<br>- Max 7 dni w przód<br>- Jeśli null: current weather |

### Request Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Przykładowe żądania:
```
# Current weather, default activity
GET /api/recommendations?location_id=550e8400-e29b-41d4-a716-446655440000

# Specific activity and duration
GET /api/recommendations?location_id=550e8400-e29b-41d4-a716-446655440000&activity_type=tempo&duration_minutes=120

# Future forecast
GET /api/recommendations?location_id=550e8400-e29b-41d4-a716-446655440000&date=2025-10-12
```

---

## 3. Wykorzystywane typy

### Request Types
```typescript
// Query parameters (z types.ts)
GetRecommendationParams {
  location_id: string;
  activity_type?: ActivityTypeEnum;
  duration_minutes?: number;
  date?: string;
}

ActivityTypeEnum = 'recovery' | 'spokojna' | 'tempo' | 'interwaly';
```

### Response Types
```typescript
// Main response DTO (z types.ts)
RecommendationDTO {
  weather: WeatherDTO;
  recommendation: OutfitDTO;
  additional_tips: string[];
  personalized: boolean;
  thermal_adjustment: number;
  computation_time_ms: number;
}

WeatherDTO {
  temperature: number;
  feels_like: number;
  wind_speed: number;
  humidity: number;
  rain_mm: number;
  description: string;
  icon: string;
}

OutfitDTO {
  head: string;
  torso: OutfitTorso;
  arms: string;
  hands: string;
  legs: string;
  feet: OutfitFeet;
  neck: string;
}

OutfitTorso {
  base: string;
  mid: string;
  outer: string;
}

OutfitFeet {
  socks: string;
  covers: string;
}
```

### Internal Service Types
```typescript
// Weather cache structure (JSONB w bazie)
interface WeatherCacheEntry {
  data: WeatherDTO;
  forecast?: ForecastDayDTO[];
  cached_at: string;
  ttl_seconds: number;
}

// Rule-based algorithm input
interface RecommendationInput {
  adjustedTemp: number;      // temperature + thermal_adjustment
  windSpeed: number;
  rainMm: number;
  humidity: number;
  activityType: ActivityTypeEnum;
  durationMinutes: number;
  userPreferences: ThermalPreferences | null;
}

// AI enhancement input
interface AITipsInput {
  weather: WeatherDTO;
  outfit: OutfitDTO;
  activityType: ActivityTypeEnum;
  specialConditions: string[];  // e.g., ["heavy_rain", "extreme_cold"]
}
```

---

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

```json
{
  "weather": {
    "temperature": 10.5,
    "feels_like": 8.2,
    "wind_speed": 12.5,
    "humidity": 65,
    "rain_mm": 0,
    "description": "scattered clouds",
    "icon": "03d"
  },
  "recommendation": {
    "head": "czapka",
    "torso": {
      "base": "termo",
      "mid": "softshell",
      "outer": "nic"
    },
    "arms": "naramienniki",
    "hands": "rekawiczki_przejsciowe",
    "legs": "dlugie",
    "feet": {
      "socks": "zimowe",
      "covers": "ochraniacze"
    },
    "neck": "buff"
  },
  "additional_tips": [
    "Rozważ zabranie lekkiej kurtki - możliwy deszcz",
    "Ochrona przed wiatrem zalecana na odsłoniętych partiach"
  ],
  "personalized": true,
  "thermal_adjustment": 0.5,
  "computation_time_ms": 45
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "location_id",
        "message": "Invalid UUID format"
      }
    ]
  }
}
```

**Przyczyny:**
- Invalid UUID format dla `location_id`
- Invalid `activity_type` (nie jest jednym z enum values)
- Invalid `duration_minutes` (negative, 0, lub > 600)
- Invalid `date` format (nie ISO 8601)
- `date` w przeszłości (> 24h wstecz)
- `date` za daleko w przyszłość (> 7 dni)

#### 401 Unauthorized
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**Przyczyny:**
- Brak `Authorization` header
- Invalid/expired JWT token

#### 404 Location Not Found
```json
{
  "error": {
    "code": "LOCATION_NOT_FOUND",
    "message": "Location not found or does not belong to user",
    "details": [
      {
        "field": "location_id",
        "message": "Location with ID 550e8400-... not found"
      }
    ]
  }
}
```

**Przyczyny:**
- `location_id` nie istnieje w bazie
- `location_id` należy do innego użytkownika (RLS block)

#### 429 Rate Limited
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

**Przyczyny:**
- Przekroczony limit AI enhancement (100/user/day)
- Przekroczony limit weather API (1000/day shared)

#### 503 Service Unavailable
```json
{
  "error": {
    "code": "WEATHER_SERVICE_UNAVAILABLE",
    "message": "Weather service temporarily unavailable",
    "details": [
      {
        "service": "openweather_api",
        "message": "Connection timeout"
      }
    ]
  }
}
```

**Przyczyny:**
- OpenWeather API down/timeout
- Network issues z external API

**Note:** AI service failure NIE powoduje 503 - graceful degradation (empty `additional_tips`)

---

## 5. Przepływ danych

### High-Level Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/recommendations?location_id=...&activity_type=tempo
       ▼
┌─────────────────────────────────────────────────────────────┐
│              API Endpoint Handler (Astro)                    │
│  1. Parse & validate query params                            │
│  2. Extract user from JWT (Astro.locals.user)                │
└──────┬──────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│         LocationService.verifyOwnership()                    │
│  Check if location_id belongs to authenticated user          │
│  (Query: user_locations WHERE id = ? AND user_id = ?)        │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├────────────────────────┬────────────────────────────┐
       ▼                        ▼                            ▼
┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐
│WeatherService│    │  ProfileService    │    │ Start Timer      │
│              │    │                    │    │ (performance)    │
│getWeather()  │    │getUserProfile()    │    └──────────────────┘
│              │    │                    │
│1. Check      │    │Get thermal_        │
│   cache      │    │adjustment from     │
│   (weather_  │    │profiles table      │
│   cache)     │    │                    │
│              │    │Default: 0.0        │
│2. If miss/   │    └────────┬───────────┘
│   expired:   │             │
│   - Call     │             │
│     OpenWea- │             │
│     ther API │             │
│   - Parse    │             │
│   - Update   │             │
│     cache    │             │
│   - Set TTL  │             │
│     (30min/  │             │
│     6h)      │             │
└──────┬───────┘             │
       │                     │
       │  WeatherDTO         │ thermal_adjustment: number
       └──────┬──────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│     RecommendationService.generateOutfit()                   │
│                                                              │
│  Rule-based Algorithm (synchronous, <10ms):                 │
│                                                              │
│  1. adjustedTemp = weather.temperature + thermal_adjustment │
│  2. For each body zone:                                     │
│     - head: getHeadGear(adjustedTemp, wind)                 │
│     - torso: getTorsoLayers(adjustedTemp, wind, rain,       │
│              activity, duration)                            │
│     - arms: getArmGear(adjustedTemp, activity)              │
│     - hands: getHandGear(adjustedTemp, wind,                │
│              preferences.cold_hands)                        │
│     - legs: getLegGear(adjustedTemp, activity)              │
│     - feet: getFeetGear(adjustedTemp, rain,                 │
│             preferences.cold_feet)                          │
│     - neck: getNeckGear(adjustedTemp, wind)                 │
│                                                              │
│  3. Apply activity intensity adjustments                    │
│  4. Return OutfitDTO                                        │
└──────┬───────────────────────────────────────────────────────┘
       │
       │  OutfitDTO
       ▼
┌─────────────────────────────────────────────────────────────┐
│       AIService.generateTips() [ASYNC, NON-BLOCKING]         │
│                                                              │
│  1. Detect special conditions:                              │
│     - Heavy rain (> 5mm/h)                                  │
│     - Strong wind (> 25 km/h)                               │
│     - Extreme cold (< -5°C)                                 │
│     - Extreme heat (> 30°C)                                 │
│                                                              │
│  2. If special conditions OR user requests:                 │
│     - Check rate limit (100/day/user)                       │
│     - Call Claude Haiku via OpenRouter                      │
│     - Parse AI response → string[]                          │
│                                                              │
│  3. Fallback on error:                                      │
│     - Return empty array []                                 │
│     - Log error (non-critical)                              │
│                                                              │
│  4. Caching:                                                │
│     - Cache per (weather_conditions, activity_type)         │
│     - TTL: 1 hour                                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │  additional_tips: string[]
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Assemble RecommendationDTO                      │
│                                                              │
│  - weather: WeatherDTO                                      │
│  - recommendation: OutfitDTO                                │
│  - additional_tips: string[]                                │
│  - personalized: boolean (true if thermal_adjustment != 0)  │
│  - thermal_adjustment: number                               │
│  - computation_time_ms: number (stop timer)                 │
└──────┬───────────────────────────────────────────────────────┘
       │
       ▼ 200 OK
┌─────────────┐
│   Client    │
└─────────────┘
```

### Detailed Service Interactions

#### 1. Weather Data Flow (WeatherService)

```typescript
async function getWeather(
  locationId: string, 
  date?: string
): Promise<WeatherDTO> {
  // 1. Get location coordinates
  const location = await supabase
    .from('user_locations')
    .select('location')  // GEOGRAPHY(POINT)
    .eq('id', locationId)
    .single();
  
  const { latitude, longitude } = parseGeography(location.location);
  
  // 2. Generate cache key
  const cacheKey = date 
    ? `forecast_${latitude}_${longitude}_${date}`
    : `current_${latitude}_${longitude}`;
  
  // 3. Check cache
  const cached = await supabase
    .from('weather_cache')
    .select('data, cached_at')
    .eq('cache_key', cacheKey)
    .single();
  
  if (cached && !isCacheExpired(cached, date ? 21600 : 1800)) {
    return cached.data as WeatherDTO;
  }
  
  // 4. Fetch from OpenWeather API
  const weatherData = date
    ? await fetchForecastData(latitude, longitude, date)
    : await fetchCurrentWeather(latitude, longitude);
  
  // 5. Update cache
  await supabase
    .from('weather_cache')
    .upsert({
      cache_key: cacheKey,
      data: weatherData,
      cached_at: new Date().toISOString()
    });
  
  return weatherData;
}
```

#### 2. Rule-based Recommendation (RecommendationService)

```typescript
function generateOutfit(input: RecommendationInput): OutfitDTO {
  const { adjustedTemp, windSpeed, rainMm, activityType, userPreferences } = input;
  
  return {
    head: calculateHead(adjustedTemp, windSpeed, userPreferences),
    torso: calculateTorso(adjustedTemp, windSpeed, rainMm, activityType),
    arms: calculateArms(adjustedTemp, activityType),
    hands: calculateHands(adjustedTemp, windSpeed, userPreferences?.cold_hands),
    legs: calculateLegs(adjustedTemp, activityType),
    feet: calculateFeet(adjustedTemp, rainMm, userPreferences?.cold_feet),
    neck: calculateNeck(adjustedTemp, windSpeed)
  };
}

// Example rule function
function calculateHead(temp: number, wind: number, prefs: any): string {
  if (temp < 5) return 'czapka_zimowa';
  if (temp < 10) return 'czapka';
  if (temp < prefs?.cap_threshold_temp || wind > 20) return 'opaska';
  return 'nic';
}
```

#### 3. AI Enhancement (AIService)

```typescript
async function generateTips(
  weather: WeatherDTO,
  outfit: OutfitDTO,
  activityType: ActivityTypeEnum
): Promise<string[]> {
  try {
    // Check rate limit
    const canProceed = await checkRateLimit('ai_tips', userId, 100, 86400);
    if (!canProceed) {
      console.warn('AI tips rate limit exceeded');
      return [];
    }
    
    // Detect special conditions
    const specialConditions = detectSpecialConditions(weather);
    if (specialConditions.length === 0) {
      // Normal conditions, skip AI
      return [];
    }
    
    // Call Claude Haiku via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku',
        messages: [{
          role: 'user',
          content: buildPrompt(weather, outfit, activityType, specialConditions)
        }],
        max_tokens: 200
      })
    });
    
    const data = await response.json();
    return parseTips(data.choices[0].message.content);
    
  } catch (error) {
    console.error('AI tips generation failed:', error);
    return []; // Graceful degradation
  }
}
```

---

## 6. Względy bezpieczeństwa

### 1. Authentication & Authorization

#### JWT Token Verification
```typescript
// Middleware (src/middleware/index.ts)
export async function onRequest({ locals, request, redirect }, next) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  locals.user = user;
  return next();
}
```

#### Location Ownership Verification
```typescript
async function verifyLocationOwnership(
  locationId: string, 
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_locations')
    .select('id')
    .eq('id', locationId)
    .eq('user_id', userId)
    .single();
  
  return !error && !!data;
}
```

### 2. Input Validation & Sanitization

#### Query Parameters Validation
```typescript
const schema = z.object({
  location_id: z.string().uuid('Invalid UUID format'),
  activity_type: z.enum(['recovery', 'spokojna', 'tempo', 'interwaly']).default('spokojna'),
  duration_minutes: z.number().int().min(10).max(600).default(90),
  date: z.string().datetime().optional().refine((date) => {
    if (!date) return true;
    const targetDate = new Date(date);
    const now = new Date();
    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return targetDate >= now && targetDate <= maxDate;
  }, 'Date must be between now and 7 days in the future')
});

// Usage
const validated = schema.safeParse(queryParams);
if (!validated.success) {
  return { status: 400, body: { error: validated.error } };
}
```

### 3. Rate Limiting

#### Implementation Strategy
```typescript
// Rate limit check function
async function checkRateLimit(
  key: string,
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const cacheKey = `ratelimit:${key}:${userId}`;
  
  // Using Supabase edge function or external Redis/Upstash
  const count = await redis.incr(cacheKey);
  
  if (count === 1) {
    await redis.expire(cacheKey, windowSeconds);
  }
  
  return count <= limit;
}

// Rate limits:
// - AI tips: 100 requests/user/day
// - Weather API: 1000 requests/day (shared, tracked globally)
```

### 4. Data Security

#### Sensitive Data Handling
- ✅ **Weather data**: Public information, no PII
- ✅ **Location**: Geographic coordinates only, no address stored
- ✅ **Thermal preferences**: User-specific, protected by RLS
- ⚠️ **Logging**: NEVER log JWT tokens, user IDs in plain text

#### RLS Policies (Supabase)
```sql
-- user_locations: users can only access their own locations
CREATE POLICY "Users can view own locations"
  ON user_locations FOR SELECT
  USING (auth.uid() = user_id);

-- profiles: users can only access their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

### 5. External API Security

#### OpenWeather API
- Store API key in environment variables (never commit)
- Use server-side only (Astro SSR/Edge Functions)
- Implement request timeout (5s)
- Handle API errors gracefully

#### OpenRouter (Claude Haiku)
- Store API key in environment variables
- Use server-side only
- Implement timeout (10s)
- Non-critical: failures don't break endpoint

### 6. HTTPS & Transport Security
- Enforce HTTPS in production (Cloudflare Pages default)
- Use secure headers (Helmet.js equivalent)
- CORS configuration: restrict to app domain only

---

## 7. Obsługa błędów

### Error Handling Strategy

#### 1. Validation Errors (400)

**Scenario**: Invalid query parameters

```typescript
class ValidationError extends Error {
  constructor(public details: Array<{ field: string; message: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

// Handler
if (error instanceof ValidationError) {
  return new Response(JSON.stringify({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: error.details
    }
  }), { 
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Examples:**
- Invalid UUID: `"location_id must be a valid UUID"`
- Invalid activity: `"activity_type must be one of: recovery, spokojna, tempo, interwaly"`
- Invalid duration: `"duration_minutes must be between 10 and 600"`
- Invalid date: `"date must be between today and 7 days in the future"`

#### 2. Authentication Errors (401)

**Scenario**: Missing or invalid JWT token

```typescript
if (!token || !user) {
  return new Response(JSON.stringify({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required'
    }
  }), { 
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### 3. Authorization Errors (404)

**Scenario**: Location not found or doesn't belong to user

```typescript
const locationExists = await verifyLocationOwnership(locationId, userId);

if (!locationExists) {
  return new Response(JSON.stringify({
    error: {
      code: 'LOCATION_NOT_FOUND',
      message: 'Location not found or does not belong to user',
      details: [{ field: 'location_id', message: `Location ${locationId} not found` }]
    }
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Note**: Używamy 404 zamiast 403 aby nie ujawniać czy location istnieje (security best practice)

#### 4. Rate Limiting Errors (429)

**Scenario**: User exceeded rate limits

```typescript
const canProceed = await checkRateLimit('recommendations', userId, 100, 86400);

if (!canProceed) {
  return new Response(JSON.stringify({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retry_after: 3600
    }
  }), { 
    status: 429,
    headers: { 
      'Content-Type': 'application/json',
      'Retry-After': '3600'
    }
  });
}
```

#### 5. External Service Errors (503)

**Scenario A: Weather API unavailable**

```typescript
try {
  const weather = await fetchWeatherWithTimeout(latitude, longitude, 5000);
} catch (error) {
  if (error instanceof TimeoutError || error instanceof NetworkError) {
    return new Response(JSON.stringify({
      error: {
        code: 'WEATHER_SERVICE_UNAVAILABLE',
        message: 'Weather service temporarily unavailable',
        details: [{
          service: 'openweather_api',
          message: error.message
        }]
      }
    }), { 
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Retry-After': '60'
      }
    });
  }
  throw error;
}
```

**Scenario B: AI service failure (non-critical)**

```typescript
// AI service failure does NOT cause 503
// Graceful degradation: return empty tips array
try {
  additionalTips = await aiService.generateTips(...);
} catch (error) {
  console.error('AI tips generation failed:', error);
  additionalTips = []; // Empty array, continue with recommendation
}
```

#### 6. Internal Server Errors (500)

**Scenario**: Unexpected errors

```typescript
try {
  // ... endpoint logic
} catch (error) {
  console.error('Internal server error:', error);
  
  return new Response(JSON.stringify({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      // Don't expose internal details in production
      ...(process.env.NODE_ENV === 'development' && { 
        debug: error.message 
      })
    }
  }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Error Logging

```typescript
// Use structured logging (e.g., Sentry, Supabase logs)
function logError(error: Error, context: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context: {
      userId: context.userId, // Anonymized if needed
      endpoint: '/api/recommendations',
      params: context.params
    }
  };
  
  // Send to Sentry or similar
  Sentry.captureException(error, { extra: logEntry });
  
  // Also log to Supabase (optional)
  // console.error(JSON.stringify(logEntry));
}
```

---

## 8. Wydajność

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **P50 Response Time** | < 100ms | Without AI tips |
| **P95 Response Time** | < 300ms | With AI tips (cached) |
| **P99 Response Time** | < 2000ms | With AI tips (cache miss) |
| **Cache Hit Rate** | > 80% | Weather data |
| **Core Algorithm** | < 10ms | Rule-based calculation |
| **AI Tips** | < 2000ms | OpenRouter API call |

### Optimization Strategies

#### 1. Weather Data Caching

**Cache Strategy:**
```typescript
// Cache keys
const CACHE_TTL = {
  CURRENT_WEATHER: 30 * 60,  // 30 minutes
  FORECAST: 6 * 60 * 60       // 6 hours
};

// Cache structure in weather_cache table
{
  cache_key: string,          // "current_{lat}_{lon}" or "forecast_{lat}_{lon}_{date}"
  data: JSONB,                // WeatherDTO
  cached_at: timestamp,
  ttl_seconds: integer
}

// Auto-cleanup expired entries via scheduled function (runs hourly)
DELETE FROM weather_cache WHERE cached_at + (ttl_seconds || ' seconds')::interval < NOW();
```

**Benefits:**
- Reduces OpenWeather API calls by ~80%
- Instant response for cached data
- Shared cache across users (same location)

#### 2. Rule-based Algorithm Optimization

**Fast Path Implementation:**
```typescript
// Precompute lookup tables (in-memory)
const OUTFIT_RULES = {
  head: [
    { maxTemp: 5, value: 'czapka_zimowa' },
    { maxTemp: 10, value: 'czapka' },
    { maxTemp: 15, value: 'opaska' },
    { maxTemp: Infinity, value: 'nic' }
  ],
  // ... other zones
};

// O(1) lookup per zone
function findGear(rules: any[], temp: number): string {
  return rules.find(r => temp <= r.maxTemp).value;
}
```

**Performance:**
- 7 zones × O(1) lookups = ~10ms total
- No database queries needed
- No external API calls

#### 3. AI Tips Optimization

**Conditional AI Enhancement:**
```typescript
// Only call AI when needed
function shouldCallAI(weather: WeatherDTO): boolean {
  return (
    weather.rain_mm > 5 ||          // Heavy rain
    weather.wind_speed > 25 ||      // Strong wind
    weather.temperature < -5 ||     // Extreme cold
    weather.temperature > 30        // Extreme heat
  );
}

// Example: 70% of requests skip AI = 70% instant response
if (shouldCallAI(weather)) {
  additionalTips = await aiService.generateTips(...);
} else {
  additionalTips = []; // Skip AI, save cost and time
}
```

**AI Response Caching:**
```typescript
// Cache AI tips per weather pattern (in-memory or Redis)
const aiCacheKey = `ai_tips_${temp}_${wind}_${rain}_${activity}`;
const cachedTips = await cache.get(aiCacheKey);

if (cachedTips) {
  return cachedTips;
}

// Generate and cache for 1 hour
const tips = await generateAITips(...);
await cache.set(aiCacheKey, tips, 3600);
```

#### 4. Database Query Optimization

**Minimize Database Calls:**
```typescript
// Batch queries where possible
const [location, profile] = await Promise.all([
  supabase.from('user_locations').select('location').eq('id', locationId).single(),
  supabase.from('profiles').select('thermal_adjustment, thermal_preferences').eq('id', userId).single()
]);
```

**Use Indexes:**
```sql
-- Already in schema
CREATE INDEX idx_weather_cache_key ON weather_cache(cache_key);
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_profiles_id ON profiles(id); -- Primary key, automatic
```

#### 5. Response Size Optimization

**Minimize Payload:**
- Weather icon: use code (e.g., "03d") not full URL → saves ~50 bytes
- Outfit strings: short codes (e.g., "czapka") not full descriptions → saves ~200 bytes
- Remove unnecessary fields (e.g., internal IDs)

**Compression:**
- Enable gzip/brotli compression (Cloudflare Pages automatic)
- Typical response: ~800 bytes → ~300 bytes compressed

#### 6. Monitoring & Profiling

**Key Metrics to Track:**
```typescript
// Add timing instrumentation
const startTime = performance.now();

// ... endpoint logic

const computationTime = performance.now() - startTime;

// Include in response
return {
  // ... response data
  computation_time_ms: Math.round(computationTime)
};

// Also log to analytics
logMetric('recommendations_response_time', computationTime, {
  cache_hit: wasCacheHit,
  ai_called: additionalTips.length > 0
});
```

**Performance Alerts:**
- P95 > 500ms → Investigate
- Cache hit rate < 70% → Adjust TTL
- AI timeout rate > 5% → Check OpenRouter status

### Load Testing Scenarios

#### Scenario 1: Typical Load
- 100 users
- 5 requests/user/day
- 500 requests/day total
- Expected: P95 < 200ms, Cache hit 85%

#### Scenario 2: Peak Load (Morning Rush)
- 100 users
- 50 requests in 1 hour (8-9 AM)
- Expected: P95 < 300ms, No rate limit hits

#### Scenario 3: Cold Cache
- Fresh deployment, empty cache
- First 100 requests
- Expected: P95 < 1000ms (weather API calls), then stabilize

---

## 9. Etapy wdrożenia

### Phase 1: Infrastructure & Core Services (Priorytet: Wysoki)

#### 1.1 Environment Setup
```bash
# Add required environment variables
OPENWEATHER_API_KEY=<key>
OPENROUTER_API_KEY=<key>
SUPABASE_URL=<url>
SUPABASE_KEY=<anon_key>
```

**Files:**
- `.env.example` - dokumentacja zmiennych
- `src/env.d.ts` - TypeScript types dla `import.meta.env`

#### 1.2 Database Schema Verification
```sql
-- Verify weather_cache table exists (should be in migrations)
SELECT * FROM weather_cache LIMIT 1;

-- Verify RLS policies for user_locations and profiles
SELECT * FROM pg_policies WHERE tablename IN ('user_locations', 'profiles');
```

**Files:**
- `supabase/migrations/20251009000300_weather_cache.sql` (verify)
- `supabase/migrations/20251009000600_rls_policies.sql` (verify)

#### 1.3 Create Service Layer Structure
```
src/services/
├── weather/
│   ├── weather.service.ts       # Main weather service
│   ├── openweather.client.ts    # OpenWeather API client
│   └── weather.types.ts         # Internal types
├── recommendations/
│   ├── recommendation.service.ts # Rule-based algorithm
│   ├── outfit-rules.ts           # Rule definitions
│   └── recommendation.types.ts   # Internal types
├── ai/
│   ├── ai.service.ts             # AI enhancement service
│   ├── openrouter.client.ts      # OpenRouter API client
│   └── ai.types.ts               # Internal types
├── location/
│   └── location.service.ts       # Location verification
└── shared/
    ├── cache.service.ts          # Cache utilities
    └── rate-limit.service.ts     # Rate limiting
```

**Estimated Time:** 2 hours

---

### Phase 2: Weather Service Implementation (Priorytet: Krytyczny)

#### 2.1 OpenWeather API Client
**File:** `src/services/weather/openweather.client.ts`

```typescript
import type { WeatherDTO, ForecastDayDTO } from '@/types';

const OPENWEATHER_API_KEY = import.meta.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

export class OpenWeatherClient {
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherDTO> {
    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    
    if (!response.ok) {
      throw new WeatherAPIError(`OpenWeather API error: ${response.status}`);
    }
    
    const data = await response.json();
    return this.parseCurrentWeather(data);
  }
  
  async getForecast(lat: number, lon: number, date: string): Promise<WeatherDTO> {
    // Implementation for forecast endpoint
    // Parse target date and extract matching forecast day
  }
  
  private parseCurrentWeather(data: any): WeatherDTO {
    return {
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      wind_speed: data.wind.speed * 3.6, // m/s to km/h
      humidity: data.main.humidity,
      rain_mm: data.rain?.['1h'] || 0,
      description: data.weather[0].description,
      icon: data.weather[0].icon
    };
  }
}

export class WeatherAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherAPIError';
  }
}
```

**Tests:**
- Unit test: `parseCurrentWeather()`
- Integration test: Mock API responses
- Error handling: Timeout, 404, 503

**Estimated Time:** 3 hours

#### 2.2 Weather Cache Service
**File:** `src/services/weather/weather.service.ts`

```typescript
import { supabaseClient } from '@/db/supabase.client';
import { OpenWeatherClient } from './openweather.client';
import type { WeatherDTO, Coordinates } from '@/types';

const CACHE_TTL = {
  CURRENT: 30 * 60,    // 30 minutes
  FORECAST: 6 * 60 * 60 // 6 hours
};

export class WeatherService {
  private openWeatherClient = new OpenWeatherClient();
  
  async getWeather(locationId: string, date?: string): Promise<WeatherDTO> {
    // 1. Get location coordinates
    const coords = await this.getLocationCoordinates(locationId);
    
    // 2. Generate cache key
    const cacheKey = date 
      ? `forecast_${coords.latitude}_${coords.longitude}_${date}`
      : `current_${coords.latitude}_${coords.longitude}`;
    
    // 3. Check cache
    const cached = await this.getCachedWeather(cacheKey);
    if (cached) return cached;
    
    // 4. Fetch from API
    const weather = date
      ? await this.openWeatherClient.getForecast(coords.latitude, coords.longitude, date)
      : await this.openWeatherClient.getCurrentWeather(coords.latitude, coords.longitude);
    
    // 5. Update cache
    await this.setCachedWeather(cacheKey, weather, date ? CACHE_TTL.FORECAST : CACHE_TTL.CURRENT);
    
    return weather;
  }
  
  private async getLocationCoordinates(locationId: string): Promise<Coordinates> {
    const { data, error } = await supabaseClient
      .from('user_locations')
      .select('location')
      .eq('id', locationId)
      .single();
    
    if (error || !data) {
      throw new Error('Location not found');
    }
    
    // Parse PostGIS GEOGRAPHY(POINT) - format: POINT(lon lat)
    const match = data.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
    if (!match) {
      throw new Error('Invalid location format');
    }
    
    return {
      longitude: parseFloat(match[1]),
      latitude: parseFloat(match[2])
    };
  }
  
  private async getCachedWeather(cacheKey: string): Promise<WeatherDTO | null> {
    const { data, error } = await supabaseClient
      .from('weather_cache')
      .select('data, cached_at, ttl_seconds')
      .eq('cache_key', cacheKey)
      .single();
    
    if (error || !data) return null;
    
    // Check if cache is expired
    const cachedAt = new Date(data.cached_at);
    const expiresAt = new Date(cachedAt.getTime() + data.ttl_seconds * 1000);
    
    if (expiresAt < new Date()) {
      return null; // Expired
    }
    
    return data.data as WeatherDTO;
  }
  
  private async setCachedWeather(cacheKey: string, data: WeatherDTO, ttl: number): Promise<void> {
    await supabaseClient
      .from('weather_cache')
      .upsert({
        cache_key: cacheKey,
        data: data,
        cached_at: new Date().toISOString(),
        ttl_seconds: ttl
      });
  }
}
```

**Tests:**
- Unit test: Cache hit/miss logic
- Unit test: TTL expiration
- Integration test: Full flow with database

**Estimated Time:** 4 hours

---

### Phase 3: Recommendation Engine (Priorytet: Krytyczny)

#### 3.1 Outfit Rules Definition
**File:** `src/services/recommendations/outfit-rules.ts`

```typescript
import type { ActivityTypeEnum } from '@/types';

// Rule tables for each body zone
export const HEAD_RULES = [
  { maxTemp: 0, value: 'czapka_zimowa' },
  { maxTemp: 5, value: 'czapka' },
  { maxTemp: 10, value: 'czapka', windThreshold: 15 },
  { maxTemp: 15, value: 'opaska' },
  { maxTemp: Infinity, value: 'nic' }
];

export const TORSO_BASE_RULES = [
  { maxTemp: 5, value: 'termo_zimowe' },
  { maxTemp: 10, value: 'termo' },
  { maxTemp: 15, value: 'koszulka_dl' },
  { maxTemp: 20, value: 'koszulka_kr' },
  { maxTemp: Infinity, value: 'koszulka_kr' }
];

export const TORSO_MID_RULES = [
  { maxTemp: 0, value: 'softshell', activity: ['recovery', 'spokojna'] },
  { maxTemp: 5, value: 'softshell', activity: ['recovery'] },
  { maxTemp: 10, value: 'kamizelka', activity: ['recovery'] },
  { maxTemp: Infinity, value: 'nic' }
];

export const TORSO_OUTER_RULES = [
  { rainThreshold: 5, value: 'kurtka_przeciwdeszczowa' },
  { maxTemp: -5, value: 'kurtka_zimowa' },
  { maxTemp: Infinity, value: 'nic' }
];

export const ARMS_RULES = [
  { maxTemp: 10, value: 'dlugie_rekawy' },
  { maxTemp: 15, value: 'naramienniki' },
  { maxTemp: Infinity, value: 'nic' }
];

export const HANDS_RULES = [
  { maxTemp: 0, value: 'rekawiczki_zimowe' },
  { maxTemp: 5, value: 'rekawiczki_przejsciowe' },
  { maxTemp: 10, value: 'rekawiczki_cienkie', coldHands: true },
  { maxTemp: Infinity, value: 'nic' }
];

export const LEGS_RULES = [
  { maxTemp: 10, value: 'dlugie_ocieplone' },
  { maxTemp: 15, value: 'dlugie' },
  { maxTemp: 20, value: '3/4', activity: ['recovery', 'spokojna'] },
  { maxTemp: Infinity, value: 'krotkie' }
];

export const FEET_SOCKS_RULES = [
  { maxTemp: 5, value: 'zimowe' },
  { maxTemp: 15, value: 'przejsciowe' },
  { maxTemp: Infinity, value: 'letnie' }
];

export const FEET_COVERS_RULES = [
  { rainThreshold: 3, value: 'ochraniacze_wodoodporne' },
  { maxTemp: 5, value: 'ochraniacze' },
  { maxTemp: 10, value: 'ochraniacze', coldFeet: true },
  { maxTemp: Infinity, value: 'nic' }
];

export const NECK_RULES = [
  { maxTemp: 5, value: 'buff' },
  { maxTemp: 10, value: 'buff', windThreshold: 20 },
  { maxTemp: Infinity, value: 'nic' }
];
```

**Estimated Time:** 2 hours (includes research for realistic values)

#### 3.2 Recommendation Service
**File:** `src/services/recommendations/recommendation.service.ts`

```typescript
import type { OutfitDTO, ActivityTypeEnum, ThermalPreferences } from '@/types';
import * as rules from './outfit-rules';

interface RecommendationInput {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  rainMm: number;
  humidity: number;
  activityType: ActivityTypeEnum;
  durationMinutes: number;
  thermalAdjustment: number;
  userPreferences: ThermalPreferences | null;
}

export class RecommendationService {
  generateOutfit(input: RecommendationInput): OutfitDTO {
    const adjustedTemp = input.temperature + input.thermalAdjustment;
    
    return {
      head: this.calculateHead(adjustedTemp, input.windSpeed, input.userPreferences),
      torso: this.calculateTorso(adjustedTemp, input.windSpeed, input.rainMm, input.activityType),
      arms: this.calculateArms(adjustedTemp, input.activityType),
      hands: this.calculateHands(adjustedTemp, input.windSpeed, input.userPreferences),
      legs: this.calculateLegs(adjustedTemp, input.activityType),
      feet: this.calculateFeet(adjustedTemp, input.rainMm, input.userPreferences),
      neck: this.calculateNeck(adjustedTemp, input.windSpeed)
    };
  }
  
  private calculateHead(temp: number, wind: number, prefs: ThermalPreferences | null): string {
    for (const rule of rules.HEAD_RULES) {
      if (temp <= rule.maxTemp) {
        if (rule.windThreshold && wind < rule.windThreshold) continue;
        return rule.value;
      }
    }
    return 'nic';
  }
  
  private calculateTorso(temp: number, wind: number, rain: number, activity: ActivityTypeEnum) {
    const base = this.findMatchingRule(rules.TORSO_BASE_RULES, temp);
    const mid = this.findMatchingRule(rules.TORSO_MID_RULES, temp, { activity });
    const outer = rain > 5 
      ? 'kurtka_przeciwdeszczowa' 
      : this.findMatchingRule(rules.TORSO_OUTER_RULES, temp);
    
    return { base, mid, outer };
  }
  
  private calculateArms(temp: number, activity: ActivityTypeEnum): string {
    return this.findMatchingRule(rules.ARMS_RULES, temp, { activity });
  }
  
  private calculateHands(temp: number, wind: number, prefs: ThermalPreferences | null): string {
    const coldHands = prefs?.cold_hands || false;
    return this.findMatchingRule(rules.HANDS_RULES, temp, { coldHands });
  }
  
  private calculateLegs(temp: number, activity: ActivityTypeEnum): string {
    return this.findMatchingRule(rules.LEGS_RULES, temp, { activity });
  }
  
  private calculateFeet(temp: number, rain: number, prefs: ThermalPreferences | null) {
    const coldFeet = prefs?.cold_feet || false;
    const socks = this.findMatchingRule(rules.FEET_SOCKS_RULES, temp);
    const covers = rain > 3
      ? 'ochraniacze_wodoodporne'
      : this.findMatchingRule(rules.FEET_COVERS_RULES, temp, { coldFeet });
    
    return { socks, covers };
  }
  
  private calculateNeck(temp: number, wind: number): string {
    for (const rule of rules.NECK_RULES) {
      if (temp <= rule.maxTemp) {
        if (rule.windThreshold && wind < rule.windThreshold) continue;
        return rule.value;
      }
    }
    return 'nic';
  }
  
  private findMatchingRule(rules: any[], temp: number, context?: any): string {
    for (const rule of rules) {
      if (temp <= rule.maxTemp) {
        // Check additional conditions (activity, cold hands/feet, etc.)
        if (rule.activity && context?.activity && !rule.activity.includes(context.activity)) {
          continue;
        }
        if (rule.coldHands !== undefined && rule.coldHands !== context?.coldHands) {
          continue;
        }
        if (rule.coldFeet !== undefined && rule.coldFeet !== context?.coldFeet) {
          continue;
        }
        return rule.value;
      }
    }
    return 'nic';
  }
}
```

**Tests:**
- Unit test: Each zone calculation
- Unit test: Thermal adjustment application
- Unit test: Activity type modifiers
- Integration test: Full outfit generation

**Estimated Time:** 4 hours

---

### Phase 4: AI Enhancement (Priorytet: Średni)

#### 4.1 OpenRouter Client
**File:** `src/services/ai/openrouter.client.ts`

```typescript
const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterClient {
  async generateCompletion(prompt: string): Promise<string> {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    
    if (!response.ok) {
      throw new AIServiceError(`OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}
```

**Estimated Time:** 2 hours

#### 4.2 AI Service with Rate Limiting
**File:** `src/services/ai/ai.service.ts`

```typescript
import { OpenRouterClient } from './openrouter.client';
import type { WeatherDTO, OutfitDTO, ActivityTypeEnum } from '@/types';

export class AIService {
  private client = new OpenRouterClient();
  
  async generateTips(
    weather: WeatherDTO,
    outfit: OutfitDTO,
    activityType: ActivityTypeEnum,
    userId: string
  ): Promise<string[]> {
    try {
      // Check if AI enhancement is needed
      if (!this.shouldCallAI(weather)) {
        return [];
      }
      
      // Check rate limit (100/day/user)
      const canProceed = await this.checkRateLimit(userId);
      if (!canProceed) {
        console.warn(`AI tips rate limit exceeded for user ${userId}`);
        return [];
      }
      
      // Build prompt
      const prompt = this.buildPrompt(weather, outfit, activityType);
      
      // Call AI
      const response = await this.client.generateCompletion(prompt);
      
      // Parse response to array of tips
      return this.parseTips(response);
      
    } catch (error) {
      console.error('AI tips generation failed:', error);
      return []; // Graceful degradation
    }
  }
  
  private shouldCallAI(weather: WeatherDTO): boolean {
    return (
      weather.rain_mm > 5 ||          // Heavy rain
      weather.wind_speed > 25 ||      // Strong wind
      weather.temperature < -5 ||     // Extreme cold
      weather.temperature > 30        // Extreme heat
    );
  }
  
  private async checkRateLimit(userId: string): Promise<boolean> {
    // Implementation using Supabase or external rate limiter
    // For MVP, can use simple counter in database
    const key = `ai_tips_${userId}_${new Date().toISOString().split('T')[0]}`;
    
    const { data, error } = await supabaseClient
      .from('rate_limits')
      .select('count')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      // Create new counter
      await supabaseClient.from('rate_limits').insert({ key, count: 1 });
      return true;
    }
    
    if (data.count >= 100) {
      return false; // Rate limit exceeded
    }
    
    // Increment counter
    await supabaseClient
      .from('rate_limits')
      .update({ count: data.count + 1 })
      .eq('key', key);
    
    return true;
  }
  
  private buildPrompt(
    weather: WeatherDTO,
    outfit: OutfitDTO,
    activityType: ActivityTypeEnum
  ): string {
    return `Jesteś doświadczonym cyklistą. Podaj 2-3 krótkie wskazówki dla rowerzysty w następujących warunkach:

Pogoda:
- Temperatura: ${weather.temperature}°C (odczuwalna: ${weather.feels_like}°C)
- Wiatr: ${weather.wind_speed} km/h
- Deszcz: ${weather.rain_mm} mm/h
- Opis: ${weather.description}

Typ aktywności: ${activityType}

Rekomendowany strój:
- Głowa: ${outfit.head}
- Tułów: ${outfit.torso.base}, ${outfit.torso.mid}, ${outfit.torso.outer}
- Ramiona: ${outfit.arms}
- Dłonie: ${outfit.hands}
- Nogi: ${outfit.legs}
- Stopy: skarpety ${outfit.feet.socks}, ${outfit.feet.covers}
- Szyja: ${outfit.neck}

Odpowiedź w formacie:
- Wskazówka 1
- Wskazówka 2
- Wskazówka 3 (opcjonalnie)`;
  }
  
  private parseTips(response: string): string[] {
    // Parse bullet points or numbered list
    const lines = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.match(/^[-•*\d.]/)); // Bullet or numbered
    
    return lines
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Max 3 tips
  }
}
```

**Tests:**
- Unit test: `shouldCallAI()` conditions
- Unit test: Prompt building
- Unit test: Response parsing
- Integration test: Rate limiting

**Estimated Time:** 4 hours

---

### Phase 5: API Endpoint Implementation (Priorytet: Krytyczny)

#### 5.1 Validation Schema
**File:** `src/pages/api/recommendations.ts` (partial)

```typescript
import { z } from 'zod';

const GetRecommendationsSchema = z.object({
  location_id: z.string().uuid('Invalid UUID format'),
  activity_type: z.enum(['recovery', 'spokojna', 'tempo', 'interwaly'])
    .default('spokojna'),
  duration_minutes: z.coerce.number().int().min(10).max(600)
    .default(90),
  date: z.string().datetime().optional().refine((date) => {
    if (!date) return true;
    
    const targetDate = new Date(date);
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return targetDate >= yesterday && targetDate <= maxDate;
  }, 'Date must be between today and 7 days in the future')
});
```

**Estimated Time:** 1 hour

#### 5.2 Main Endpoint Handler
**File:** `src/pages/api/recommendations.ts`

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { WeatherService } from '@/services/weather/weather.service';
import { RecommendationService } from '@/services/recommendations/recommendation.service';
import { AIService } from '@/services/ai/ai.service';
import { supabaseClient } from '@/db/supabase.client';
import type { RecommendationDTO, GetRecommendationParams } from '@/types';

// ... validation schema from 5.1

export const GET: APIRoute = async ({ request, locals }) => {
  const startTime = performance.now();
  
  try {
    // 1. Authentication
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      location_id: url.searchParams.get('location_id'),
      activity_type: url.searchParams.get('activity_type') || 'spokojna',
      duration_minutes: url.searchParams.get('duration_minutes') || '90',
      date: url.searchParams.get('date') || undefined
    };
    
    const validated = GetRecommendationsSchema.safeParse(queryParams);
    if (!validated.success) {
      return new Response(JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: validated.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const params = validated.data;
    
    // 3. Verify location ownership
    const locationExists = await verifyLocationOwnership(params.location_id, user.id);
    if (!locationExists) {
      return new Response(JSON.stringify({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found or does not belong to user',
          details: [{ field: 'location_id', message: `Location ${params.location_id} not found` }]
        }
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 4. Fetch data in parallel
    const weatherService = new WeatherService();
    const [weather, profile] = await Promise.all([
      weatherService.getWeather(params.location_id, params.date),
      getUserProfile(user.id)
    ]);
    
    // 5. Generate outfit recommendation (rule-based)
    const recommendationService = new RecommendationService();
    const outfit = recommendationService.generateOutfit({
      temperature: weather.temperature,
      feelsLike: weather.feels_like,
      windSpeed: weather.wind_speed,
      rainMm: weather.rain_mm,
      humidity: weather.humidity,
      activityType: params.activity_type,
      durationMinutes: params.duration_minutes,
      thermalAdjustment: profile.thermal_adjustment || 0,
      userPreferences: profile.thermal_preferences
    });
    
    // 6. Generate AI tips (async, non-blocking, optional)
    const aiService = new AIService();
    const additionalTips = await aiService.generateTips(
      weather,
      outfit,
      params.activity_type,
      user.id
    );
    
    // 7. Assemble response
    const computationTime = performance.now() - startTime;
    
    const response: RecommendationDTO = {
      weather,
      recommendation: outfit,
      additional_tips: additionalTips,
      personalized: (profile.thermal_adjustment || 0) !== 0,
      thermal_adjustment: profile.thermal_adjustment || 0,
      computation_time_ms: Math.round(computationTime)
    };
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error in /api/recommendations:', error);
    
    // Handle specific error types
    if (error instanceof WeatherAPIError) {
      return new Response(JSON.stringify({
        error: {
          code: 'WEATHER_SERVICE_UNAVAILABLE',
          message: 'Weather service temporarily unavailable',
          details: [{ service: 'openweather_api', message: error.message }]
        }
      }), { 
        status: 503, 
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }
    
    // Generic error
    return new Response(JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        ...(import.meta.env.DEV && { debug: error.message })
      }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// Helper functions
async function verifyLocationOwnership(locationId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('user_locations')
    .select('id')
    .eq('id', locationId)
    .eq('user_id', userId)
    .single();
  
  return !error && !!data;
}

async function getUserProfile(userId: string) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('thermal_adjustment, thermal_preferences')
    .eq('id', userId)
    .single();
  
  if (error) {
    return { thermal_adjustment: 0, thermal_preferences: null };
  }
  
  return data;
}
```

**Tests:**
- Integration test: Full endpoint flow
- Error handling tests: All error scenarios
- Performance test: Response time < 100ms (without AI)

**Estimated Time:** 5 hours

---

### Phase 6: Testing & Quality Assurance (Priorytet: Wysoki)

#### 6.1 Unit Tests
```typescript
// src/services/recommendations/__tests__/recommendation.service.test.ts
import { describe, it, expect } from 'vitest';
import { RecommendationService } from '../recommendation.service';

describe('RecommendationService', () => {
  const service = new RecommendationService();
  
  it('should recommend winter gear for cold weather', () => {
    const outfit = service.generateOutfit({
      temperature: -5,
      feelsLike: -8,
      windSpeed: 15,
      rainMm: 0,
      humidity: 70,
      activityType: 'spokojna',
      durationMinutes: 90,
      thermalAdjustment: 0,
      userPreferences: null
    });
    
    expect(outfit.head).toBe('czapka_zimowa');
    expect(outfit.torso.base).toBe('termo_zimowe');
    expect(outfit.hands).toBe('rekawiczki_zimowe');
  });
  
  it('should apply thermal adjustment correctly', () => {
    const baseOutfit = service.generateOutfit({
      temperature: 10,
      thermalAdjustment: 0,
      // ... other params
    });
    
    const adjustedOutfit = service.generateOutfit({
      temperature: 10,
      thermalAdjustment: 2, // User runs cold
      // ... other params
    });
    
    // With +2°C adjustment, outfit should be lighter
    expect(adjustedOutfit.head).not.toBe(baseOutfit.head);
  });
  
  // ... more tests
});
```

**Coverage Target:** >80% for service layer

**Estimated Time:** 6 hours

#### 6.2 Integration Tests
```typescript
// src/pages/api/__tests__/recommendations.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('GET /api/recommendations', () => {
  let authToken: string;
  let locationId: string;
  
  beforeAll(async () => {
    // Setup test user and location
    authToken = await getTestAuthToken();
    locationId = await createTestLocation();
  });
  
  it('should return 200 with valid parameters', async () => {
    const response = await fetch(
      `/api/recommendations?location_id=${locationId}&activity_type=spokojna`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('weather');
    expect(data).toHaveProperty('recommendation');
    expect(data.computation_time_ms).toBeLessThan(500);
  });
  
  it('should return 401 without auth token', async () => {
    const response = await fetch(`/api/recommendations?location_id=${locationId}`);
    expect(response.status).toBe(401);
  });
  
  it('should return 404 for non-existent location', async () => {
    const response = await fetch(
      `/api/recommendations?location_id=00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    expect(response.status).toBe(404);
  });
  
  // ... more tests
});
```

**Estimated Time:** 4 hours

#### 6.3 Load Testing
```typescript
// scripts/load-test.ts
import autocannon from 'autocannon';

const result = await autocannon({
  url: 'http://localhost:3000/api/recommendations',
  connections: 10,
  duration: 30,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`
  },
  queries: {
    location_id: TEST_LOCATION_ID,
    activity_type: 'spokojna'
  }
});

console.info(result);
// Expected: P95 < 300ms, 0 errors
```

**Estimated Time:** 2 hours

---

### Phase 7: Documentation & Deployment (Priorytet: Średni)

#### 7.1 API Documentation
- Update `.ai/api-plan.md` with implementation notes
- Add code examples to README
- Document rate limits and caching behavior

**Estimated Time:** 2 hours

#### 7.2 Monitoring Setup
```typescript
// Add performance logging
function logRecommendationMetrics(metrics: {
  userId: string;
  cacheHit: boolean;
  aiCalled: boolean;
  responseTime: number;
}) {
  // Send to Supabase Analytics or Sentry
  analytics.track('recommendation_generated', metrics);
}
```

**Estimated Time:** 2 hours

#### 7.3 Deployment Checklist
- [ ] Environment variables set in Cloudflare Pages
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Rate limiting configured
- [ ] OpenWeather API key valid
- [ ] OpenRouter API key valid
- [ ] CORS configuration
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring enabled

**Estimated Time:** 1 hour

---

## Total Estimated Time: 44 hours (~5-6 days for 1 developer)

### Priority Breakdown:
- **Krytyczny (must have for MVP)**: Phases 1-3, 5 (~20 hours)
- **Wysoki (important for quality)**: Phase 6 (~12 hours)
- **Średni (nice to have)**: Phases 4, 7 (~12 hours)

### Dependencies:
1. Phase 1 → Phase 2, 3, 4, 5 (all depend on infrastructure)
2. Phase 2 → Phase 5 (weather service needed by endpoint)
3. Phase 3 → Phase 5 (recommendation service needed by endpoint)
4. Phase 4 → Phase 5 (optional, can be parallel)
5. Phase 5 → Phase 6 (testing requires implementation)
6. Phase 6 → Phase 7 (deploy after testing)

### Recommended Implementation Order:
1. Day 1: Phase 1 (infrastructure) + Phase 2 (weather service)
2. Day 2: Phase 3 (recommendation engine)
3. Day 3: Phase 5 (API endpoint) + Phase 4 (AI service, parallel)
4. Day 4-5: Phase 6 (testing)
5. Day 6: Phase 7 (documentation & deployment)

