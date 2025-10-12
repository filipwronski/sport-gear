# Plan implementacji widoku Onboarding (4 kroki)

## 1. Przegląd
Widok Onboarding to 4-krokowy kreator konfiguracji profilu dla nowych użytkowników aplikacji CycleGear. Głównym celem jest szybka i intuicyjna konfiguracja podstawowych ustawień użytkownika po rejestracji, w tym wyboru sportu, lokalizacji, preferencji termicznych oraz opcjonalnego dodania pierwszego roweru. Widok implementuje podejście mobile-first z pełną responsywnością i obsługą dostępu.

## 2. Routing widoku
Ścieżka: `/auth/onboarding`

Widok powinien być dostępny wyłącznie dla uwierzytelnionych użytkowników i zawierać guard sprawdzający czy użytkownik już przeszedł onboarding (przekierowanie do dashboardu jeśli tak).

## 3. Struktura komponentów
```
OnboardingPage (Astro page)
├── OnboardingLayout (React - główny layout z progress barem)
    ├── ProgressBar (shadcn/ui Progress)
    ├── StepContainer (kontener dla aktualnego kroku)
    │   ├── StepSport (krok 1 - wybór sportu)
    │   ├── StepLocation (krok 2 - lokalizacja)
    │   ├── StepThermalQuiz (krok 3 - quiz termiczny)
    │   └── StepBike (krok 4 - dodanie roweru)
    └── OnboardingNavigation (nawigacja między krokami)
        ├── Button (Wstecz - disabled na kroku 1)
        ├── Button (Dalej - walidacja przed przejściem)
        └── Button (Pomiń - opcjonalne dla kroków 2-4)
```

## 4. Szczegóły komponentów

### OnboardingPage
- **Opis**: Główna strona Astro zawierająca React island z całym widokiem onboarding
- **Główne elementy**: 
  - Meta tags dla SEO (tytuł "Konfiguracja profilu")
  - React island z OnboardingLayout
  - Brak nawigacji - pełnoekranowy kreator
- **Obsługiwane interakcje**: Brak (kontener)
- **Obsługiwana walidacja**: Brak (middleware auth)
- **Typy**: Brak własnych typów
- **Propsy**: Brak (strona Astro)

### OnboardingLayout
- **Opis**: Główny kontener React zarządzający stanem całego onboarding i renderowaniem kroków
- **Główne elementy**:
  - ProgressBar z shadcn/ui (4 kroki)
  - StepContainer z warunkowym renderowaniem aktualnego kroku
  - OnboardingNavigation na dole
  - Toast notifications dla błędów
- **Obsługiwane interakcje**: 
  - Zarządzanie nawigacją między krokami
  - Zapisywanie postępu w localStorage
  - Finalne wysłanie danych do API
- **Obsługiwana walidacja**: 
  - Walidacja każdego kroku przed przejściem dalej
  - Sprawdzanie kompletności danych
  - Walidacja API responses
- **Typy**: OnboardingState, OnboardingStep
- **Propsy**: Brak (główny komponent)

### StepSport
- **Opis**: Pierwszy krok - wybór sportu (tylko kolarstwo aktywne w MVP)
- **Główne elementy**:
  - Card z ikoną roweru
  - Radio button "Kolarstwo szosowe" (aktywny)
  - Disabled radio buttons dla innych sportów z etykietą "Wkrótce"
  - Opis korzyści z wyboru kolarstwa
- **Obsługiwane interakcje**: Wybór sportu (tylko kolarstwo możliwe)
- **Obsługiwana walidacja**: 
  - Wymagany wybór sportu przed przejściem dalej
  - Automatyczna walidacja po wyborze
- **Typy**: SportSelection
- **Propsy**: 
  ```typescript
  interface StepSportProps {
    selectedSport: string;
    onSportSelect: (sport: string) => void;
    isValid: boolean;
  }
  ```

### StepLocation
- **Opis**: Drugi krok - wybór lokalizacji z autocomplete i geolokacją
- **Główne elementy**:
  - Input z autocomplete dla miasta
  - Button "Użyj mojej lokalizacji" z ikoną GPS
  - Mapa poglądowa (opcjonalna integracja z Mapbox)
  - Walidacja dostępności pogody dla lokalizacji
- **Obsługiwane interakcje**: 
  - Wprowadzanie tekstu w autocomplete
  - Kliknięcie "Użyj mojej lokalizacji"
  - Wybór z listy sugestii
- **Obsługiwana walidacja**: 
  - Wymagane współrzędne geograficzne
  - Wymagane miasto i kod kraju
  - Sprawdzanie dostępności API pogody
  - Obsługa błędów geolokacji (odmowa dostępu)
- **Typy**: LocationSearchViewModel
- **Propsy**:
  ```typescript
  interface StepLocationProps {
    locationData: LocationSearchViewModel;
    onLocationChange: (data: Partial<LocationSearchViewModel>) => void;
    onGeolocationRequest: () => Promise<void>;
    isValid: boolean;
    isLoadingGeolocation: boolean;
  }
  ```

### StepThermalQuiz
- **Opis**: Trzeci krok - quiz preferencji termicznych z 4 pytaniami
- **Główne elementy**:
  - 4 pytania w formie accordion/kroków
  - Radio buttons dla każdej odpowiedzi
  - Progress indicator w ramach quizu
  - Podgląd rekomendacji na podstawie odpowiedzi
- **Obsługiwane interakcje**: 
  - Wybór odpowiedzi na każde pytanie
  - Nawigacja między pytaniami quizu
  - Dynamiczna aktualizacja podglądu
- **Obsługiwana walidacja**: 
  - Wszystkie 4 pytania wymagane przed przejściem dalej
  - Walidacja enum wartości dla każdej odpowiedzi
  - Spójność odpowiedzi (logiczne kombinacje)
- **Typy**: ThermalQuizViewModel
- **Propsy**:
  ```typescript
  interface StepThermalQuizProps {
    quizData: ThermalQuizViewModel;
    onAnswerChange: (questionId: string, answer: string) => void;
    isValid: boolean;
  }
  ```

### StepBike
- **Opis**: Czwarty krok opcjonalny - dodanie pierwszego roweru
- **Główne elementy**:
  - Form z polami: nazwa, typ roweru, przebieg
  - Dropdown dla typu roweru (szosowy/gravelowy/MTB/czasowy)
  - Checkbox "Pomiń ten krok"
  - Podgląd karty roweru
- **Obsługiwane interakcje**: 
  - Wypełnianie formularza
  - Zmiana checkbox "pomiń"
  - Podgląd danych roweru
- **Obsługiwana walidacja**: 
  - Nazwa roweru wymagana (jeśli nie pominięty)
  - Typ roweru wymagany (jeśli nie pominięty)
  - Przebieg opcjonalny, musi być liczbą >= 0
  - Walidacja długości nazwy (max 50 znaków)
- **Typy**: BikeFormViewModel
- **Propsy**:
  ```typescript
  interface StepBikeProps {
    bikeData: BikeFormViewModel;
    onBikeChange: (data: Partial<BikeFormViewModel>) => void;
    onSkip: (skip: boolean) => void;
    isValid: boolean;
    isSkipped: boolean;
  }
  ```

### OnboardingNavigation
- **Opis**: Komponent nawigacji między krokami z przyciskami akcji
- **Główne elementy**:
  - Button "Wstecz" (disabled na kroku 1)
  - Button "Dalej" (primary, z loading state)
  - Button "Pomiń" (ghost style, ukryty na kroku 1)
  - Button "Zakończ" na ostatnim kroku
- **Obsługiwane interakcje**: 
  - Kliknięcie "Wstecz" - przejście do poprzedniego kroku
  - Kliknięcie "Dalej" - walidacja i przejście dalej
  - Kliknięcie "Pomiń" - oznaczenie kroku jako pominięty
  - Kliknięcie "Zakończ" - finalizacja onboarding
- **Obsługiwana walidacja**: Wyłączanie przycisków gdy krok nie jest valid
- **Typy**: NavigationState
- **Propsy**:
  ```typescript
  interface OnboardingNavigationProps {
    currentStep: number;
    totalSteps: number;
    canGoBack: boolean;
    canGoForward: boolean;
    canSkip: boolean;
    isSubmitting: boolean;
    onBack: () => void;
    onForward: () => void;
    onSkip: () => void;
    onFinish: () => Promise<void>;
  }
  ```

## 5. Typy

### OnboardingState (główny stan widoku)
```typescript
interface OnboardingState {
  currentStep: number; // 1-4
  completedSteps: boolean[]; // [false, false, false, false]
  sport: string; // "kolarstwo"
  location: LocationSearchViewModel | null;
  thermalPreferences: ThermalPreferences;
  bike: BikeFormViewModel | null;
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

### LocationSearchViewModel
```typescript
interface LocationSearchViewModel extends Partial<CreateLocationCommand> {
  searchQuery: string; // dla autocomplete
  isSearching: boolean; // loading state dla autocomplete
  suggestions: Array<{
    city: string;
    country_code: string;
    latitude: number;
    longitude: number;
  }>; // sugestie autocomplete
  geolocationError: string | null; // błąd geolokacji
}
```

### ThermalQuizViewModel
```typescript
interface ThermalQuizViewModel {
  general_feeling: ThermalFeelingEnum | null;
  cold_hands: boolean | null;
  cold_feet: boolean | null;
  cap_threshold_temp: number | null; // temperatura z enum
  completedQuestions: string[]; // IDs ukończonych pytań
  previewRecommendation?: OutfitDTO; // podgląd rekomendacji
}
```

### BikeFormViewModel
```typescript
interface BikeFormViewModel extends Partial<CreateBikeCommand> {
  isSkipped: boolean; // czy krok został pominięty
  validationErrors: Record<string, string>; // błędy walidacji pól
}
```

### NavigationState
```typescript
interface NavigationState {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoForward: boolean;
  canSkip: boolean;
  isSubmitting: boolean;
}
```

## 6. Zarządzanie stanem
Stan całego onboarding będzie zarządzany przez custom hook `useOnboardingState` implementujący wzorzec reducer + context. Hook będzie:

- Zarządzał całym stanem OnboardingState
- Implementował logikę nawigacji między krokami
- Walidował każdy krok przed przejściem dalej
- Zapisuje postęp w localStorage co 5 sekund
- Koordynował wywołania API w odpowiedniej kolejności
- Zarządzał stanami ładowania i błędami

Hook będzie używał useReducer dla złożonej logiki stanu i useEffect dla side effects (API calls, localStorage).

## 7. Integracja API

### POST /api/locations (Krok 2)
**Request**: CreateLocationCommand
```typescript
{
  latitude: number;
  longitude: number;
  city: string;
  country_code: string;
  is_default: true;
  label?: string;
}
```
**Response**: LocationDTO
**Obsługa**: Wywołanie po zatwierdzeniu lokalizacji, async z loading state

### PUT /api/profile (Krok 3)
**Request**: UpdateProfileCommand (częściowy)
```typescript
{
  thermal_preferences: ThermalPreferences
}
```
**Response**: ProfileDTO
**Obsługa**: Wywołanie po ukończeniu quizu termicznego

### POST /api/bikes (Krok 4 - opcjonalny)
**Request**: CreateBikeCommand
```typescript
{
  name: string;
  type: BikeTypeEnum;
  current_mileage?: number;
}
```
**Response**: BikeDTO
**Obsługa**: Wywołanie tylko jeśli użytkownik dodał rower

Wszystkie wywołania używają istniejących utilities z `response.utils.ts` i `errorHandler.ts`.

## 8. Interakcje użytkownika

1. **Wybór sportu**: Kliknięcie radio button → automatyczne oznaczenie kroku jako ukończony → odblokowanie przycisku "Dalej"

2. **Wprowadzanie lokalizacji**: 
   - Wpisanie tekstu → wywołanie autocomplete API
   - Wybór z sugestii → wypełnienie wszystkich pól lokalizacji
   - Kliknięcie "Użyj mojej lokalizacji" → wywołanie Geolocation API → reverse geocoding

3. **Quiz termiczny**: 
   - Wybór odpowiedzi → aktualizacja stanu + walidacja pytania
   - Wszystkie pytania ukończone → odblokowanie "Dalej"
   - Dynamiczny podgląd rekomendacji na podstawie odpowiedzi

4. **Dodanie roweru**:
   - Wypełnianie formularza → walidacja w czasie rzeczywistym
   - Checkbox "Pomiń" → ukrycie formularza + oznaczenie jako pominięty

5. **Nawigacja**: 
   - "Wstecz" → zapisanie postępu + powrót do poprzedniego kroku
   - "Dalej" → walidacja + przejście dalej
   - "Pomiń" → oznaczenie kroku jako pominięty + przejście dalej
   - "Zakończ" → final validation + API calls + przekierowanie

## 9. Warunki i walidacja

### StepSport
- Wymagany wybór sportu (tylko "kolarstwo" dostępne)
- Blokada przejścia dalej bez wyboru

### StepLocation
- Wymagane: latitude, longitude, city, country_code
- Walidacja formatu współrzędnych (-90 do 90, -180 do 180)
- Sprawdzanie dostępności danych pogodowych dla lokalizacji
- Obsługa błędów geolokacji (permission denied, unavailable)

### StepThermalQuiz
- Wszystkie 4 pytania wymagane
- general_feeling: enum (marzlak/neutralnie/szybko_mi_gorąco)
- cold_hands/cold_feet: boolean
- cap_threshold_temp: enum values (5, 10, 15, 20)
- Spójność odpowiedzi (np. "szybko mi gorąco" + "zimne ręce" = ostrzeżenie)

### StepBike
- Jeśli nie pominięty: wymagane name, type
- name: max 50 znaków, niepuste
- type: jedna z wartości enum BikeTypeEnum
- current_mileage: opcjonalne, liczba >= 0

### Globalne warunki
- Wszystkie kroki muszą być valid przed finalizacją
- Progress zapisuje się automatycznie w localStorage
- Możliwość wznowienia onboarding z miejsca przerwania

## 10. Obsługa błędów

### Błędy API
- 400 Bad Request: Wyświetlenie błędów walidacji pod polami
- 401 Unauthorized: Przekierowanie do logowania
- 422 Validation Error: Szczegółowe błędy pól z API
- Network errors: Toast z retry button

### Błędy geolokacji
- Permission denied: Komunikat + manual input fallback
- Position unavailable: Komunikat + manual input
- Timeout: Retry button

### Błędy walidacji
- Field-level errors: Czerwone obramowanie + komunikat
- Step-level errors: Blokada przycisku "Dalej" + podsumowanie błędów
- Global errors: Toast notifications

### Recovery scenarios
- Przerwanie procesu: Zapis w localStorage
- Błędy API podczas finalizacji: Możliwość retry bez utraty danych
- Invalid data: Clear error states + allow re-entry

## 11. Kroki implementacji

1. **Utworzenie struktury plików i typów**
   - `src/pages/auth/onboarding.astro`
   - `src/components/onboarding/OnboardingLayout.tsx`
   - `src/types/onboarding.types.ts`
   - `src/hooks/useOnboardingState.ts`

2. **Implementacja podstawowych komponentów**
   - OnboardingLayout z progress barem
   - StepSport (disabled inne sporty)
   - OnboardingNavigation

3. **Implementacja StepLocation**
   - Autocomplete z external API (np. Geoapify)
   - Geolocation integration
   - Walidacja lokalizacji

4. **Implementacja StepThermalQuiz**
   - 4 pytania z enumami
   - Real-time validation
   - Preview rekomendacji

5. **Implementacja StepBike**
   - Form z walidacją
   - Skip functionality

6. **Integracja API**
   - POST /api/locations
   - PUT /api/profile
   - POST /api/bikes (opcjonalny)

7. **Zarządzanie stanem i nawigacja**
   - useOnboardingState hook
   - Local storage persistence
   - Step validation logic

8. **Obsługa błędów i edge cases**
   - Error boundaries
   - Network error handling
   - Geolocation fallbacks

9. **Testowanie i optymalizacja**
   - Unit tests dla komponentów
   - E2E tests dla flow
   - Mobile responsiveness
   - Performance optimization

10. **Final integration i deployment**
    - Auth guard
    - Redirect logic
    - Analytics tracking
    - Documentation update
