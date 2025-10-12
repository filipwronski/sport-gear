# Plan implementacji widoku Społeczności

## 1. Przegląd

Widok Społeczności umożliwia użytkownikom przeglądanie zestawów ubioru udostępnionych przez innych kolarzy w ich okolicy (domyślnie w promieniu 50 km). Głównym celem tego widoku jest wspieranie decyzji użytkowników poprzez pokazywanie rzeczywistych wyborów innych osób w podobnych warunkach pogodowych. Widok zawiera zaawansowane opcje filtrowania (temperatura, wiatr, typ aktywności, ocena, reputacja użytkownika) oraz system reputacji bazujący na liczbie udzielonych feedbacków.

**Kluczowe funkcjonalności:**
- Przeglądanie zestawów w promieniu 50 km (konfigurowalne 1-100 km)
- Filtrowanie według warunków pogodowych (temperatura ±3°C, wiatr ±5 km/h)
- System reputacji użytkowników (Nowicjusz, Regularny, Ekspert, Mistrz)
- Sortowanie według: reputacji, dystansu, daty, oceny
- Paginacja z opcjonalnym infinite scroll
- Responsywny design (mobile-first)

## 2. Routing widoku

**Ścieżka główna:** `/community`

**Opcjonalny podwidok:** `/community/my-shared` - lista własnych udostępnionych zestawów

**Struktura URL z parametrami:**
```
/community?location_id=<uuid>&radius_km=50&temperature=12&temperature_range=3&activity_type=tempo&min_rating=4&reputation_filter=ekspert&time_range=24&sort=reputation&limit=10&offset=0
```

Wszystkie parametry filtrów są opcjonalne (poza `location_id`) i synchronizowane z URL dla możliwości linkowania i powrotu do przefiltrowanych wyników.

## 3. Struktura komponentów

```
src/pages/community.astro (główna strona Astro)
│
├── CommunityViewContainer (React Island - główny kontener)
│   │
│   ├── CommunityHeader
│   │   ├── PageTitle
│   │   ├── TabNavigation (Przeglądaj / Moje udostępnione)
│   │   └── RefreshButton
│   │
│   ├── CommunityFiltersPanel (React Island - panel filtrów)
│   │   ├── LocationSelector (dropdown z lokalizacjami użytkownika)
│   │   ├── RadiusSlider (slider 1-100 km)
│   │   ├── TemperatureRangeInput (temperatura ± zakres)
│   │   ├── WindSpeedInput (opcjonalnie)
│   │   ├── ActivityTypeSelect (dropdown)
│   │   ├── MinRatingSelect (1-5 gwiazdek)
│   │   ├── ReputationFilter (multi-select lub checkboxy)
│   │   ├── TimeRangeSelect (ostatnie 24h/48h/7dni)
│   │   ├── SortSelect (reputacja/dystans/data/ocena)
│   │   └── FilterActions (Reset / Zastosuj na mobile)
│   │
│   ├── ActiveFiltersDisplay (chip'y z aktywnymi filtrami)
│   │
│   ├── OutfitsListContainer
│   │   ├── OutfitsListHeader (liczba wyników, sortowanie)
│   │   ├── OutfitsList
│   │   │   ├── OutfitCard (wielokrotnie)
│   │   │   │   ├── UserInfoSection
│   │   │   │   │   ├── Pseudonym
│   │   │   │   │   └── ReputationBadge (z tooltipem)
│   │   │   │   ├── WeatherInfoSection
│   │   │   │   │   ├── TemperatureDisplay
│   │   │   │   │   ├── WindSpeedDisplay
│   │   │   │   │   └── WeatherIcon
│   │   │   │   ├── OutfitVisualization
│   │   │   │   │   └── OutfitIcons (7 stref ciała)
│   │   │   │   ├── MetadataSection
│   │   │   │   │   ├── ActivityTypeBadge
│   │   │   │   │   ├── RatingDisplay (gwiazdki)
│   │   │   │   │   ├── DistanceDisplay
│   │   │   │   │   └── TimeAgo
│   │   │   │   └── ViewDetailsButton
│   │   │   │
│   │   │   ├── LoadingState (skeleton cards)
│   │   │   └── EmptyState
│   │   │
│   │   └── Pagination / InfiniteScrollTrigger
│   │
│   └── OutfitDetailModal (React Island - modal ze szczegółami)
│       ├── ModalHeader (pseudonym + badge + zamknij)
│       ├── DetailedWeatherSection
│       ├── DetailedOutfitSection (wszystkie 7 stref w rozwinięciu)
│       ├── NotesSection (jeśli są)
│       └── MetadataFooter (data, dystans, aktywność)
```

## 4. Szczegóły komponentów

### 4.1. CommunityViewContainer

**Opis komponentu:**
Główny kontener zarządzający stanem całego widoku społeczności. Odpowiada za inicjalizację filtrów z URL, pobieranie danych z API oraz koordynację między komponentami potomnymi.

**Główne elementy:**
- `<div className="container mx-auto px-4 py-6">` - główny wrapper
- `<CommunityHeader />` - nagłówek z tytułem i nawigacją
- `<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">` - layout responsywny
  - `<aside className="lg:col-span-1">` - panel filtrów (sidebar na desktop)
  - `<main className="lg:col-span-3">` - lista wyników

**Obsługiwane interakcje:**
- Inicjalizacja widoku z parametrami URL
- Obsługa zmiany filtrów (aktualizacja URL i refetch)
- Przełączanie między zakładkami (Przeglądaj / Moje udostępnione)
- Odświeżanie danych

**Obsługiwana walidacja:**
- Walidacja parametrów URL przy montowaniu komponentu
- Weryfikacja istnienia location_id w lokalizacjach użytkownika
- Sanityzacja wartości filtrów przed wysłaniem do API

**Typy:**
- `CommunityFiltersState` (ViewModel)
- `GetCommunityOutfitsParams` (DTO dla API)
- `CommunityOutfitsListDTO` (response z API)

**Propsy:**
- `defaultLocationId?: string` - domyślna lokalizacja z profilu użytkownika
- `userLocations: LocationDTO[]` - lista lokalizacji użytkownika

### 4.2. CommunityFiltersPanel

**Opis komponentu:**
Panel zawierający wszystkie kontrolki filtrowania. Na desktop wyświetlany jako sidebar, na mobile jako drawer/sheet otwierany przyciskiem. Synchronizuje stan filtrów z URL i przekazuje zmiany do rodzica.

**Główne elementy:**
- `<Card className="p-4">` lub `<Sheet>` na mobile
- `<form>` zawierający wszystkie kontrolki filtrów
- Sekcje grupujące powiązane filtry (Lokalizacja, Pogoda, Preferencje, Sortowanie)
- Przyciski akcji: Reset filtrów, Zastosuj (tylko mobile)

**Obsługiwane interakcje:**
- Zmiana wartości filtrów (debounced na desktop, na mobile z przyciskiem)
- Reset wszystkich filtrów do wartości domyślnych
- Otwarcie/zamknięcie drawera na mobile
- Walidacja wartości podczas wprowadzania

**Obsługiwana walidacja:**
- `location_id`: wymagane, UUID, musi istnieć w userLocations
- `radius_km`: 1-100, liczba całkowita
- `temperature`: -30 do 50°C (realistyczny zakres)
- `temperature_range`: 0-10°C
- `wind_speed`: opcjonalny, 0-100 km/h
- `time_range`: 1-168 godzin (do 7 dni)
- `min_rating`: 1-5
- `limit`: 1-50
- `offset`: ≥ 0

**Typy:**
- `CommunityFiltersState` (ViewModel)
- `LocationDTO[]` (lista lokalizacji)
- Enums: `ActivityTypeEnum`, `ReputationBadgeEnum`, `SortOptionEnum`

**Propsy:**
```typescript
interface CommunityFiltersPanelProps {
  filters: CommunityFiltersState;
  onFiltersChange: (filters: Partial<CommunityFiltersState>) => void;
  onReset: () => void;
  userLocations: LocationDTO[];
  isMobile: boolean;
  isOpen?: boolean; // dla mobile drawer
  onClose?: () => void; // dla mobile drawer
}
```

### 4.3. LocationSelector

**Opis komponentu:**
Dropdown do wyboru lokalizacji użytkownika jako centrum wyszukiwania. Wyświetla listę zapisanych lokalizacji z ikonami i etykietami.

**Główne elementy:**
- `<Select>` z shadcn/ui
- `<SelectTrigger>` z wybraną lokalizacją
- `<SelectContent>` z listą `<SelectItem>`
- Ikona lokalizacji i tekst: "Miasto (etykieta)"

**Obsługiwane interakcje:**
- Wybór lokalizacji z listy
- Wyświetlenie placeholder gdy brak lokalizacji
- Link "Dodaj lokalizację" gdy lista pusta

**Obsługiwana walidacja:**
- Sprawdzenie czy location_id istnieje w userLocations
- Wymagane pole - nie można zostawić pustego

**Typy:**
- `LocationDTO[]`
- `string` (selectedLocationId)

**Propsy:**
```typescript
interface LocationSelectorProps {
  locations: LocationDTO[];
  selectedLocationId: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
}
```

### 4.4. OutfitsList

**Opis komponentu:**
Lista kart z zestawami ubioru. Obsługuje stany: loading (skeleton), empty (brak wyników), error oraz wyświetlanie danych. Na mobile wyświetla karty pionowo, na desktop w grid 2-3 kolumny.

**Główne elementy:**
- `<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">`
- Warunkowe renderowanie:
  - `isLoading` → `<LoadingState />` (skeleton cards)
  - `error` → `<ErrorState />` z przyciskiem retry
  - `isEmpty` → `<EmptyState />` z sugestiami
  - success → lista `<OutfitCard />` komponentów

**Obsługiwane interakcje:**
- Kliknięcie karty → otwarcie szczegółów w modalu
- Scroll do końca → load more (infinite scroll)
- Lub kliknięcie "Załaduj więcej" (pagination)

**Obsługiwana walidacja:**
- Brak (prezentacyjny komponent)

**Typy:**
- `CommunityOutfitDTO[]`
- Loading/error states (boolean)

**Propsy:**
```typescript
interface OutfitsListProps {
  outfits: CommunityOutfitDTO[];
  isLoading: boolean;
  error?: string;
  onOutfitClick: (outfitId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}
```

### 4.5. OutfitCard

**Opis komponentu:**
Karta pojedynczego zestawu wyświetlająca najważniejsze informacje: użytkownik z badgem reputacji, warunki pogodowe, ikony ubioru (7 stref), ocena, dystans, czas. Klikalna - otwiera modal ze szczegółami.

**Główne elementy:**
- `<Card className="hover:shadow-lg transition-shadow cursor-pointer">`
- Header: Pseudonym + ReputationBadge + TimeAgo
- Body:
  - Sekcja pogody (temperatura, wiatr, ikona)
  - Wizualizacja ubioru (uproszczona, ikony 7 stref)
  - Badge typu aktywności
- Footer: Ocena (gwiazdki) + Dystans (ikona + km)

**Obsługiwane interakcje:**
- Kliknięcie całej karty → onOutfitClick(id)
- Hover na badge'u reputacji → tooltip
- Hover na ikonie ubioru → tooltip z nazwą

**Obsługiwana walidacja:**
- Brak (prezentacyjny)

**Typy:**
- `CommunityOutfitDTO`

**Propsy:**
```typescript
interface OutfitCardProps {
  outfit: CommunityOutfitDTO;
  onClick: (id: string) => void;
}
```

### 4.6. ReputationBadge

**Opis komponentu:**
Wizualna reprezentacja poziomu reputacji użytkownika w systemie. Wyświetla kolorową odznakę z ikoną i tekstem. Zawiera tooltip z dodatkowym kontekstem (liczba feedbacków).

**Główne elementy:**
- `<TooltipProvider>` i `<Tooltip>` z shadcn/ui
- `<Badge variant={reputationVariant}>` z odpowiednim kolorem
- Ikona (gwiazdka/medal) + tekst poziomu reputacji
- `<TooltipContent>`: "Ekspert - 67 feedbacków"

**Kolory i ikony według poziomu:**
- Nowicjusz (<10): szary (#9CA3AF), ikona gwiazdka pusta
- Regularny (10-50): brązowy (#D97706), ikona gwiazdka połowa
- Ekspert (50-100): srebrny (#71717A), ikona gwiazdka pełna
- Mistrz (>100): złoty (#EAB308), ikona medal/korona

**Obsługiwane interakcje:**
- Hover → wyświetlenie tooltipa z liczbą feedbacków

**Obsługiwana walidacja:**
- Brak (prezentacyjny)

**Typy:**
- `ReputationBadgeEnum`
- `number` (feedback_count)

**Propsy:**
```typescript
interface ReputationBadgeProps {
  badge: ReputationBadgeEnum;
  feedbackCount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

### 4.7. OutfitDetailModal

**Opis komponentu:**
Modal/dialog wyświetlający pełne szczegóły wybranego zestawu ubioru. Zawiera rozszerzone informacje o pogodzie, wszystkie 7 stref ubioru z opisami, notatkę użytkownika (jeśli jest) oraz metadane.

**Główne elementy:**
- `<Dialog>` z shadcn/ui
- `<DialogHeader>`: Pseudonym + Badge + przycisk zamknij
- `<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">`
- Sekcje:
  - **Warunki pogodowe** (pełne dane: temp, feels_like, wiatr, wilgotność, opady)
  - **Ubiór - 7 stref** (lista z ikonami i opisami dla każdej strefy)
  - **Notatki** (jeśli istnieją)
  - **Metadane** (typ aktywności, czas trwania, data, dystans od użytkownika)

**Obsługiwane interakcje:**
- Kliknięcie X lub poza modal → zamknięcie
- ESC → zamknięcie
- Scroll w zawartości modala

**Obsługiwana walidacja:**
- Brak (prezentacyjny)

**Typy:**
- `CommunityOutfitDTO`

**Propsy:**
```typescript
interface OutfitDetailModalProps {
  outfit: CommunityOutfitDTO | null;
  isOpen: boolean;
  onClose: () => void;
}
```

### 4.8. EmptyState

**Opis komponentu:**
Komponent wyświetlany gdy brak wyników spełniających kryteria filtrów. Zawiera ilustrację, komunikat oraz sugestie działań (np. rozszerzenie promienia, zmniejszenie wymagań filtrów).

**Główne elementy:**
- `<div className="flex flex-col items-center justify-center py-12">`
- Ikona/ilustracja SVG (rowerzysta, lupa)
- Tytuł: "Brak zestawów w okolicy"
- Opis: "Nie znaleźliśmy zestawów pasujących do Twoich filtrów"
- Sugestie:
  - Lista bullet points ze wskazówkami
  - Przycisk "Rozszerz promień wyszukiwania"
  - Przycisk "Resetuj filtry"
- Link do FAQ lub pomocy

**Obsługiwane interakcje:**
- Kliknięcie "Rozszerz promień" → zwiększenie radius_km o 50%
- Kliknięcie "Resetuj filtry" → onReset()

**Obsługiwana walidacja:**
- Brak (prezentacyjny)

**Typy:**
- Brak specyficznych

**Propsy:**
```typescript
interface EmptyStateProps {
  currentFilters: CommunityFiltersState;
  onExpandRadius: () => void;
  onResetFilters: () => void;
}
```

### 4.9. LoadingState

**Opis komponentu:**
Skeleton screen wyświetlany podczas ładowania danych. Pokazuje placeholdery w kształcie OutfitCard dla lepszego UX (użytkownik wie czego się spodziewać).

**Główne elementy:**
- Grid identyczny jak OutfitsList
- 6-9 komponentów `<Skeleton>` z shadcn/ui ułożonych jak OutfitCard
- Pulsująca animacja

**Obsługiwane interakcje:**
- Brak (statyczny komponent)

**Obsługiwana walidacja:**
- Brak

**Typy:**
- Brak

**Propsy:**
```typescript
interface LoadingStateProps {
  count?: number; // liczba skeleton cards (default 9)
}
```

### 4.10. ActiveFiltersDisplay

**Opis komponentu:**
Wyświetla aktywne filtry jako chip'y/badge'y z możliwością szybkiego usunięcia pojedynczego filtra. Pokazuje tylko filtry różniące się od wartości domyślnych.

**Główne elementy:**
- `<div className="flex flex-wrap gap-2 mb-4">`
- Dla każdego aktywnego filtra: `<Badge variant="secondary">`
  - Tekst: "Temperatura: 12°C ±3" lub "Minimum ocena: 4"
  - Ikona X do usunięcia
- Przycisk "Wyczyść wszystkie" gdy więcej niż 1 filtr

**Obsługiwane interakcje:**
- Kliknięcie X na chip → usunięcie tego filtra
- Kliknięcie "Wyczyść wszystkie" → reset wszystkich filtrów

**Obsługiwana walidacja:**
- Brak (prezentacyjny)

**Typy:**
- `CommunityFiltersState`

**Propsy:**
```typescript
interface ActiveFiltersDisplayProps {
  filters: CommunityFiltersState;
  onRemoveFilter: (filterKey: keyof CommunityFiltersState) => void;
  onClearAll: () => void;
}
```

### 4.11. Pagination

**Opis komponentu:**
Klasyczna paginacja z przyciskami Previous/Next i numerami stron. Wyświetlana na dole listy wyników.

**Główne elementy:**
- `<div className="flex items-center justify-center gap-2 mt-6">`
- Button "Poprzednia" (disabled gdy offset=0)
- Numery stron (z elipsą gdy dużo stron)
- Button "Następna" (disabled gdy !has_more)
- Info: "Strona X z Y"

**Obsługiwane interakcje:**
- Kliknięcie Previous → offset -= limit
- Kliknięcie Next → offset += limit
- Kliknięcie numeru strony → offset = (page - 1) * limit

**Obsługiwana walidacja:**
- offset >= 0
- Nie pozwalaj na next gdy !has_more

**Typy:**
- `number` (offset, limit, total)
- `boolean` (has_more)

**Propsy:**
```typescript
interface PaginationProps {
  currentOffset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  onPageChange: (newOffset: number) => void;
}
```

## 5. Typy

### 5.1. Istniejące typy (z types.ts)

**CommunityOutfitDTO** - główny typ dla pojedynczego zestawu społeczności:
```typescript
interface CommunityOutfitDTO {
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
```

**CommunityOutfitsListDTO** - response z API:
```typescript
interface CommunityOutfitsListDTO {
  outfits: CommunityOutfitDTO[];
  total: number;
  has_more: boolean;
}
```

**GetCommunityOutfitsParams** - parametry query dla API:
```typescript
interface GetCommunityOutfitsParams {
  location_id: string;
  radius_km?: number;
  temperature?: number;
  temperature_range?: number;
  activity_type?: ActivityTypeEnum;
  min_rating?: number;
  reputation_filter?: ReputationBadgeEnum;
  time_range?: number;
  sort?: "reputation" | "distance" | "created_at" | "rating";
  limit?: number;
  offset?: number;
}
```

**OutfitDTO** - struktura ubioru (7 stref):
```typescript
interface OutfitDTO {
  head: string;
  torso: OutfitTorso;
  arms: string;
  hands: string;
  legs: string;
  feet: OutfitFeet;
  neck: string;
}

interface OutfitTorso {
  base: string;
  mid: string;
  outer: string;
}

interface OutfitFeet {
  socks: string;
  covers: string;
}
```

**ReputationBadgeEnum:**
```typescript
type ReputationBadgeEnum = "nowicjusz" | "regularny" | "ekspert" | "mistrz";
```

**ActivityTypeEnum:**
```typescript
type ActivityTypeEnum = "recovery" | "spokojna" | "tempo" | "interwaly";
```

### 5.2. Nowe typy (ViewModels do stworzenia)

**CommunityFiltersState** - stan filtrów w komponencie (rozszerzenie GetCommunityOutfitsParams o wartości domyślne):
```typescript
interface CommunityFiltersState {
  location_id: string;
  radius_km: number; // default: 50
  temperature?: number;
  temperature_range: number; // default: 3
  wind_speed?: number;
  activity_type?: ActivityTypeEnum;
  min_rating?: number; // 1-5
  reputation_filter?: ReputationBadgeEnum[];
  time_range: number; // default: 24 (hours)
  sort: "reputation" | "distance" | "created_at" | "rating"; // default: "reputation"
  limit: number; // default: 10
  offset: number; // default: 0
}
```

**CommunityViewState** - główny stan widoku:
```typescript
interface CommunityViewState {
  filters: CommunityFiltersState;
  outfits: CommunityOutfitDTO[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  selectedOutfitId: string | null; // dla modala
}
```

**ReputationBadgeConfig** - konfiguracja stylowania badge'y:
```typescript
interface ReputationBadgeConfig {
  badge: ReputationBadgeEnum;
  label: string; // "Nowicjusz", "Regularny", "Ekspert", "Mistrz"
  color: string; // Tailwind class
  icon: string; // nazwa ikony z lucide-react
  minFeedbacks: number;
  maxFeedbacks: number | null;
}

const REPUTATION_CONFIG: Record<ReputationBadgeEnum, ReputationBadgeConfig> = {
  nowicjusz: {
    badge: "nowicjusz",
    label: "Nowicjusz",
    color: "bg-gray-400",
    icon: "Star",
    minFeedbacks: 0,
    maxFeedbacks: 9
  },
  regularny: {
    badge: "regularny",
    label: "Regularny",
    color: "bg-amber-600",
    icon: "Star",
    minFeedbacks: 10,
    maxFeedbacks: 49
  },
  ekspert: {
    badge: "ekspert",
    label: "Ekspert",
    color: "bg-zinc-500",
    icon: "Star",
    minFeedbacks: 50,
    maxFeedbacks: 99
  },
  mistrz: {
    badge: "mistrz",
    label: "Mistrz",
    color: "bg-yellow-500",
    icon: "Award",
    minFeedbacks: 100,
    maxFeedbacks: null
  }
};
```

**OutfitIconMapping** - mapowanie wartości z API na ikony i etykiety:
```typescript
interface OutfitItemConfig {
  value: string; // wartość z API (np. "czapka", "opaska", "nic")
  label: string; // etykieta po polsku
  icon: string; // nazwa ikony
  category: "head" | "torso" | "arms" | "hands" | "legs" | "feet" | "neck";
}

// Przykład dla head:
const HEAD_ITEMS: Record<string, OutfitItemConfig> = {
  czapka: { value: "czapka", label: "Czapka", icon: "Cap", category: "head" },
  opaska: { value: "opaska", label: "Opaska", icon: "Headband", category: "head" },
  buff: { value: "buff", label: "Buff", icon: "Scarf", category: "head" },
  nic: { value: "nic", label: "Bez nakrycia głowy", icon: "X", category: "head" }
};

// Podobnie dla pozostałych kategorii...
```

**SortOption** - opcje sortowania:
```typescript
interface SortOption {
  value: "reputation" | "distance" | "created_at" | "rating";
  label: string;
  icon: string;
}

const SORT_OPTIONS: SortOption[] = [
  { value: "reputation", label: "Według reputacji", icon: "Award" },
  { value: "distance", label: "Według odległości", icon: "MapPin" },
  { value: "created_at", label: "Według daty", icon: "Clock" },
  { value: "rating", label: "Według oceny", icon: "Star" }
];
```

## 6. Zarządzanie stanem

### 6.1. Strategia zarządzania stanem

Ze względu na złożoność widoku (wiele filtrów, synchronizacja z URL, paginacja), zaleca się użycie **custom hooka** `useCommunityView` który będzie centralnie zarządzał stanem i logiką biznesową.

**Struktura stanu:**
- Stan lokalny (React.useState) dla UI (np. otwarcie mobile drawer, modal)
- URL jako single source of truth dla filtrów (URLSearchParams)
- React Query lub własny hook dla fetching i cache'owania danych

### 6.2. Custom hook: useCommunityView

**Lokalizacja:** `src/hooks/useCommunityView.ts`

**Odpowiedzialności:**
1. Inicjalizacja filtrów z URL
2. Synchronizacja zmian filtrów z URL
3. Fetching danych z API
4. Cache'owanie (5 min zgodnie z PRD)
5. Obsługa błędów
6. Paginacja/infinite scroll

**Interfejs:**
```typescript
interface UseCommunityViewParams {
  defaultLocationId?: string;
}

interface UseCommunityViewReturn {
  // Stan
  state: CommunityViewState;
  
  // Akcje dla filtrów
  setFilters: (filters: Partial<CommunityFiltersState>) => void;
  resetFilters: () => void;
  setLocationId: (id: string) => void;
  setSort: (sort: SortOption['value']) => void;
  
  // Akcje dla paginacji
  loadMore: () => void;
  goToPage: (page: number) => void;
  
  // Akcje dla modala
  openOutfitDetail: (id: string) => void;
  closeOutfitDetail: () => void;
  
  // Helpers
  refetch: () => Promise<void>;
  getActiveFiltersCount: () => number;
}

export function useCommunityView(params: UseCommunityViewParams): UseCommunityViewReturn {
  // Implementacja...
}
```

**Kluczowe elementy implementacji:**

1. **Synchronizacja z URL:**
```typescript
// Parsowanie URL → state
const parseFiltersFromURL = (searchParams: URLSearchParams): CommunityFiltersState => {
  return {
    location_id: searchParams.get('location_id') || defaultLocationId,
    radius_km: parseInt(searchParams.get('radius_km') || '50'),
    temperature: searchParams.get('temperature') ? parseFloat(searchParams.get('temperature')!) : undefined,
    // ...pozostałe filtry
  };
};

// State → URL
const syncFiltersToURL = (filters: CommunityFiltersState) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  window.history.pushState({}, '', `?${params.toString()}`);
};
```

2. **Fetching z debouncing:**
```typescript
const debouncedFetch = useMemo(
  () => debounce((filters: CommunityFiltersState) => {
    fetchOutfits(filters);
  }, 500),
  []
);

useEffect(() => {
  debouncedFetch(filters);
}, [filters]);
```

3. **Cache strategy:**
```typescript
// Użycie React Query lub prosty cache w sessionStorage
const queryKey = ['community-outfits', JSON.stringify(filters)];
const cacheTime = 5 * 60 * 1000; // 5 minut

// Z React Query:
const { data, isLoading, error } = useQuery(
  queryKey,
  () => fetchCommunityOutfits(filters),
  { staleTime: cacheTime }
);
```

### 6.3. Pomocnicze hooki

**useLocationSelection** - zarządzanie wyborem lokalizacji:
```typescript
interface UseLocationSelectionReturn {
  selectedLocation: LocationDTO | null;
  availableLocations: LocationDTO[];
  selectLocation: (id: string) => void;
  isLoading: boolean;
}
```

**useOutfitModal** - zarządzanie stanem modala:
```typescript
interface UseOutfitModalReturn {
  isOpen: boolean;
  selectedOutfit: CommunityOutfitDTO | null;
  open: (outfit: CommunityOutfitDTO) => void;
  close: () => void;
}
```

**useFiltersDrawer** (tylko mobile) - zarządzanie drawer'em:
```typescript
interface UseFiltersDrawerReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}
```

## 7. Integracja API

### 7.1. Główny endpoint: GET /api/community/outfits

**Typ żądania:**
```typescript
// Query parameters są zakodowane w URL
type RequestParams = GetCommunityOutfitsParams;

// Przykład wywołania:
const params = new URLSearchParams({
  location_id: 'uuid-here',
  radius_km: '50',
  temperature: '12',
  temperature_range: '3',
  activity_type: 'tempo',
  min_rating: '4',
  reputation_filter: 'ekspert',
  time_range: '24',
  sort: 'reputation',
  limit: '10',
  offset: '0'
});

const response = await fetch(`/api/community/outfits?${params.toString()}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Typ odpowiedzi:**
```typescript
// Success (200):
type SuccessResponse = CommunityOutfitsListDTO;

// Error responses:
interface ErrorResponse {
  error: string;
  message?: string;
  details?: Record<string, string[]>;
}

// 400 - Validation Error
interface ValidationErrorResponse extends ErrorResponse {
  error: "Validation Error";
  details: Record<string, string[]>; // np. { "radius_km": ["Must be between 1 and 100"] }
}

// 401 - Unauthorized
interface UnauthorizedResponse extends ErrorResponse {
  error: "Unauthorized";
  message: "Authentication required";
}

// 404 - Location Not Found
interface NotFoundResponse extends ErrorResponse {
  error: "Location Not Found";
  message: "The specified location_id does not exist or does not belong to you";
}

// 500 - Internal Server Error
interface ServerErrorResponse extends ErrorResponse {
  error: "Internal Server Error";
  message: "An unexpected error occurred";
}
```

**Funkcja fetchCommunityOutfits:**
```typescript
// src/lib/api/community.ts

async function fetchCommunityOutfits(
  params: GetCommunityOutfitsParams
): Promise<CommunityOutfitsListDTO> {
  const searchParams = new URLSearchParams();
  
  // Dodaj wszystkie parametry do URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(`/api/community/outfits?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Token będzie automatycznie dołączony przez middleware
    },
    credentials: 'include' // dla cookies z session
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new CommunityApiError(response.status, error);
  }

  return response.json();
}

class CommunityApiError extends Error {
  constructor(
    public status: number,
    public body: ErrorResponse
  ) {
    super(body.message || body.error);
    this.name = 'CommunityApiError';
  }
}
```

### 7.2. Pomocniczy endpoint: GET /api/feedbacks

Używany dla zakładki "Moje udostępnione zestawy".

**Typ żądania:**
```typescript
const params = new URLSearchParams({
  shared_with_community: 'true',
  limit: '20',
  offset: '0',
  sort: 'created_at_desc'
});

const response = await fetch(`/api/feedbacks?${params.toString()}`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
});
```

**Typ odpowiedzi:**
```typescript
interface MySharedOutfitsResponse {
  feedbacks: FeedbackDTO[];
  total: number;
  has_more: boolean;
}
```

**Funkcja fetchMySharedOutfits:**
```typescript
async function fetchMySharedOutfits(
  limit: number = 20,
  offset: number = 0
): Promise<FeedbackDTO[]> {
  const params = new URLSearchParams({
    shared_with_community: 'true',
    limit: String(limit),
    offset: String(offset),
    sort: 'created_at_desc'
  });

  const response = await fetch(`/api/feedbacks?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shared outfits');
  }

  const data = await response.json();
  return data.feedbacks;
}
```

### 7.3. Obsługa błędów API

**Centralna funkcja obsługi błędów:**
```typescript
// src/lib/api/errorHandler.ts

function handleCommunityApiError(error: CommunityApiError): string {
  switch (error.status) {
    case 400:
      // Validation error - wyświetl szczegóły
      const details = Object.entries(error.body.details || {})
        .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
        .join('; ');
      return `Błąd walidacji: ${details}`;
      
    case 401:
      // Unauthorized - przekieruj do logowania
      window.location.href = '/login';
      return 'Wymagane logowanie';
      
    case 404:
      return 'Wybrana lokalizacja nie została znaleziona. Wybierz inną lokalizację.';
      
    case 500:
      return 'Wystąpił błąd serwera. Spróbuj ponownie za chwilę.';
      
    default:
      return 'Wystąpił nieoczekiwany błąd. Sprawdź połączenie z internetem.';
  }
}
```

## 8. Interakcje użytkownika

### 8.1. Inicjalizacja widoku

**Scenariusz:** Użytkownik wchodzi na `/community`

**Przebieg:**
1. Komponent montuje się i parsuje URL parameters
2. Jeśli `location_id` w URL → użyj jej
3. Jeśli brak → użyj domyślnej lokalizacji z profilu
4. Jeśli użytkownik nie ma żadnej lokalizacji → pokaż prompt "Dodaj lokalizację"
5. Inicjalizuj pozostałe filtry z URL lub wartości domyślne
6. Wywołaj API z parametrami
7. Pokaż LoadingState podczas ładowania
8. Wyświetl wyniki lub EmptyState

### 8.2. Zmiana filtrów (desktop)

**Scenariusz:** Użytkownik zmienia wartość filtra na desktopie

**Przebieg:**
1. Użytkownik zmienia wartość w kontrolce (np. przesuwa slider promienia)
2. Wywołaj `onFiltersChange({ radius_km: newValue })`
3. Hook aktualizuje stan filtrów
4. Debounce 500ms
5. Po debounce: sync z URL i wywołaj API
6. Pokaż LoadingState (tylko lista, nie cały widok)
7. Zaktualizuj listę wyników
8. Zaktualizuj ActiveFiltersDisplay

### 8.3. Zmiana filtrów (mobile)

**Scenariusz:** Użytkownik zmienia filtry na mobile

**Przebieg:**
1. Użytkownik klika przycisk "Filtry" → otwiera się drawer od dołu
2. Zmienia wartości filtrów w drawer (nie wywołuje API)
3. Klika "Zastosuj" → drawer się zamyka
4. Sync z URL i wywołaj API
5. Pokaż LoadingState
6. Zaktualizuj listę

**Alternatywnie:** Klik "Anuluj" → zamknij drawer bez zmian

### 8.4. Reset filtrów

**Scenariusz:** Użytkownik klika "Reset filtrów" lub "Wyczyść wszystkie" w ActiveFiltersDisplay

**Przebieg:**
1. Wywołaj `resetFilters()`
2. Ustaw wszystkie filtry na wartości domyślne (poza location_id)
3. Sync z URL (usuń wszystkie parametry poza location_id)
4. Wywołaj API
5. Zaktualizuj listę

### 8.5. Sortowanie

**Scenariusz:** Użytkownik zmienia sortowanie

**Przebieg:**
1. Użytkownik wybiera opcję z dropdown "Sortuj według"
2. Wywołaj `setSort(newSort)`
3. Aktualizuj URL (`?sort=distance`)
4. Wywołaj API (offset zostaje zresetowany do 0)
5. Wyświetl nową kolejność wyników

### 8.6. Paginacja

**Scenariusz:** Użytkownik klika "Następna strona"

**Przebieg:**
1. Wywołaj `goToPage(currentPage + 1)` lub `loadMore()`
2. Zwiększ offset o limit
3. Sync z URL
4. Wywołaj API
5. Pokaż LoadingState
6. Dołącz nowe wyniki (infinite scroll) lub zastąp (pagination)
7. Scroll do góry listy (dla pagination)

### 8.7. Kliknięcie karty zestawu

**Scenariusz:** Użytkownik klika kartę OutfitCard

**Przebieg:**
1. Wywołaj `openOutfitDetail(outfit.id)`
2. Ustaw `selectedOutfitId` w state
3. Otwórz OutfitDetailModal
4. Wyświetl pełne szczegóły zestawu
5. Zablokuj scroll body (trapFocus w modalu)

**Zamknięcie modala:**
- Klik X, ESC, lub klik poza modal → wywołaj `closeOutfitDetail()`

### 8.8. Hover na ReputationBadge

**Scenariusz:** Użytkownik najeżdża kursorem na badge reputacji

**Przebieg:**
1. Pokaż tooltip z Tooltip component (shadcn/ui)
2. Wyświetl: "Ekspert - 67 feedbacków"
3. Po 200ms delay (aby uniknąć przypadkowych hover)
4. Hide po zjechaniu kursorem

### 8.9. Przełączanie zakładek

**Scenariusz:** Użytkownik klika zakładkę "Moje udostępnione"

**Przebieg:**
1. Zmień aktywną zakładkę w state
2. Ukryj panel filtrów (nie są potrzebne)
3. Wywołaj `fetchMySharedOutfits()`
4. Wyświetl listę własnych udostępnionych zestawów (format jak FeedbacksList)
5. Umożliw usunięcie zestawu (przycisk "Przestań udostępniać")

### 8.10. Rozszerzenie promienia (EmptyState)

**Scenariusz:** Brak wyników, użytkownik klika "Rozszerz promień"

**Przebieg:**
1. Wywołaj `setFilters({ radius_km: currentRadius * 1.5 })`
2. Max 100 km
3. Wywołaj API z nowym promieniem
4. Jeśli nadal brak wyników → pokaż sugestię zmiany innych filtrów

## 9. Warunki i walidacja

### 9.1. Walidacja po stronie klienta (przed wysłaniem do API)

**Komponent: CommunityFiltersPanel**

#### location_id
- **Warunek:** Wymagane, UUID v4, musi istnieć w `userLocations`
- **Walidacja:** 
  ```typescript
  if (!location_id) return "Lokalizacja jest wymagana";
  if (!isValidUUID(location_id)) return "Nieprawidłowy format lokalizacji";
  if (!userLocations.find(l => l.id === location_id)) {
    return "Ta lokalizacja nie istnieje w Twoim profilu";
  }
  ```
- **Stan UI:** Czerwona ramka select, komunikat błędu pod polem
- **Blokada wysyłki:** Tak, przycisk "Zastosuj" disabled

#### radius_km
- **Warunek:** 1-100, liczba całkowita
- **Walidacja:**
  ```typescript
  const value = parseInt(radius_km);
  if (isNaN(value)) return "Promień musi być liczbą";
  if (value < 1) return "Minimalny promień to 1 km";
  if (value > 100) return "Maksymalny promień to 100 km";
  ```
- **Stan UI:** Slider z range 1-100, wyświetlanie wartości w czasie rzeczywistym
- **Blokada wysyłki:** Nie (slider fizycznie uniemożliwia wyjście poza zakres)

#### temperature
- **Warunek:** Opcjonalne, -30 do 50°C, liczba
- **Walidacja:**
  ```typescript
  if (temperature !== undefined) {
    const value = parseFloat(temperature);
    if (isNaN(value)) return "Temperatura musi być liczbą";
    if (value < -30 || value > 50) return "Temperatura musi być w zakresie -30°C do 50°C";
  }
  ```
- **Stan UI:** Input type="number" z step=0.5
- **Blokada wysyłki:** Tak, jeśli błąd walidacji

#### temperature_range
- **Warunek:** 0-10°C, liczba całkowita
- **Walidacja:**
  ```typescript
  const value = parseInt(temperature_range);
  if (value < 0) return "Zakres nie może być ujemny";
  if (value > 10) return "Maksymalny zakres to ±10°C";
  ```
- **Stan UI:** Slider 0-10, domyślnie 3
- **Blokada wysyłki:** Nie (slider z ograniczeniem)

#### wind_speed
- **Warunek:** Opcjonalne, 0-100 km/h
- **Walidacja:**
  ```typescript
  if (wind_speed !== undefined) {
    const value = parseFloat(wind_speed);
    if (value < 0) return "Prędkość wiatru nie może być ujemna";
    if (value > 100) return "Maksymalna prędkość to 100 km/h";
  }
  ```
- **Stan UI:** Input lub slider
- **Blokada wysyłki:** Tak, jeśli błąd

#### activity_type
- **Warunek:** Opcjonalne, jedna z wartości enum
- **Walidacja:**
  ```typescript
  const validTypes = ["recovery", "spokojna", "tempo", "interwaly"];
  if (activity_type && !validTypes.includes(activity_type)) {
    return "Nieprawidłowy typ aktywności";
  }
  ```
- **Stan UI:** Select z opcjami + "Wszystkie"
- **Blokada wysyłki:** Nie (select uniemożliwia nieprawidłową wartość)

#### min_rating
- **Warunek:** Opcjonalne, 1-5
- **Walidacja:**
  ```typescript
  if (min_rating !== undefined) {
    if (min_rating < 1 || min_rating > 5) return "Ocena musi być od 1 do 5";
  }
  ```
- **Stan UI:** Gwiazdki (clickable) lub select 1-5
- **Blokada wysyłki:** Nie

#### reputation_filter
- **Warunek:** Opcjonalne, jedna lub więcej wartości enum
- **Walidacja:**
  ```typescript
  const validBadges = ["nowicjusz", "regularny", "ekspert", "mistrz"];
  if (reputation_filter && !reputation_filter.every(b => validBadges.includes(b))) {
    return "Nieprawidłowa reputacja";
  }
  ```
- **Stan UI:** Checkboxy lub multi-select
- **Blokada wysyłki:** Nie

#### time_range
- **Warunek:** 1-168 godzin (max 7 dni)
- **Walidacja:**
  ```typescript
  const value = parseInt(time_range);
  if (value < 1) return "Minimalny zakres to 1 godzina";
  if (value > 168) return "Maksymalny zakres to 168 godzin (7 dni)";
  ```
- **Stan UI:** Select z opcjami (24h, 48h, 7 dni) lub custom input
- **Blokada wysyłki:** Tak, jeśli błąd

#### limit i offset
- **Warunek:** limit: 1-50, offset: ≥0
- **Walidacja:**
  ```typescript
  if (limit < 1 || limit > 50) return "Limit musi być od 1 do 50";
  if (offset < 0) return "Offset nie może być ujemny";
  ```
- **Stan UI:** Zarządzane wewnętrznie przez paginację (nie edytowalne przez user)
- **Blokada wysyłki:** Nie (walidacja wewnętrzna)

### 9.2. Walidacja URL parameters (przy inicjalizacji)

**Komponent: useCommunityView hook**

Gdy użytkownik wchodzi na stronę z parametrami URL (np. z linku), hook musi:
1. Sparsować wszystkie parametry
2. Zwalidować każdy zgodnie z regułami powyżej
3. W przypadku błędu → użyj wartości domyślnej + pokaż toast info
4. Jeśli location_id nieprawidłowy → użyj default lub prompt do wyboru

```typescript
function sanitizeFiltersFromURL(params: URLSearchParams): CommunityFiltersState {
  const filters: Partial<CommunityFiltersState> = {};
  
  // location_id (wymagane)
  const locationId = params.get('location_id');
  if (locationId && isValidUUID(locationId)) {
    filters.location_id = locationId;
  } else {
    filters.location_id = defaultLocationId; // fallback
    showToast('info', 'Użyto domyślnej lokalizacji');
  }
  
  // radius_km
  const radius = parseInt(params.get('radius_km') || '50');
  filters.radius_km = clamp(radius, 1, 100);
  
  // temperature (opcjonalne)
  const temp = params.get('temperature');
  if (temp) {
    const value = parseFloat(temp);
    if (!isNaN(value) && value >= -30 && value <= 50) {
      filters.temperature = value;
    }
  }
  
  // ... podobnie dla pozostałych
  
  return filters as CommunityFiltersState;
}
```

### 9.3. Warunki wyświetlania UI

**EmptyState** wyświetla się gdy:
```typescript
!isLoading && !error && outfits.length === 0
```

**LoadingState** wyświetla się gdy:
```typescript
isLoading && outfits.length === 0 // pierwsze ładowanie
// Lub jeśli używamy skeleton dla każdego ładowania
```

**ErrorState** wyświetla się gdy:
```typescript
!isLoading && error !== null
```

**Pagination/Next button** disabled gdy:
```typescript
!hasMore || isLoading
```

**Previous button** disabled gdy:
```typescript
offset === 0 || isLoading
```

**"Zastosuj" button** (mobile) disabled gdy:
```typescript
isLoading || !isValid(currentFilters)
```

**ActiveFiltersDisplay** pokazuje tylko filtry gdzie:
```typescript
// Filtr jest różny od wartości domyślnej
filter.value !== DEFAULT_FILTERS[filter.key]
```

## 10. Obsługa błędów

### 10.1. Błędy API

#### 401 Unauthorized
- **Przyczyna:** Brak tokena lub wygasła sesja
- **Obsługa:**
  1. Wyświetl toast: "Sesja wygasła. Proszę zalogować się ponownie."
  2. Zapisz aktualny URL w sessionStorage (dla redirect po logowaniu)
  3. Przekieruj do `/login?redirect=/community`
  4. Po zalogowaniu → wróć na `/community` z zachowanymi filtrami

#### 400 Validation Error
- **Przyczyna:** Nieprawidłowe parametry (mimo walidacji client-side)
- **Obsługa:**
  1. Parsuj `error.details` z response
  2. Wyświetl toast z listą błędów: "Błąd filtrów: radius_km musi być od 1 do 100"
  3. Podświetl błędne pola w formularzu (jeśli możliwe zidentyfikować)
  4. Nie wywołuj ponownie API do poprawy

#### 404 Location Not Found
- **Przyczyna:** location_id nie istnieje lub nie należy do użytkownika
- **Obsługa:**
  1. Wyświetl toast: "Wybrana lokalizacja nie została znaleziona"
  2. Zmień location_id na domyślną lokalizację użytkownika
  3. Jeśli brak domyślnej → pokaż prompt "Dodaj lokalizację"
  4. Automatycznie refetch z nową lokalizacją

#### 500 Internal Server Error
- **Przyczyna:** Błąd serwera lub bazy danych
- **Obsługa:**
  1. Wyświetl toast: "Wystąpił błąd serwera. Spróbuj ponownie."
  2. Pokaż przycisk "Spróbuj ponownie" w ErrorState
  3. Zaloguj błąd do Sentry (jeśli skonfigurowany)
  4. Po 3 nieudanych próbach → pokaż "Serwis chwilowo niedostępny"

#### Network Error (offline)
- **Przyczyna:** Brak połączenia internetowego
- **Obsługa:**
  1. Wyświetl toast: "Brak połączenia z internetem"
  2. Pokaż ErrorState z ikoną offline
  3. Przycisk "Spróbuj ponownie"
  4. Sprawdzaj `navigator.onLine` i automatycznie retry gdy online

### 10.2. Błędy walidacji (client-side)

**Strategia:** Walidacja na bieżąco (on blur) + przed submit

```typescript
interface ValidationErrors {
  [key: string]: string | undefined;
}

const [errors, setErrors] = useState<ValidationErrors>({});

const validateField = (name: string, value: any): string | undefined => {
  switch (name) {
    case 'radius_km':
      if (value < 1 || value > 100) return 'Promień musi być od 1 do 100 km';
      break;
    // ... inne pola
  }
  return undefined;
};

const handleBlur = (name: string, value: any) => {
  const error = validateField(name, value);
  setErrors(prev => ({ ...prev, [name]: error }));
};

const isFormValid = (): boolean => {
  return Object.values(errors).every(e => e === undefined);
};
```

**Wyświetlanie błędów:**
- Czerwona ramka na polu z błędem
- Komunikat pod polem (mały font, czerwony kolor)
- Ikona ! obok pola
- Disabled "Zastosuj" gdy !isFormValid()

### 10.3. Empty state scenarios

#### Scenariusz 1: Brak zestawów w ogóle
- **Warunek:** Pierwsze wejście, brak danych w promieniu
- **UI:**
  - Ikona: rowerzysta + lupa
  - Tytuł: "Brak zestawów w okolicy"
  - Opis: "W promieniu 50 km nie ma jeszcze udostępnionych zestawów."
  - Akcja: "Rozszerz promień do 100 km" (button)
  - Sugestia: "Bądź pierwszy! Dodaj feedback po treningu i udostępnij go społeczności."

#### Scenariusz 2: Zbyt restrykcyjne filtry
- **Warunek:** Użytkownik ma aktywne filtry, brak wyników
- **UI:**
  - Ikona: filtr + X
  - Tytuł: "Brak pasujących zestawów"
  - Opis: "Nie znaleźliśmy zestawów spełniających wszystkie kryteria."
  - Lista sugestii:
    - "Rozszerz promień wyszukiwania"
    - "Zwiększ zakres temperatury"
    - "Usuń filtr reputacji"
  - Akcja: "Resetuj filtry" (button)

#### Scenariusz 3: Zbyt wąski zakres czasu
- **Warunek:** time_range=24h, brak wyników
- **UI:**
  - Sugestia: "Spróbuj rozszerzyć zakres czasowy do 48h lub 7 dni"
  - Auto-button: "Pokaż z ostatnich 48h"

### 10.4. Loading states

**Pierwsze ładowanie:**
- Full page loader lub skeleton cards (preferowane skeleton dla lepszego UX)
- 9 skeleton cards w grid

**Refetch po zmianie filtrów:**
- Overlay z transparentnym tłem + spinner na środku listy
- Istniejąca lista lekko wyszarzona (opacity: 0.5)
- Bez scroll do góry

**Infinite scroll load more:**
- Mały spinner na dole listy
- Komunikat: "Ładowanie kolejnych wyników..."

**Timeout handling:**
- Jeśli request trwa >10s → pokaż komunikat "To trwa dłużej niż zwykle..."
- Po 30s → timeout, pokaż błąd z retry

### 10.5. Defensive programming

**Sprawdzanie danych z API:**
```typescript
function normalizeOutfit(outfit: CommunityOutfitDTO): CommunityOutfitDTO {
  return {
    ...outfit,
    user_pseudonym: outfit.user_pseudonym || 'Anonim',
    reputation_badge: outfit.reputation_badge || 'nowicjusz',
    feedback_count: Math.max(0, outfit.feedback_count || 0),
    distance_km: Math.max(0, outfit.distance_km || 0),
    overall_rating: clamp(outfit.overall_rating || 3, 1, 5),
    weather_conditions: {
      temperature: outfit.weather_conditions?.temperature ?? 0,
      feels_like: outfit.weather_conditions?.feels_like ?? 0,
      wind_speed: outfit.weather_conditions?.wind_speed ?? 0,
      humidity: outfit.weather_conditions?.humidity ?? 50,
      rain_mm: outfit.weather_conditions?.rain_mm ?? 0
    }
  };
}
```

**Fallback dla brakujących danych:**
- Pseudonym → "Anonim"
- Badge → "nowicjusz"
- Ikony ubioru → placeholder icon (?)
- Dystans → "Nieznany dystans"

## 11. Kroki implementacji

### Faza 1: Setup i infrastruktura (2-3h)

1. **Utworzenie struktury plików**
   ```
   src/pages/community.astro
   src/components/community/
     CommunityViewContainer.tsx
     CommunityFiltersPanel.tsx
     OutfitsList.tsx
     OutfitCard.tsx
     ReputationBadge.tsx
     OutfitDetailModal.tsx
     EmptyState.tsx
     LoadingState.tsx
     ActiveFiltersDisplay.tsx
   src/hooks/
     useCommunityView.ts
     useLocationSelection.ts
     useOutfitModal.ts
   src/lib/api/
     community.ts
   src/lib/utils/
     outfit-icons.ts
     reputation-config.ts
   ```

2. **Dodanie typów ViewModels**
   - Rozszerz `src/types.ts` o ViewModels z sekcji 5.2
   - `CommunityFiltersState`, `CommunityViewState`, `ReputationBadgeConfig`, etc.

3. **Setup stałych i konfiguracji**
   - `src/lib/utils/reputation-config.ts` - config dla badge'y
   - `src/lib/utils/outfit-icons.ts` - mapowanie wartości na ikony
   - `src/constants/community.constants.ts` - domyślne wartości filtrów

### Faza 2: Strona główna i routing (1-2h)

4. **Implementacja `community.astro`**
   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   import CommunityViewContainer from '../components/community/CommunityViewContainer';
   
   // Server-side: pobierz dane użytkownika, lokalizacje
   const user = Astro.locals.user;
   if (!user) return Astro.redirect('/login');
   
   const userLocations = await fetchUserLocations(user.id);
   const defaultLocationId = userLocations.find(l => l.is_default)?.id;
   ---
   
   <Layout title="Społeczność - CycleGear">
     <CommunityViewContainer 
       defaultLocationId={defaultLocationId}
       userLocations={userLocations}
       client:load
     />
   </Layout>
   ```

5. **Dodanie linku w nawigacji**
   - Dodaj link "Społeczność" w głównym navbarze
   - Ikona: Users lub UsersRound z lucide-react

### Faza 3: API client i custom hook (3-4h)

6. **Implementacja `src/lib/api/community.ts`**
   - Funkcja `fetchCommunityOutfits(params)` (sekcja 7.1)
   - Funkcja `fetchMySharedOutfits(limit, offset)` (sekcja 7.2)
   - Klasa `CommunityApiError` do obsługi błędów
   - Funkcja `handleCommunityApiError(error)` (sekcja 7.3)

7. **Implementacja custom hooka `useCommunityView`**
   - State management (React.useState)
   - Funkcje pomocnicze:
     - `parseFiltersFromURL()`
     - `syncFiltersToURL()`
     - `sanitizeFiltersFromURL()`
   - Fetching logic z debouncing
   - Cache strategy (opcjonalnie React Query)
   - Eksport interfejsu `UseCommunityViewReturn`

8. **Implementacja pomocniczych hooków**
   - `useLocationSelection` - zarządzanie wyborem lokalizacji
   - `useOutfitModal` - stan modala
   - `useFiltersDrawer` (mobile) - stan drawer'a filtrów

### Faza 4: Komponenty filtrów (4-5h)

9. **Implementacja `CommunityFiltersPanel.tsx`**
   - Layout z Card (desktop) lub Sheet (mobile)
   - Sekcje filtrów (Lokalizacja, Pogoda, Preferencje, Sortowanie)
   - Przyciski akcji (Reset, Zastosuj na mobile)
   - Responsywność (drawer na mobile)

10. **Implementacja sub-komponentów filtrów**
    - `LocationSelector.tsx` - select lokalizacji
    - `RadiusSlider.tsx` - slider promienia (shadcn Slider)
    - `TemperatureRangeInput.tsx` - input temp + slider range
    - `ActivityTypeSelect.tsx` - select typu aktywności
    - `MinRatingSelect.tsx` - gwiazdki lub select 1-5
    - `ReputationFilter.tsx` - checkboxy dla badge'y
    - `TimeRangeSelect.tsx` - select 24h/48h/7d
    - `SortSelect.tsx` - select sortowania

11. **Walidacja filtrów**
    - Funkcje walidacyjne dla każdego pola (sekcja 9.1)
    - On blur validation
    - Display błędów walidacji
    - Disabled "Zastosuj" gdy błędy

### Faza 5: Komponenty listy i kart (4-5h)

12. **Implementacja `OutfitsList.tsx`**
    - Grid layout responsywny
    - Warunkowe renderowanie (loading/error/empty/data)
    - Integracja z LoadingState, EmptyState, ErrorState

13. **Implementacja `OutfitCard.tsx`**
    - Struktura karty (header, body, footer)
    - Integracja z ReputationBadge
    - Ikony pogody i ubioru
    - Rating display (gwiazdki)
    - Dystans i time ago
    - Click handler

14. **Implementacja `ReputationBadge.tsx`**
    - Badge z kolorami według reputation-config
    - Tooltip z liczbą feedbacków
    - Różne rozmiary (props: size)
    - Opcjonalna etykieta tekstowa

15. **Implementacja `LoadingState.tsx`**
    - Skeleton cards (shadcn Skeleton)
    - Grid identyczny jak OutfitsList
    - 9 skeleton cards z animacją

16. **Implementacja `EmptyState.tsx`**
    - 3 warianty (sekcja 10.3):
      - Brak zestawów w ogóle
      - Zbyt restrykcyjne filtry
      - Zbyt wąski zakres czasu
    - Ilustracja SVG lub ikona
    - Przyciski akcji (Rozszerz promień, Reset filtrów)

### Faza 6: Modal szczegółów (2-3h)

17. **Implementacja `OutfitDetailModal.tsx`**
    - Dialog z shadcn/ui
    - Header (pseudonym + badge + close)
    - Sekcja pogody (pełne dane)
    - Sekcja ubioru (wszystkie 7 stref):
      - Lista z ikonami
      - Dla torso: 3 warstwy (base, mid, outer)
      - Dla feet: skarpety + ochraniacze
    - Sekcja notatek (jeśli istnieją)
    - Footer z metadanymi (aktywność, data, dystans)

18. **Integracja modala z OutfitCard**
    - onClick w OutfitCard → openOutfitDetail(outfit.id)
    - Pass outfit do modal
    - Zarządzanie stanem (isOpen, selectedOutfit)

### Faza 7: Dodatkowe komponenty UI (2h)

19. **Implementacja `ActiveFiltersDisplay.tsx`**
    - Chip'y dla aktywnych filtrów
    - Ikona X do usuwania
    - Przycisk "Wyczyść wszystkie"
    - Tylko filtry różniące się od domyślnych

20. **Implementacja `Pagination.tsx`**
    - Przyciski Previous/Next
    - Numery stron (z elipsą gdy dużo)
    - Info "Strona X z Y"
    - Disabled states

21. **Implementacja header'a widoku**
    - Tytuł "Społeczność"
    - Tab navigation (Przeglądaj / Moje udostępnione)
    - Przycisk Refresh
    - Licznik wyników

### Faza 8: Główny kontener i integracja (2-3h)

22. **Implementacja `CommunityViewContainer.tsx`**
    - Użycie `useCommunityView` hook
    - Layout responsywny (sidebar + main na desktop, vertical na mobile)
    - Przekazanie props do child components
    - Obsługa callbacków (onFiltersChange, onOutfitClick, etc.)
    - Error boundaries

23. **Integracja wszystkich komponentów**
    - CommunityHeader
    - CommunityFiltersPanel
    - ActiveFiltersDisplay
    - OutfitsList
    - Pagination
    - OutfitDetailModal

### Faza 9: Responsywność i mobile UX (3-4h)

24. **Mobile drawer dla filtrów**
    - Przycisk "Filtry" w header (mobile only)
    - Sheet z shadcn/ui otwierany od dołu
    - Filtry w drawer
    - Przyciski "Anuluj" i "Zastosuj"

25. **Responsywny grid**
    - Mobile (< 768px): 1 kolumna
    - Tablet (768-1024px): 2 kolumny
    - Desktop (> 1024px): 3 kolumny

26. **Touch-friendly UI**
    - Większe buttony (min 44x44px)
    - Slider z większymi thumb'ami
    - Łatwiejsze klikanie kart (większe hit areas)

27. **Modal na mobile**
    - Pełny ekran na małych urządzeniach
    - Scrollable content
    - Close button zawsze widoczny (sticky header)

### Faza 10: Obsługa błędów i edge cases (2-3h)

28. **Error boundaries**
    - Główny error boundary dla całego widoku
    - Fallback UI z przyciskiem "Spróbuj ponownie"

29. **Toast notifications**
    - Success toasts (rzadko używane w tym widoku)
    - Error toasts (API errors, validation)
    - Info toasts (użyto domyślnej lokalizacji, etc.)

30. **Graceful degradation**
    - Brak lokalizacji użytkownika → prompt "Dodaj lokalizację"
    - Brak wyników → EmptyState z sugestiami
    - Timeout requestów → komunikat i retry

31. **Defensive programming**
    - Normalizacja danych z API (funkcja `normalizeOutfit`)
    - Fallbacks dla brakujących danych
    - Try-catch bloki w kluczowych miejscach

### Faza 11: Optymalizacje (2h)

32. **Cache strategy**
    - Implementacja cache (sessionStorage lub React Query)
    - TTL 5 minut zgodnie z PRD
    - Cache key bazujący na filtrach

33. **Debouncing**
    - Debounce 500ms dla zmian filtrów (desktop)
    - Immediate dla sortowania i paginacji

34. **Lazy loading**
    - Opcjonalnie: infinite scroll zamiast paginacji
    - Intersection Observer dla lazy load obrazków (jeśli będą)

35. **Performance**
    - Memo dla komponentów które nie muszą re-renderować
    - useMemo dla ciężkich obliczeń
    - useCallback dla funkcji przekazywanych jako props

### Faza 12: Testy i finalizacja (3-4h)

36. **Testy manualne**
    - Test wszystkich interakcji użytkownika
    - Test responsywności na różnych urządzeniach
    - Test walidacji filtrów
    - Test stanów błędów (symulacja 401, 404, 500)
    - Test empty states

37. **Testy automatyczne (opcjonalnie)**
    - Unit testy dla custom hooków
    - Unit testy dla funkcji walidacyjnych
    - Integration testy dla głównych flow
    - E2E test dla krytycznej ścieżki (Vitest/Playwright)

38. **Accessibility audit**
    - Keyboard navigation
    - Screen reader compatibility
    - Focus management (szczególnie w modalu)
    - ARIA labels
    - Color contrast

39. **Code review i refactoring**
    - Przegląd kodu
    - Usunięcie duplikacji
    - Upewnienie się że naming jest consistent
    - Dodanie komentarzy JSDoc gdzie potrzeba

40. **Dokumentacja**
    - README z opisem komponentów
    - Dokumentacja dla przyszłych developerów
    - Screenshots w README
    - Changelog jeśli potrzebny

### Podsumowanie czasowe

| Faza | Opis | Szacowany czas |
|------|------|----------------|
| 1 | Setup i infrastruktura | 2-3h |
| 2 | Strona główna i routing | 1-2h |
| 3 | API client i custom hook | 3-4h |
| 4 | Komponenty filtrów | 4-5h |
| 5 | Komponenty listy i kart | 4-5h |
| 6 | Modal szczegółów | 2-3h |
| 7 | Dodatkowe komponenty UI | 2h |
| 8 | Główny kontener i integracja | 2-3h |
| 9 | Responsywność i mobile UX | 3-4h |
| 10 | Obsługa błędów i edge cases | 2-3h |
| 11 | Optymalizacje | 2h |
| 12 | Testy i finalizacja | 3-4h |
| **TOTAL** | | **30-38h** |

**Zalecany harmonogram:**
- Sprint 1 (tydzień 1): Fazy 1-4 - podstawowa funkcjonalność filtrów
- Sprint 2 (tydzień 2): Fazy 5-8 - lista, karty, modal, integracja
- Sprint 3 (tydzień 3): Fazy 9-12 - mobile, błędy, optymalizacje, testy

---

## Dodatkowe uwagi

### Przyszłe rozszerzenia (post-MVP)

1. **Mapa zestawów**
   - Placeholder w widoku: "Mapa dostępna wkrótce"
   - Integracja z Mapbox/Leaflet
   - Wyświetlanie lokalizacji zestawów jako pinów
   - Klik na pin → modal szczegółów

2. **Zakładka "Moje udostępnione"**
   - Lista własnych shared outfits
   - Możliwość usunięcia (przestań udostępniać)
   - Statystyki: ile razy zobaczono

3. **Porównywanie zestawów**
   - Checkbox na kartach "Dodaj do porównania"
   - Panel porównania (side-by-side) max 3 zestawy

4. **Zapisywanie zestawów jako favorite**
   - Ikona serduszka na karcie
   - Zakładka "Ulubione"

5. **Filtr zaawansowany**
   - Zakres wilgotności
   - Filtr po opadach
   - Filtr po czasie trwania aktywności

### Best practices

- **Accessibility:** Używaj semantic HTML, ARIA labels, keyboard navigation
- **Performance:** Lazy load komponentów, debounce, memo, cache
- **Error handling:** Zawsze graceful degradation, informacyjne komunikaty
- **Code quality:** TypeScript strict, ESLint, Prettier, jednostki testowe
- **UX:** Loading states, empty states, error states, optimistic UI gdzie możliwe
- **Mobile-first:** Projektuj najpierw dla mobile, potem skaluj do desktop

---

**Dokument stworzony:** Październik 2025  
**Wersja:** 1.0  
**Status:** Gotowy do implementacji

