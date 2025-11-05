# Plan implementacji widoku Sprzęt – Lista rowerów

## 1. Przegląd

Widok listy rowerów jest kluczowym elementem modułu zarządzania sprzętem w aplikacji CycleGear. Jego głównym celem jest umożliwienie użytkownikom przeglądania wszystkich swoich rowerów w formie interaktywnych kart, filtrowania ich według statusu i typu, sortowania oraz szybkiego dodawania nowych rowerów. Każda karta roweru prezentuje najważniejsze informacje: nazwę, typ, przebieg, status, informacje o ostatnim serwisie, nadchodzącym serwisie oraz łączny koszt utrzymania.

Widok implementuje wzorzec React Island w kontekście Astro, co zapewnia optymalną wydajność przy zachowaniu pełnej interaktywności tam, gdzie jest potrzebna.

## 2. Routing widoku

**Ścieżka:** `/gear`

**Plik:** `src/pages/gear.astro`

Widok jest dostępny jako osobna strona w aplikacji, z nawigacją z głównego menu (Navbar). Strona implementuje server-side data fetching w Astro dla początkowego renderowania (SSR), a następnie wykorzystuje React Island dla interaktywnej części widoku.

**Struktura pliku:**
```astro
---
// src/pages/gear.astro
import Layout from '../layouts/Layout.astro';
import BikeListView from '../components/gear/BikeListView';

// Server-side auth check
const session = Astro.locals.session;
if (!session) {
  return Astro.redirect('/login');
}
---

<Layout title="Moje rowery - CycleGear">
  <BikeListView client:load userId={session.userId} />
</Layout>
```

## 3. Struktura komponentów

```
src/pages/gear.astro (Astro page)
└── BikeListView (React Island - główny kontener)
    ├── BikeListHeader (React)
    │   ├── PageTitle (React)
    │   ├── AddBikeButton (shadcn Button)
    │   └── BikeListControls (React)
    │       ├── SearchInput (shadcn Input)
    │       ├── StatusFilter (shadcn Select)
    │       ├── TypeFilter (shadcn Select)
    │       └── SortSelect (shadcn Select)
    │
    ├── BikeGrid (React)
    │   ├── BikeCard (React) [wielokrotność]
    │   │   ├── BikeCardImage (React)
    │   │   ├── BikeCardHeader (React)
    │   │   │   ├── BikeTypeIcon (React)
    │   │   │   ├── BikeName (React)
    │   │   │   └── BikeStatusBadge (shadcn Badge)
    │   │   ├── BikeCardStats (React)
    │   │   │   ├── MileageDisplay (React)
    │   │   │   ├── LastServiceInfo (React)
    │   │   │   └── NextServiceInfo (React)
    │   │   └── BikeCardFooter (React)
    │   │       ├── TotalCostDisplay (React)
    │   │       └── ViewDetailsButton (shadcn Button)
    │   └── EmptyState (React)
    │
    ├── AddBikeDialog (shadcn Dialog)
    │   └── BikeForm (React)
    │       ├── BikeNameInput (shadcn Input + Label)
    │       ├── BikeTypeSelect (shadcn Select)
    │       ├── PurchaseDatePicker (shadcn Calendar)
    │       ├── CurrentMileageInput (shadcn Input + Label)
    │       ├── BikeImageUpload (React custom)
    │       ├── NotesTextarea (shadcn Textarea)
    │       └── FormActions (shadcn Button group)
    │
    ├── LoadingState (React - Skeleton)
    └── ErrorState (React)
```

## 4. Szczegóły komponentów

### BikeListView
**Plik:** `src/components/gear/BikeListView.tsx`

**Opis:**
Główny kontener-orkiestrator dla całego widoku. Zarządza stanem globalnym widoku (lista rowerów, filtry, sortowanie, wyszukiwanie, stan modala), wykonuje zapytania API oraz koordynuje wszystkie komponenty potomne. Jest to React Island montowany w Astro z dyrektywą `client:load`.

**Główne elementy:**
- `<div className="container mx-auto px-4 py-8">` - główny kontener z paddingiem
- `<BikeListHeader />` - nagłówek z kontrolkami
- `<BikeGrid />` - siatka kart rowerów
- `<AddBikeDialog />` - modal dodawania roweru
- `<LoadingState />` - skeleton podczas ładowania
- `<ErrorState />` - komunikat błędu

**Obsługiwane interakcje:**
- Montowanie komponentu → fetch początkowej listy rowerów
- Zmiana filtrów → ponowne filtrowanie listy
- Zmiana sortowania → ponowne sortowanie listy
- Wyszukiwanie → filtrowanie po nazwie
- Otwarcie modala dodawania → zmiana stanu `isAddDialogOpen`
- Dodanie roweru → POST /api/bikes → optimistic update → refetch listy

**Obsługiwana walidacja:**
- Brak bezpośredniej walidacji (delegowana do BikeForm)
- Weryfikacja authenticated user (props.userId)

**Typy:**
- `BikeListViewProps` (własny)
- `BikeDTO` (z types.ts)
- `BikesListDTO` (z types.ts)
- `BikeFilters` (własny)
- `SortOption` (własny)

**Propsy:**
```typescript
interface BikeListViewProps {
  userId: string;
}
```

### BikeListHeader
**Plik:** `src/components/gear/BikeListHeader.tsx`

**Opis:**
Komponent nagłówka sekcji zawierający tytuł strony, przycisk dodawania nowego roweru oraz wszystkie kontrolki filtrowania i sortowania. Odpowiada za UX górnej części widoku.

**Główne elementy:**
- `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">` - responsywny kontener flex
- `<PageTitle />` - tytuł "Moje rowery"
- `<AddBikeButton />` - przycisk CTA
- `<BikeListControls />` - kontrolki filtrowania

**Obsługiwane interakcje:**
- Kliknięcie "Dodaj rower" → callback `onAddBikeClick`
- Zmiana filtrów → callback `onFiltersChange`
- Zmiana sortowania → callback `onSortChange`
- Wpisywanie w search → debounced callback `onSearchChange`

**Obsługiwana walidacja:**
- Brak walidacji (komponenty kontrolne)

**Typy:**
- `BikeListHeaderProps` (własny)
- `BikeFilters` (własny)
- `SortOption` (własny)

**Propsy:**
```typescript
interface BikeListHeaderProps {
  totalCount: number;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  onAddBikeClick: () => void;
  onFiltersChange: (filters: BikeFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
}
```

### BikeListControls
**Plik:** `src/components/gear/BikeListControls.tsx`

**Opis:**
Grupuje wszystkie kontrolki do filtrowania (status, typ), sortowania i wyszukiwania. Implementuje responsywny layout: na mobile wertykalnie, na desktop horyzontalnie.

**Główne elementy:**
- `<div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">` - kontener kontrolek
- `<SearchInput />` - pole wyszukiwania (shadcn Input z ikoną)
- `<StatusFilter />` - dropdown statusu (shadcn Select)
- `<TypeFilter />` - dropdown typu (shadcn Select)
- `<SortSelect />` - dropdown sortowania (shadcn Select)

**Obsługiwane interakcje:**
- Zmiana w search input → debounced (300ms) → `onSearchChange(value)`
- Wybór statusu → `onFiltersChange({ ...filters, status: value })`
- Wybór typu → `onFiltersChange({ ...filters, type: value })`
- Wybór sortowania → `onSortChange(value)`

**Obsługiwana walidacja:**
- Brak bezpośredniej walidacji (kontrolki select mają predefiniowane wartości)

**Typy:**
- `BikeListControlsProps` (własny)
- `BikeFilters` (własny)
- `SortOption` (własny)
- `BikeStatusEnum` (z types.ts)
- `BikeTypeEnum` (z types.ts)

**Propsy:**
```typescript
interface BikeListControlsProps {
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  onFiltersChange: (filters: BikeFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
}
```

### BikeGrid
**Plik:** `src/components/gear/BikeGrid.tsx`

**Opis:**
Komponent siatki wyświetlający karty rowerów. Obsługuje responsywny grid layout (1 kolumna na mobile, 2 na tablet, 3 na desktop). Renderuje EmptyState gdy brak rowerów.

**Główne elementy:**
- `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">` - responsywna siatka
- `{bikes.map(bike => <BikeCard key={bike.id} bike={bike} />)}` - mapowanie kart
- `{bikes.length === 0 && <EmptyState />}` - pusty stan

**Obsługiwane interakcje:**
- Kliknięcie karty → nawigacja do `/gear/${bikeId}` (przekazane przez BikeCard)

**Obsługiwana walidacja:**
- Brak walidacji (komponenty prezentacyjne)

**Typy:**
- `BikeGridProps` (własny)
- `BikeDTO` (z types.ts)

**Propsy:**
```typescript
interface BikeGridProps {
  bikes: BikeDTO[];
  isLoading: boolean;
  onBikeClick: (bikeId: string) => void;
}
```

### BikeCard
**Plik:** `src/components/gear/BikeCard.tsx`

**Opis:**
Karta pojedynczego roweru wyświetlająca wszystkie kluczowe informacje: miniaturę/placeholder, nazwę, typ z ikoną, status badge, przebieg, ostatni serwis, najbliższy serwis, liczbę aktywnych przypomnień oraz łączny koszt. Karta jest interaktywna (hover effect, cursor pointer) i klikalalna.

**Główne elementy:**
- `<Card className="cursor-pointer hover:shadow-lg transition-shadow">` - shadcn Card z hover effect
- `<BikeCardImage />` - obrazek roweru lub placeholder
- `<BikeCardHeader />` - górna część: ikona typu, nazwa, badge statusu
- `<CardContent>` - środkowa część z informacjami:
  - `<BikeCardStats />` - przebieg, ostatni serwis, najbliższy serwis
  - Liczba aktywnych przypomnień (Badge z numerem)
- `<CardFooter>` - dolna część: łączny koszt + przycisk "Zobacz szczegóły"

**Obsługiwane interakcje:**
- Kliknięcie karty (dowolne miejsce) → `onClick()` → nawigacja do `/gear/${bike.id}`
- Hover → zmiana shadow/elevation (Tailwind transition)

**Obsługiwana walidacja:**
- Brak walidacji (komponent prezentacyjny)

**Typy:**
- `BikeCardProps` (własny)
- `BikeDTO` (z types.ts)
- `NextServiceInfo` (z types.ts)
- `ReminderStatusEnum` (z types.ts)

**Propsy:**
```typescript
interface BikeCardProps {
  bike: BikeDTO;
  onClick: (bikeId: string) => void;
}
```

### BikeCardStats
**Plik:** `src/components/gear/BikeCardStats.tsx`

**Opis:**
Komponent wyświetlający kluczowe statystyki roweru w czytelnej formie z ikonami: przebieg, informacje o ostatnim serwisie (data + typ) oraz najbliższy serwis (typ + pozostałe km + status badge).

**Główne elementy:**
- `<div className="space-y-3">` - kontener ze spacingiem
- `<MileageDisplay />` - ikona + przebieg w km
- `<LastServiceInfo />` - ikona + data + typ ostatniego serwisu
- `<NextServiceInfo />` - ikona + typ + km remaining + status badge (upcoming/overdue)

**Obsługiwane interakcje:**
- Brak interakcji (komponent prezentacyjny)

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- `BikeCardStatsProps` (własny)
- `BikeDTO` (z types.ts)
- `NextServiceInfo` (z types.ts)

**Propsy:**
```typescript
interface BikeCardStatsProps {
  currentMileage: number | null;
  lastServiceDate: string | null;
  lastServiceType: string | null;
  nextService: NextServiceInfo | null;
}
```

### AddBikeDialog
**Plik:** `src/components/gear/AddBikeDialog.tsx`

**Opis:**
Modal (Dialog) zawierający formularz dodawania nowego roweru. Wykorzystuje shadcn Dialog component. Obsługuje otwarcie/zamknięcie, walidację formularza oraz komunikację z API.

**Główne elementy:**
- `<Dialog open={open} onOpenChange={onOpenChange}>` - shadcn Dialog
- `<DialogContent>` - kontener contentu
- `<DialogHeader>` - tytuł "Dodaj nowy rower"
- `<BikeForm />` - formularz
- `<DialogFooter>` - przyciski akcji (Anuluj, Dodaj rower)

**Obsługiwane interakcje:**
- Zamknięcie modala → `onOpenChange(false)` → reset formularza
- Submit formularza → walidacja → POST /api/bikes → callback `onSuccess` → zamknięcie
- Przycisk "Anuluj" → zamknięcie bez zapisywania

**Obsługiwana walidacja:**
- Delegowana do BikeForm (Zod schema validation)

**Typy:**
- `AddBikeDialogProps` (własny)
- `CreateBikeCommand` (z types.ts)
- `BikeDTO` (z types.ts)

**Propsy:**
```typescript
interface AddBikeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (bike: BikeDTO) => void;
}
```

### BikeForm
**Plik:** `src/components/gear/BikeForm.tsx`

**Opis:**
Formularz dodawania/edycji roweru z pełną walidacją Zod. Wykorzystuje React Hook Form + Zod resolver. Zawiera wszystkie pola zgodnie z CreateBikeCommand: nazwa (required), typ (required), data zakupu (optional), przebieg (optional, default 0), zdjęcie (optional, max 5MB), notatki (optional).

**Główne elementy:**
- `<Form {...form}>` - React Hook Form wrapper
- `<FormField name="name">` - pole nazwy (Input, max 50 znaków, required)
- `<FormField name="type">` - dropdown typu (Select: szosowy/gravelowy/mtb/czasowy, required)
- `<FormField name="purchase_date">` - date picker (Calendar, optional)
- `<FormField name="current_mileage">` - pole przebiegu (Input type="number", default 0)
- `<FormField name="image">` - upload zdjęcia (custom FileInput, max 5MB, optional)
- `<FormField name="notes">` - pole notatek (Textarea, optional)
- `<Button type="submit">` - przycisk submitu

**Obsługiwane interakcje:**
- Wypełnianie pól → walidacja on blur/on change
- Submit → pełna walidacja → jeśli OK: `onSubmit(data)`, jeśli błąd: wyświetlenie błędów
- Upload zdjęcia → walidacja rozmiaru (max 5MB) i typu (image/*)

**Obsługiwana walidacja:**
Szczegółowa walidacja Zod (CreateBikeSchema):
```typescript
CreateBikeSchema = z.object({
  name: z.string()
    .min(1, "Nazwa jest wymagana")
    .max(50, "Nazwa może mieć maksymalnie 50 znaków"),
  type: z.enum(["szosowy", "gravelowy", "mtb", "czasowy"], {
    required_error: "Typ roweru jest wymagany"
  }),
  purchase_date: z.string().date().optional(),
  current_mileage: z.number()
    .int("Przebieg musi być liczbą całkowitą")
    .min(0, "Przebieg nie może być ujemny")
    .default(0)
    .optional(),
  notes: z.string().max(500, "Notatki mogą mieć maksymalnie 500 znaków").optional(),
  // image handling done separately (file upload validation)
})
```

Walidacja zdjęcia (poza Zod, w handleru upload):
- Typ pliku: tylko image/* (image/jpeg, image/png, image/webp)
- Rozmiar: max 5MB (5 * 1024 * 1024 bytes)
- Format: wyświetlenie błędu jako FormMessage

**Typy:**
- `BikeFormProps` (własny)
- `CreateBikeCommand` (z types.ts)
- `BikeTypeEnum` (z types.ts)

**Propsy:**
```typescript
interface BikeFormProps {
  onSubmit: (data: CreateBikeCommand) => Promise<void>;
  isSubmitting: boolean;
  defaultValues?: Partial<CreateBikeCommand>;
}
```

### EmptyState
**Plik:** `src/components/gear/EmptyState.tsx`

**Opis:**
Komponent wyświetlany gdy użytkownik nie ma jeszcze żadnych rowerów lub gdy filtry nie zwróciły żadnych wyników. Zawiera grafikę SVG (ikona roweru), tytuł, opis oraz przycisk CTA do dodania pierwszego roweru.

**Główne elementy:**
- `<div className="flex flex-col items-center justify-center py-12 px-4">` - wycentrowany kontener
- `<BikeIconSVG className="w-24 h-24 text-gray-400" />` - ikona
- `<h3 className="text-lg font-semibold text-gray-900">` - tytuł "Nie masz jeszcze rowerów"
- `<p className="text-sm text-gray-500">` - opis "Dodaj swój pierwszy rower, aby..."
- `<Button onClick={onAddBikeClick}>` - przycisk "Dodaj pierwszy rower"

**Obsługiwane interakcje:**
- Kliknięcie przycisku → callback `onAddBikeClick` → otwarcie modala

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- `EmptyStateProps` (własny)

**Propsy:**
```typescript
interface EmptyStateProps {
  hasFilters: boolean; // czy są aktywne filtry (różny tekst)
  onAddBikeClick: () => void;
}
```

### LoadingState
**Plik:** `src/components/gear/LoadingState.tsx`

**Opis:**
Komponent skeleton screen wyświetlany podczas ładowania listy rowerów. Implementuje Skeleton z shadcn/ui do stworzenia placeholder kart rowerów (zwykle 3-6 sztuk).

**Główne elementy:**
- `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">` - grid jak w BikeGrid
- `{Array.from({ length: 6 }).map(() => <BikeCardSkeleton />)}` - placeholder karty

**BikeCardSkeleton:**
- `<Card>` z Skeleton dla każdego elementu:
  - `<Skeleton className="h-48 w-full" />` - obrazek
  - `<Skeleton className="h-6 w-3/4" />` - nazwa
  - `<Skeleton className="h-4 w-1/2" />` - typ
  - `<Skeleton className="h-4 w-full" />` - statystyki (kilka linii)

**Obsługiwane interakcje:**
- Brak interakcji

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- Brak propsów

**Propsy:**
```typescript
interface LoadingStateProps {}
```

### ErrorState
**Plik:** `src/components/gear/ErrorState.tsx`

**Opis:**
Komponent wyświetlany gdy wystąpi błąd podczas pobierania listy rowerów (np. błąd sieci, błąd serwera 500). Zawiera ikonę błędu, komunikat oraz przycisk "Spróbuj ponownie".

**Główne elementy:**
- `<div className="flex flex-col items-center justify-center py-12 px-4">` - wycentrowany kontener
- `<AlertCircle className="w-16 h-16 text-red-500" />` - ikona błędu (lucide-react)
- `<h3 className="text-lg font-semibold text-gray-900">` - tytuł "Wystąpił błąd"
- `<p className="text-sm text-gray-500">` - opis błędu
- `<Button onClick={onRetry} variant="outline">` - przycisk "Spróbuj ponownie"

**Obsługiwane interakcje:**
- Kliknięcie "Spróbuj ponownie" → callback `onRetry` → ponowne wywołanie fetch

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- `ErrorStateProps` (własny)

**Propsy:**
```typescript
interface ErrorStateProps {
  error: Error | string;
  onRetry: () => void;
}
```

## 5. Typy

### Typy istniejące (z `src/types.ts`):

```typescript
// Typy już zdefiniowane w projekcie:
BikeDTO - pełny obiekt roweru z computed fields
BikesListDTO - odpowiedź GET /api/bikes
CreateBikeCommand - dane do utworzenia roweru
UpdateBikeCommand - dane do aktualizacji roweru
BikeTypeEnum - enum typu roweru: "szosowy" | "gravelowy" | "mtb" | "czasowy"
BikeStatusEnum - enum statusu: "active" | "archived" | "sold"
ServiceTypeEnum - enum typów serwisu
ReminderStatusEnum - enum statusów przypomnienia: "active" | "completed" | "overdue" | "upcoming"
NextServiceInfo - informacje o najbliższym serwisie
GetBikesParams - query params dla GET /api/bikes
```

### Nowe typy do zdefiniowania (ViewModel):

**Plik:** `src/components/gear/types.ts`

```typescript
import type {
  BikeDTO,
  BikeStatusEnum,
  BikeTypeEnum,
} from "../../types";

/**
 * Filtry dla listy rowerów
 */
export interface BikeFilters {
  status: BikeStatusEnum | "all"; // "all" dla braku filtra
  type: BikeTypeEnum | "all"; // "all" dla braku filtra
}

/**
 * Opcje sortowania listy rowerów
 */
export type SortOption =
  | "name_asc"
  | "name_desc"
  | "mileage_asc"
  | "mileage_desc"
  | "created_at_asc"
  | "created_at_desc";

/**
 * Stan widoku listy rowerów
 */
export interface BikeListState {
  bikes: BikeDTO[];
  filteredBikes: BikeDTO[];
  isLoading: boolean;
  error: Error | null;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  isAddDialogOpen: boolean;
}

/**
 * Metadata wyświetlania kart rowerów
 */
export interface BikeCardDisplayData {
  id: string;
  name: string;
  type: BikeTypeEnum;
  typeIcon: string; // nazwa ikony z lucide-react
  typeLabel: string; // polskie oznaczenie
  status: BikeStatusEnum;
  statusBadgeVariant: "default" | "secondary" | "outline"; // wariant Badge
  statusLabel: string; // polskie oznaczenie
  currentMileage: number;
  mileageFormatted: string; // np. "5 420 km"
  lastService: {
    date: string | null;
    dateFormatted: string | null; // np. "15 maja 2024"
    type: string | null;
    typeLabel: string | null; // polskie oznaczenie
  } | null;
  nextService: {
    type: string;
    typeLabel: string; // polskie oznaczenie
    targetMileage: number;
    kmRemaining: number;
    kmRemainingFormatted: string; // np. "Za 580 km"
    status: ReminderStatusEnum;
    statusBadgeVariant: "default" | "warning" | "destructive";
    statusLabel: string; // "Wkrótce" | "Do zrobienia" | "Przeterminowane"
  } | null;
  activeRemindersCount: number;
  totalCost: number;
  totalCostFormatted: string; // np. "1 250,50 zł"
  hasImage: boolean;
  imagePlaceholder: string; // URL lub ścieżka do placeholder
}

/**
 * Dane dla select/dropdown typów roweru
 */
export interface BikeTypeOption {
  value: BikeTypeEnum | "all";
  label: string; // polskie oznaczenie
  icon: string; // nazwa ikony z lucide-react
}

/**
 * Dane dla select/dropdown statusów roweru
 */
export interface BikeStatusOption {
  value: BikeStatusEnum | "all";
  label: string; // polskie oznaczenie
}

/**
 * Dane dla select/dropdown sortowania
 */
export interface SortOptionData {
  value: SortOption;
  label: string; // polskie oznaczenie
}

/**
 * Hook state dla zarządzania listą rowerów
 */
export interface UseBikeListReturn {
  bikes: BikeDTO[];
  displayBikes: BikeCardDisplayData[]; // przetworzone do wyświetlenia
  isLoading: boolean;
  error: Error | null;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  totalCount: number;
  isAddDialogOpen: boolean;
  setFilters: (filters: BikeFilters) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  addBike: (data: CreateBikeCommand) => Promise<void>;
  refetchBikes: () => Promise<void>;
  handleBikeClick: (bikeId: string) => void;
}
```

### Funkcje pomocnicze (utils):

**Plik:** `src/components/gear/utils.ts`

```typescript
import type { BikeDTO, BikeTypeEnum, BikeStatusEnum, ServiceTypeEnum, ReminderStatusEnum } from "../../types";
import type { BikeCardDisplayData, SortOption } from "./types";

/**
 * Mapowanie typu roweru na ikonę (lucide-react)
 */
export const bikeTypeToIcon = (type: BikeTypeEnum): string => {
  const iconMap: Record<BikeTypeEnum, string> = {
    szosowy: "Bike",
    gravelowy: "Mountain",
    mtb: "TreePine",
    czasowy: "Zap",
  };
  return iconMap[type];
};

/**
 * Mapowanie typu roweru na polską etykietę
 */
export const bikeTypeToLabel = (type: BikeTypeEnum): string => {
  const labelMap: Record<BikeTypeEnum, string> = {
    szosowy: "Szosowy",
    gravelowy: "Gravelowy",
    mtb: "MTB",
    czasowy: "Czasowy",
  };
  return labelMap[type];
};

/**
 * Mapowanie statusu roweru na polską etykietę
 */
export const bikeStatusToLabel = (status: BikeStatusEnum): string => {
  const labelMap: Record<BikeStatusEnum, string> = {
    active: "Aktywny",
    archived: "Zarchiwizowany",
    sold: "Sprzedany",
  };
  return labelMap[status];
};

/**
 * Mapowanie statusu roweru na wariant Badge
 */
export const bikeStatusToBadgeVariant = (
  status: BikeStatusEnum
): "default" | "secondary" | "outline" => {
  const variantMap: Record<BikeStatusEnum, "default" | "secondary" | "outline"> = {
    active: "default",
    archived: "secondary",
    sold: "outline",
  };
  return variantMap[status];
};

/**
 * Mapowanie typu serwisu na polską etykietę
 */
export const serviceTypeToLabel = (type: ServiceTypeEnum): string => {
  const labelMap: Record<ServiceTypeEnum, string> = {
    lancuch: "Łańcuch",
    kaseta: "Kaseta",
    klocki_przod: "Klocki przód",
    klocki_tyl: "Klocki tył",
    opony: "Opony",
    przerzutki: "Przerzutki",
    hamulce: "Hamulce",
    przeglad_ogolny: "Przegląd ogólny",
    inne: "Inne",
  };
  return labelMap[type];
};

/**
 * Mapowanie statusu przypomnienia na polską etykietę
 */
export const reminderStatusToLabel = (status: ReminderStatusEnum): string => {
  const labelMap: Record<ReminderStatusEnum, string> = {
    active: "Aktywne",
    upcoming: "Wkrótce",
    overdue: "Przeterminowane",
    completed: "Zakończone",
  };
  return labelMap[status];
};

/**
 * Mapowanie statusu przypomnienia na wariant Badge
 */
export const reminderStatusToBadgeVariant = (
  status: ReminderStatusEnum
): "default" | "warning" | "destructive" => {
  const variantMap: Record<ReminderStatusEnum, "default" | "warning" | "destructive"> = {
    active: "default",
    upcoming: "warning",
    overdue: "destructive",
    completed: "default",
  };
  return variantMap[status];
};

/**
 * Formatowanie liczby z separatorami tysięcy
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("pl-PL").format(value);
};

/**
 * Formatowanie przebiegu (km)
 */
export const formatMileage = (km: number | null): string => {
  if (km === null || km === 0) return "0 km";
  return `${formatNumber(km)} km`;
};

/**
 * Formatowanie kosztu (PLN)
 */
export const formatCost = (amount: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
};

/**
 * Formatowanie daty
 */
export const formatDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

/**
 * Formatowanie pozostałych kilometrów do serwisu
 */
export const formatKmRemaining = (km: number): string => {
  if (km <= 0) return "Przeterminowane";
  return `Za ${formatNumber(km)} km`;
};

/**
 * Transformacja BikeDTO do BikeCardDisplayData
 */
export const transformBikeToDisplayData = (
  bike: BikeDTO
): BikeCardDisplayData => {
  return {
    id: bike.id,
    name: bike.name,
    type: bike.type,
    typeIcon: bikeTypeToIcon(bike.type),
    typeLabel: bikeTypeToLabel(bike.type),
    status: bike.status || "active",
    statusBadgeVariant: bikeStatusToBadgeVariant(bike.status || "active"),
    statusLabel: bikeStatusToLabel(bike.status || "active"),
    currentMileage: bike.current_mileage || 0,
    mileageFormatted: formatMileage(bike.current_mileage),
    lastService: null, // TODO: implement when service data available
    nextService: bike.next_service
      ? {
          type: bike.next_service.service_type,
          typeLabel: serviceTypeToLabel(bike.next_service.service_type),
          targetMileage: bike.next_service.target_mileage,
          kmRemaining: bike.next_service.km_remaining,
          kmRemainingFormatted: formatKmRemaining(bike.next_service.km_remaining),
          status: bike.next_service.status,
          statusBadgeVariant: reminderStatusToBadgeVariant(bike.next_service.status),
          statusLabel: reminderStatusToLabel(bike.next_service.status),
        }
      : null,
    activeRemindersCount: bike.active_reminders_count,
    totalCost: bike.total_cost,
    totalCostFormatted: formatCost(bike.total_cost),
    hasImage: false, // TODO: implement when image handling ready
    imagePlaceholder: "/placeholder-bike.svg",
  };
};

/**
 * Filtrowanie rowerów według filtrów
 */
export const filterBikes = (
  bikes: BikeDTO[],
  filters: BikeFilters,
  searchQuery: string
): BikeDTO[] => {
  let filtered = bikes;

  // Filtr statusu
  if (filters.status !== "all") {
    filtered = filtered.filter((bike) => bike.status === filters.status);
  }

  // Filtr typu
  if (filters.type !== "all") {
    filtered = filtered.filter((bike) => bike.type === filters.type);
  }

  // Wyszukiwanie po nazwie
  if (searchQuery.trim() !== "") {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((bike) =>
      bike.name.toLowerCase().includes(query)
    );
  }

  return filtered;
};

/**
 * Sortowanie rowerów
 */
export const sortBikes = (
  bikes: BikeDTO[],
  sortBy: SortOption
): BikeDTO[] => {
  const sorted = [...bikes];

  switch (sortBy) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pl"));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "pl"));
    case "mileage_asc":
      return sorted.sort(
        (a, b) => (a.current_mileage || 0) - (b.current_mileage || 0)
      );
    case "mileage_desc":
      return sorted.sort(
        (a, b) => (b.current_mileage || 0) - (a.current_mileage || 0)
      );
    case "created_at_asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      );
    case "created_at_desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    default:
      return sorted;
  }
};
```

## 6. Zarządzanie stanem

### Główny stan widoku

Stan widoku jest zarządzany w głównym komponencie `BikeListView` poprzez dedykowany custom hook `useBikeList`. Hook ten enkapsuluje całą logikę biznesową, wywołania API, filtrowanie, sortowanie i wyszukiwanie.

**Plik hooka:** `src/components/gear/hooks/useBikeList.ts`

```typescript
import { useState, useEffect, useMemo, useCallback } from "react";
import type { BikeDTO, CreateBikeCommand } from "../../../types";
import type { BikeFilters, SortOption, UseBikeListReturn, BikeCardDisplayData } from "../types";
import { filterBikes, sortBikes, transformBikeToDisplayData } from "../utils";
import { fetchBikes, createBike } from "../../../lib/api/bikes";
import { useToast } from "../../../hooks/use-toast";

const DEFAULT_FILTERS: BikeFilters = {
  status: "all",
  type: "all",
};

const DEFAULT_SORT: SortOption = "name_asc";

export const useBikeList = (userId: string): UseBikeListReturn => {
  // Raw data from API
  const [bikes, setBikes] = useState<BikeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // UI state
  const [filters, setFilters] = useState<BikeFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { toast } = useToast();

  // Fetch bikes from API
  const fetchBikesData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchBikes({ status: undefined, type: undefined });
      setBikes(result.bikes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bikes"));
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać listy rowerów",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchBikesData();
  }, [fetchBikesData]);

  // Computed: filtered and sorted bikes
  const filteredAndSortedBikes = useMemo(() => {
    const filtered = filterBikes(bikes, filters, searchQuery);
    const sorted = sortBikes(filtered, sortBy);
    return sorted;
  }, [bikes, filters, searchQuery, sortBy]);

  // Computed: display data
  const displayBikes = useMemo(() => {
    return filteredAndSortedBikes.map(transformBikeToDisplayData);
  }, [filteredAndSortedBikes]);

  // Dialog handlers
  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const closeAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  // Add bike handler
  const addBike = useCallback(
    async (data: CreateBikeCommand) => {
      try {
        const newBike = await createBike(data);

        // Optimistic update
        setBikes((prev) => [newBike, ...prev]);

        toast({
          title: "Sukces",
          description: `Rower "${newBike.name}" został dodany`,
        });

        closeAddDialog();

        // Refetch to ensure consistency
        await fetchBikesData();
      } catch (err) {
        toast({
          title: "Błąd",
          description: "Nie udało się dodać roweru",
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast, closeAddDialog, fetchBikesData]
  );

  // Navigate to bike details
  const handleBikeClick = useCallback((bikeId: string) => {
    window.location.href = `/gear/${bikeId}`;
  }, []);

  return {
    bikes,
    displayBikes,
    isLoading,
    error,
    filters,
    sortBy,
    searchQuery,
    totalCount: filteredAndSortedBikes.length,
    isAddDialogOpen,
    setFilters,
    setSortBy,
    setSearchQuery,
    openAddDialog,
    closeAddDialog,
    addBike,
    refetchBikes: fetchBikesData,
    handleBikeClick,
  };
};
```

### Lokalne stany komponentów

**BikeForm:**
- Zarządzany przez React Hook Form (`useForm`)
- Stan formularza: wartości pól, błędy walidacji, stan submitu
- Zod schema resolver dla walidacji

**BikeListControls:**
- Debounced search input (używa `useDebouncedValue` hook)
- Lokalny stan inputu przed debounce

## 7. Integracja API

### API Client Functions

**Plik:** `src/lib/api/bikes.ts`

```typescript
import type {
  BikeDTO,
  BikesListDTO,
  CreateBikeCommand,
  UpdateBikeCommand,
  GetBikesParams,
} from "../../types";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || "/api";

/**
 * Fetch all bikes for authenticated user
 */
export async function fetchBikes(
  params?: GetBikesParams
): Promise<BikesListDTO> {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append("status", params.status);
  }
  if (params?.type) {
    queryParams.append("type", params.type);
  }

  const url = `${API_BASE_URL}/bikes${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch bikes");
  }

  return response.json();
}

/**
 * Create new bike
 */
export async function createBike(
  data: CreateBikeCommand
): Promise<BikeDTO> {
  const response = await fetch(`${API_BASE_URL}/bikes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Validation error"
      );
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create bike");
  }

  return response.json();
}

/**
 * Update existing bike
 */
export async function updateBike(
  bikeId: string,
  data: UpdateBikeCommand
): Promise<BikeDTO> {
  const response = await fetch(`${API_BASE_URL}/bikes/${bikeId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Bike not found");
    }
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || "Validation error"
      );
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update bike");
  }

  return response.json();
}

/**
 * Delete bike
 */
export async function deleteBike(bikeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bikes/${bikeId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Bike not found");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete bike");
  }
}
```

### Użycie w komponencie

```typescript
// W useBikeList hook:
import { fetchBikes, createBike } from "../../../lib/api/bikes";

// Fetch:
const result = await fetchBikes({ status: undefined, type: undefined });
// Typ result: BikesListDTO

// Create:
const newBike = await createBike(data);
// Typ data: CreateBikeCommand
// Typ newBike: BikeDTO
```

## 8. Interakcje użytkownika

### 1. Przeglądanie listy rowerów

**Flow:**
1. Użytkownik wchodzi na `/gear`
2. System wykonuje SSR check autentykacji w Astro
3. Komponent `BikeListView` montuje się i wywołuje `useBikeList(userId)`
4. Hook wykonuje `fetchBikesData()` → GET /api/bikes
5. Podczas ładowania wyświetla się `<LoadingState />` (skeleton cards)
6. Po otrzymaniu danych renderuje się `<BikeGrid>` z kartami rowerów
7. Każda karta wyświetla: obraz, nazwę, typ, status, przebieg, ostatni serwis, najbliższy serwis, przypomnienia, koszt

**Interakcje:**
- Hover na karcie → shadow effect (Tailwind transition)
- Kliknięcie karty → nawigacja do `/gear/${bikeId}`

### 2. Filtrowanie listy

**Flow:**
1. Użytkownik klika dropdown "Status" w `<BikeListControls>`
2. Wybiera wartość (Wszystkie/Aktywny/Zarchiwizowany/Sprzedany)
3. Callback `onFiltersChange({ ...filters, status: value })`
4. Hook `useBikeList` aktualizuje stan `filters`
5. `useMemo` przelicza `filteredAndSortedBikes` automatycznie
6. `<BikeGrid>` rerenderuje się z nowymi danymi
7. Jeśli brak wyników → wyświetla `<EmptyState hasFilters={true} />`

**Analogicznie dla filtra typu roweru.**

### 3. Wyszukiwanie po nazwie

**Flow:**
1. Użytkownik wpisuje tekst w `<SearchInput>` w `<BikeListControls>`
2. Input jest debounced (300ms) → callback `onSearchChange(value)` po 300ms od ostatniego znaku
3. Hook aktualizuje `searchQuery`
4. `useMemo` filtruje rowery po nazwie (case-insensitive)
5. Lista aktualizuje się automatycznie

### 4. Sortowanie

**Flow:**
1. Użytkownik klika dropdown "Sortuj" w `<BikeListControls>`
2. Wybiera opcję (Nazwa A-Z, Nazwa Z-A, Przebieg rosnąco, Przebieg malejąco, Data dodania...)
3. Callback `onSortChange(value)`
4. Hook aktualizuje `sortBy`
5. `useMemo` sortuje przefiltrowaną listę
6. Lista renderuje się w nowej kolejności

### 5. Dodawanie roweru

**Flow:**
1. Użytkownik klika przycisk "Dodaj rower" w `<BikeListHeader>` lub w `<EmptyState>`
2. Callback `openAddDialog()`
3. Hook ustawia `isAddDialogOpen = true`
4. `<AddBikeDialog>` renderuje się (shadcn Dialog otwiera się z animacją)
5. Użytkownik wypełnia formularz `<BikeForm>`:
   - Nazwa (required, walidacja on blur)
   - Typ (required, dropdown)
   - Data zakupu (optional, date picker)
   - Przebieg (optional, default 0)
   - Zdjęcie (optional, file upload)
   - Notatki (optional, textarea)
6. Użytkownik klika "Dodaj rower"
7. React Hook Form wywołuje walidację Zod
8. Jeśli błędy → wyświetlają się pod polami (FormMessage)
9. Jeśli OK → wywołuje `onSubmit(data)`
10. Hook wywołuje `addBike(data)`
11. Funkcja `addBike`:
    - Wywołuje POST /api/bikes z danymi
    - Podczas requestu: przycisk submit pokazuje loader, jest disabled
    - Jeśli sukces (201):
      - Optimistic update: `setBikes((prev) => [newBike, ...prev])`
      - Toast success: "Rower '{name}' został dodany"
      - `closeAddDialog()` → modal zamyka się
      - `fetchBikesData()` → refetch dla pewności (w tle)
    - Jeśli błąd (400/422/500):
      - Toast error: "Nie udało się dodać roweru"
      - Modal pozostaje otwarty
      - Użytkownik może poprawić dane i spróbować ponownie

### 6. Obsługa błędów pobierania

**Flow:**
1. Podczas `fetchBikesData()` wystąpił błąd (np. błąd sieci, 500)
2. Hook ustawia `error = Error` i `isLoading = false`
3. Wyświetla się `<ErrorState error={error} onRetry={refetchBikes} />`
4. Użytkownik klika "Spróbuj ponownie"
5. Callback `onRetry()` → wywołuje `refetchBikes()` → ponowny fetch

### 7. Pusty stan

**Flow:**
1. Użytkownik nie ma jeszcze żadnych rowerów (nowy account)
2. `bikes.length === 0` i `!isLoading` i `!error`
3. `<BikeGrid>` renderuje `<EmptyState hasFilters={false} onAddBikeClick={openAddDialog} />`
4. EmptyState pokazuje: ikonę, tekst "Nie masz jeszcze rowerów", przycisk "Dodaj pierwszy rower"
5. Kliknięcie przycisku → otwiera modal jak w punkcie 5

## 9. Warunki i walidacja

### Warunki weryfikowane przez interfejs

#### 1. Autentykacja (na poziomie strony)
**Komponent:** `gear.astro`
**Warunek:** Użytkownik musi być zalogowany
**Weryfikacja:**
```typescript
const session = Astro.locals.session;
if (!session) {
  return Astro.redirect('/login');
}
```
**Wpływ na UI:** Niezalogowani użytkownicy są przekierowywani na `/login`

#### 2. Stan ładowania
**Komponent:** `BikeListView`
**Warunek:** `isLoading === true`
**Weryfikacja:** Hook `useBikeList` zwraca stan `isLoading`
**Wpływ na UI:** Renderowanie `<LoadingState />` (skeleton cards) zamiast `<BikeGrid>`

#### 3. Stan błędu
**Komponent:** `BikeListView`
**Warunek:** `error !== null`
**Weryfikacja:** Hook `useBikeList` zwraca `error` jeśli fetch się nie powiódł
**Wpływ na UI:** Renderowanie `<ErrorState />` z przyciskiem retry

#### 4. Pusty stan (brak rowerów)
**Komponent:** `BikeGrid`
**Warunek:** `bikes.length === 0 && !isLoading && !error`
**Weryfikacja:** Sprawdzenie długości tablicy
**Wpływ na UI:** Renderowanie `<EmptyState />` z CTA do dodania pierwszego roweru

#### 5. Pusty stan (brak wyników filtrowania)
**Komponent:** `BikeGrid`
**Warunek:** `filteredBikes.length === 0` ale `bikes.length > 0`
**Weryfikacja:** Sprawdzenie długości przefiltrowanej tablicy
**Wpływ na UI:** `<EmptyState hasFilters={true} />` - inny tekst: "Brak rowerów spełniających kryteria"

#### 6. Wyświetlanie next service
**Komponent:** `BikeCardStats`
**Warunek:** `bike.next_service !== null`
**Weryfikacja:** Sprawdzenie czy obiekt istnieje
**Wpływ na UI:** 
- Jeśli istnieje → wyświetl sekcję "Najbliższy serwis" z badge statusu
- Jeśli nie → wyświetl "Brak zaplanowanych serwisów"

#### 7. Status przypomnienia (badge variant)
**Komponent:** `BikeCardStats` (NextServiceInfo)
**Warunek:** `bike.next_service.status`
**Weryfikacja:** Mapowanie przez `reminderStatusToBadgeVariant()`
**Wpływ na UI:**
- `upcoming` → żółty badge "Wkrótce"
- `overdue` → czerwony badge "Przeterminowane"
- `active` → niebieski badge "Aktywne"

#### 8. Licznik aktywnych przypomnień
**Komponent:** `BikeCard`
**Warunek:** `bike.active_reminders_count > 0`
**Weryfikacja:** Sprawdzenie wartości licznika
**Wpływ na UI:**
- Jeśli > 0 → wyświetl Badge z liczbą i ikoną dzwonka
- Jeśli 0 → nie wyświetlaj sekcji

### Walidacja formularza dodawania roweru

#### 1. Nazwa roweru (required)
**Komponent:** `BikeForm`
**Pole:** `name`
**Warunki:**
- Nie może być puste (`.min(1, "Nazwa jest wymagana")`)
- Maksymalnie 50 znaków (`.max(50, "Nazwa może mieć maksymalnie 50 znaków")`)

**Weryfikacja:** Zod schema + React Hook Form
**Wpływ na UI:**
- Błąd wyświetla się pod polem jako `<FormMessage>` (czerwony tekst)
- Pole ma czerwone obramowanie (Tailwind `border-red-500`)
- Submit jest zablokowany jeśli walidacja nie przeszła

#### 2. Typ roweru (required)
**Komponent:** `BikeForm`
**Pole:** `type`
**Warunki:**
- Musi być wybrana jedna z wartości: szosowy|gravelowy|mtb|czasowy
- Enum validation (`.enum(["szosowy", "gravelowy", "mtb", "czasowy"])`)

**Weryfikacja:** Zod schema
**Wpływ na UI:** 
- Select nie pozwala na pusty wybór (first option disabled)
- Komunikat "Typ roweru jest wymagany" jeśli nie wybrano

#### 3. Data zakupu (optional)
**Komponent:** `BikeForm`
**Pole:** `purchase_date`
**Warunki:**
- Optional (`.optional()`)
- Jeśli podana → musi być valid date string (`.string().date()`)
- Nie może być w przyszłości (dodatkowa walidacja)

**Weryfikacja:** Zod + custom validation
**Wpływ na UI:** Komunikat błędu jeśli data jest invalid lub w przyszłości

#### 4. Przebieg (optional)
**Komponent:** `BikeForm`
**Pole:** `current_mileage`
**Warunki:**
- Optional, default 0
- Musi być liczbą całkowitą (`.int("Przebieg musi być liczbą całkowitą")`)
- Nie może być ujemna (`.min(0, "Przebieg nie może być ujemny")`)
- Maksymalnie 999999 km (sensowny limit)

**Weryfikacja:** Zod schema
**Wpływ na UI:** 
- Input type="number" z min="0" step="1"
- Komunikat błędu jeśli wartość nieprawidłowa

#### 5. Zdjęcie (optional)
**Komponent:** `BikeForm`
**Pole:** `image` (File input)
**Warunki:**
- Optional
- Jeśli wybrane:
  - Typ: tylko image/* (image/jpeg, image/png, image/webp)
  - Rozmiar: max 5MB (5 * 1024 * 1024 bytes)

**Weryfikacja:** Custom handler na onChange inputa
```typescript
const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate type
  if (!file.type.startsWith("image/")) {
    setImageError("Plik musi być obrazem");
    return;
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    setImageError("Plik jest za duży (max 5MB)");
    return;
  }

  setImageError(null);
  // Upload logic...
};
```

**Wpływ na UI:**
- Komunikat błędu wyświetla się jako `<FormMessage>` pod inputem
- Preview obrazu jeśli upload OK
- Możliwość usunięcia wybranego pliku

#### 6. Notatki (optional)
**Komponent:** `BikeForm`
**Pole:** `notes`
**Warunki:**
- Optional
- Maksymalnie 500 znaków (`.max(500, "Notatki mogą mieć maksymalnie 500 znaków")`)

**Weryfikacja:** Zod schema
**Wpływ na UI:**
- Textarea z licznikiem znaków: "254/500"
- Komunikat błędu jeśli przekroczono limit

### Walidacja API (backend)

Walidacja na backendzie (już zaimplementowana w `src/pages/api/bikes/index.ts`) używa tej samej Zod schemy co frontend (`CreateBikeSchema` z `src/lib/validation/bike.schemas.ts`), co zapewnia spójność.

**Response 422 Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "name": ["Nazwa jest wymagana"],
      "type": ["Typ roweru jest wymagany"]
    }
  }
}
```

Frontend parsuje te błędy i wyświetla je w odpowiednich polach formularza.

## 10. Obsługa błędów

### 1. Błąd autentykacji (401 Unauthorized)

**Kiedy występuje:**
- Użytkownik nie jest zalogowany
- Sesja wygasła
- Token jest nieprawidłowy

**Obsługa:**
```typescript
// W API client (bikes.ts):
if (response.status === 401) {
  // Redirect to login
  window.location.href = "/login?redirect=/gear";
  throw new Error("Unauthorized");
}
```

**UX:**
- Automatyczne przekierowanie na stronę logowania
- Po zalogowaniu powrót na `/gear` (query param `redirect`)

### 2. Błąd walidacji (422 Validation Error)

**Kiedy występuje:**
- Dane formularza nie przeszły walidacji backendu
- Niezgodność typów lub wartości

**Obsługa:**
```typescript
// W addBike funkcji (useBikeList hook):
if (response.status === 422) {
  const errorData = await response.json();
  // Parse validation errors
  const errors = errorData.error?.details || {};
  
  // Set form errors (React Hook Form)
  Object.entries(errors).forEach(([field, messages]) => {
    form.setError(field as any, {
      type: "manual",
      message: messages[0],
    });
  });
  
  throw new Error(errorData.error?.message || "Validation error");
}
```

**UX:**
- Błędy walidacji wyświetlają się pod odpowiednimi polami formularza
- Modal pozostaje otwarty
- Toast notification: "Sprawdź poprawność danych"

### 3. Błąd sieciowy (Network Error)

**Kiedy występuje:**
- Brak połączenia z internetem
- Timeout requestu
- Serwer niedostępny

**Obsługa:**
```typescript
// W useBikeList hook:
try {
  const result = await fetchBikes(...);
  setBikes(result.bikes);
} catch (err) {
  setError(err instanceof Error ? err : new Error("Network error"));
  toast({
    title: "Błąd połączenia",
    description: "Sprawdź swoje połączenie internetowe",
    variant: "destructive",
  });
}
```

**UX:**
- Wyświetlenie `<ErrorState>` z komunikatem "Brak połączenia"
- Przycisk "Spróbuj ponownie" do retry
- Ikona błędu (AlertCircle z lucide-react)

### 4. Błąd serwera (500 Internal Server Error)

**Kiedy występuje:**
- Błąd w kodzie backendu
- Błąd bazy danych
- Nieobsłużony wyjątek

**Obsługa:**
```typescript
// W API client:
if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  throw new Error(
    errorData.message || "Coś poszło nie tak. Spróbuj później."
  );
}
```

**UX:**
- Toast error: "Coś poszło nie tak. Spróbuj później."
- Dla fetch listy: `<ErrorState>` z retry
- Dla create bike: modal pozostaje otwarty, toast + możliwość retry

### 5. Błąd 404 (Not Found)

**Kiedy występuje:**
- Endpoint nie istnieje (nie powinno się zdarzyć w normalnym flow)
- Rower o podanym ID nie istnieje (dla PUT/DELETE, nie GET)

**Obsługa:**
```typescript
if (response.status === 404) {
  throw new Error("Rower nie został znaleziony");
}
```

**UX:**
- Toast error z odpowiednim komunikatem
- Refetch listy do synchronizacji

### 6. Błąd uploadowania zdjęcia

**Kiedy występuje:**
- Plik jest za duży (>5MB)
- Nieprawidłowy typ pliku (nie image/*)
- Błąd uploadu do storage

**Obsługa:**
```typescript
// W BikeForm:
const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    setImageError("Plik musi być obrazem (JPG, PNG, WEBP)");
    e.target.value = ""; // Clear input
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setImageError("Plik jest za duży. Maksymalny rozmiar to 5MB");
    e.target.value = "";
    return;
  }

  setImageError(null);
  // Proceed with upload...
};
```

**UX:**
- Komunikat błędu pod inputem pliku (FormMessage)
- Input zostaje wyczyszczony
- Możliwość wyboru innego pliku

### 7. Pusta lista / brak wyników

**Kiedy występuje:**
- Użytkownik nie ma jeszcze żadnych rowerów
- Filtry nie zwróciły żadnych wyników
- Wszystkie rowery zostały usunięte/zarchiwizowane

**Obsługa:**
```typescript
// W BikeGrid:
if (bikes.length === 0 && !isLoading && !error) {
  return <EmptyState hasFilters={hasActiveFilters} onAddBikeClick={onAddClick} />;
}
```

**UX:**
- `<EmptyState>` z odpowiednim komunikatem:
  - Brak rowerów: "Nie masz jeszcze rowerów" + CTA "Dodaj pierwszy rower"
  - Brak wyników filtrów: "Brak rowerów spełniających kryteria" + sugestia zmiany filtrów
- Przyjazna grafika SVG (ikona roweru)
- Przycisk akcji do rozwiązania problemu

### 8. Błąd debounced search

**Kiedy występuje:**
- Użytkownik wpisuje bardzo szybko
- Potencjalne race conditions

**Obsługa:**
```typescript
// Używamy useDebounce hook z cleanup:
const debouncedSearch = useDebounce(searchQuery, 300);

useEffect(() => {
  // Wykonaj search tylko dla aktualnej wartości
  setSearchQuery(debouncedSearch);
  
  return () => {
    // Cleanup jeśli komponent unmount
  };
}, [debouncedSearch]);
```

**UX:**
- Opóźnienie 300ms przed filtrowaniem
- Brak flickeringu podczas wpisywania
- Loading indicator podczas wyszukiwania (optional)

## 11. Kroki implementacji

### Faza 1: Setup i struktura podstawowa

**Krok 1.1: Utworzenie struktury folderów**
```bash
mkdir -p src/components/gear
mkdir -p src/components/gear/hooks
mkdir -p src/lib/api
```

**Krok 1.2: Utworzenie strony Astro**
- Plik: `src/pages/gear.astro`
- Dodanie auth check w frontmatter
- Dodanie Layout wrapper
- Przygotowanie miejsca na React Island

**Krok 1.3: Definicja typów**
- Plik: `src/components/gear/types.ts`
- Zdefiniowanie wszystkich interfejsów ViewModel:
  - `BikeFilters`
  - `SortOption`
  - `BikeListState`
  - `BikeCardDisplayData`
  - `BikeTypeOption`, `BikeStatusOption`, `SortOptionData`
  - `UseBikeListReturn`

**Krok 1.4: Funkcje pomocnicze**
- Plik: `src/components/gear/utils.ts`
- Implementacja wszystkich funkcji mapujących i formatujących:
  - `bikeTypeToIcon`, `bikeTypeToLabel`
  - `bikeStatusToLabel`, `bikeStatusToBadgeVariant`
  - `serviceTypeToLabel`
  - `reminderStatusToLabel`, `reminderStatusToBadgeVariant`
  - `formatMileage`, `formatCost`, `formatDate`, `formatKmRemaining`
  - `transformBikeToDisplayData`
  - `filterBikes`, `sortBikes`

### Faza 2: API Client

**Krok 2.1: Implementacja API client functions**
- Plik: `src/lib/api/bikes.ts`
- Implementacja:
  - `fetchBikes(params?: GetBikesParams): Promise<BikesListDTO>`
  - `createBike(data: CreateBikeCommand): Promise<BikeDTO>`
  - `updateBike(id, data): Promise<BikeDTO>` (na przyszłość)
  - `deleteBike(id): Promise<void>` (na przyszłość)
- Obsługa błędów (401, 422, 500)
- Proper typing dla request/response

### Faza 3: Custom Hook

**Krok 3.1: Implementacja useBikeList hook**
- Plik: `src/components/gear/hooks/useBikeList.ts`
- Stan lokalny:
  - `bikes`, `isLoading`, `error`
  - `filters`, `sortBy`, `searchQuery`
  - `isAddDialogOpen`
- Funkcje:
  - `fetchBikesData()` - initial fetch i refetch
  - `addBike(data)` - create z optimistic update
  - `openAddDialog()`, `closeAddDialog()`
  - `handleBikeClick(id)` - nawigacja
- Computed values:
  - `filteredAndSortedBikes` (useMemo)
  - `displayBikes` (useMemo z transformacją)
- Integration z toast notifications
- useEffect dla initial fetch

**Krok 3.2: Testowanie hooka**
- Jednostkowe testy dla filtering logic
- Testy dla sorting logic
- Mock API calls

### Faza 4: Komponenty prezentacyjne (od dołu do góry)

**Krok 4.1: EmptyState**
- Plik: `src/components/gear/EmptyState.tsx`
- Ikona SVG (lucide-react)
- Conditional rendering based on `hasFilters`
- Przycisk CTA
- Responsive styling (Tailwind)

**Krok 4.2: LoadingState**
- Plik: `src/components/gear/LoadingState.tsx`
- Skeleton cards (shadcn Skeleton)
- Grid layout identyczny jak BikeGrid
- Responsive

**Krok 4.3: ErrorState**
- Plik: `src/components/gear/ErrorState.tsx`
- Ikona AlertCircle
- Wyświetlenie error message
- Przycisk retry
- Styling

**Krok 4.4: BikeCardStats**
- Plik: `src/components/gear/BikeCardStats.tsx`
- Wyświetlenie przebiegu (formatowanie)
- Last service info (conditional)
- Next service info (conditional, z badge statusu)
- Ikony z lucide-react
- Spacing i layout

**Krok 4.5: BikeCard**
- Plik: `src/components/gear/BikeCard.tsx`
- shadcn Card component
- BikeCardImage (placeholder lub real image)
- BikeCardHeader (ikona typu, nazwa, status badge)
- BikeCardStats (użycie komponentu z 4.4)
- Active reminders badge
- Total cost display
- Hover effect
- onClick handler
- Responsive layout

**Krok 4.6: BikeGrid**
- Plik: `src/components/gear/BikeGrid.tsx`
- Responsive grid (1/2/3 columns)
- Map BikeCard components
- Conditional rendering EmptyState
- Passing onClick handler

### Faza 5: Komponenty kontrolne

**Krok 5.1: BikeListControls**
- Plik: `src/components/gear/BikeListControls.tsx`
- SearchInput (shadcn Input z ikoną Search)
  - Implementacja debounce (useDebounce hook)
- StatusFilter (shadcn Select)
  - Opcje: Wszystkie, Aktywny, Zarchiwizowany, Sprzedany
- TypeFilter (shadcn Select)
  - Opcje: Wszystkie, Szosowy, Gravelowy, MTB, Czasowy
  - Ikony dla każdej opcji
- SortSelect (shadcn Select)
  - Opcje sortowania z polskimi labelkami
- Responsive layout (vertical na mobile, horizontal na desktop)
- Callbacks do parent

**Krok 5.2: BikeListHeader**
- Plik: `src/components/gear/BikeListHeader.tsx`
- PageTitle component
- AddBikeButton (shadcn Button, variant="default", size="default")
- BikeListControls integration
- Flexbox layout z responsywnością
- Wyświetlanie totalCount: "Moje rowery (3)"

### Faza 6: Formularz dodawania roweru

**Krok 6.1: BikeForm component**
- Plik: `src/components/gear/BikeForm.tsx`
- Setup React Hook Form + Zod resolver
- Pola formularza (wszystkie z FormField wrapper):
  - Nazwa (Input)
  - Typ (Select z ikonami)
  - Data zakupu (DatePicker/Calendar)
  - Przebieg (Input type="number")
  - Zdjęcie (custom FileInput)
  - Notatki (Textarea)
- Walidacja real-time
- Image upload handling z walidacją
- Submit handler
- Loading state podczas submitu
- Error messages (FormMessage)

**Krok 6.2: AddBikeDialog component**
- Plik: `src/components/gear/AddBikeDialog.tsx`
- shadcn Dialog setup
- DialogContent z BikeForm
- DialogHeader: "Dodaj nowy rower"
- DialogFooter: przyciski Anuluj, Dodaj
- Controlled open/onOpenChange
- Reset formularza po zamknięciu
- onSuccess callback

### Faza 7: Główny komponent widoku

**Krok 7.1: BikeListView (orkiestrator)**
- Plik: `src/components/gear/BikeListView.tsx`
- Użycie hooka useBikeList
- Conditional rendering:
  - Loading → LoadingState
  - Error → ErrorState
  - Success → BikeListHeader + BikeGrid
- AddBikeDialog integration
- Container styling (Tailwind)
- Props typing

### Faza 8: Integracja i testowanie

**Krok 8.1: Integracja z Astro page**
- Import BikeListView w `gear.astro`
- Passing userId z session
- client:load directive
- Layout wrapping

**Krok 8.2: Nawigacja**
- Dodanie linku "/gear" do Navbar
- Ikona "Sprzęt" (lucide-react: Wrench)
- Active state dla `/gear` route

**Krok 8.3: Manual testing**
- Test flow dodawania roweru (happy path)
- Test walidacji (wszystkie pola)
- Test filtrowania (status, typ)
- Test sortowania (wszystkie opcje)
- Test wyszukiwania (debounce)
- Test empty state
- Test error state (symulacja błędu API)
- Test loading state
- Test responsywności (mobile, tablet, desktop)
- Test kliknięcia karty (nawigacja)

**Krok 8.4: Component tests**
- Testy BikeCard rendering
- Testy BikeListControls (filters, search)
- Testy BikeForm validation
- Testy utils functions
- Mock API dla testów integracyjnych

**Krok 8.5: E2E tests (Playwright)**
- Test flow: login → /gear → add bike → lista aktualizuje się
- Test filtrowania i sortowania
- Test nawigacji do szczegółów roweru

### Faza 9: Optymalizacja i polish

**Krok 9.1: Performance optimization**
- Memoization komponentów (React.memo gdzie sensowne)
- Lazy loading komponentu AddBikeDialog (React.lazy)
- Image optimization (Astro Image)
- Code splitting

**Krok 9.2: Accessibility (a11y)**
- ARIA labels dla wszystkich interaktywnych elementów
- Keyboard navigation (Tab, Enter, Escape)
- Focus management (dialog trap focus)
- Screen reader testing
- Color contrast check (WCAG AA)

**Krok 9.3: UX polish**
- Animacje (Framer Motion lub Tailwind transitions)
  - Dialog slide-in
  - Card hover
  - Toast animations
- Loading states (skeleton animations)
- Empty state ilustracje
- Micro-interactions
- Toast notifications consistency

**Krok 9.4: Error boundary**
- Implementacja React Error Boundary
- Fallback UI dla unhandled errors
- Error logging (Sentry integration optional)

**Krok 9.5: Documentation**
- JSDoc comments dla wszystkich komponentów
- README dla folderu `gear/`
- Storybook stories (optional)

### Faza 10: Review i deployment

**Krok 10.1: Code review**
- Self-review całego kodu
- Checklist:
  - Wszystkie typy poprawne
  - Wszystkie error cases obsłużone
  - Wszystkie user stories zaimplementowane
  - Brak console.info w produkcji
  - Brak TODO comments
  - Proper error messages (po polsku)

**Krok 10.2: Final testing**
- Smoke test na dev environment
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile testing (iOS Safari, Android Chrome)
- Edge cases testing

**Krok 10.3: Deployment**
- Merge do main branch
- CI/CD pipeline (GitHub Actions)
- Deploy na Cloudflare Pages
- Weryfikacja na produkcji
- Monitoring (Sentry, Plausible)

---

## Notatki implementacyjne

### Priorytetyzacja

**Must-have (MVP):**
- Wyświetlanie listy rowerów
- Filtrowanie (status, typ)
- Sortowanie (nazwa, przebieg)
- Dodawanie roweru (pełny flow)
- Responsive design
- Error handling
- Loading states

**Should-have:**
- Wyszukiwanie po nazwie (debounced)
- Upload zdjęcia
- Empty state illustrations
- Animacje (subtle)

**Could-have:**
- Export listy do CSV
- Bulk actions (archive multiple)
- Drag & drop reordering (custom order)

### Zależności do instalacji

```bash
# shadcn/ui components (jeśli nie ma)
npx shadcn-ui@latest add card
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add label
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast

# React Hook Form + Zod (jeśli nie ma)
pnpm add react-hook-form @hookform/resolvers zod

# Lucide React icons (jeśli nie ma)
pnpm add lucide-react

# Date handling
pnpm add date-fns
```

### Best practices

1. **Type safety:** Wszystkie komponenty i funkcje muszą mieć explicite typy
2. **Error handling:** Każde wywołanie API musi mieć try-catch i obsługę błędów
3. **Accessibility:** Wszystkie interaktywne elementy muszą być dostępne z klawiatury
4. **Responsive:** Mobile-first approach, testy na małych ekranach
5. **Performance:** useMemo/useCallback dla expensive operations
6. **Consistency:** Używanie wspólnych komponentów shadcn/ui, nie custom solutions
7. **i18n ready:** Wszystkie teksty w zmiennych (przygotowanie na tłumaczenia)

---

**Status dokumentu:** Gotowy do implementacji  
**Wersja:** 1.0  
**Data utworzenia:** Październik 2025  
**Autor:** Senior Frontend Developer  
**Ostatnia aktualizacja:** Październik 2025

