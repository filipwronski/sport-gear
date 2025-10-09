# Schemat Bazy Danych - CycleGear MVP

**Wersja:** 1.0  
**Data:** Październik 2025  
**Technologia:** PostgreSQL (Supabase)  
**Autor:** Database Architecture Team

---

## Spis Treści

1. [Przegląd Architektury](#przegląd-architektury)
2. [Schemat Tabel](#schemat-tabel)
3. [Relacje i Kardynalność](#relacje-i-kardynalność)
4. [Indeksy](#indeksy)
5. [Row Level Security (RLS)](#row-level-security-rls)
6. [Funkcje Pomocnicze](#funkcje-pomocnicze)
7. [Triggery i Automatyzacje](#triggery-i-automatyzacje)
8. [GDPR Compliance](#gdpr-compliance)
9. [Optymalizacje Wydajnościowe](#optymalizacje-wydajnościowe)
10. [Estymacja Rozmiaru](#estymacja-rozmiaru)
11. [Strategie Maintenance](#strategie-maintenance)

---

## Przegląd Architektury

### Moduły Funkcjonalne

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION (Supabase Auth)            │
│                         auth.users                           │
└────────────────────────────┬────────────────────────────────┘
                             │ 1:1 (auto-trigger)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    MODULE: USER PROFILES                     │
│  ┌──────────┐         ┌─────────────────┐                  │
│  │ profiles │────────▶│ user_locations  │                  │
│  └──────────┘  1:N    └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
┌──────────────────┐  ┌────────────┐  ┌─────────────────┐
│ MODULE: EQUIPMENT│  │  OUTFITS   │  │    WEATHER      │
│                  │  │            │  │                 │
│  bikes           │  │ outfit_    │  │ weather_cache   │
│    │             │  │ feedbacks  │  │                 │
│    ├─ service_   │  │    │       │  └─────────────────┘
│    │   records   │  │    ▼       │
│    │             │  │ shared_    │
│    └─ service_   │  │ outfits    │
│       reminders  │  │            │
│                  │  └────────────┘
└──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              LOOKUP TABLE: default_service_intervals         │
└─────────────────────────────────────────────────────────────┘
```

### Kluczowe Decyzje Architektoniczne

1. **Spatial Queries**: GEOGRAPHY(POINT) + PostGIS dla społeczności w promieniu 50km
2. **Flexible Data**: JSONB dla thermal_preferences, outfit data, weather cache
3. **Multi-location Support**: Osobna tabela `user_locations` (1:N)
4. **Soft Complete**: Service reminders oznaczane jako completed zamiast DELETE
5. **Denormalizacja**: `shared_outfits` dla performance (eventual consistency)
6. **Rule-based AI**: Brak recommendation cache (instant response)
7. **TTL Strategy**: Automatic cleanup dla feedbacks (30), shared_outfits (30d), weather
8. **Hard Delete**: Bikes bez soft delete (zgodnie z decyzją użytkownika)
9. **Trigger Automation**: 10 triggerów dla consistency i user experience
10. **RLS na wszystkim**: Zero-trust security model

---

## Schemat Tabel

### 1. profiles

**Opis**: Rozszerzenie profilu użytkownika (1:1 z auth.users). Przechowuje dane osobowe, preferencje termiczne, personalizację AI i ustawienia społeczności.

```sql
CREATE TABLE profiles (
  -- Primary Key
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Data
  display_name TEXT,
  
  -- Thermal Preferences (z quizu onboardingowego)
  thermal_preferences JSONB DEFAULT '{}'::JSONB,
  -- Struktura: {
  --   "general_feeling": "marzlak" | "neutralnie" | "szybko_mi_goraco",
  --   "cold_hands": true | false,
  --   "cold_feet": true | false,
  --   "cap_threshold_temp": 5 | 10 | 15 | 20
  -- }
  
  -- AI Personalization
  thermal_adjustment NUMERIC(3,1) DEFAULT 0.0 CHECK (thermal_adjustment BETWEEN -2.0 AND 2.0),
  feedback_count INTEGER DEFAULT 0,
  
  -- Community Settings
  pseudonym TEXT UNIQUE,
  reputation_badge TEXT DEFAULT 'nowicjusz' CHECK (reputation_badge IN ('nowicjusz', 'regularny', 'ekspert', 'mistrz')),
  share_with_community BOOLEAN DEFAULT true,
  
  -- User Preferences
  units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),
  
  -- Location (FK do default location)
  default_location_id UUID REFERENCES user_locations(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE profiles IS 'User profiles extending Supabase Auth with app-specific data';
COMMENT ON COLUMN profiles.thermal_preferences IS 'JSONB storing 4 quiz answers from onboarding';
COMMENT ON COLUMN profiles.thermal_adjustment IS 'AI-calculated adjustment (-2°C to +2°C) based on feedback history';
COMMENT ON COLUMN profiles.feedback_count IS 'Total number of outfit feedbacks, used for reputation badge';
COMMENT ON COLUMN profiles.pseudonym IS 'Unique pseudonym for community sharing, auto-generated on first share';
COMMENT ON COLUMN profiles.reputation_badge IS 'Badge based on feedback_count: <10 nowicjusz, 10-50 regularny, 50-100 ekspert, >100 mistrz';
```

---

### 2. user_locations

**Opis**: Wielka lokalizacji użytkownika (dom, praca, rodzice, weekendy). Używana do pobierania pogody i spatial queries społeczności.

```sql
CREATE TABLE user_locations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Location Data
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  -- Struktura: ST_MakePoint(longitude, latitude)
  -- Zaokrąglone do 3 cyfr po przecinku (~100m accuracy dla privacy)
  
  city TEXT NOT NULL,
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 (PL, DE, etc.)
  
  -- Settings
  is_default BOOLEAN DEFAULT false,
  label TEXT, -- Optional: "Dom", "Praca", "Rodzice"
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints
ALTER TABLE user_locations
  ADD CONSTRAINT unique_default_location_per_user 
  UNIQUE (user_id, is_default) 
  WHERE is_default = true;

-- Comments
COMMENT ON TABLE user_locations IS 'Multiple locations per user for weather and community features';
COMMENT ON COLUMN user_locations.location IS 'PostGIS GEOGRAPHY point for spatial queries (50km radius)';
COMMENT ON COLUMN user_locations.is_default IS 'Only one default location per user, enforced by partial unique constraint and trigger';
```

---

### 3. bikes

**Opis**: Rowery użytkownika. Wsparcie dla wielu rowerów per user. Hard delete (brak soft delete).

```sql
CREATE TABLE bikes (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL CHECK (LENGTH(name) > 0 AND LENGTH(name) <= 50),
  type TEXT NOT NULL CHECK (type IN ('szosowy', 'gravelowy', 'mtb', 'czasowy')),
  purchase_date DATE,
  
  -- Mileage
  current_mileage INTEGER DEFAULT 0 CHECK (current_mileage >= 0),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'sold')),
  
  -- Optional
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE bikes IS 'User bikes, supports multiple bikes per user, hard delete only';
COMMENT ON COLUMN bikes.current_mileage IS 'Current total mileage in km, manually updated or auto-updated from service_records';
COMMENT ON COLUMN bikes.status IS 'active (in use), archived (not used but kept), sold (historical only)';
```

---

### 4. service_records

**Opis**: Historia serwisów roweru. Kaskadowe usuwanie przy DELETE bike.

```sql
CREATE TABLE service_records (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  
  -- Service Data
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service INTEGER NOT NULL CHECK (mileage_at_service >= 0),
  
  -- Service Type (VARCHAR dla elastyczności)
  service_type TEXT NOT NULL CHECK (service_type IN (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- Location
  service_location TEXT CHECK (service_location IN ('warsztat', 'samodzielnie')),
  
  -- Cost (optional, PLN only in MVP)
  cost NUMERIC(10, 2) CHECK (cost >= 0),
  currency TEXT DEFAULT 'PLN' CHECK (currency = 'PLN'),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE service_records IS 'Service history for bikes, cascades on bike deletion';
COMMENT ON COLUMN service_records.service_type IS 'VARCHAR instead of ENUM for flexibility, CHECK constraint for validation';
COMMENT ON COLUMN service_records.cost IS 'Optional cost in PLN (MVP), prepared for multi-currency in future';
COMMENT ON COLUMN service_records.mileage_at_service IS 'Mileage at time of service, no validation against previous records (too complex for MVP)';
```

---

### 5. service_reminders

**Opis**: Przypomnienia o serwisach. Soft complete (completed_at) zamiast DELETE. Auto-create nowego po wykonaniu.

```sql
CREATE TABLE service_reminders (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  completed_service_id UUID REFERENCES service_records(id) ON DELETE SET NULL,
  
  -- Reminder Config
  service_type TEXT NOT NULL CHECK (service_type IN (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- Mileage Tracking
  triggered_at_mileage INTEGER NOT NULL CHECK (triggered_at_mileage >= 0),
  interval_km INTEGER NOT NULL CHECK (interval_km > 0),
  target_mileage INTEGER GENERATED ALWAYS AS (triggered_at_mileage + interval_km) STORED,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE service_reminders IS 'Service reminders with soft complete, auto-creates new reminder after completion';
COMMENT ON COLUMN service_reminders.target_mileage IS 'GENERATED COLUMN: triggered_at_mileage + interval_km, no manual updates needed';
COMMENT ON COLUMN service_reminders.completed_at IS 'Soft complete timestamp instead of DELETE, links to completed_service_id';
```

---

### 6. default_service_intervals

**Opis**: Lookup table dla domyślnych interwałów serwisowych. Edytowalne przez admina bez deploy.

```sql
CREATE TABLE default_service_intervals (
  -- Primary Key
  service_type TEXT PRIMARY KEY CHECK (service_type IN (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- Default Interval
  default_interval_km INTEGER NOT NULL CHECK (default_interval_km > 0),
  
  -- Metadata
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Data
INSERT INTO default_service_intervals (service_type, default_interval_km, description) VALUES
  ('lancuch', 3000, 'Wymiana łańcucha co 3000 km'),
  ('kaseta', 9000, 'Wymiana kasety co 9000 km (3 łańcuchy)'),
  ('klocki_przod', 2000, 'Klocki hamulcowe przód co 2000 km'),
  ('klocki_tyl', 2500, 'Klocki hamulcowe tył co 2500 km'),
  ('opony', 4000, 'Wymiana opon co 4000 km'),
  ('przerzutki', 10000, 'Serwis przerzutek co 10000 km'),
  ('hamulce', 5000, 'Przegląd hamulców co 5000 km'),
  ('przeglad_ogolny', 5000, 'Przegląd ogólny co 5000 km'),
  ('inne', 5000, 'Inne czynności co 5000 km');

-- Comments
COMMENT ON TABLE default_service_intervals IS 'Lookup table for default service intervals, editable by admin without deployment';
```

---

### 7. outfit_feedbacks

**Opis**: Historia feedbacków użytkownika po treningach. Max 30 ostatnich (trigger cleanup). Podstawa personalizacji AI.

```sql
CREATE TABLE outfit_feedbacks (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location_id UUID REFERENCES user_locations(id) ON DELETE SET NULL,
  
  -- Weather Input Parameters (dla rekonstrukcji rekomendacji)
  temperature NUMERIC(4,1) NOT NULL,
  feels_like NUMERIC(4,1) NOT NULL,
  wind_speed NUMERIC(5,2) NOT NULL CHECK (wind_speed >= 0),
  humidity INTEGER NOT NULL CHECK (humidity BETWEEN 0 AND 100),
  rain_mm NUMERIC(5,2) DEFAULT 0 CHECK (rain_mm >= 0),
  
  -- Activity Context
  activity_type TEXT NOT NULL CHECK (activity_type IN ('recovery', 'spokojna', 'tempo', 'interwaly')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  
  -- Actual Outfit (co użytkownik faktycznie ubrał)
  actual_outfit JSONB NOT NULL,
  -- Struktura: {
  --   "head": "czapka" | "opaska" | "buff" | "nic",
  --   "torso": {
  --     "base": "koszulka_kr" | "koszulka_dl" | "termo",
  --     "mid": "kurtka_lekka" | "softshell" | "nic",
  --     "outer": "kurtka_zimowa" | "wiatrowka" | "nic"
  --   },
  --   "arms": "rekawki" | "naramienniki" | "nic",
  --   "hands": "rekawiczki_zimowe" | "przejsciowe" | "letnie" | "nic",
  --   "legs": "dlugie" | "3/4" | "krotkie" | "getry",
  --   "feet": {
  --     "socks": "zimowe" | "letnie",
  --     "covers": "ochraniacze" | "nic"
  --   },
  --   "neck": "komin" | "buff" | "nic"
  -- }
  
  -- Feedback
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  -- 1 = bardzo zimno, 2 = zimno, 3 = komfortowo, 4 = ciepło, 5 = bardzo gorąco
  
  zone_ratings JSONB DEFAULT '{}'::JSONB,
  -- Opcjonalne oceny per strefa: {"head": 3, "hands": 2, ...}
  
  notes TEXT,
  
  -- Community Sharing
  shared_with_community BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE outfit_feedbacks IS 'User feedback after training, max 30 per user (trigger cleanup), basis for AI personalization';
COMMENT ON COLUMN outfit_feedbacks.actual_outfit IS 'JSONB storing what user actually wore (7 zones), not AI recommendation';
COMMENT ON COLUMN outfit_feedbacks.overall_rating IS '1-5 scale: 1=very cold, 2=cold, 3=comfortable, 4=warm, 5=very hot';
COMMENT ON COLUMN outfit_feedbacks.zone_ratings IS 'Optional per-zone ratings in JSONB format';
COMMENT ON COLUMN outfit_feedbacks.shared_with_community IS 'If true, trigger creates entry in shared_outfits';
```

---

### 8. shared_outfits

**Opis**: Anonimizowane zestawy ubioru udostępnione społeczności. TTL 30 dni. Denormalizacja dla performance.

```sql
CREATE TABLE shared_outfits (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (user_id SET NULL dla GDPR)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  feedback_id UUID UNIQUE REFERENCES outfit_feedbacks(id) ON DELETE CASCADE,
  
  -- Denormalized User Data (updated via triggers)
  user_pseudonym TEXT NOT NULL,
  reputation_badge TEXT NOT NULL,
  feedback_count INTEGER NOT NULL,
  
  -- Location for Spatial Queries
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  
  -- Denormalized Weather Conditions
  weather_conditions JSONB NOT NULL,
  -- Struktura: {
  --   "temperature": 10,
  --   "feels_like": 8,
  --   "wind_speed": 15,
  --   "humidity": 70,
  --   "rain_mm": 0
  -- }
  
  -- Activity Context
  activity_type TEXT NOT NULL,
  
  -- Outfit (categories only, no brands)
  outfit JSONB NOT NULL,
  -- Same structure as outfit_feedbacks.actual_outfit
  
  -- Rating
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  
  -- Timestamps (TTL 30 days)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE shared_outfits IS 'Community-shared outfits, anonymized, TTL 30 days, denormalized for performance';
COMMENT ON COLUMN shared_outfits.user_id IS 'SET NULL on user deletion for GDPR, pseudonym remains for community data integrity';
COMMENT ON COLUMN shared_outfits.weather_conditions IS 'Denormalized weather data to avoid JOINs in spatial queries';
COMMENT ON COLUMN shared_outfits.location IS 'PostGIS GEOGRAPHY point for 50km radius queries';
COMMENT ON COLUMN shared_outfits.outfit IS 'JSONB with outfit categories only (no brand names), copied from feedback';
```

---

### 9. weather_cache

**Opis**: Cache pogody współdzielony między użytkownikami. TTL 30 minut (current) / 6h (forecast).

```sql
CREATE TABLE weather_cache (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Location Key (unique identifier per location)
  location_key TEXT NOT NULL UNIQUE,
  -- Format: "City_CountryCode" np. "Warsaw_PL" lub geohash dla precyzji
  
  -- Cached Data
  current_weather JSONB,
  -- Struktura z OpenWeather API Current Weather Data 2.5:
  -- {
  --   "temp": 10.5,
  --   "feels_like": 8.2,
  --   "humidity": 65,
  --   "wind_speed": 12.5,
  --   "wind_deg": 180,
  --   "weather": [{"main": "Clouds", "description": "scattered clouds", "icon": "03d"}],
  --   "rain": {"1h": 0.5}
  -- }
  
  forecast_data JSONB,
  -- Struktura: 7-day forecast array z OpenWeather API
  
  -- TTL
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE weather_cache IS 'Shared weather cache per location, TTL 30min (current) / 6h (forecast)';
COMMENT ON COLUMN weather_cache.location_key IS 'Unique key per location: "City_CountryCode" or geohash';
COMMENT ON COLUMN weather_cache.expires_at IS 'TTL expiration, different for current (30min) vs forecast (6h)';
```

---

## Relacje i Kardynalność

### Diagram ERD

```
auth.users (Supabase Auth)
    ║
    ║ 1:1 (ON DELETE CASCADE, auto-trigger)
    ║
    ▼
profiles
    ║
    ╠══════════════════════════════════════════════════╗
    ║                                                  ║
    ║ 1:N                                              ║ 1:N
    ▼                                                  ▼
user_locations ◄───────┐                          bikes
    ║                  │                              ║
    ║ N:1              │ default_location_id          ╠═══════════════════╗
    ║ (SET NULL)       │                              ║                   ║
    ▼                  │                              ║ 1:N               ║ 1:N
outfit_feedbacks       └──────────────────────────────╣ (CASCADE)         ║ (CASCADE)
    ║                                                  ▼                   ▼
    ║ 1:0..1 (trigger if shared)                  service_records    service_reminders
    ▼                                                                      ║
shared_outfits                                                             ║ N:1
    ║                                                                      ║ (SET NULL)
    ║ N:1 (SET NULL na GDPR delete)                                       ▼
    ║                                                                  service_records
    ▼                                                              (completed_service_id)
profiles (user_id)


default_service_intervals (lookup table, brak FK)
    → używane przez aplikację przy tworzeniu service_reminders
```

### Szczegóły Relacji

| Parent Table | Child Table | Relationship | ON DELETE | Opis |
|--------------|-------------|--------------|-----------|------|
| `auth.users` | `profiles` | 1:1 | CASCADE | Auto-create przez trigger |
| `profiles` | `user_locations` | 1:N | CASCADE | Wielka lokalizacji |
| `profiles` | `bikes` | 1:N | CASCADE | Wielka rowerów |
| `profiles` | `outfit_feedbacks` | 1:N | CASCADE | Max 30 (trigger) |
| `profiles` | `shared_outfits` | 1:N | SET NULL | GDPR - pseudonim pozostaje |
| `user_locations` | `profiles` | N:1 | SET NULL | default_location_id |
| `user_locations` | `outfit_feedbacks` | 1:N | SET NULL | location_id |
| `bikes` | `service_records` | 1:N | CASCADE | Historia serwisów |
| `bikes` | `service_reminders` | 1:N | CASCADE | Przypomnienia |
| `service_records` | `service_reminders` | 1:N | SET NULL | completed_service_id |
| `outfit_feedbacks` | `shared_outfits` | 1:0..1 | CASCADE | Jeśli shared_with_community |

### Kardynalność - Szczegóły

**1:1 Relationships:**
- `auth.users ↔ profiles`: Enforced przez FK (profiles.id = auth.users.id), auto-create przez trigger

**1:N Relationships:**
- `profiles → user_locations`: User może mieć wiele lokalizacji (dom, praca, rodzice)
- `profiles → bikes`: User może mieć wiele rowerów
- `profiles → outfit_feedbacks`: User może mieć max 30 feedbacków (trigger cleanup)
- `profiles → shared_outfits`: User może udostępnić wiele zestawów
- `bikes → service_records`: Bike ma pełną historię serwisów
- `bikes → service_reminders`: Bike może mieć wiele aktywnych reminderów

**N:1 Relationships (Reverse FK):**
- `profiles ← user_locations`: default_location_id wskazuje na domyślną lokalizację
- `outfit_feedbacks ← user_locations`: Feedback powiązany z lokalizacją

**Special Cases:**
- `service_reminders.completed_service_id → service_records`: Self-referencing link (który serwis zakończył reminder)
- `default_service_intervals`: Lookup table bez FK - używana przez aplikację jako reference

---

## Indeksy

### B-tree Indexes (Standard)

```sql
-- Primary Keys (automatic)
-- profiles(id), user_locations(id), bikes(id), service_records(id), 
-- service_reminders(id), outfit_feedbacks(id), shared_outfits(id), weather_cache(id)

-- Foreign Keys
CREATE INDEX idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX idx_bikes_user_id ON bikes(user_id);
CREATE INDEX idx_service_records_bike_id ON service_records(bike_id);
CREATE INDEX idx_service_reminders_bike_id ON service_reminders(bike_id);
CREATE INDEX idx_service_reminders_completed_service_id ON service_reminders(completed_service_id);
CREATE INDEX idx_outfit_feedbacks_user_id ON outfit_feedbacks(user_id);
CREATE INDEX idx_outfit_feedbacks_location_id ON outfit_feedbacks(location_id);
CREATE INDEX idx_shared_outfits_user_id ON shared_outfits(user_id);
CREATE INDEX idx_shared_outfits_feedback_id ON shared_outfits(feedback_id);

-- Unique Constraints (automatic unique index)
-- profiles(pseudonym), user_locations(user_id, is_default) WHERE is_default = true
-- shared_outfits(feedback_id), weather_cache(location_key)

-- Frequently Filtered Columns
CREATE INDEX idx_profiles_reputation_badge ON profiles(reputation_badge);
CREATE INDEX idx_bikes_status ON bikes(status);
CREATE INDEX idx_service_records_service_type ON service_records(service_type);
```

### Partial Indexes (Conditional)

```sql
-- Active bikes only (most common query)
CREATE INDEX idx_bikes_active ON bikes(user_id, status) 
WHERE status = 'active';

-- Active reminders only (exclude completed)
CREATE INDEX idx_service_reminders_active ON service_reminders(bike_id, completed_at) 
WHERE completed_at IS NULL;

-- Valid weather cache only (exclude expired)
CREATE INDEX idx_weather_cache_valid ON weather_cache(location_key, expires_at) 
WHERE expires_at > NOW();

-- Recent feedbacks only (last 30 days for analytics)
CREATE INDEX idx_outfit_feedbacks_recent ON outfit_feedbacks(user_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';
```

### GIST Spatial Indexes (PostGIS)

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Spatial indexes for 50km radius queries
CREATE INDEX idx_user_locations_geography ON user_locations USING GIST(location);
CREATE INDEX idx_shared_outfits_geography ON shared_outfits USING GIST(location);
```

### Composite Indexes (Multi-column)

```sql
-- Timeline queries (user feed, descending by date)
CREATE INDEX idx_outfit_feedbacks_timeline ON outfit_feedbacks(user_id, created_at DESC);
CREATE INDEX idx_service_records_timeline ON service_records(bike_id, service_date DESC);

-- Community sorting (reputation + recency)
CREATE INDEX idx_shared_outfits_community ON shared_outfits(reputation_badge, created_at DESC);

-- Mileage-based queries
CREATE INDEX idx_service_records_mileage ON service_records(bike_id, mileage_at_service DESC);
CREATE INDEX idx_service_reminders_target ON service_reminders(bike_id, target_mileage) 
WHERE completed_at IS NULL;
```

### JSONB Indexes (Optional - Post-MVP)

```sql
-- Jeśli potrzebne query po konkretnych kluczach JSONB
-- CREATE INDEX idx_profiles_thermal_prefs_gin ON profiles USING GIN(thermal_preferences);
-- CREATE INDEX idx_outfit_feedbacks_outfit_gin ON outfit_feedbacks USING GIN(actual_outfit);
```

**Uwaga**: JSONB GIN indexes zajmują dużo miejsca. W MVP najprawdopodobniej niepotrzebne - jeśli query po JSONB stanie się bottleneckiem, dodać w późniejszej fazie.

---

## Row Level Security (RLS)

### Enable RLS na wszystkich tabelach

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_service_intervals ENABLE ROW LEVEL SECURITY;
```

### Helper Functions

```sql
-- Helper: Check if user owns the bike
CREATE OR REPLACE FUNCTION is_bike_owner(bike_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bikes 
    WHERE id = bike_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_bike_owner IS 'Helper function to check bike ownership, used in RLS policies for DRY';
```

### RLS Policies

#### 1. profiles

```sql
-- SELECT: Users can only view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- UPDATE: Users can only update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Blocked (handled by trigger on auth.users)
-- DELETE: Blocked (use delete_user_data() function for GDPR)
```

#### 2. user_locations

```sql
-- SELECT: Users can only view their own locations
CREATE POLICY user_locations_select_own ON user_locations
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert their own locations
CREATE POLICY user_locations_insert_own ON user_locations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own locations
CREATE POLICY user_locations_update_own ON user_locations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own locations
CREATE POLICY user_locations_delete_own ON user_locations
  FOR DELETE
  USING (user_id = auth.uid());
```

#### 3. bikes

```sql
-- SELECT: Users can only view their own bikes
CREATE POLICY bikes_select_own ON bikes
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert their own bikes
CREATE POLICY bikes_insert_own ON bikes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own bikes
CREATE POLICY bikes_update_own ON bikes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own bikes
CREATE POLICY bikes_delete_own ON bikes
  FOR DELETE
  USING (user_id = auth.uid());
```

#### 4. service_records

```sql
-- SELECT: Users can only view records for their bikes
CREATE POLICY service_records_select_own ON service_records
  FOR SELECT
  USING (is_bike_owner(bike_id));

-- INSERT: Users can only insert records for their bikes
CREATE POLICY service_records_insert_own ON service_records
  FOR INSERT
  WITH CHECK (is_bike_owner(bike_id));

-- UPDATE: Users can only update records for their bikes
CREATE POLICY service_records_update_own ON service_records
  FOR UPDATE
  USING (is_bike_owner(bike_id))
  WITH CHECK (is_bike_owner(bike_id));

-- DELETE: Users can only delete records for their bikes
CREATE POLICY service_records_delete_own ON service_records
  FOR DELETE
  USING (is_bike_owner(bike_id));
```

#### 5. service_reminders

```sql
-- SELECT: Users can only view reminders for their bikes
CREATE POLICY service_reminders_select_own ON service_reminders
  FOR SELECT
  USING (is_bike_owner(bike_id));

-- INSERT: Users can only insert reminders for their bikes
CREATE POLICY service_reminders_insert_own ON service_reminders
  FOR INSERT
  WITH CHECK (is_bike_owner(bike_id));

-- UPDATE: Users can only update reminders for their bikes
CREATE POLICY service_reminders_update_own ON service_reminders
  FOR UPDATE
  USING (is_bike_owner(bike_id))
  WITH CHECK (is_bike_owner(bike_id));

-- DELETE: Users can only delete reminders for their bikes
CREATE POLICY service_reminders_delete_own ON service_reminders
  FOR DELETE
  USING (is_bike_owner(bike_id));
```

#### 6. outfit_feedbacks

```sql
-- SELECT: Users can only view their own feedbacks
CREATE POLICY outfit_feedbacks_select_own ON outfit_feedbacks
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can only insert their own feedbacks
CREATE POLICY outfit_feedbacks_insert_own ON outfit_feedbacks
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own feedbacks
CREATE POLICY outfit_feedbacks_update_own ON outfit_feedbacks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own feedbacks
CREATE POLICY outfit_feedbacks_delete_own ON outfit_feedbacks
  FOR DELETE
  USING (user_id = auth.uid());
```

#### 7. shared_outfits

```sql
-- SELECT: All authenticated users can view community outfits
CREATE POLICY shared_outfits_select_all ON shared_outfits
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only insert their own shared outfits
CREATE POLICY shared_outfits_insert_own ON shared_outfits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: No updates allowed (immutable)
-- DELETE: Users can only delete their own shared outfits (GDPR)
CREATE POLICY shared_outfits_delete_own ON shared_outfits
  FOR DELETE
  USING (user_id = auth.uid());
```

#### 8. weather_cache

```sql
-- SELECT: All authenticated users can view weather cache
CREATE POLICY weather_cache_select_all ON weather_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Only service_role (Edge Functions)
CREATE POLICY weather_cache_service_role ON weather_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

#### 9. default_service_intervals

```sql
-- SELECT: All authenticated users can view defaults
CREATE POLICY default_service_intervals_select_all ON default_service_intervals
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Only service_role (admin modifications)
CREATE POLICY default_service_intervals_service_role ON default_service_intervals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

## Funkcje Pomocnicze

### 1. Auto-update updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Auto-update updated_at timestamp on every UPDATE';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_locations_updated_at BEFORE UPDATE ON user_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bikes_updated_at BEFORE UPDATE ON bikes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_records_updated_at BEFORE UPDATE ON service_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_reminders_updated_at BEFORE UPDATE ON service_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outfit_feedbacks_updated_at BEFORE UPDATE ON outfit_feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_cache_updated_at BEFORE UPDATE ON weather_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_default_service_intervals_updated_at BEFORE UPDATE ON default_service_intervals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Auto-create Profile on User Registration

```sql
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_profile_for_user IS 'Auto-create profile when user registers via Supabase Auth';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();
```

### 3. Increment Feedback Count

```sql
CREATE OR REPLACE FUNCTION increment_feedback_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET feedback_count = feedback_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_feedback_count IS 'Auto-increment feedback_count in profiles when feedback is added';

CREATE TRIGGER on_outfit_feedback_insert
  AFTER INSERT ON outfit_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION increment_feedback_count();
```

### 4. Update Reputation Badge

```sql
CREATE OR REPLACE FUNCTION update_reputation_badge()
RETURNS TRIGGER AS $$
DECLARE
  new_badge TEXT;
BEGIN
  -- Calculate badge based on feedback_count
  IF NEW.feedback_count < 10 THEN
    new_badge := 'nowicjusz';
  ELSIF NEW.feedback_count < 50 THEN
    new_badge := 'regularny';
  ELSIF NEW.feedback_count < 100 THEN
    new_badge := 'ekspert';
  ELSE
    new_badge := 'mistrz';
  END IF;
  
  -- Update if changed
  IF NEW.reputation_badge != new_badge THEN
    NEW.reputation_badge := new_badge;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_reputation_badge IS 'Auto-update reputation badge based on feedback_count';

CREATE TRIGGER on_profile_feedback_count_update
  BEFORE UPDATE OF feedback_count ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_reputation_badge();
```

### 5. Ensure Pseudonym on First Share

```sql
CREATE OR REPLACE FUNCTION ensure_pseudonym_on_share()
RETURNS TRIGGER AS $$
DECLARE
  user_pseudonym TEXT;
BEGIN
  -- Only process if sharing with community
  IF NEW.shared_with_community = true THEN
    -- Get user's pseudonym
    SELECT pseudonym INTO user_pseudonym
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Generate pseudonym if doesn't exist
    IF user_pseudonym IS NULL THEN
      user_pseudonym := 'kolarz_' || substr(NEW.user_id::TEXT, 1, 8);
      
      UPDATE profiles
      SET pseudonym = user_pseudonym
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ensure_pseudonym_on_share IS 'Auto-generate pseudonym if user shares for the first time';

CREATE TRIGGER on_outfit_feedback_share
  BEFORE INSERT ON outfit_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION ensure_pseudonym_on_share();
```

### 6. Create Shared Outfit from Feedback

```sql
CREATE OR REPLACE FUNCTION create_shared_outfit_from_feedback()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  location_point GEOGRAPHY;
BEGIN
  -- Only if shared with community
  IF NEW.shared_with_community = true THEN
    -- Get user data (denormalized)
    SELECT pseudonym, reputation_badge, feedback_count
    INTO user_record
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Get location geography
    SELECT location INTO location_point
    FROM user_locations
    WHERE id = NEW.location_id;
    
    -- Insert into shared_outfits
    INSERT INTO shared_outfits (
      user_id,
      feedback_id,
      user_pseudonym,
      reputation_badge,
      feedback_count,
      location,
      weather_conditions,
      activity_type,
      outfit,
      overall_rating,
      created_at
    ) VALUES (
      NEW.user_id,
      NEW.id,
      user_record.pseudonym,
      user_record.reputation_badge,
      user_record.feedback_count,
      location_point,
      jsonb_build_object(
        'temperature', NEW.temperature,
        'feels_like', NEW.feels_like,
        'wind_speed', NEW.wind_speed,
        'humidity', NEW.humidity,
        'rain_mm', NEW.rain_mm
      ),
      NEW.activity_type,
      NEW.actual_outfit,
      NEW.overall_rating,
      NEW.created_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_shared_outfit_from_feedback IS 'Auto-create shared_outfit entry when feedback is shared with community';

CREATE TRIGGER on_outfit_feedback_create_shared
  AFTER INSERT ON outfit_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION create_shared_outfit_from_feedback();
```

### 7. Auto-complete Reminder on Service

```sql
CREATE OR REPLACE FUNCTION auto_complete_reminder_on_service()
RETURNS TRIGGER AS $$
DECLARE
  reminder_id UUID;
  default_interval INTEGER;
BEGIN
  -- Find active reminder for this service type
  SELECT id INTO reminder_id
  FROM service_reminders
  WHERE bike_id = NEW.bike_id
    AND service_type = NEW.service_type
    AND completed_at IS NULL
  LIMIT 1;
  
  -- Mark as completed
  IF reminder_id IS NOT NULL THEN
    UPDATE service_reminders
    SET completed_at = NOW(),
        completed_service_id = NEW.id
    WHERE id = reminder_id;
    
    -- Get default interval for this service type
    SELECT default_interval_km INTO default_interval
    FROM default_service_intervals
    WHERE service_type = NEW.service_type;
    
    -- Create new reminder
    IF default_interval IS NOT NULL THEN
      INSERT INTO service_reminders (
        bike_id,
        service_type,
        triggered_at_mileage,
        interval_km
      ) VALUES (
        NEW.bike_id,
        NEW.service_type,
        NEW.mileage_at_service,
        default_interval
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_complete_reminder_on_service IS 'Auto-complete reminder and create new one when service is performed';

CREATE TRIGGER on_service_record_insert
  AFTER INSERT ON service_records
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_reminder_on_service();
```

### 8. Update Bike Mileage on Service

```sql
CREATE OR REPLACE FUNCTION update_bike_mileage_on_service()
RETURNS TRIGGER AS $$
BEGIN
  -- Update bike's current_mileage if service mileage is higher
  UPDATE bikes
  SET current_mileage = GREATEST(current_mileage, NEW.mileage_at_service)
  WHERE id = NEW.bike_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_bike_mileage_on_service IS 'Auto-update bike current_mileage when service is added';

CREATE TRIGGER on_service_record_update_mileage
  AFTER INSERT ON service_records
  FOR EACH ROW
  EXECUTE FUNCTION update_bike_mileage_on_service();
```

### 9. Enforce Single Default Location

```sql
CREATE OR REPLACE FUNCTION enforce_single_default_location()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting as default, unset other defaults for this user
  IF NEW.is_default = true THEN
    UPDATE user_locations
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
    
    -- Update profile's default_location_id
    UPDATE profiles
    SET default_location_id = NEW.id
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION enforce_single_default_location IS 'Ensure only one default location per user';

CREATE TRIGGER on_user_location_set_default
  BEFORE INSERT OR UPDATE ON user_locations
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_location();
```

### 10. Update Thermal Adjustment

```sql
CREATE OR REPLACE FUNCTION update_thermal_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  total_feedbacks INTEGER;
  cold_count INTEGER;
  hot_count INTEGER;
  adjustment NUMERIC;
BEGIN
  -- Only recalculate every 5 feedbacks
  IF NEW.feedback_count % 5 = 0 AND NEW.feedback_count >= 5 THEN
    -- Count cold (rating 1-2) and hot (rating 4-5) feedbacks
    SELECT 
      COUNT(*) FILTER (WHERE overall_rating <= 2),
      COUNT(*) FILTER (WHERE overall_rating >= 4),
      COUNT(*)
    INTO cold_count, hot_count, total_feedbacks
    FROM outfit_feedbacks
    WHERE user_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 30;
    
    -- Calculate adjustment
    IF cold_count::FLOAT / total_feedbacks > 0.6 THEN
      -- User often cold: increase adjustment (+1 to +2°C)
      adjustment := LEAST(2.0, 1.0 + (cold_count::FLOAT / total_feedbacks - 0.6) * 5);
    ELSIF hot_count::FLOAT / total_feedbacks > 0.6 THEN
      -- User often hot: decrease adjustment (-1 to -2°C)
      adjustment := GREATEST(-2.0, -1.0 - (hot_count::FLOAT / total_feedbacks - 0.6) * 5);
    ELSE
      -- Neutral: no adjustment
      adjustment := 0.0;
    END IF;
    
    NEW.thermal_adjustment := adjustment;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_thermal_adjustment IS 'Recalculate thermal adjustment every 5 feedbacks based on cold/hot ratings';

CREATE TRIGGER on_profile_recalculate_adjustment
  BEFORE UPDATE OF feedback_count ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_thermal_adjustment();
```

### 11. Cleanup Old Feedbacks (Limit 30)

```sql
CREATE OR REPLACE FUNCTION cleanup_old_feedbacks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete feedbacks beyond the 30 most recent for this user
  DELETE FROM outfit_feedbacks
  WHERE id IN (
    SELECT id
    FROM outfit_feedbacks
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 30
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_feedbacks IS 'Automatically delete feedbacks beyond the 30 most recent per user';

CREATE TRIGGER on_outfit_feedback_limit
  AFTER INSERT ON outfit_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_feedbacks();
```

---

## Triggery i Automatyzacje

### Podsumowanie Wszystkich Triggerów

| # | Trigger Name | Table | Event | Function | Opis |
|---|--------------|-------|-------|----------|------|
| 1 | `update_*_updated_at` | Wszystkie | BEFORE UPDATE | `update_updated_at_column()` | Auto-update timestamps |
| 2 | `on_auth_user_created` | `auth.users` | AFTER INSERT | `create_profile_for_user()` | Auto-create profile |
| 3 | `on_outfit_feedback_insert` | `outfit_feedbacks` | AFTER INSERT | `increment_feedback_count()` | Increment counter |
| 4 | `on_profile_feedback_count_update` | `profiles` | BEFORE UPDATE OF feedback_count | `update_reputation_badge()` | Update badge |
| 5 | `on_outfit_feedback_share` | `outfit_feedbacks` | BEFORE INSERT | `ensure_pseudonym_on_share()` | Generate pseudonym |
| 6 | `on_outfit_feedback_create_shared` | `outfit_feedbacks` | AFTER INSERT | `create_shared_outfit_from_feedback()` | Create shared_outfit |
| 7 | `on_service_record_insert` | `service_records` | AFTER INSERT | `auto_complete_reminder_on_service()` | Complete + create reminder |
| 8 | `on_service_record_update_mileage` | `service_records` | AFTER INSERT | `update_bike_mileage_on_service()` | Update bike mileage |
| 9 | `on_user_location_set_default` | `user_locations` | BEFORE INSERT/UPDATE | `enforce_single_default_location()` | One default per user |
| 10 | `on_profile_recalculate_adjustment` | `profiles` | BEFORE UPDATE OF feedback_count | `update_thermal_adjustment()` | AI personalization |
| 11 | `on_outfit_feedback_limit` | `outfit_feedbacks` | AFTER INSERT | `cleanup_old_feedbacks()` | Limit 30 feedbacks |

### Flow Diagram - Przykład: Dodanie Feedbacku

```
User dodaje outfit_feedback
         │
         ├─► BEFORE INSERT: ensure_pseudonym_on_share()
         │   └─► Generuje pseudonym jeśli pierwszy share
         │
         ├─► INSERT wykonany
         │
         ├─► AFTER INSERT: increment_feedback_count()
         │   └─► profiles.feedback_count += 1
         │       │
         │       └─► BEFORE UPDATE: update_reputation_badge()
         │           └─► Aktualizuje badge jeśli próg przekroczony
         │       │
         │       └─► BEFORE UPDATE: update_thermal_adjustment()
         │           └─► Co 5 feedbacków: recalculate adjustment
         │
         ├─► AFTER INSERT: create_shared_outfit_from_feedback()
         │   └─► Jeśli shared_with_community: INSERT do shared_outfits
         │
         └─► AFTER INSERT: cleanup_old_feedbacks()
             └─► DELETE feedbacków > 30 dla tego usera
```

---

## GDPR Compliance

### Funkcja: Export User Data

```sql
CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify user is requesting their own data
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only export your own data';
  END IF;
  
  -- Build comprehensive JSON export
  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p.*) FROM profiles p WHERE id = target_user_id),
    'locations', (SELECT jsonb_agg(to_jsonb(ul.*)) FROM user_locations ul WHERE user_id = target_user_id),
    'bikes', (SELECT jsonb_agg(to_jsonb(b.*)) FROM bikes b WHERE user_id = target_user_id),
    'service_records', (
      SELECT jsonb_agg(to_jsonb(sr.*))
      FROM service_records sr
      JOIN bikes b ON sr.bike_id = b.id
      WHERE b.user_id = target_user_id
    ),
    'service_reminders', (
      SELECT jsonb_agg(to_jsonb(srm.*))
      FROM service_reminders srm
      JOIN bikes b ON srm.bike_id = b.id
      WHERE b.user_id = target_user_id
    ),
    'outfit_feedbacks', (SELECT jsonb_agg(to_jsonb(of.*)) FROM outfit_feedbacks of WHERE user_id = target_user_id),
    'shared_outfits', (SELECT jsonb_agg(to_jsonb(so.*)) FROM shared_outfits so WHERE user_id = target_user_id),
    'export_timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION export_user_data IS 'GDPR: Export all user data as JSON (Right to Data Portability)';
```

### Funkcja: Delete User Data

```sql
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Verify user is deleting their own data
  IF target_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete your own data';
  END IF;
  
  -- Anonymize shared_outfits (keep pseudonym for community integrity)
  UPDATE shared_outfits
  SET user_id = NULL
  WHERE user_id = target_user_id;
  
  -- Delete profile (cascades to all owned data via FK)
  DELETE FROM profiles WHERE id = target_user_id;
  
  -- Delete auth user (final step)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Note: Supabase Auth will send confirmation email via configured template
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_user_data IS 'GDPR: Delete all user data, anonymize shared_outfits (Right to Erasure)';
```

### GDPR Features Summary

| Requirement | Implementation | Notes |
|-------------|----------------|-------|
| **Right to Access** | `export_user_data()` | JSON export wszystkich danych |
| **Right to Erasure** | `delete_user_data()` | Kaskadowe usuwanie + anonimizacja shared |
| **Right to Portability** | `export_user_data()` | JSON format, machine-readable |
| **Data Minimization** | Location zaokrąglone do ~100m | Privacy by design |
| **Consent** | `share_with_community` flag | Explicit opt-in dla social features |
| **Audit Trail** | Timestamps na wszystkich tabelach | created_at, updated_at |
| **Data Retention** | TTL strategies | 30 feedbacks, 30 days shared_outfits |

---

## Optymalizacje Wydajnościowe

### 1. Query Patterns i Ich Optymalizacje

#### Pattern: Dashboard Main Query
```sql
-- Pobieranie dashboardu użytkownika
SELECT 
  p.*,
  (SELECT to_jsonb(ul.*) FROM user_locations ul WHERE ul.id = p.default_location_id) as default_location,
  (SELECT COUNT(*) FROM bikes WHERE user_id = p.id AND status = 'active') as active_bikes_count
FROM profiles p
WHERE p.id = auth.uid();

-- Optymalizacja: 
-- - idx_bikes_active (partial index WHERE status = 'active')
-- - Profile query używa PK index
```

#### Pattern: Community 50km Radius Query
```sql
-- Znajdź shared outfits w promieniu 50km
SELECT 
  so.*,
  ST_Distance(so.location, $1::geography) as distance_meters
FROM shared_outfits so
WHERE 
  ST_DWithin(so.location, $1::geography, 50000) -- 50km radius
  AND temperature BETWEEN $2 - 3 AND $2 + 3 -- ±3°C
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY reputation_badge DESC, created_at DESC
LIMIT 10;

-- Optymalizacja:
-- - idx_shared_outfits_geography (GIST spatial index)
-- - idx_shared_outfits_community (composite: reputation_badge, created_at)
-- - Partial query: tylko ostatnie 24h
```

#### Pattern: Service Dashboard (Top 3 Nearest)
```sql
-- Najbliższe serwisy dla wszystkich rowerów użytkownika
SELECT 
  b.name as bike_name,
  sr.service_type,
  sr.target_mileage,
  b.current_mileage,
  (sr.target_mileage - b.current_mileage) as km_remaining
FROM service_reminders sr
JOIN bikes b ON sr.bike_id = b.id
WHERE 
  b.user_id = auth.uid()
  AND b.status = 'active'
  AND sr.completed_at IS NULL
ORDER BY km_remaining ASC
LIMIT 3;

-- Optymalizacja:
-- - idx_service_reminders_active (partial WHERE completed_at IS NULL)
-- - idx_bikes_active (partial WHERE status = 'active')
-- - idx_service_reminders_target (composite: bike_id, target_mileage)
```

### 2. Caching Strategy

| Data Type | Cache Location | TTL | Rationale |
|-----------|----------------|-----|-----------|
| Current Weather | `weather_cache` table | 30 min | Współdzielony, OpenWeather limit |
| Forecast | `weather_cache` table | 6h | Rzadziej się zmienia |
| Recommendations | Brak (rule-based) | N/A | Instant calculation |
| User Profile | Application cache | Session | Rzadkie zmiany |
| Shared Outfits | Application cache | 5 min | Częste queries, denormalizacja |

### 3. Denormalization Trade-offs

**Denormalized Data w `shared_outfits`:**
- `user_pseudonym`, `reputation_badge`, `feedback_count`
- `weather_conditions` (full JSONB)
- `location` (GEOGRAPHY point)

**Korzyści:**
- Zero JOINs dla community feed query
- Szybkie spatial queries z filtrami
- Immutable data (nie wymaga UPDATE)

**Koszty:**
- Eventual consistency (trigger-based updates)
- ~2x storage per shared outfit (~2KB vs 1KB)
- Risk: stale data jeśli trigger fail

**Justyfikacja:**
- Community feed to najczęściej używany feature
- Performance > consistency dla read-heavy social feed
- Stale data nie jest krytyczne (reputation badge może być sprzed chwili)

### 4. Connection Pooling

**Supabase Free Tier:**
- 60 max connections (PgBouncer)
- Transaction pooling mode
- Idle timeout: 10 min

**Astro SSR Configuration:**
```javascript
// Recommended: Single Supabase client per request
export const prerender = false; // SSR mode dla authenticated routes

// Limit connection pool w development
const supabase = createClient(url, key, {
  db: {
    pooling: {
      min: 1,
      max: 10
    }
  }
});
```

### 5. Batch Operations

**Recommended dla bulk inserts:**
```sql
-- Zamiast N pojedynczych INSERTs
INSERT INTO service_records (bike_id, service_date, ...)
VALUES 
  ($1, $2, ...),
  ($3, $4, ...),
  ($5, $6, ...);

-- Performance: ~10x szybsze dla N > 10
```

### 6. EXPLAIN ANALYZE - Critical Queries

```sql
-- Test przed production deployment
EXPLAIN (ANALYZE, BUFFERS) 
SELECT ... FROM shared_outfits WHERE ST_DWithin(...);

-- Target metrics:
-- - Execution Time: < 100ms (p50), < 500ms (p99)
-- - Planning Time: < 10ms
-- - Index usage: 100% (no Seq Scan na dużych tabelach)
```

---

## Estymacja Rozmiaru

### Założenia (1 rok, 100 aktywnych użytkowników)

#### Profiles
- 100 users × 2 KB/user = **200 KB**

#### User Locations
- 100 users × 2.5 locations/user × 1 KB = **250 KB**

#### Bikes
- 100 users × 1.5 bikes/user × 2 KB = **300 KB**

#### Service Records
- 100 users × 1.5 bikes × 2 serwisy/miesiąc × 12 miesięcy × 1 KB = **3.6 MB**

#### Service Reminders
- 100 users × 1.5 bikes × 5 active reminders × 300 B = **225 KB**

#### Outfit Feedbacks (max 30/user)
- 100 users × 30 feedbacks × 2 KB = **6 MB**

#### Shared Outfits (TTL 30 days)
- 50 sharing users × 8 feedbacks/month × 2 KB = **1 MB** (rolling window)

#### Weather Cache
- ~20 unique cities × 25 KB = **500 KB**

#### Default Service Intervals
- 9 types × 500 B = **5 KB**

---

### Total Data Estimate

```
Profiles:               200 KB
User Locations:         250 KB
Bikes:                  300 KB
Service Records:        3.6 MB
Service Reminders:      225 KB
Outfit Feedbacks:       6.0 MB
Shared Outfits:         1.0 MB
Weather Cache:          500 KB
Default Intervals:      5 KB
─────────────────────────────
TOTAL:                  ~12 MB

Indexes (+25-40%):      ~3-5 MB
─────────────────────────────
GRAND TOTAL:            15-20 MB
```

**Supabase Free Tier: 500 MB**  
**Utilization: 3-4%** ✅

### Scaling Projections

| Users | Data Size | Index Size | Total | % of 500MB |
|-------|-----------|------------|-------|------------|
| 100 | 12 MB | 4 MB | 16 MB | 3% |
| 500 | 60 MB | 20 MB | 80 MB | 16% |
| 1000 | 120 MB | 40 MB | 160 MB | 32% |
| 2000 | 240 MB | 80 MB | 320 MB | 64% |
| 3000 | 360 MB | 120 MB | **480 MB** | **96%** ⚠️ |

**Wniosek:** Free tier wystarczy dla ~2500 użytkowników przed migracją na Pro ($25/m).

---

## Strategie Maintenance

### Daily Tasks (Automated via Edge Functions)

#### 1. Cleanup Expired Weather Cache
```sql
-- Cron: 03:00 AM UTC
DELETE FROM weather_cache
WHERE expires_at < NOW();

-- Expected: ~5-10 deletions/day
```

#### 2. Cleanup Old Shared Outfits (TTL 30 days)
```sql
-- Cron: 03:30 AM UTC
DELETE FROM shared_outfits
WHERE created_at < NOW() - INTERVAL '30 days';

-- Expected: ~10-20 deletions/day (100 users)
```

### Weekly Tasks (Manual or Cron)

#### 1. Database Backup
```bash
# Niedziela 02:00 AM UTC
pg_dump --host=db.xxx.supabase.co \
        --username=postgres \
        --format=custom \
        --file=backup_$(date +%Y%m%d).dump \
        cyclegear_db

# Upload to S3/GCS
# Retain last 4 backups (1 month)
```

#### 2. Reconciliation - Feedback Count
```sql
-- Sprawdź consistency denormalizacji
SELECT 
  p.id,
  p.feedback_count as stored_count,
  (SELECT COUNT(*) FROM outfit_feedbacks WHERE user_id = p.id) as actual_count
FROM profiles p
WHERE p.feedback_count != (SELECT COUNT(*) FROM outfit_feedbacks WHERE user_id = p.id);

-- Jeśli > 5% discrepancy: manual fix
UPDATE profiles p
SET feedback_count = (SELECT COUNT(*) FROM outfit_feedbacks WHERE user_id = p.id)
WHERE p.id = $1;
```

### Monthly Tasks

#### 1. Analyze Slow Queries
```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries
SELECT 
  calls,
  total_exec_time,
  mean_exec_time,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Action: Optimize queries > 500ms median
```

#### 2. Index Maintenance
```sql
-- Check index bloat
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild bloated indexes (>50% bloat)
REINDEX INDEX CONCURRENTLY idx_name;
```

#### 3. Vacuum Analysis
```sql
-- Check tables needing VACUUM
SELECT 
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) * 100, 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY dead_pct DESC;

-- Manual VACUUM jeśli autovacuum nie nadąża
VACUUM ANALYZE tablename;
```

### Quarterly Tasks

#### 1. Growth Analysis
```sql
-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Plan scaling if approaching limits
```

#### 2. Security Audit
```sql
-- Review RLS policies effectiveness
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public';

-- Test bypass attempts w staging environment
```

### Monitoring Alerts

| Metric | Threshold | Alert Level | Action |
|--------|-----------|-------------|--------|
| Database Size | > 400 MB (80%) | WARNING | Plan migration to Pro |
| Database Size | > 480 MB (96%) | CRITICAL | Immediate upgrade |
| Active Connections | > 50 (83%) | WARNING | Optimize connection pooling |
| Slow Query (p50) | > 500ms | WARNING | Investigate & optimize |
| Error Rate | > 1% | CRITICAL | Emergency debugging |
| Cleanup Cron Fail | > 48h | CRITICAL | Manual cleanup + fix cron |
| Backup Fail | 2 weeks | CRITICAL | Immediate manual backup |

---

## Migration Files Structure

```
/supabase/migrations/
├── 20251008120000_initial_schema.sql
│   ├── CREATE EXTENSION postgis
│   ├── CREATE TABLE profiles
│   ├── CREATE TABLE user_locations
│   ├── CREATE TABLE bikes
│   └── Comments, indexes, constraints
│
├── 20251008120100_service_tables.sql
│   ├── CREATE TABLE service_records
│   ├── CREATE TABLE service_reminders
│   ├── CREATE TABLE default_service_intervals
│   ├── INSERT seed data (default intervals)
│   └── Indexes, constraints
│
├── 20251008120200_feedback_tables.sql
│   ├── CREATE TABLE outfit_feedbacks
│   ├── CREATE TABLE shared_outfits
│   └── Indexes (incl. spatial GIST)
│
├── 20251008120300_weather_cache.sql
│   ├── CREATE TABLE weather_cache
│   └── Indexes
│
├── 20251008120400_functions.sql
│   ├── Helper functions (is_bike_owner, etc.)
│   ├── GDPR functions (export, delete)
│   └── Utility functions
│
├── 20251008120500_triggers.sql
│   ├── Trigger functions (wszystkie 11)
│   └── CREATE TRIGGER statements
│
├── 20251008120600_rls_policies.sql
│   ├── ENABLE RLS na wszystkich tabelach
│   └── CREATE POLICY dla każdej tabeli
│
└── 20251008120700_seed_data.sql
    └── INSERT testowych danych (development only)
```

---

## Nierozwiązane Kwestie (Wymagają Decyzji Pre-Development)

### 🔴 High Priority

1. **Pseudonym Edit Cooldown**
   - **Status**: Brak limitów na zmianę pseudonimu
   - **Risk**: User może spamować zmiany, social reputation nierzetelna
   - **Rekomendacja**: Dodać `pseudonym_updated_at TIMESTAMPTZ` + CHECK constraint (min 30 dni)

2. **Rate Limiting dla AI Recommendations**
   - **Status**: Brak limitów per user
   - **Risk**: Przekroczenie OpenRouter limitów/kosztów
   - **Rekomendacja**: `profiles.daily_reco_count` + reset trigger + fallback

3. **Location Privacy (Exact vs Rounded)**
   - **Status**: GEOGRAPHY przechowuje exact coords
   - **Risk**: Privacy concern
   - **Rekomendacja**: Zaokrąglenie do 3 cyfr po przecinku (~100m) + info w Privacy Policy

### 🟡 Medium Priority

4. **Edge Function Cleanup Reliability**
   - **Status**: Brak obsługi failed cleanups
   - **Risk**: Nagromadzenie expired data
   - **Rekomendacja**: Dead letter queue + alert po 48h + manual procedure

5. **Recommendation Algorithm Accuracy Tracking**
   - **Status**: Brak tracking czy user modyfikował rekomendację
   - **Risk**: Brak danych do iteracji algorytmu
   - **Rekomendacja POST-MVP**: Dodać `outfit_feedbacks.user_modified BOOLEAN`

### 🟢 Low Priority (Post-MVP)

6. **Thermal Adjustment Seasonality**
   - **Status**: Jeden adjustment niezależnie od sezonu
   - **Risk**: Może być mylący przy ekstremalnych różnicach zima/lato
   - **Rekomendacja**: Separate adjustment per season w przyszłości

7. **Social Moderation**
   - **Status**: Brak moderacji
   - **Risk**: Offensive notes w feedbackach
   - **Rekomendacja POST-MVP**: Admin panel + report button

---

## Podsumowanie

### Kluczowe Features Schematu

✅ **Spatial Queries**: PostGIS GEOGRAPHY + GIST indexes dla 50km community radius  
✅ **Flexible Data**: JSONB dla thermal preferences, outfits, weather  
✅ **Multi-location Support**: Osobna tabela z is_default enforcement  
✅ **AI Personalization**: thermal_adjustment + feedback loop  
✅ **Denormalization**: shared_outfits dla performance  
✅ **Trigger Automation**: 11 triggerów dla consistency  
✅ **RLS Security**: Zero-trust model na wszystkich tabelach  
✅ **GDPR Compliance**: export + delete functions  
✅ **TTL Strategy**: Auto-cleanup feedbacks (30), shared_outfits (30d), weather  
✅ **Scalability**: Free tier wystarczy dla ~2500 users  

### Next Steps

1. **Pre-Development**:
   - ✅ Review schema z zespołem
   - ⚠️ Decyzja co do nierozwiązanych kwestii (#1, #2, #3)
   - ✅ TypeScript types generation setup
   - ✅ Local Supabase init

2. **Development (Week 1-2)**:
   - Implementacja 7 plików migracji
   - Test RLS policies (wszystkie scenariusze)
   - Seed data (dev + test users)
   - Edge Functions (cleanup, weather)

3. **Testing (Week 3-4)**:
   - Unit tests funkcji
   - Integration tests triggerów
   - Load testing (100 users simulation)
   - Security audit (RLS bypass attempts)

4. **Deployment (Week 5)**:
   - Production Supabase setup
   - Migracje na production
   - Monitoring (Sentry, alerts)
   - Backup cron configuration

5. **Post-Launch (Week 6+)**:
   - 48h monitoring intensywny
   - Slow query analysis
   - User feedback iteration
   - Resolve nierozwiązane kwestie

---

**Status Dokumentu:** ✅ Gotowy do implementacji  
**Ostatnia Aktualizacja:** Październik 2025  
**Następny Przegląd:** Po 2 tygodniach development