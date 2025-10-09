# 🚀 Przewodnik Wdrożenia Migracji - Supabase Cloud

## 📋 Przegląd

Ten przewodnik pokazuje jak zastosować migracje bazy danych na **Supabase Cloud** (nie lokalnie). Projekt zawiera 7 plików migracji implementujących kompletny schemat bazy danych dla CycleGear MVP.

## 📁 Struktura Migracji

```
supabase/migrations/
├── 20251009000000_initial_schema.sql      # Tabele podstawowe + PostGIS
├── 20251009000100_service_tables.sql      # Serwisy + interwały + seed data
├── 20251009000200_feedback_tables.sql     # Feedbacki + shared outfits
├── 20251009000300_weather_cache.sql       # Cache pogody
├── 20251009000400_functions.sql           # Funkcje pomocnicze + GDPR
├── 20251009000500_triggers.sql            # 11 triggerów automatyzacji
└── 20251009000600_rls_policies.sql        # Polityki RLS (zero-trust)
```

## 🛠️ Wymagania

1. **Supabase CLI** (najnowsza wersja)
2. **Projekt Supabase Cloud** (założony w dashboard)
3. **Git** (do śledzenia zmian)

## 📦 Instalacja Supabase CLI

```bash
# NPM (globalnie)
npm install -g supabase

# Lub przez Homebrew (macOS)
brew install supabase/tap/supabase

# Sprawdź wersję
supabase --version
```

## 🔧 Konfiguracja Projektu

### Krok 1: Logowanie do Supabase

```bash
# Zaloguj się do Supabase
supabase login

# Sprawdź status
supabase projects list
```

### Krok 2: Inicjalizacja Projektu (jeśli nie zrobione)

```bash
# W folderze głównym projektu
supabase init

# Lub jeśli folder supabase już istnieje
supabase link --project-ref TWOJ_PROJECT_REF
```

**Gdzie znaleźć PROJECT_REF:**
- Dashboard Supabase → Twój projekt → Settings → General → Reference ID

### Krok 3: Konfiguracja Local Development (opcjonalne)

```bash
# Jeśli chcesz testować lokalnie przed production
supabase start
```

## 🚀 Wdrożenie Migracji na Supabase Cloud

### Metoda 1: Push Migracji (Zalecana)

```bash
# Zastosuj wszystkie migracje na Cloud
supabase db push

# Lub z potwierdzeniem
supabase db push --confirm
```

### Metoda 2: Reset + Push (Jeśli baza nie jest pusta)

```bash
# ⚠️ UWAGA: To usunie wszystkie dane!
supabase db reset --linked

# Następnie push migracji
supabase db push
```

### Metoda 3: Manual SQL (Zaawansowane)

Jeśli masz problemy z CLI, możesz wykonać migracje ręcznie:

1. Otwórz **Supabase Dashboard**
2. Idź do **SQL Editor**
3. Wykonaj pliki migracji **w kolejności**:
   - Skopiuj zawartość `20251009000000_initial_schema.sql`
   - Kliknij **Run**
   - Powtórz dla pozostałych plików

## ✅ Weryfikacja Wdrożenia

### 1. Sprawdź Tabele

```sql
-- W SQL Editor Dashboard
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Oczekiwane tabele:**
- `bikes`
- `default_service_intervals`
- `outfit_feedbacks`
- `profiles`
- `service_records`
- `service_reminders`
- `shared_outfits`
- `user_locations`
- `weather_cache`

### 2. Sprawdź Rozszerzenia

```sql
SELECT extname FROM pg_extension;
```

**Powinno zawierać:** `postgis`

### 3. Sprawdź RLS

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Wszystkie tabele powinny mieć:** `rowsecurity = true`

### 4. Sprawdź Triggery

```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

**Oczekiwane:** 11+ triggerów

### 5. Sprawdź Seed Data

```sql
SELECT service_type, default_interval_km 
FROM default_service_intervals;
```

**Powinno zwrócić:** 9 wierszy z domyślnymi interwałami

## 🔒 Konfiguracja Bezpieczeństwa

### 1. Sprawdź Ustawienia Auth

W Dashboard → Authentication → Settings:
- ✅ **Enable email confirmations**
- ✅ **Enable phone confirmations** (opcjonalne)
- ✅ **Secure email change** (zalecane)

### 2. Ustaw JWT Secret (Production)

W Dashboard → Settings → API:
- Skopiuj **anon public** key do `.env`
- Skopiuj **service_role** key (tylko dla Edge Functions)

### 3. Konfiguracja CORS (jeśli potrzebne)

W Dashboard → Settings → API → CORS:
- Dodaj domenę produkcyjną
- Dla development: `http://localhost:4321`

## 📊 Generowanie TypeScript Types

```bash
# Wygeneruj typy na podstawie schematu
supabase gen types typescript --linked > src/types/database.types.ts

# Lub dla local development
supabase gen types typescript --local > src/types/database.types.ts
```

## 🧪 Testowanie Schematu

### 1. Test Podstawowy - Utworzenie Profilu

```sql
-- Symuluj utworzenie użytkownika (normalnie przez Auth)
INSERT INTO auth.users (id, email) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com');

-- Sprawdź czy profil został utworzony automatycznie
SELECT * FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 2. Test Spatial Queries

```sql
-- Dodaj lokalizację testową (Warszawa)
INSERT INTO user_locations (user_id, location, city, country_code, is_default)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  ST_MakePoint(21.0122, 52.2297),
  'Warsaw',
  'PL',
  true
);

-- Test spatial query (50km od Warszawy)
SELECT city, ST_Distance(location, ST_MakePoint(21.0122, 52.2297)) as distance_meters
FROM user_locations
WHERE ST_DWithin(location, ST_MakePoint(21.0122, 52.2297), 50000);
```

### 3. Test Triggerów

```sql
-- Dodaj feedback (powinien zwiększyć feedback_count)
INSERT INTO outfit_feedbacks (
  user_id, temperature, feels_like, wind_speed, humidity,
  activity_type, duration_minutes, actual_outfit, overall_rating
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  10.5, 8.2, 15.0, 70,
  'spokojna', 60,
  '{"head": "czapka", "torso": {"base": "koszulka_dl"}}',
  3
);

-- Sprawdź czy feedback_count się zwiększył
SELECT feedback_count FROM profiles 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

## 🚨 Rozwiązywanie Problemów

### Problem: "Extension postgis not found"

**Rozwiązanie:**
1. Dashboard → Settings → Extensions
2. Znajdź "postgis" i włącz
3. Ponów migrację

### Problem: "Permission denied for relation auth.users"

**Rozwiązanie:**
- Upewnij się, że używasz **service_role** key dla operacji na `auth.users`
- Sprawdź czy trigger ma `SECURITY DEFINER`

### Problem: "Migrations out of sync"

**Rozwiązanie:**
```bash
# Sprawdź status
supabase migration list --linked

# Repair jeśli potrzebne
supabase migration repair --linked

# Lub reset i ponowny push
supabase db reset --linked
supabase db push
```

### Problem: "RLS policy violation"

**Rozwiązanie:**
1. Sprawdź czy RLS policies zostały utworzone
2. Sprawdź czy używasz prawidłowego user context
3. Dla testów użyj `service_role` key

## 📈 Monitoring i Maintenance

### 1. Sprawdź Rozmiar Bazy

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Monitoruj Slow Queries

W Dashboard → Reports → Database → Slow Queries

### 3. Backup Strategy

- **Automatyczne:** Supabase robi daily backups (7 dni retention na Free tier)
- **Manualne:** Dashboard → Settings → Database → Create backup

## 🎯 Następne Kroki

1. **Konfiguracja Astro/Next.js Client:**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   import type { Database } from './types/database.types'
   
   const supabase = createClient<Database>(
     process.env.PUBLIC_SUPABASE_URL!,
     process.env.PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

2. **Implementacja Auth Flow:**
   - Signup/Login komponenty
   - Protected routes
   - Profile management

3. **Edge Functions (dla pogody):**
   ```bash
   supabase functions new weather-sync
   ```

4. **Monitoring Setup:**
   - Sentry dla error tracking
   - Analytics dla user behavior
   - Performance monitoring

## 📞 Wsparcie

Jeśli napotkasz problemy:

1. **Dokumentacja Supabase:** https://supabase.com/docs
2. **Discord Community:** https://discord.supabase.com
3. **GitHub Issues:** Jeśli to bug w CLI

---

**Status:** ✅ Gotowe do wdrożenia  
**Ostatnia aktualizacja:** Październik 2025  
**Wersja schematu:** 1.0
