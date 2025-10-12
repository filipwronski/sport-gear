# Architektura UI dla CycleGear (MVP)

## 1. Przegląd struktury UI

CycleGear to aplikacja webowa (Astro + React Islands) z pięcioma głównymi sekcjami nawigacji: `Dashboard`, `Rekomendacje`, `Społeczność`, `Sprzęt`, `Profil`. Ekrany dynamiczne renderowane są SSR + Islands, a treści informacyjne (Landing/O projekcie/Privacy/Terms) jako SSG i linkowane w stopce. Warstwa danych oparta o TanStack Query (cache zgodny z TTL API), stan UI w Zustand. Autoryzacja przez Supabase Auth z guardami tras i redirectami. Priorytety UX: mobile-first, skeletony >2s, spinnery <2s, empty states z CTA, a11y (ARIA, kontrast, focus).

## 2. Lista widoków

- **Nazwa widoku**: Dashboard
- **Ścieżka widoku**: `/dashboard`
- **Główny cel**: Szybki przegląd pogody/rekomendacji dnia, statusu sprzętu i aktywności społeczności.
- **Kluczowe informacje do wyświetlenia**:
  - Podsumowanie pogody + szybka rekomendacja (z `/api/dashboard`).
  - Stan sprzętu: liczba aktywnych rowerów, nadchodzące/przeterminowane serwisy.
  - Aktywność społeczności: liczba najnowszych zestawów, podobne warunki.
  - Status personalizacji: licznik feedbacków, aktywność personalizacji, `thermal_adjustment`.
- **Kluczowe komponenty widoku**:
  - Sekcja „Dzisiejsza pogoda i rekomendacja” (island, refetch co 60 min).
  - Karty „Stan sprzętu” i „Co ubierają inni”.
  - Sticky „Szybkie akcje” (mobile footer): Nowa rekomendacja / Dodaj feedback / Dodaj serwis / Prognoza.
- **UX, dostępność i względy bezpieczeństwa**:
  - ARIA dla sekcji, focusable CTA, kontrast; offline banner i retry.
  - Dane z `/api/dashboard` w jednym requestcie, fallback na skeletony; obsługa 401/403/429.

- **Nazwa widoku**: Rekomendacje
- **Ścieżka widoku**: `/recommendations`
- **Główny cel**: Generowanie rekomendacji ubioru dla bieżącej lub przyszłej daty.
- **Kluczowe informacje do wyświetlenia**:
  - Parametry: `location_id`, `activity_type`, `duration_minutes`, `date` (do 7 dni).
  - Warunki pogodowe (temp, feels_like, wiatr, wilgotność, opady, opis, ikona).
  - Rekomendacja dla 7 stref (głowa, tułów x3, ręce, dłonie, nogi, stopy, szyja).
  - Dodatkowe wskazówki AI (on-demand) i „Podobna pogoda ostatnio”.
- **Kluczowe komponenty widoku**:
  - Filtry + date-picker (max 7 dni, forecast).
  - Layout: desktop dwie kolumny (SVG sylwetka + lista per strefa), mobile zakładki/akordeon.
  - Przycisk „Wskazówki AI” (loader, komunikat o limicie).
  - CTA „Dodaj feedback po treningu”.
- **UX, dostępność i względy bezpieczeństwa**:
  - Etykiety ARIA dla klikalnych stref SVG; tooltipy i focus states.
  - Cache: current 30 min, forecast 6 h; refetch on-focus i co 60 min.
  - Obsługa 404 Location, 429 limitów, 503 pogody; komunikaty przy braku danych.

- **Nazwa widoku**: Społeczność
- **Ścieżka widoku**: `/community`
- **Główny cel**: Przegląd udostępnionych zestawów w promieniu 50 km przy podobnych warunkach.
- **Kluczowe informacje do wyświetlenia**:
  - Lista zestawów: pseudonim, badge reputacji, warunki, aktywność, ubiór, ocena, dystans, data.
  - Filtry: radius, temperatura ±3°C, wiatr ±5 km/h, aktywność, min rating, sort=reputation, time_range.
- **Kluczowe komponenty widoku**:
  - Panel filtrów (zachowuje stan w URL), lista wyników, paginacja/infinite scroll.
  - Badge reputacji z tooltipem, sortowanie.
  - (Mapa post-MVP – placeholder sekcji).
- **UX, dostępność i względy bezpieczeństwa**:
  - Empty states z sugestią filtrów; cache 5 min; a11y dla listy i filtrów.
  - Ukrywanie wrażliwych danych; anonimizacja zgodnie z PRD.

- **Nazwa widoku**: Sprzęt – lista rowerów
- **Ścieżka widoku**: `/gear`
- **Główny cel**: Zarządzanie listą rowerów i szybkim dostępem do szczegółów.
- **Kluczowe informacje do wyświetlenia**:
  - Karty rowerów: nazwa, typ (ikona), przebieg, status, ostatni serwis, najbliższy serwis, aktywne przypomnienia, łączny koszt.
- **Kluczowe komponenty widoku**:
  - Przycisk „Dodaj rower” (modal/formularz).
  - Filtry statusu i typu, sortowanie, wyszukiwarka po nazwie.
- **UX, dostępność i względy bezpieczeństwa**:
  - Walidacja z Zod; feedback błędów 422; optimistic UI po dodaniu.

- **Nazwa widoku**: Sprzęt – szczegóły roweru
- **Ścieżka widoku**: `/gear/:bikeId`
- **Główny cel**: Przegląd historii, przypomnień i kosztów konkretnego roweru.
- **Kluczowe informacje do wyświetlenia**:
  - Karty/zakładki: Historia serwisów, Przypomnienia, Koszty; szybka aktualizacja przebiegu.
- **Kluczowe komponenty widoku**:
  - Quick action „Zaktualizuj przebieg” (PATCH, walidacja ≥ obecna wartość).
  - Historia: tabela na desktop, karty na mobile; filtry, sorty; eksport CSV.
  - Przypomnienia: lista ze statusami kolorami (upcoming/due/overdue), „Oznacz jako zrobione”.
  - Koszty: KPI, wykres kołowy (breakdown), wykres liniowy (12 mies.).
- **UX, dostępność i względy bezpieczeństwa**:
  - Optimistic UI dla PATCH i complete reminder; rollback na błąd.
  - Kolorystyka statusów z opisem tekstowym (a11y).

- **Nazwa widoku**: Profil
- **Ścieżka widoku**: `/profile`
- **Główny cel**: Zarządzanie danymi, preferencjami termicznymi, prywatnością i jednostkami.
- **Kluczowe informacje do wyświetlenia**:
  - Dane osobowe, lokalizacja domyślna, preferencje termiczne, ustawienia prywatności i jednostek.
  - Personalizacja: badge, licznik do kolejnego progu; historia feedbacków (lista z filtrami/paginacją 20/str).
- **Kluczowe komponenty widoku**:
  - Formularze edycji sekcyjne; przyciski „Eksport danych (JSON)” i „Usuń konto”.
  - Widok historii feedbacków z filtrami (aktywność, ocena, sort) i paginacją.
- **UX, dostępność i względy bezpieczeństwa**:
  - Potwierdzenia destrukcyjnych akcji (modal x2); 401/403 ukrywa akcje.
  - Mapowanie błędów 422 → pola; maskowanie offline.

- **Nazwa widoku**: Onboarding (4 kroki)
- **Ścieżka widoku**: `/auth/onboarding`
- **Główny cel**: Szybka konfiguracja profilu po rejestracji.
- **Kluczowe informacje do wyświetlenia**:
  - Krok 1: Wybór sportu (tylko kolarstwo aktywne).
  - Krok 2: Lokalizacja (autocomplete + „Użyj mojej lokalizacji”).
  - Krok 3: Quiz preferencji termicznych (4 pytania).
  - Krok 4: Opcjonalne dodanie pierwszego roweru.
- **Kluczowe komponenty widoku**:
  - Progress bar, „Wstecz”/„Dalej”, „Pomiń” (można wrócić później w Profilu).
- **UX, dostępność i względy bezpieczeństwa**:
  - Guard po autologowaniu; zapisywanie postępu; walidacje kroków.

- **Nazwa widoku**: Auth (Logowanie/Rejestracja/Reset/Google OAuth)
- **Ścieżka widoku**: `/auth/*`
- **Główny cel**: Dostęp do aplikacji z obsługą Supabase Auth.
- **Kluczowe informacje do wyświetlenia**:
  - Formularze, statusy błędów, redirecty po sukcesie (Dashboard/Onboarding).
- **Kluczowe komponenty widoku**:
  - Logowanie, rejestracja (email+hasło/Google), reset hasła.
- **UX, dostępność i względy bezpieczeństwa**:
  - Ochrona przed brute-force (komunikaty po 5 próbach), a11y formularzy.

- **Nazwa widoku**: Strony informacyjne (Landing/Legal)
- **Ścieżka widoku**: `/`, `/legal/privacy`, `/legal/terms`, `/about`
- **Główny cel**: Informacje o produkcie i politykach.
- **Kluczowe informacje do wyświetlenia**:
  - Treści statyczne SSG; linki w footerze; kontakt.
- **Kluczowe komponenty widoku**:
  - Sekcje treści, nawigacja do rejestracji.
- **UX, dostępność i względy bezpieczeństwa**:
  - SSG szybkie czasy ładowania; SEO; dostępność treści.

## 3. Mapa podróży użytkownika

- **Onboarding po rejestracji**: Rejestracja/Google → redirect do `/auth/onboarding` → kroki 1–4 (z opcją „Pomiń”) → po zakończeniu `/dashboard`.
- **Codzienny trening**: `/dashboard` → CTA „Nowa rekomendacja” → `/recommendations` (filtry predef.) → wyświetlenie rekomendacji → trening → CTA „Dodaj feedback” (modal) → POST feedback → aktualizacja personalizacji.
- **Przegląd społeczności**: `/dashboard` → sekcja „Co ubierają inni” → `/community` z prefiltrami (radius/temp) → przeglądanie listy → szczegóły zestawu (modal/side panel).
- **Zarządzanie sprzętem**: `/gear` → „Dodaj rower” → sukces → `/gear/:bikeId` → „Dodaj serwis” lub „Zaktualizuj przebieg” → przypomnienia i koszty aktualizują się automatycznie.
- **Opieka nad serwisami**: `/gear/:bikeId` → zakładka „Przypomnienia” → „Oznacz jako zrobione” → automatyczne odświeżenie listy i następnego przypomnienia.
- **Profil i prywatność**: `/profile` → edycja danych/preferencji/jednostek → zapis → toasty sukcesu; możliwy eksport lub usunięcie konta.

## 4. Układ i struktura nawigacji

- **Navbar (sticky)**: Logo → pozycje: Dashboard / Rekomendacje / Społeczność / Sprzęt / Profil → Avatar menu: Profil / Ustawienia / Wyloguj.
- **Routing**: `/dashboard`, `/recommendations`, `/community`, `/gear`, `/gear/:bikeId`, `/profile`, `/auth/*`, `/legal/*`.
- **Footer**: Linki do Landing/O projekcie/Privacy/Terms (SSG), kontakt.
- **Mobile**: Hamburger menu; sticky footer z szybkimi akcjami na głównych widokach.
- **Guardy**: Trasy chronione dla zalogowanych (poza landing/legal/auth). Redirecty wg stanu auth i onboarding.

## 5. Kluczowe komponenty

- **WeatherSummaryCard**: Podsumowanie pogody + quick recommendation.
- **RecommendationView**: Filtry, SVG sylwetka z 7 strefami (ARIA), lista rekomendacji, „Wskazówki AI”.
- **FeedbackModal**: Krokowy formularz, edycja rzeczywistego ubioru, ocena ogólna i per strefa.
- **CommunityList**: Filtry z URL, lista zestawów, badge reputacji z tooltipem, sort.
- **BikesList**: Karty rowerów, filtry, sort, „Dodaj rower”.
- **BikeDetailsTabs**: Zakładki: Historia (tabela/karty, eksport CSV), Przypomnienia (statusy, complete), Koszty (KPI + wykresy).
- **QuickMileagePatch**: Formularz PATCH przebiegu z walidacją i optimistic UI.
- **ProfileForm**: Dane, lokalizacja domyślna, preferencje termiczne, prywatność, jednostki; historia feedbacków.
- **AuthForms**: Login/Register/Reset/Google OAuth przepływy z obsługą błędów i redirectów.
- **Toasts & ErrorBoundary**: Standaryzowane toasty, mapowanie 422→pola, 429→retry-after, 401/403→redirect/ukrycie akcji.
- **OfflineBanner & RetryQueue**: Komunikaty offline, blokady CTA, kolejka retry po reconnect.
- **Analytics & Monitoring Hooks**: Integracja Plausible/Sentry dla kluczowych zdarzeń i błędów.
