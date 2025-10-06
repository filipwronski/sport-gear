# Tech Stack - CycleGear MVP

## Wersja: 1.0 (Zoptymalizowana)
Data: Październik 2025  
Planowany czas realizacji: 6 tygodni

---

## Frontend

### Framework: Astro (SSG/SSR) + React Islands Architecture
**Dlaczego Astro:**
- Doskonała performance - zero JS domyślnie
- Islands Architecture - interaktywność tylko tam gdzie potrzeba
- Elastyczność SSG/SSR per route
- Świetne SEO out-of-the-box

**Komponenty jako Islands (React):**
- Dashboard - interaktywny widget pogody + rekomendacje
- SVG Cyclist Body - 7 interaktywnych stref
- Formularze (dodawanie roweru, serwisu, feedback)
- Społeczność - live feed zestawów
- Profile settings

**Strony statyczne (Astro):**
- Landing page
- O projekcie
- Privacy Policy / Terms of Service

### Styling: Tailwind CSS + shadcn/ui
**Komponenty z shadcn/ui (React):**
- Form, Input, Button, Select, Toast
- Card, Avatar, Badge, Skeleton
- Dialog, Dropdown Menu, Tabs
- Calendar, Slider, Switch

**Konfiguracja Tailwind:**
- Mobile-first breakpoints (sm: 640px, md: 768px, lg: 1024px)
- Custom color palette (brand colors)
- Typography plugin dla contentu

---

## Backend

### BaaS: Supabase
**Komponenty:**
- **PostgreSQL** - baza danych (500MB free tier)
- **Auth** - email/password + Google OAuth
- **Storage** - zdjęcia rowerów (max 1MB/zdjęcie po kompresji)
- **Edge Functions** - logika biznesowa, AI
- **RLS (Row Level Security)** - bezpieczeństwo danych

**Limity Free Tier:**
- 500MB database storage ✅
- 1GB file storage ✅
- 2GB bandwidth/miesiąc ⚠️ (monitorować)
- Unlimited API requests ✅

**Schemat bazy:**
```sql
profiles (user data, thermal preferences)
bikes (nazwa, typ, przebieg, zdjęcie)
service_records (historia serwisów)
service_reminders (przypomnienia)
weather_cache (cache pogody 1h)
outfit_feedbacks (oceny użytkownika)
shared_outfits (społeczność, anonimizowane)
recommendation_cache (cache rekomendacji)
```

---

## AI & Logic

### ⚡ OPTYMALIZACJA: Hybrid Approach (Rule-based + AI)

**Podstawowe rekomendacje: Rule-based Algorithm**
```javascript
// Edge Function Supabase / Astro Endpoint
function getBaseRecommendation(temp, wind, rain, activity, userAdjustment) {
  const adjustedTemp = temp + userAdjustment; // -2 do +2°C z feedbacków
  
  // Deterministyczne reguły dla 7 stref
  const rules = {
    head: getHeadGear(adjustedTemp, wind),
    torso: getTorsoLayers(adjustedTemp, wind, rain, activity),
    arms: getArmGear(adjustedTemp),
    hands: getHandGear(adjustedTemp, wind),
    legs: getLegGear(adjustedTemp, activity),
    feet: getFeetGear(adjustedTemp, rain),
    neck: getNeckGear(adjustedTemp, wind)
  };
  
  return rules;
}
```

**Korzyści rule-based:**
- ✅ 0 kosztów API
- ✅ Instant response (<10ms)
- ✅ Pełna kontrola i przewidywalność
- ✅ Łatwe debugowanie i tweaking
- ✅ Brak rate limitów
- ✅ Działa offline (w przyszłości PWA)

**AI Enhancement: Claude Haiku (przez OpenRouter)**
**Użycie TYLKO dla:**
- "Dodatkowe wskazówki" (1 request na rekomendację)
- Nietypowe warunki (burza, mgła, ekstremalne temp)
- Kontekst lokalny (np. "silny wiatr boczny na tej trasie")

**Dlaczego Claude Haiku:**
- 5-10x tańszy niż GPT-4 (~$0.006 za rekomendację vs $0.06)
- Szybszy response (1-2s vs 3-5s)
- Wystarczająco inteligentny dla prostych wskazówek
- Większy limit requestów

**Fallback:** GPT-3.5-turbo (jeśli Haiku niedostępny)

**Koszty AI:**
- MVP (100 users × 5 req/miesiąc): ~$3-5/miesiąc
- 1000 users: ~$30-50/miesiąc
- vs GPT-4: $600/miesiąc 🔴

### Personalizacja: Linear Regression
```javascript
// Po zebraniu 5+ feedbacków
function calculateThermalAdjustment(feedbacks) {
  // Analiza pattern: jeśli >60% "zimno" → +1°C do +2°C
  // Wagowanie: ostatnie 3 feedbacki = 70%
  const adjustment = linearRegression(feedbacks);
  return clamp(adjustment, -2, 2);
}
```

**Biblioteka:** TensorFlow.js (ultra lightweight) LUB prosty algorytm własny

---

## API Zewnętrzne

### OpenWeather API (Free Tier)
**Endpoints:**
- Current Weather Data API 2.5
- 7-Day Forecast

**Limity:**
- 1000 calls/day ✅ (wystarczy z cachingiem)

**Caching:**
- Current weather: 1h (zapisane w `weather_cache` Supabase)
- Forecast: 6h
- Cache per miasto, nie per user

**Koszty:** $0 (free tier)

---

## Deployment & Infrastructure

### Hosting: Cloudflare Pages
**Dlaczego Cloudflare:**
- Unlimited bandwidth (free tier) ✅
- Global CDN (świetne dla Polski)
- Automatic HTTPS
- Preview deployments
- Edge Functions support (dla API routes Astro)

**Alternatywa:** Vercel (jeśli problemy z Astro + Cloudflare)

### CI/CD: GitHub Actions
**Pipeline:**
```yaml
.github/workflows/deploy.yml:
  - on: push to main
  - steps:
    1. Checkout code
    2. Install dependencies (pnpm)
    3. Run tests (Vitest)
    4. Build Astro (astro build)
    5. Deploy to Cloudflare Pages
```

**Dodatkowe workflows:**
- PR preview deploys
- Lighthouse CI (performance testing)
- Dependency updates (Dependabot)

### Monitoring & Analytics
- **Plausible Analytics** (privacy-friendly, GDPR compliant)
- **Sentry** (error tracking, free tier 5K errors/miesiąc)
- **Supabase Dashboard** (database metrics, auth stats)

---

## Development Tools

### Package Manager: pnpm
- Szybszy niż npm/yarn
- Oszczędność miejsca (linked dependencies)

### Linting & Formatting:
- ESLint + prettier
- TypeScript strict mode
- Husky pre-commit hooks

### Testing:
- **Vitest** - unit tests
- **Playwright** - E2E tests (krytyczne flow)
- **React Testing Library** - component tests

### Type Safety:
- **TypeScript** - strict mode
- Supabase types auto-generation

---

## Struktura Projektu
```
