```markdown
# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard to główny widok aplikacji CycleGear, stanowiący centralny punkt informacyjny dla zalogowanego użytkownika. Widok agreguje dane z czterech kluczowych obszarów:
- Aktualna pogoda i szybka rekomendacja ubioru
- Stan sprzętu rowerowego i nadchodzące serwisy
- Aktywność społeczności lokalnej
- Status personalizacji AI

Widok wykorzystuje architekturę React Islands w Astro, co pozwala na selektywną interaktywność tylko tam, gdzie jest potrzebna. Główna sekcja pogodowa będzie odświeżana automatycznie co 60 minut. Widok jest w pełni responsywny (mobile-first) i obsługuje wszystkie stany: loading, success, error, empty state.

## 2. Routing widoku

**Ścieżka:** `/dashboard`

**Plik:** `src/pages/dashboard.astro`

**Ochrona:** Widok wymaga autentykacji. Middleware (`src/middleware/index.ts`) weryfikuje JWT token i ustawia `locals.userId`. Brak autoryzacji skutkuje przekierowaniem do `/` (landing page).

**Query params:** Opcjonalnie `?location_id=<uuid>` - pozwala na wyświetlenie danych dla konkretnej lokalizacji użytkownika (jeśli ma ich wiele).

## 3. Struktura komponentów

```
DashboardPage (Astro)
├── Layout (Astro)
│   ├── Navbar (React Island) *nowy*
│   │   ├── Logo
│   │   ├── NavigationMenu (shadcn/ui)
│   │   └── UserDropdown (shadcn/ui)
│   └── Footer (Astro) *nowy*
│
├── DashboardContainer (React Island) *nowy*
│   ├── DashboardHeader (React)
│   │   └── LocationSelector (React) - dropdown lokalizacji
│   │
│   ├── WeatherSection (React)
│   │   ├── WeatherCard (React)
│   │   │   ├── TemperatureDisplay
│   │   │   ├── WeatherIcon
│   │   │   └── WeatherDetails
│   │   └── QuickRecommendationCard (React)
│   │       ├── RecommendationText
│   │       └── ViewDetailsButton (shadcn/ui Button)
│   │
│   ├── TwoColumnLayout (React)
│   │   ├── EquipmentStatusSection (React)
│   │   │   ├── SectionHeader
│   │   │   ├── BikesOverview (React)
│   │   │   │   └── BikeStatusCard[] (React)
│   │   │   └── UpcomingServicesCard (React)
│   │   │       └── ServiceReminderItem[] (React)
│   │   │
│   │   └── CommunityActivitySection (React)
│   │       ├── SectionHeader
│   │       ├── ActivityStats (React)
│   │       └── ViewCommunityButton (shadcn/ui Button)
│   │
│   ├── PersonalizationStatusSection (React)
│   │   ├── FeedbackProgressBar (React)
│   │   ├── PersonalizationBadge (React)
│   │   └── ThermalAdjustmentIndicator (React)
│   │
│   └── QuickActionsBar (React)
│       └── ActionButton[] (shadcn/ui Button)
│
├── ErrorBoundary (React)
├── SkeletonLoader (React) *nowy*
└── Toast Notifications (shadcn/ui) *nowy*
```

## 4. Szczegóły komponentów

### 4.1. DashboardPage (Astro)

**Opis:** Główny plik strony Astro, odpowiedzialny za server-side rendering i obsługę autentykacji.

**Główne elementy:**
```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer.astro';
import DashboardContainer from '../components/dashboard/DashboardContainer';

// Server-side logic
const userId = Astro.locals.userId;
if (!userId) {
  return Astro.redirect('/');
}

const url = new URL(Astro.request.url);
const locationId = url.searchParams.get('location_id') || undefined;
---

<Layout title="Dashboard - CycleGear">
  <Navbar client:load userId={userId} />
  <main class="min-h-screen bg-gray-50 pb-20 md:pb-0">
    <DashboardContainer 
      client:load 
      userId={userId}
      initialLocationId={locationId}
    />
  </main>
  <Footer />
</Layout>
```

**Obsługiwane zdarzenia:** Brak (strona Astro)

**Warunki walidacji:**
- Weryfikacja `userId` w `Astro.locals` (z middleware)
- Walidacja `location_id` query param (format UUID)

**Typy:** Brak (Astro)

**Propsy:** Brak (root page)

---

### 4.2. Navbar (React Island)

**Opis:** Główny pasek nawigacyjny aplikacji, sticky na górze ekranu. Zawiera logo, menu główne i dropdown użytkownika. Na mobile transformuje się w hamburger menu.

**Główne elementy:**
```tsx
<header className="sticky top-0 z-50 w-full border-b bg-white">
  <div className="container flex h-16 items-center justify-between">
    <Logo />
    <NavigationMenu /> {/* Desktop only */}
    <UserDropdown userId={userId} />
    <MobileMenuButton /> {/* Mobile only */}
  </div>
  {isMobileMenuOpen && <MobileMenu />}
</header>
```

**Obsługiwane interakcje:**
- Kliknięcie logo → przekierowanie do `/dashboard`
- Kliknięcie linku menu → nawigacja do sekcji (Dashboard/Rekomendacje/Społeczność/Sprzęt/Profil)
- Kliknięcie avatara → rozwinięcie dropdown (Profil/Ustawienia/Wyloguj)
- Kliknięcie hamburger → otwarcie/zamknięcie mobile menu
- Podświetlenie aktywnej sekcji (current route)

**Warunki walidacji:**
- `userId` musi być przekazane (string, min 1 znak)
- Aktywna sekcja na podstawie `window.location.pathname`

**Typy:**
- `NavbarProps: { userId: string }`
- `NavigationItem: { label: string; href: string; icon?: React.ReactNode }`

**Propsy:**
```tsx
interface NavbarProps {
  userId: string; // ID zalogowanego użytkownika
}
```

---

### 4.3. DashboardContainer (React Island)

**Opis:** Główny kontener dashboardu, zarządza stanem, pobiera dane z API, obsługuje auto-refresh i koordynuje wszystkie sekcje. Jest to główny React Island widoku.

**Główne elementy:**
```tsx
<div className="container mx-auto px-4 py-6 md:py-8">
  {isLoading && <SkeletonLoader />}
  {error && <ErrorDisplay error={error} onRetry={refetch} />}
  {data && (
    <>
      <DashboardHeader locationId={currentLocationId} onLocationChange={handleLocationChange} />
      <WeatherSection data={data.weather_summary} />
      <TwoColumnLayout>
        <EquipmentStatusSection data={data.equipment_status} />
        <CommunityActivitySection data={data.community_activity} />
      </TwoColumnLayout>
      <PersonalizationStatusSection data={data.personalization_status} />
      <QuickActionsBar />
    </>
  )}
</div>
```

**Obsługiwane interakcje:**
- Initial load → fetch danych z `/api/dashboard`
- Auto-refresh co 60 min → refetch tylko weather_summary
- Zmiana lokalizacji → refetch z nowym `location_id`
- Retry po błędzie → ponowne wywołanie fetch
- Pull-to-refresh na mobile (opcjonalnie)

**Warunki walidacji:**
- `userId` musi być niepusty
- `locationId` musi być UUID lub undefined
- Response z API musi zawierać wszystkie 4 sekcje (weather_summary, equipment_status, community_activity, personalization_status)

**Typy:**
- `DashboardContainerProps`
- `DashboardDTO` (z types.ts)
- `DashboardState: { data, isLoading, error }`

**Propsy:**
```tsx
interface DashboardContainerProps {
  userId: string;
  initialLocationId?: string;
}
```

---

### 4.4. WeatherSection (React)

**Opis:** Sekcja wyświetlająca aktualną pogodę i szybką rekomendację ubioru. Pełna szerokość, wizualnie dominująca. Zawiera badge "Odświeżono X minut temu".

**Główne elementy:**
```tsx
<section className="mb-6 md:mb-8" aria-labelledby="weather-heading">
  <h2 id="weather-heading" className="sr-only">Dzisiejsza pogoda i rekomendacja</h2>
  <div className="grid gap-4 md:grid-cols-2">
    <WeatherCard weather={data} refreshedAt={lastRefresh} />
    <QuickRecommendationCard recommendation={data.quick_recommendation} />
  </div>
</section>
```

**Komponenty dzieci:**
- `WeatherCard`: Wyświetla temperaturę, feels like, opis, ikonę pogody
- `QuickRecommendationCard`: 1-2 zdaniowa rekomendacja + button "Zobacz pełną rekomendację"

**Obsługiwane interakcje:**
- Kliknięcie "Zobacz pełną rekomendację" → nawigacja do `/recommendations?location_id={id}`
- Hover na ikonie pogody → tooltip z opisem

**Warunki walidacji:**
- `current_temperature` musi być number
- `description` musi być non-empty string
- `quick_recommendation` musi być non-empty string

**Typy:**
- `WeatherSectionProps: { data: WeatherSummaryDTO; lastRefresh: Date }`
- `WeatherSummaryDTO` (z types.ts)

**Propsy:**
```tsx
interface WeatherSectionProps {
  data: WeatherSummaryDTO;
  lastRefresh?: Date;
}
```

---

### 4.5. EquipmentStatusSection (React)

**Opis:** Sekcja wyświetlająca stan sprzętu: liczbę aktywnych rowerów, nadchodzące/przeterminowane serwisy. Na desktop zajmuje 50% szerokości (lewa kolumna).

**Główne elementy:**
```tsx
<section className="rounded-lg border bg-white p-6" aria-labelledby="equipment-heading">
  <div className="mb-4 flex items-center justify-between">
    <h2 id="equipment-heading" className="text-xl font-semibold">Stan sprzętu</h2>
    <Link href="/bikes" className="text-sm text-primary hover:underline">
      Zobacz wszystkie
    </Link>
  </div>
  
  <BikesOverview count={data.active_bikes_count} />
  
  {data.overdue_services_count > 0 && (
    <Alert variant="destructive">
      Masz {data.overdue_services_count} przeterminowanych serwisów!
    </Alert>
  )}
  
  <div className="mt-4">
    <h3 className="mb-2 text-sm font-medium text-gray-700">Najbliższe serwisy</h3>
    {data.upcoming_services.length > 0 ? (
      <div className="space-y-2">
        {data.upcoming_services.slice(0, 3).map(service => (
          <ServiceReminderItem key={service.bike_id} service={service} />
        ))}
      </div>
    ) : (
      <EmptyState message="Brak zaplanowanych serwisów" icon={<CheckCircle />} />
    )}
  </div>
</section>
```

**Komponenty dzieci:**
- `BikesOverview`: Badge z liczbą aktywnych rowerów
- `ServiceReminderItem`: Pojedynczy item z informacją o serwisie (nazwa roweru, typ, km do serwisu, status badge)
- `Alert` (shadcn/ui): Alert o przeterminowanych serwisach

**Obsługiwane interakcje:**
- Kliknięcie "Zobacz wszystkie" → `/bikes`
- Kliknięcie ServiceReminderItem → `/bikes/{bikeId}`
- Kliknięcie Alert → `/bikes` z filtrem "overdue"

**Warunki walidacji:**
- `active_bikes_count` >= 0
- `overdue_services_count` >= 0
- `upcoming_services` jest array (może być pusty)
- Każdy element `upcoming_services` musi zawierać: bike_id, bike_name, service_type, km_remaining, status

**Typy:**
- `EquipmentStatusSectionProps: { data: EquipmentStatusDTO }`
- `EquipmentStatusDTO` (z types.ts)
- `UpcomingServiceDTO` (z types.ts)

**Propsy:**
```tsx
interface EquipmentStatusSectionProps {
  data: EquipmentStatusDTO;
}
```

---

### 4.6. CommunityActivitySection (React)

**Opis:** Sekcja wyświetlająca aktywność społeczności: liczba najnowszych zestawów i podobne warunki. Na desktop zajmuje 50% szerokości (prawa kolumna).

**Główne elementy:**
```tsx
<section className="rounded-lg border bg-white p-6" aria-labelledby="community-heading">
  <div className="mb-4 flex items-center justify-between">
    <h2 id="community-heading" className="text-xl font-semibold">Co ubierają inni</h2>
    <Link href="/community" className="text-sm text-primary hover:underline">
      Zobacz więcej
    </Link>
  </div>
  
  <div className="space-y-4">
    <ActivityStats
      recentCount={data.recent_outfits_count}
      similarCount={data.similar_conditions_count}
    />
    
    <Button onClick={() => navigate('/community')} variant="outline" className="w-full">
      Przeglądaj zestawy społeczności
    </Button>
  </div>
</section>
```

**Komponenty dzieci:**
- `ActivityStats`: 2 karty z liczbami (recent_outfits_count, similar_conditions_count)
- `Button` (shadcn/ui): CTA do społeczności

**Obsługiwane interakcje:**
- Kliknięcie "Zobacz więcej" → `/community/outfits`
- Kliknięcie Button → `/community/outfits`

**Warunki walidacji:**
- `recent_outfits_count` >= 0
- `similar_conditions_count` >= 0

**Typy:**
- `CommunityActivitySectionProps: { data: CommunityActivityDTO }`
- `CommunityActivityDTO` (z types.ts)

**Propsy:**
```tsx
interface CommunityActivitySectionProps {
  data: CommunityActivityDTO;
}
```

---

### 4.7. PersonalizationStatusSection (React)

**Opis:** Sekcja wyświetlająca status personalizacji AI: liczba feedbacków, progress bar do aktywacji, badge personalizacji, wskaźnik thermal adjustment.

**Główne elementy:**
```tsx
<section className="mb-6 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-6">
  <h2 className="mb-4 text-lg font-semibold">Status personalizacji</h2>
  
  {data.personalization_active ? (
    <div className="flex items-center gap-2">
      <Badge variant="success">Personalizacja aktywna</Badge>
      <span className="text-sm text-gray-600">
        Dostosowanie termiczne: {data.thermal_adjustment > 0 ? '+' : ''}{data.thermal_adjustment}°C
      </span>
    </div>
  ) : (
    <div>
      <p className="mb-2 text-sm text-gray-700">
        Jeszcze {data.next_personalization_at - data.feedback_count} feedbacków do pełnej personalizacji
      </p>
      <FeedbackProgressBar 
        current={data.feedback_count} 
        target={data.next_personalization_at} 
      />
    </div>
  )}
  
  <Button onClick={() => navigate('/feedbacks/new')} variant="outline" size="sm" className="mt-4">
    Dodaj feedback
  </Button>
</section>
```

**Komponenty dzieci:**
- `FeedbackProgressBar`: Progress bar z wypełnieniem (feedback_count / next_personalization_at)
- `Badge` (shadcn/ui): Badge "Personalizacja aktywna"
- `ThermalAdjustmentIndicator`: Wskaźnik dostosowania (-2°C do +2°C)

**Obsługiwane interakcje:**
- Kliknięcie "Dodaj feedback" → `/feedbacks/new`
- Hover na Badge → tooltip wyjaśniający personalizację

**Warunki walidacji:**
- `feedback_count` >= 0
- `personalization_active` jest boolean
- `thermal_adjustment` między -2 a 2
- `next_personalization_at` >= feedback_count

**Typy:**
- `PersonalizationStatusSectionProps: { data: PersonalizationStatusDTO }`
- `PersonalizationStatusDTO` (z types.ts)

**Propsy:**
```tsx
interface PersonalizationStatusSectionProps {
  data: PersonalizationStatusDTO;
}
```

---

### 4.8. QuickActionsBar (React)

**Opis:** Pasek z quick actions, sticky na dole na mobile, inline na desktop. Zawiera 4 główne akcje CTA.

**Główne elementy:**
```tsx
<div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg md:static md:mt-8 md:rounded-lg md:border">
  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
    <Button onClick={() => navigate('/recommendations')} variant="default">
      <Compass className="mr-2 h-4 w-4" />
      <span className="hidden md:inline">Nowa</span> rekomendacja
    </Button>
    
    <Button onClick={() => navigate('/feedbacks/new')} variant="outline">
      <MessageSquare className="mr-2 h-4 w-4" />
      <span className="hidden md:inline">Dodaj</span> feedback
    </Button>
    
    <Button onClick={handleAddService} variant="outline">
      <Wrench className="mr-2 h-4 w-4" />
      <span className="hidden md:inline">Dodaj</span> serwis
    </Button>
    
    <Button onClick={() => navigate('/weather/forecast')} variant="outline">
      <Calendar className="mr-2 h-4 w-4" />
      Prognoza
    </Button>
  </div>
</div>
```

**Komponenty dzieci:**
- `Button[]` (shadcn/ui): 4 buttony akcji

**Obsługiwane interakcje:**
- "Nowa rekomendacja" → `/recommendations?location_id={currentLocationId}`
- "Dodaj feedback" → `/feedbacks/new`
- "Dodaj serwis" → modal wyboru roweru → `/bikes/{bikeId}/services/new`
- "Prognoza" → `/weather/forecast?location_id={currentLocationId}`

**Warunki walidacji:** Brak

**Typy:**
- `QuickActionsBarProps: { currentLocationId?: string }`

**Propsy:**
```tsx
interface QuickActionsBarProps {
  currentLocationId?: string;
}
```

---

### 4.9. SkeletonLoader (React)

**Opis:** Komponent wyświetlający skeleton UI podczas ładowania danych. Odzwierciedla layout dashboardu.

**Główne elementy:**
```tsx
<div className="container mx-auto px-4 py-6">
  <Skeleton className="mb-6 h-8 w-48" /> {/* Header */}
  <div className="mb-6 grid gap-4 md:grid-cols-2">
    <Skeleton className="h-48" /> {/* Weather */}
    <Skeleton className="h-48" /> {/* Recommendation */}
  </div>
  <div className="grid gap-4 md:grid-cols-2">
    <Skeleton className="h-64" /> {/* Equipment */}
    <Skeleton className="h-64" /> {/* Community */}
  </div>
  <Skeleton className="mt-6 h-24" /> {/* Personalization */}
</div>
```

**Komponenty dzieci:**
- `Skeleton[]` (shadcn/ui): Placeholder elementy

**Obsługiwane interakcje:** Brak

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:** Brak

---

### 4.10. ErrorDisplay (React)

**Opis:** Komponent wyświetlający komunikat błędu z możliwością retry.

**Główne elementy:**
```tsx
<div className="flex min-h-[400px] flex-col items-center justify-center">
  <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
  <h2 className="mb-2 text-xl font-semibold">{getErrorTitle(error)}</h2>
  <p className="mb-6 text-center text-gray-600">{getErrorMessage(error)}</p>
  <Button onClick={onRetry}>Spróbuj ponownie</Button>
</div>
```

**Obsługiwane interakcje:**
- Kliknięcie "Spróbuj ponownie" → wywołanie `onRetry()`

**Warunki walidacji:**
- `error` musi być Error | ApiErrorResponse
- `onRetry` musi być funkcją

**Typy:**
- `ErrorDisplayProps`
- `ApiErrorResponse` (z types.ts)

**Propsy:**
```tsx
interface ErrorDisplayProps {
  error: Error | ApiErrorResponse;
  onRetry: () => void;
}
```

---

## 5. Typy

### 5.1. Typy istniejące (z types.ts)

Wszystkie główne DTO są już zdefiniowane w `src/types.ts`:

```typescript
// Dashboard główny typ
interface DashboardDTO {
  weather_summary: WeatherSummaryDTO;
  equipment_status: EquipmentStatusDTO;
  community_activity: CommunityActivityDTO;
  personalization_status: PersonalizationStatusDTO;
}

// Weather Summary
interface WeatherSummaryDTO {
  location_id: string;
  current_temperature: number;
  feels_like: number;
  description: string;
  quick_recommendation: string;
}

// Equipment Status
interface EquipmentStatusDTO {
  active_bikes_count: number;
  upcoming_services: UpcomingServiceDTO[];
  overdue_services_count: number;
}

interface UpcomingServiceDTO {
  bike_id: string;
  bike_name: string;
  service_type: ServiceTypeEnum;
  target_mileage: number;
  current_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
}

// Community Activity
interface CommunityActivityDTO {
  recent_outfits_count: number;
  similar_conditions_count: number;
}

// Personalization Status
interface PersonalizationStatusDTO {
  feedback_count: number;
  personalization_active: boolean;
  thermal_adjustment: number;
  next_personalization_at: number;
}

// API Error Response
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 5.2. Nowe typy ViewModels

Typy specyficzne dla widoku Dashboard (do stworzenia w `src/components/dashboard/types.ts`):

```typescript
// Props komponentów
export interface DashboardContainerProps {
  userId: string;
  initialLocationId?: string;
}

export interface NavbarProps {
  userId: string;
}

export interface WeatherSectionProps {
  data: WeatherSummaryDTO;
  lastRefresh?: Date;
}

export interface EquipmentStatusSectionProps {
  data: EquipmentStatusDTO;
}

export interface CommunityActivitySectionProps {
  data: CommunityActivityDTO;
}

export interface PersonalizationStatusSectionProps {
  data: PersonalizationStatusDTO;
}

export interface QuickActionsBarProps {
  currentLocationId?: string;
}

export interface ErrorDisplayProps {
  error: Error | ApiErrorResponse;
  onRetry: () => void;
}

// Stan Dashboard
export interface DashboardState {
  data: DashboardDTO | null;
  isLoading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
}

// Navigation Item
export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

// Service Status Badge
export type ServiceStatusVariant = 'upcoming' | 'active' | 'overdue' | 'completed';

export interface ServiceStatusBadgeProps {
  status: ServiceStatusVariant;
  kmRemaining?: number;
}

// Location Option (dla LocationSelector)
export interface LocationOption {
  id: string;
  label: string;
  city: string;
  isDefault: boolean;
}
```

### 5.3. Custom Hooks Types

```typescript
// useDashboardData hook return type
export interface UseDashboardDataReturn {
  data: DashboardDTO | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastRefresh: Date | null;
}

// useAutoRefresh hook params
export interface UseAutoRefreshOptions {
  enabled: boolean;
  intervalMs: number;
  onRefresh: () => void;
}
```

### 5.4. Enums i Constants

```typescript
// Error codes
export enum DashboardErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  LOCATION_NOT_FOUND = 'LOCATION_NOT_FOUND',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN',
}

// Refresh interval
export const WEATHER_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minut

// Navigation items
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
  { label: 'Rekomendacje', href: '/recommendations', icon: <CompassIcon /> },
  { label: 'Społeczność', href: '/community', icon: <UsersIcon /> },
  { label: 'Sprzęt', href: '/bikes', icon: <BikeIcon /> },
  { label: 'Profil', href: '/profile', icon: <UserIcon /> },
];
```

---

## 6. Zarządzanie stanem

### 6.1. Stan globalny

Dashboard **nie wymaga** globalnego state managementu (Redux/Zustand). Cały stan jest lokalny w komponencie `DashboardContainer`.

### 6.2. Stan lokalny DashboardContainer

```typescript
const [state, setState] = useState<DashboardState>({
  data: null,
  isLoading: true,
  error: null,
  lastRefresh: null,
});

const [currentLocationId, setCurrentLocationId] = useState<string | undefined>(
  initialLocationId
);
```

### 6.3. Custom Hooks

#### useDashboardData

Hook zarządzający fetching danych z `/api/dashboard`:

```typescript
function useDashboardData(
  userId: string, 
  locationId?: string
): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = new URL('/api/dashboard', window.location.origin);
      if (locationId) {
        url.searchParams.set('location_id', locationId);
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'include', // Include JWT cookie
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = '/';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const dashboardData: DashboardDTO = await response.json();
      setData(dashboardData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, locationId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    lastRefresh,
  };
}
```

#### useAutoRefresh

Hook obsługujący automatyczne odświeżanie pogody co 60 minut:

```typescript
function useAutoRefresh({ 
  enabled, 
  intervalMs, 
  onRefresh 
}: UseAutoRefreshOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      onRefresh();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [enabled, intervalMs, onRefresh]);
}
```

Użycie w `DashboardContainer`:

```typescript
const { data, isLoading, error, refetch, lastRefresh } = useDashboardData(
  userId, 
  currentLocationId
);

useAutoRefresh({
  enabled: !!data && !error,
  intervalMs: WEATHER_REFRESH_INTERVAL_MS,
  onRefresh: refetch,
});
```

### 6.4. Zarządzanie cache

Opcjonalnie można użyć **React Query** (TanStack Query) dla lepszego cache managementu:

```typescript
import { useQuery } from '@tanstack/react-query';

function useDashboardData(userId: string, locationId?: string) {
  return useQuery({
    queryKey: ['dashboard', userId, locationId],
    queryFn: () => fetchDashboard(userId, locationId),
    staleTime: 60 * 60 * 1000, // 60 minut
    refetchInterval: 60 * 60 * 1000, // Auto-refresh
    retry: 2,
  });
}
```

**Decyzja:** Jeśli aplikacja będzie miała więcej widoków z API calls, warto dodać React Query. Dla MVP można zacząć od własnego hooka.

---

## 7. Integracja API

### 7.1. Endpoint

**URL:** `GET /api/dashboard`

**Query Parameters:**
- `location_id` (optional): UUID lokalizacji użytkownika

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Autentykacja:** JWT token w cookie (ustawiony przez Supabase Auth). Astro middleware weryfikuje token i ustawia `locals.userId`.

### 7.2. Request Types

```typescript
// Brak body, tylko query params
interface DashboardQueryParams {
  location_id?: string;
}
```

### 7.3. Response Types

**Success (200):**

```typescript
type DashboardResponse = DashboardDTO;
```

Struktura:
```json
{
  "weather_summary": {
    "location_id": "uuid",
    "current_temperature": 12.5,
    "feels_like": 10.2,
    "description": "scattered clouds",
    "quick_recommendation": "Long sleeves recommended"
  },
  "equipment_status": {
    "active_bikes_count": 2,
    "upcoming_services": [...],
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

**Error (4xx, 5xx):**

```typescript
type DashboardErrorResponse = ApiErrorResponse;
```

Struktura:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 7.4. Error Codes

| Status | Code | Message | Obsługa UI |
|--------|------|---------|------------|
| 401 | UNAUTHORIZED | Authentication required | Redirect to `/` |
| 404 | LOCATION_NOT_FOUND | Location not found | Pokaż error + formularz wyboru lokalizacji |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests | Pokaż error + disabled retry przez X minut |
| 500 | INTERNAL_SERVER_ERROR | Unexpected error | Pokaż error + retry button |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable | Pokaż error + retry button |

### 7.5. Fetch Implementation

```typescript
async function fetchDashboard(
  locationId?: string
): Promise<DashboardDTO> {
  const url = new URL('/api/dashboard', window.location.origin);
  if (locationId) {
    url.searchParams.set('location_id', locationId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include', // Include auth cookie
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/';
      throw new Error('Unauthorized');
    }

    // Try to parse error response
    try {
      const errorData: ApiErrorResponse = await response.json();
      throw new Error(errorData.error.message);
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  return response.json();
}
```

### 7.6. Retry Logic

Przy błędach sieciowych (network error, 5xx) implementujemy exponential backoff:

```typescript
async function fetchWithRetry(
  fn: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
```

---

## 8. Interakcje użytkownika

### 8.1. Initial Load

**Trigger:** Użytkownik otwiera `/dashboard`

**Flow:**
1. Astro SSR weryfikuje autentykację (middleware)
2. Jeśli brak auth → redirect do `/`
3. Jeśli auth OK → render `DashboardContainer` z `client:load`
4. React Island mountuje się → wywołuje `useDashboardData`
5. Hook fetchuje dane z `/api/dashboard`
6. Podczas fetch → wyświetl `SkeletonLoader`
7. Po sukcesie → render pełnego dashboardu
8. Po błędzie → wyświetl `ErrorDisplay`

**Oczekiwany czas:** <2s (skeleton), <3s (pełne dane)

### 8.2. Auto-refresh pogody

**Trigger:** Co 60 minut od initial load

**Flow:**
1. Timer w `useAutoRefresh` wywołuje `refetch()`
2. Hook fetchuje dane z `/api/dashboard`
3. **Nie pokazuje** loadera (update w tle)
4. Po sukcesie → cichy update stanu + `lastRefresh` timestamp
5. Po błędzie → cichy błąd (log w konsoli), toast notification "Nie udało się odświeżyć pogody"

**UX:** Badge "Odświeżono X minut temu" aktualizuje się dynamicznie

### 8.3. Zmiana lokalizacji

**Trigger:** Użytkownik wybiera lokalizację z dropdown (jeśli ma >1 lokalizację)

**Flow:**
1. Kliknięcie dropdown → fetch listy lokalizacji użytkownika (`/api/locations`)
2. Wybór lokalizacji → `setCurrentLocationId(newId)`
3. `useDashboardData` reaguje na zmianę → refetch z nowym `location_id`
4. Wyświetl mini-loader (spinner w header) **bez** pełnego skeletonu
5. Po sukcesie → update dashboardu, update URL query param `?location_id={newId}`

**Edge case:** Jeśli użytkownik ma tylko 1 lokalizację → dropdown nie wyświetlany

### 8.4. Nawigacja do szczegółów

**Triggery:**

1. **"Zobacz pełną rekomendację"** → `/recommendations?location_id={currentLocationId}`
2. **Kliknięcie ServiceReminderItem** → `/bikes/{bikeId}`
3. **"Zobacz wszystkie" (sprzęt)** → `/bikes`
4. **Alert przeterminowane serwisy** → `/bikes?filter=overdue`
5. **"Zobacz więcej" (społeczność)** → `/community/outfits?location_id={currentLocationId}`
6. **"Przeglądaj zestawy"** → `/community/outfits?location_id={currentLocationId}`
7. **"Nowa rekomendacja"** → `/recommendations?location_id={currentLocationId}`
8. **"Dodaj feedback"** → `/feedbacks/new`
9. **"Dodaj serwis"** → Modal wyboru roweru → `/bikes/{bikeId}/services/new`
10. **"Prognoza"** → `/weather/forecast?location_id={currentLocationId}`

**Implementacja:** Nawigacja przez Astro routing (pełne page reload) lub `astro:transitions` (opcjonalnie).

### 8.5. Retry po błędzie

**Trigger:** Użytkownik klika "Spróbuj ponownie" w `ErrorDisplay`

**Flow:**
1. Kliknięcie → wywołanie `refetch()`
2. Reset stanu `error` → `null`
3. Wyświetl `SkeletonLoader`
4. Ponowny fetch z `/api/dashboard`
5. Success → render dashboardu
6. Failure → ponowny `ErrorDisplay`

**Limit:** Brak limitu retry dla użytkownika (może próbować wielokrotnie)

### 8.6. Mobile hamburger menu

**Trigger:** Kliknięcie ikony hamburger w `Navbar`

**Flow:**
1. Toggle `isMobileMenuOpen` state
2. Animacja slide-in menu (transition 300ms)
3. Overlay z `backdrop-blur`
4. Kliknięcie linku → zamknij menu + nawigacja
5. Kliknięcie overlay → zamknij menu
6. ESC key → zamknij menu

**Accessibility:** Focus trap w otwartym menu, focus pierwszy link po otwarciu

### 8.7. Pull-to-refresh (opcjonalnie, mobile)

**Trigger:** Użytkownik wykonuje gest pull-to-refresh na mobile

**Flow:**
1. Detekcja gestu (touchstart/touchmove)
2. Visual feedback (ikona odświeżania)
3. Po zwolnieniu → wywołanie `refetch()`
4. Loading indicator
5. Success → update + toast "Odświeżono"

**Implementacja:** Biblioteka `react-simple-pull-to-refresh` lub custom hook

---

## 9. Warunki i walidacja

### 9.1. Walidacja parametrów wejściowych

#### DashboardContainer

**Warunek:** `userId` musi być niepustym stringiem

```typescript
if (!userId || userId.trim() === '') {
  throw new Error('userId is required');
}
```

**Warunek:** `initialLocationId` musi być UUID lub undefined

```typescript
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (initialLocationId && !UUID_REGEX.test(initialLocationId)) {
  console.warn('Invalid location_id format, ignoring');
  setCurrentLocationId(undefined);
}
```

### 9.2. Walidacja odpowiedzi API

#### DashboardDTO validation

```typescript
function validateDashboardResponse(data: any): data is DashboardDTO {
  return (
    data &&
    typeof data === 'object' &&
    // weather_summary
    data.weather_summary &&
    typeof data.weather_summary.location_id === 'string' &&
    typeof data.weather_summary.current_temperature === 'number' &&
    typeof data.weather_summary.feels_like === 'number' &&
    typeof data.weather_summary.description === 'string' &&
    typeof data.weather_summary.quick_recommendation === 'string' &&
    // equipment_status
    data.equipment_status &&
    typeof data.equipment_status.active_bikes_count === 'number' &&
    Array.isArray(data.equipment_status.upcoming_services) &&
    typeof data.equipment_status.overdue_services_count === 'number' &&
    // community_activity
    data.community_activity &&
    typeof data.community_activity.recent_outfits_count === 'number' &&
    typeof data.community_activity.similar_conditions_count === 'number' &&
    // personalization_status
    data.personalization_status &&
    typeof data.personalization_status.feedback_count === 'number' &&
    typeof data.personalization_status.personalization_active === 'boolean' &&
    typeof data.personalization_status.thermal_adjustment === 'number' &&
    typeof data.personalization_status.next_personalization_at === 'number'
  );
}
```

Użycie w `fetchDashboard`:

```typescript
const data = await response.json();
if (!validateDashboardResponse(data)) {
  throw new Error('Invalid dashboard response format');
}
return data;
```

**Alternatywa:** Użycie `zod` dla type-safe validation:

```typescript
import { z } from 'zod';

const DashboardDTOSchema = z.object({
  weather_summary: z.object({
    location_id: z.string().uuid(),
    current_temperature: z.number(),
    feels_like: z.number(),
    description: z.string(),
    quick_recommendation: z.string(),
  }),
  equipment_status: z.object({
    active_bikes_count: z.number().int().min(0),
    upcoming_services: z.array(z.object({
      bike_id: z.string().uuid(),
      bike_name: z.string(),
      service_type: z.string(),
      target_mileage: z.number(),
      current_mileage: z.number(),
      km_remaining: z.number(),
      status: z.enum(['upcoming', 'active', 'overdue', 'completed']),
    })),
    overdue_services_count: z.number().int().min(0),
  }),
  community_activity: z.object({
    recent_outfits_count: z.number().int().min(0),
    similar_conditions_count: z.number().int().min(0),
  }),
  personalization_status: z.object({
    feedback_count: z.number().int().min(0),
    personalization_active: z.boolean(),
    thermal_adjustment: z.number().min(-2).max(2),
    next_personalization_at: z.number().int().min(0),
  }),
});

// Użycie
const data = DashboardDTOSchema.parse(await response.json());
```

### 9.3. Warunki UI

#### Wyświetlanie sekcji

**Warunek:** Alert przeterminowane serwisy wyświetlany tylko jeśli `overdue_services_count > 0`

```typescript
{data.equipment_status.overdue_services_count > 0 && (
  <Alert variant="destructive">
    Masz {data.equipment_status.overdue_services_count} przeterminowanych serwisów!
  </Alert>
)}
```

**Warunek:** Lista serwisów → Empty state jeśli `upcoming_services.length === 0`

```typescript
{data.equipment_status.upcoming_services.length > 0 ? (
  <ServicesList services={data.equipment_status.upcoming_services} />
) : (
  <EmptyState message="Brak zaplanowanych serwisów" />
)}
```

**Warunek:** Badge personalizacji tylko jeśli `personalization_active === true`

```typescript
{data.personalization_status.personalization_active && (
  <Badge variant="success">Personalizacja aktywna</Badge>
)}
```

**Warunek:** Progress bar tylko jeśli `personalization_active === false`

```typescript
{!data.personalization_status.personalization_active && (
  <FeedbackProgressBar 
    current={data.personalization_status.feedback_count}
    target={data.personalization_status.next_personalization_at}
  />
)}
```

#### Status badge kolory

**Warunek:** Kolor badge zależny od `status` i `km_remaining`

```typescript
function getStatusVariant(status: ReminderStatusEnum, kmRemaining: number): string {
  if (status === 'overdue') return 'destructive'; // Czerwony
  if (status === 'upcoming' && kmRemaining <= 200) return 'warning'; // Żółty
  if (status === 'upcoming') return 'secondary'; // Szary
  return 'default';
}
```

#### Temperatura wyświetlanie

**Warunek:** Jeśli `thermal_adjustment !== 0`, pokaż wskaźnik

```typescript
{data.personalization_status.thermal_adjustment !== 0 && (
  <span className="text-sm">
    Dostosowanie: {data.personalization_status.thermal_adjustment > 0 ? '+' : ''}
    {data.personalization_status.thermal_adjustment}°C
  </span>
)}
```

### 9.4. Warunki nawigacji

**Warunek:** "Dodaj serwis" tylko jeśli `active_bikes_count > 0`

```typescript
<Button
  onClick={handleAddService}
  disabled={data?.equipment_status.active_bikes_count === 0}
>
  Dodaj serwis
</Button>
```

**Warunek:** "Przeglądaj społeczność" disabled jeśli `recent_outfits_count === 0`

```typescript
<Button
  onClick={() => navigate('/community')}
  disabled={data?.community_activity.recent_outfits_count === 0}
>
  Przeglądaj zestawy
</Button>
```

---

## 10. Obsługa błędów

### 10.1. Kategorie błędów

#### 1. Błędy autentykacji (401)

**Przyczyna:** Brak/nieprawidłowy JWT token

**Obsługa:**
- Automatic redirect do `/` (landing page)
- Brak wyświetlania error screen (seamless redirect)
- Log w konsoli (dev mode)

```typescript
if (response.status === 401) {
  console.error('Unauthorized access, redirecting to login');
  window.location.href = '/';
  return;
}
```

#### 2. Błędy zasobów (404)

**Przyczyna:** Location not found (nieprawidłowy `location_id`)

**Obsługa:**
- Wyświetl error message: "Nie znaleziono lokalizacji"
- Przycisk "Wybierz inną lokalizację" → otwiera dropdown
- Fallback: fetch bez `location_id` (użyj default location)

```typescript
if (response.status === 404) {
  const errorData = await response.json();
  if (errorData.error.code === 'LOCATION_NOT_FOUND') {
    // Remove location_id and retry with default
    setCurrentLocationId(undefined);
    refetch();
  }
}
```

#### 3. Błędy rate limit (429)

**Przyczyna:** Zbyt wiele requestów w krótkim czasie

**Obsługa:**
- Wyświetl error: "Osiągnąłeś limit zapytań. Spróbuj za {X} minut."
- Disabled retry button przez X minut
- Timer countdown w UI
- Automatyczny retry po upływie czasu

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || '300'; // 5 min default
  const retryAfterSeconds = parseInt(retryAfter, 10);
  
  setError({
    message: `Osiągnąłeś limit zapytań. Spróbuj za ${Math.ceil(retryAfterSeconds / 60)} minut.`,
    retryAfter: Date.now() + retryAfterSeconds * 1000,
  });
  
  // Auto retry after cooldown
  setTimeout(() => refetch(), retryAfterSeconds * 1000);
}
```

#### 4. Błędy serwera (500, 503)

**Przyczyna:** Internal server error, service unavailable

**Obsługa:**
- Wyświetl error: "Coś poszło nie tak. Spróbuj później."
- Enabled retry button
- Retry z exponential backoff (3 próby)
- Fallback: Partial data z cache (jeśli dostępne)

```typescript
if (response.status >= 500) {
  throw new Error('Service temporarily unavailable');
}
```

#### 5. Błędy sieciowe (Network Error)

**Przyczyna:** Brak internetu, timeout

**Obsługa:**
- Wyświetl error: "Brak połączenia z internetem"
- Ikona offline
- Enabled retry button
- Online/offline event listener → auto retry on reconnect

```typescript
window.addEventListener('online', () => {
  if (error?.type === 'NETWORK_ERROR') {
    refetch();
  }
});

window.addEventListener('offline', () => {
  setError({ type: 'NETWORK_ERROR', message: 'Brak połączenia z internetem' });
});
```

#### 6. Błędy walidacji response (Invalid Data)

**Przyczyna:** Backend zwrócił niepoprawny format danych

**Obsługa:**
- Wyświetl error: "Otrzymano nieprawidłowe dane. Odśwież stronę."
- Log całego response w konsoli (dev mode)
- Enabled retry + "Odśwież stronę" button
- Sentry error report (production)

```typescript
try {
  const data = await response.json();
  if (!validateDashboardResponse(data)) {
    throw new Error('Invalid response format');
  }
} catch (parseError) {
  console.error('Failed to parse dashboard response:', parseError);
  setError({
    type: 'PARSE_ERROR',
    message: 'Otrzymano nieprawidłowe dane. Odśwież stronę.',
  });
}
```

### 10.2. Error Display Component

```typescript
function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const errorConfig = getErrorConfig(error);
  
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
      <errorConfig.Icon className="mb-4 h-16 w-16 text-red-500" />
      <h2 className="mb-2 text-xl font-semibold">{errorConfig.title}</h2>
      <p className="mb-6 max-w-md text-center text-gray-600">
        {errorConfig.message}
      </p>
      
      {errorConfig.canRetry && (
        <Button 
          onClick={onRetry}
          disabled={errorConfig.retryDisabled}
        >
          {errorConfig.retryLabel}
        </Button>
      )}
      
      {errorConfig.secondaryAction && (
        <Button 
          onClick={errorConfig.secondaryAction.onClick}
          variant="outline"
          className="mt-2"
        >
          {errorConfig.secondaryAction.label}
        </Button>
      )}
    </div>
  );
}
```

### 10.3. Toast Notifications

Dla non-critical errors (np. failed auto-refresh):

```typescript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// Auto-refresh failed
toast({
  variant: 'destructive',
  title: 'Nie udało się odświeżyć pogody',
  description: 'Sprawdź połączenie z internetem',
  duration: 5000,
});
```

### 10.4. Error Boundaries

Dla unexpected React errors:

```typescript
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error Boundary caught:', error, errorInfo);
    // Send to Sentry in production
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={this.state.error!}
          onRetry={() => window.location.reload()}
        />
      );
    }

    return this.props.children;
  }
}
```

### 10.5. Logging i Monitoring

**Development:**
- Console.error dla wszystkich błędów
- Console.warn dla validation issues

**Production:**
- Sentry error reporting
- Custom error tags: `{ component: 'Dashboard', endpoint: '/api/dashboard' }`
- User context: `{ userId, locationId }`

```typescript
import * as Sentry from '@sentry/react';

try {
  // ... fetch
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'Dashboard',
      endpoint: '/api/dashboard',
    },
    contexts: {
      user: { id: userId },
      location: { id: locationId },
    },
  });
  throw error;
}
```

---

## 11. Kroki implementacji

### Faza 1: Setup i Struktura (Dzień 1)

#### Krok 1.1: Utworzenie struktury folderów

```bash
src/components/
├── dashboard/
│   ├── DashboardContainer.tsx
│   ├── WeatherSection.tsx
│   ├── EquipmentStatusSection.tsx
│   ├── CommunityActivitySection.tsx
│   ├── PersonalizationStatusSection.tsx
│   ├── QuickActionsBar.tsx
│   ├── SkeletonLoader.tsx
│   ├── ErrorDisplay.tsx
│   └── types.ts
├── navigation/
│   ├── Navbar.tsx
│   ├── NavigationMenu.tsx
│   ├── UserDropdown.tsx
│   └── MobileMenu.tsx
└── shared/
    ├── EmptyState.tsx
    ├── ServiceReminderItem.tsx
    └── StatusBadge.tsx
```

#### Krok 1.2: Utworzenie strony Dashboard

Stwórz `src/pages/dashboard.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/navigation/Navbar';
import DashboardContainer from '../components/dashboard/DashboardContainer';

const userId = Astro.locals.userId;
if (!userId) {
  return Astro.redirect('/');
}

const url = new URL(Astro.request.url);
const locationId = url.searchParams.get('location_id') || undefined;
---

<Layout title="Dashboard - CycleGear">
  <Navbar client:load userId={userId} />
  <main class="min-h-screen bg-gray-50 pb-20 md:pb-0">
    <DashboardContainer 
      client:load 
      userId={userId}
      initialLocationId={locationId}
    />
  </main>
</Layout>
```

#### Krok 1.3: Dodanie typów

Stwórz `src/components/dashboard/types.ts` z wszystkimi typami z sekcji 5.

### Faza 2: Custom Hooks (Dzień 1-2)

#### Krok 2.1: Implementacja useDashboardData

Stwórz `src/hooks/useDashboardData.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { DashboardDTO } from '../types';
import type { UseDashboardDataReturn } from '../components/dashboard/types';

export function useDashboardData(
  userId: string,
  locationId?: string
): UseDashboardDataReturn {
  // ... implementacja z sekcji 6.3
}
```

#### Krok 2.2: Implementacja useAutoRefresh

Stwórz `src/hooks/useAutoRefresh.ts`:

```typescript
import { useEffect } from 'react';
import type { UseAutoRefreshOptions } from '../components/dashboard/types';

export function useAutoRefresh(options: UseAutoRefreshOptions): void {
  // ... implementacja z sekcji 6.3
}
```

### Faza 3: Komponenty Podstawowe (Dzień 2-3)

#### Krok 3.1: SkeletonLoader

```typescript
// src/components/dashboard/SkeletonLoader.tsx
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonLoader() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Skeleton className="mb-6 h-8 w-48" />
      {/* ... więcej skeletonów */}
    </div>
  );
}
```

#### Krok 3.2: ErrorDisplay

```typescript
// src/components/dashboard/ErrorDisplay.tsx
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  // ... implementacja z sekcji 10.2
}
```

#### Krok 3.3: DashboardContainer (szkielet)

```typescript
// src/components/dashboard/DashboardContainer.tsx
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { SkeletonLoader } from './SkeletonLoader';
import { ErrorDisplay } from './ErrorDisplay';

export default function DashboardContainer({ 
  userId, 
  initialLocationId 
}: DashboardContainerProps) {
  const { data, isLoading, error, refetch, lastRefresh } = useDashboardData(
    userId,
    initialLocationId
  );

  useAutoRefresh({
    enabled: !!data && !error,
    intervalMs: 60 * 60 * 1000,
    onRefresh: refetch,
  });

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Sekcje - do implementacji w następnych krokach */}
    </div>
  );
}
```

### Faza 4: Sekcje Dashboard (Dzień 3-4)

#### Krok 4.1: WeatherSection

Implementacja sekcji pogodowej z kartą pogody i quick recommendation.

#### Krok 4.2: EquipmentStatusSection

Implementacja sekcji sprzętu z listą rowerów i nadchodzącymi serwisami.

#### Krok 4.3: CommunityActivitySection

Implementacja sekcji społeczności z licznikami aktywności.

#### Krok 4.4: PersonalizationStatusSection

Implementacja sekcji personalizacji z progress barem i badge.

#### Krok 4.5: QuickActionsBar

Implementacja paska quick actions ze sticky positioning na mobile.

### Faza 5: Nawigacja (Dzień 4-5)

#### Krok 5.1: Navbar

Implementacja głównego paska nawigacyjnego z logo, menu i dropdown użytkownika.

#### Krok 5.2: Mobile Menu

Implementacja hamburger menu dla mobile z animacjami.

### Faza 6: Komponenty Pomocnicze (Dzień 5)

#### Krok 6.1: ServiceReminderItem

Komponent wyświetlający pojedynczy reminder serwisu.

#### Krok 6.2: StatusBadge

Komponent badge dla statusów (upcoming/overdue/etc).

#### Krok 6.3: EmptyState

Komponent empty state dla pustych list.

### Faza 7: Responsywność i Stylowanie (Dzień 5-6)

#### Krok 7.1: Mobile layout

- Grid → column na mobile
- Sticky QuickActionsBar na dole
- Touch-friendly buttons (min 44x44px)

#### Krok 7.2: Desktop layout

- 2-column grid dla Equipment/Community
- Inline QuickActionsBar
- Hover states

#### Krok 7.3: Tailwind classes

```typescript
// Desktop: 2 kolumny
<div className="grid gap-6 md:grid-cols-2">
  <EquipmentStatusSection />
  <CommunityActivitySection />
</div>

// Mobile sticky footer
<div className="fixed bottom-0 left-0 right-0 md:static">
  <QuickActionsBar />
</div>
```

### Faza 8: Accessibility (Dzień 6)

#### Krok 8.1: ARIA labels

```typescript
<section aria-labelledby="weather-heading">
  <h2 id="weather-heading" className="sr-only">
    Dzisiejsza pogoda i rekomendacja
  </h2>
</section>
```

#### Krok 8.2: Focus management

- Focus trap w mobile menu
- Skip links
- Keyboard navigation

#### Krok 8.3: Screen reader support

- Semantic HTML (`<main>`, `<section>`, `<nav>`)
- Alt texts dla ikon
- ARIA live regions dla dynamic content

### Faza 9: Testing (Dzień 6-7)

#### Krok 9.1: Unit tests

```typescript
// src/components/dashboard/__tests__/DashboardContainer.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContainer } from '../DashboardContainer';

describe('DashboardContainer', () => {
  it('displays skeleton loader initially', () => {
    render(<DashboardContainer userId="user-123" />);
    expect(screen.getByTestId('skeleton-loader')).toBeInTheDocument();
  });

  it('fetches and displays dashboard data', async () => {
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockDashboardData),
      })
    );

    render(<DashboardContainer userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Dzisiejsza pogoda')).toBeInTheDocument();
    });
  });

  // ... więcej testów
});
```

#### Krok 9.2: Integration tests

Test całego flow: load → data fetch → render → interaction

#### Krok 9.3: E2E tests (Playwright)

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads and displays data', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Wait for data
  await page.waitForSelector('[data-testid="weather-section"]');
  
  // Verify sections
  await expect(page.getByRole('heading', { name: 'Stan sprzętu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Co ubierają inni' })).toBeVisible();
});
```

### Faza 10: Performance Optimization (Dzień 7)

#### Krok 10.1: Code splitting

```typescript
// Lazy load heavy components
const CommunityActivitySection = lazy(() => 
  import('./CommunityActivitySection')
);
```

#### Krok 10.2: Memoization

```typescript
const WeatherSection = memo(({ data, lastRefresh }: WeatherSectionProps) => {
  // ... component
});
```

#### Krok 10.3: Image optimization

Użyj `<Image />` z Astro dla optimized images.

### Faza 11: Error Handling Polish (Dzień 7)

#### Krok 11.1: Wszystkie error cases

Implementacja obsługi dla 401, 404, 429, 500, 503, network errors.

#### Krok 11.2: Toast notifications

Dodanie toastów dla non-critical errors.

#### Krok 11.3: Retry logic

Exponential backoff, auto-retry po reconnect.

### Faza 12: Final Polish (Dzień 8)

#### Krok 12.1: Animacje

- Fade in dla sekcji
- Slide in dla mobile menu
- Loading spinners

#### Krok 12.2: Micro-interactions

- Hover effects
- Active states
- Ripple effects na buttons

#### Krok 12.3: Final review

- Code review
- Accessibility audit
- Performance audit (Lighthouse)
- Cross-browser testing

---

## Checklist implementacji

### Must Have (MVP)
- [ ] Autentykacja i redirect
- [ ] Fetch danych z `/api/dashboard`
- [ ] Skeleton loader
- [ ] Wszystkie 4 sekcje (Weather, Equipment, Community, Personalization)
- [ ] QuickActionsBar
- [ ] Navbar z nawigacją
- [ ] Responsywność (mobile + desktop)
- [ ] Error handling (401, 404, 500, network)
- [ ] Auto-refresh co 60 min
- [ ] Accessibility (ARIA, keyboard nav)

### Should Have
- [ ] Mobile hamburger menu
- [ ] Zmiana lokalizacji (dropdown)
- [ ] Pull-to-refresh (mobile)
- [ ] Toast notifications
- [ ] Retry z exponential backoff
- [ ] React Query dla cache
- [ ] Unit tests
- [ ] E2E tests

### Nice to Have
- [ ] Dark mode
- [ ] Animacje i transitions
- [ ] Offline mode indicator
- [ ] Service Worker (PWA prep)
- [ ] Performance monitoring (Web Vitals)
- [ ] A/B testing setup

---

## Wymagane zależności

```json
{
  "dependencies": {
    "astro": "^4.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "@tanstack/react-query": "^5.x",
    "lucide-react": "^0.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "@playwright/test": "^1.x",
    "vitest": "^1.x"
  }
}
```

---

## Szacowany czas implementacji

| Faza | Czas | Osoba |
|------|------|-------|
| 1. Setup i struktura | 4h | Mid/Senior |
| 2. Custom hooks | 4h | Senior |
| 3. Komponenty podstawowe | 8h | Mid |
| 4. Sekcje Dashboard | 12h | Mid/Senior |
| 5. Nawigacja | 6h | Mid |
| 6. Komponenty pomocnicze | 4h | Junior/Mid |
| 7. Responsywność | 6h | Mid |
| 8. Accessibility | 4h | Senior |
| 9. Testing | 8h | Mid/Senior |
| 10. Performance | 4h | Senior |
| 11. Error handling | 4h | Senior |
| 12. Final polish | 4h | Senior |
| **TOTAL** | **68h (~9 dni)** | |

---

## Sukces implementacji

Dashboard uznajemy za ukończony gdy:
1. ✅ Wszystkie sekcje renderują się poprawnie
2. ✅ Auto-refresh działa co 60 min
3. ✅ Responsywność na mobile i desktop
4. ✅ Wszystkie error cases są obsłużone
5. ✅ Accessibility score >95 (Lighthouse)
6. ✅ Performance score >90 (Lighthouse)
7. ✅ Code coverage >80%
8. ✅ E2E testy przechodzą
9. ✅ Cross-browser testing (Chrome, Safari, Firefox)
10. ✅ Manual QA na realnych urządzeniach

---

**Dokument stworzony:** 2025-01-11  
**Wersja:** 1.0  
**Status:** Gotowy do implementacji  
**Następny krok:** Rozpoczęcie Fazy 1 - Setup
```