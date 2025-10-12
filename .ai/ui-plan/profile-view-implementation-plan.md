# Plan implementacji widoku Profil

## 1. Przegląd
Widok Profil umożliwia użytkownikowi zarządzanie swoimi danymi osobowymi, preferencjami termicznymi, ustawieniami prywatności i jednostkami. Dodatkowo wyświetla status personalizacji, historię feedbacków oraz zapewnia dostęp do eksportu danych i usunięcia konta zgodnie z wymaganiami GDPR. Widok jest częścią modułu autentykacji i profilu aplikacji CycleGear.

## 2. Routing widoku
Widok dostępny jest pod ścieżką `/profile` i wymaga uwierzytelnienia użytkownika.

## 3. Struktura komponentów
```
ProfileView (główny kontener)
├── PersonalInfoSection (dane osobowe)
├── ThermalPreferencesSection (preferencje termiczne)
├── PrivacySettingsSection (ustawienia prywatności)
├── UnitsSettingsSection (jednostki)
├── PersonalizationStatus (status personalizacji)
├── FeedbackHistorySection (historia feedbacków)
│   ├── FeedbackFilters (filtry)
│   ├── FeedbackList (lista z paginacją)
│   └── FeedbackPagination (kontrole paginacji)
└── ActionButtons (przyciski akcji)
    ├── ExportDataButton (eksport danych)
    └── DeleteAccountButton (usunięcie konta)
        └── DeleteAccountModal (modal potwierdzenia)
```

## 4. Szczegóły komponentów

### ProfileView
- **Opis komponentu**: Główny kontener widoku profilu, zarządza stanem całego widoku i koordynuje wszystkie podkomponenty. Ładuje dane profilu przy montowaniu i obsługuje aktualizacje.
- **Główne elementy**: Card kontenery dla każdej sekcji, przyciski akcji na dole, toast notifications dla feedbacku użytkownika.
- **Obsługiwane interakcje**: onProfileUpdate (aktualizacja profilu), onExportData (eksport danych), onDeleteAccount (usunięcie konta).
- **Obsługiwana walidacja**: Walidacja wszystkich pól formularzy sekcyjnych przed zapisem zmian.
- **Typy**: ProfileDTO, UpdateProfileCommand, ProfileViewModel, ApiErrorResponse.
- **Propsy**: Brak (komponent główny).

### PersonalInfoSection
- **Opis komponentu**: Sekcja do edycji danych osobowych użytkownika - imię wyświetlane i lokalizacja domyślna.
- **Główne elementy**: Input dla display_name, Select dla default_location z opcjami lokalizacji użytkownika.
- **Obsługiwane interakcje**: onDisplayNameChange, onDefaultLocationChange.
- **Obsługiwana walidacja**: display_name wymagane, maksymalnie 50 znaków; default_location musi istnieć w lokalizacjach użytkownika.
- **Typy**: ProfileDTO, LocationDTO, UpdateProfileCommand.
- **Propsy**: profile: ProfileDTO, locations: LocationDTO[], onUpdate: (command: Partial<UpdateProfileCommand>) => void.

### ThermalPreferencesSection
- **Opis komponentu**: Zarządzanie preferencjami termicznymi - możliwość ponowienia quizu lub ręcznej edycji wszystkich parametrów.
- **Główne elementy**: Button "Przejdź quiz ponownie", collapsible sekcje dla ręcznej edycji z Select/Checkbox/NumberInput.
- **Obsługiwane interakcje**: onStartQuiz (uruchomienie quizu), onManualUpdate (ręczne zmiany), onSavePreferences.
- **Obsługiwana walidacja**: general_feeling musi być prawidłowym enum, cap_threshold_temp między -10 a 30°C.
- **Typy**: ThermalPreferences, UpdateProfileCommand, ThermalPreferencesViewModel.
- **Propsy**: preferences: ThermalPreferences, onUpdate: (prefs: ThermalPreferences) => void, onStartQuiz: () => void.

### PrivacySettingsSection
- **Opis komponentu**: Ustawienia prywatności dotyczące udostępniania danych społeczności.
- **Główne elementy**: Checkbox "Udostępniaj moje zestawy społeczności" z opisem konsekwencji.
- **Obsługiwane interakcje**: onShareToggle (zmiana checkboxa).
- **Obsługiwana walidacja**: Boolean wartość, brak dodatkowych warunków.
- **Typy**: UpdateProfileCommand.
- **Propsy**: shareWithCommunity: boolean, onUpdate: (share: boolean) => void.

### UnitsSettingsSection
- **Opis komponentu**: Wybór systemu jednostek - metryczny lub imperialny.
- **Główne elementy**: RadioGroup z opcjami "metryczne" i "imperialne".
- **Obsługiwane interakcje**: onUnitsChange (zmiana wyboru jednostek).
- **Obsługiwana walidacja**: Tylko prawidłowe wartości enum UnitsEnum.
- **Typy**: UnitsEnum, UpdateProfileCommand.
- **Propsy**: units: UnitsEnum, onUpdate: (units: UnitsEnum) => void.

### PersonalizationStatus
- **Opis komponentu**: Wyświetlanie aktualnego statusu personalizacji z badge'em reputacji i postęp do następnego poziomu.
- **Główne elementy**: Badge z nazwą poziomu, progress bar do następnego poziomu, licznik feedbacków.
- **Obsługiwane interakcje**: Brak (komponent tylko do odczytu).
- **Obsługiwana walidacja**: Brak.
- **Typy**: ProfileDTO, PersonalizationStatusViewModel.
- **Propsy**: profile: ProfileDTO.

### FeedbackHistorySection
- **Opis komponentu**: Wyświetlanie historii feedbacków z możliwością filtrowania i paginacji.
- **Główne elementy**: FeedbackFilters, FeedbackList z kartami feedbacków, FeedbackPagination.
- **Obsługiwane interakcje**: onFiltersChange (zmiana filtrów), onPageChange (zmiana strony), onFeedbackDelete.
- **Obsługiwana walidacja**: Parametry filtrowania muszą być prawidłowe (rating 1-5, prawidłowe enumy).
- **Typy**: FeedbackDTO, FeedbacksListDTO, GetFeedbacksParams, FeedbackHistoryViewModel.
- **Propsy**: Brak (zarządza własnym stanem przez hook).

### ActionButtons
- **Opis komponentu**: Kontener dla przycisków akcji destrukcyjnych.
- **Główne elementy**: ExportDataButton i DeleteAccountButton w rzędzie.
- **Obsługiwane interakcje**: onExportClick, onDeleteClick.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak specyficznych.
- **Propsy**: onExport: () => void, onDelete: () => void, isLoading: boolean.

### ExportDataButton
- **Opis komponentu**: Przycisk do eksportu wszystkich danych użytkownika w formacie JSON zgodnie z GDPR.
- **Główne elementy**: Button z ikoną download i tekstem "Eksportuj dane (JSON)".
- **Obsługiwane interakcje**: onClick (uruchomienie eksportu).
- **Obsługiwana walidacja**: Brak.
- **Typy**: ProfileExportDTO.
- **Propsy**: onExport: () => Promise<void>, isExporting: boolean.

### DeleteAccountButton
- **Opis komponentu**: Przycisk do usunięcia konta z otwieraniem modalu potwierdzenia.
- **Główne elementy**: Button w stylu danger z tekstem "Usuń konto".
- **Obsługiwane interakcje**: onClick (otwarcie modalu).
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak.
- **Propsy**: onDeleteClick: () => void.

### DeleteAccountModal
- **Opis komponentu**: Modal potwierdzenia usunięcia konta z wymaganym hasłem i checkboxem potwierdzenia.
- **Główne elementy**: Dialog z ostrzeżeniem, PasswordInput, Checkbox potwierdzenia, przyciski Cancel/Delete.
- **Obsługiwane interakcje**: onPasswordChange, onConfirmationToggle, onConfirmDelete, onCancel.
- **Obsługiwana walidacja**: Hasło wymagane, checkbox potwierdzenia wymagany, minimum 8 znaków hasła.
- **Typy**: DeleteAccountViewModel.
- **Propsy**: isOpen: boolean, onClose: () => void, onConfirm: (password: string) => Promise<void>, isDeleting: boolean.

## 5. Typy
### Istniejące typy z types.ts:
- **ProfileDTO**: Pełne dane profilu użytkownika
- **UpdateProfileCommand**: Polecenia aktualizacji profilu
- **ProfileExportDTO**: Struktura eksportu danych GDPR
- **LocationDTO**: Dane lokalizacji
- **FeedbackDTO**: Pojedynczy feedback
- **FeedbacksListDTO**: Lista feedbacków z paginacją
- **GetFeedbacksParams**: Parametry filtrowania feedbacków
- **ThermalPreferences**: Preferencje termiczne
- **UnitsEnum**: Enum jednostek (metric|imperial)
- **ReputationBadgeEnum**: Badge reputacji
- **ApiErrorResponse**: Standardowa odpowiedź błędu API

### Nowe typy ViewModel:
```typescript
interface ProfileViewModel extends ProfileDTO {
  nextPersonalizationAt: number; // Liczba feedbacków do następnego poziomu
  canDeleteAccount: boolean; // Czy użytkownik może usunąć konto
}

interface ThermalPreferencesViewModel extends ThermalPreferences {
  isValid: boolean;
  errors: {
    general_feeling?: string;
    cap_threshold_temp?: string;
  };
}

interface FeedbackHistoryViewModel extends FeedbacksListDTO {
  filters: GetFeedbacksParams;
  isLoading: boolean;
  error: string | null;
}

interface DeleteAccountViewModel {
  password: string;
  confirmed: boolean;
  isDeleting: boolean;
  error: string | null;
}

interface PersonalizationStatusViewModel {
  badge: ReputationBadgeEnum;
  feedbackCount: number;
  nextLevelAt: number;
  progress: number; // 0-100%
}
```

## 6. Zarządzanie stanem
Stan widoku zarządzany jest przez kombinację lokalnego stanu React i customowych hooków:

- **useProfile**: Custom hook do zarządzania danymi profilu
  - Stan: profile (ProfileDTO | null), isLoading, isUpdating, error
  - Akcje: fetchProfile, updateProfile, deleteAccount
  - Integruje z GET/PUT/DELETE /api/profile

- **useLocations**: Custom hook do zarządzania lokalizacjami
  - Stan: locations (LocationDTO[]), isLoading
  - Akcje: fetchLocations
  - Integruje z GET /api/locations

- **useFeedbackHistory**: Custom hook do zarządzania historią feedbacków
  - Stan: FeedbackHistoryViewModel
  - Akcje: fetchFeedbacks, updateFilters, loadNextPage, deleteFeedback
  - Integruje z GET /api/feedbacks

- **useExport**: Custom hook do eksportu danych
  - Stan: isExporting, error
  - Akcje: exportData (tworzy download JSON)
  - Integruje z GET /api/profile/export

- **Lokalny stan komponentów**: Form validation states, modal visibility, loading states dla poszczególnych sekcji.

## 7. Integracja API
Widok integruje się z następującymi endpointami:

- **GET /api/profile**: Pobieranie danych profilu
  - Request: Brak parametrów
  - Response: ProfileDTO
  - Używane w: useProfile.fetchProfile()

- **PUT /api/profile**: Aktualizacja profilu
  - Request: UpdateProfileCommand (partial update)
  - Response: ProfileDTO (zaktualizowane dane)
  - Używane w: useProfile.updateProfile()

- **DELETE /api/profile**: Usunięcie konta
  - Request: Brak
  - Response: 204 No Content
  - Używane w: useProfile.deleteAccount()

- **GET /api/profile/export**: Eksport danych
  - Request: Brak
  - Response: ProfileExportDTO
  - Używane w: useExport.exportData()

- **GET /api/locations**: Pobieranie lokalizacji
  - Request: Query params { default_only?: boolean }
  - Response: LocationDTO[]
  - Używane w: useLocations.fetchLocations()

- **GET /api/feedbacks**: Pobieranie historii feedbacków
  - Request: Query params GetFeedbacksParams
  - Response: FeedbacksListDTO
  - Używane w: useFeedbackHistory.fetchFeedbacks()

Wszystkie wywołania API obsługują błędy poprzez try/catch z mapowaniem na toast notifications.

## 8. Interakcje użytkownika
- **Edycja danych osobowych**: Zmiana display_name lub default_location → walidacja → przycisk "Zapisz" się aktywuje → kliknięcie zapisuje zmiany → toast sukcesu
- **Edycja preferencji termicznych**: Uruchomienie quizu → przejście do flow quizu LUB ręczna edycja pól → walidacja → zapis zmian
- **Zmiana ustawień prywatności**: Toggle checkbox → natychmiastowy zapis → toast potwierdzenia
- **Zmiana jednostek**: Wybór radio button → natychmiastowy zapis → toast potwierdzenia
- **Filtrowanie feedbacków**: Zmiana filtrów (aktywność, ocena, sortowanie) → automatyczne przeładowanie listy
- **Paginacja feedbacków**: Kliknięcie następna/poprzednia strona → ładowanie kolejnej strony
- **Eksport danych**: Kliknięcie przycisku → pobieranie JSON → automatyczny download pliku
- **Usunięcie konta**: Kliknięcie przycisku → otwarcie modalu → wypełnienie hasła i potwierdzenie → usunięcie konta → przekierowanie do strony logowania z komunikatem

## 9. Warunki i walidacja
- **display_name**: Wymagane, maksymalnie 50 znaków, niepuste po trim()
- **thermal_preferences.general_feeling**: Musi być prawidłową wartością enum ("marzlak"|"neutralnie"|"szybko_mi_goraco")
- **thermal_preferences.cap_threshold_temp**: Liczba między -10 a 30 (stopnie Celsjusza)
- **default_location**: Musi istnieć w liście lokalizacji użytkownika
- **units**: Musi być prawidłową wartością enum ("metric"|"imperial")
- **hasło przy usunięciu konta**: Wymagane, minimum 8 znaków
- **potwierdzenie usunięcia**: Checkbox musi być zaznaczony
- **filtry feedbacków**: rating między 1-5, activity_type prawidłowy enum, sort prawidłowa wartość

Walidacja odbywa się na poziomie komponentów z natychmiastowym feedbackiem oraz przed wysłaniem do API.

## 10. Obsługa błędów
- **401 Unauthorized**: Przekierowanie do strony logowania
- **403 Forbidden**: Ukrycie niedostępnych akcji (np. usunięcie konta)
- **404 Not Found**: Komunikat "Profil nie znaleziony"
- **422 Validation Error**: Mapowanie błędów na poszczególne pola formularzy
- **Błędy sieciowe**: Toast z opcją retry, offline mask dla krytycznych funkcji
- **Błędy walidacji**: Czerwone obramowania pól z komunikatami błędów
- **Empty states**: Brak lokalizacji - przycisk "Dodaj lokalizację", brak feedbacków - zachęta do dodania pierwszego
- **Loading states**: Skeleton loaders dla sekcji, spinner dla przycisków akcji
- **Usunięcie konta sukces**: Przekierowanie do logowania z komunikatem "Konto zostało usunięte"

## 11. Kroki implementacji
1. Utworzyć strukturę plików: `src/pages/profile.astro`, `src/components/profile/`
2. Zaimplementować custom hooks: `useProfile`, `useLocations`, `useFeedbackHistory`, `useExport`
3. Utworzyć komponenty bazowe: `PersonalInfoSection`, `ThermalPreferencesSection`, `PrivacySettingsSection`, `UnitsSettingsSection`
4. Zaimplementować `PersonalizationStatus` z obliczeniami progress
5. Utworzyć `FeedbackHistorySection` z filtrami i paginacją
6. Zaimplementować `DeleteAccountModal` z pełną walidacją
7. Dodać `ExportDataButton` z logiką download JSON
8. Złożyć wszystko w `ProfileView` z koordynacją stanu
9. Dodać routing w `src/pages/profile.astro`
10. Przetestować integrację z API i obsłużyć wszystkie scenariusze błędów
11. Dodać responsywność i mobile-first design
12. Przetestować E2E flow edycji profilu i usunięcia konta
