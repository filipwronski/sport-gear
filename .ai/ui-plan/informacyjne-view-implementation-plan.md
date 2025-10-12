# Plan implementacji widoku Strony informacyjne (Landing/Legal)

## 1. Przegląd
Widok stron informacyjnych obejmuje statyczne strony aplikacji CycleGear, takie jak strona główna (landing page), polityka prywatności, warunki użytkowania oraz strona "O nas". Głównym celem jest prezentacja produktu, zapewnienie informacji prawnych oraz ułatwienie dostępu do rejestracji. Strony są renderowane jako Static Site Generation (SSG) w Astro dla optymalnej wydajności, SEO i dostępności.

## 2. Routing widoku
Widok jest dostępny pod następującymi ścieżkami:
- `/` - Strona główna (landing page)
- `/legal/privacy` - Polityka prywatności
- `/legal/terms` - Warunki użytkowania
- `/about` - Informacje o projekcie

## 3. Struktura komponentów
Główna struktura opiera się na wspólnym layoucie Astro z komponentami React Islands dla interaktywnych elementów:
- **Layout** (Astro): Główny kontener z header, main i footer
  - **Header** (React Island): Nawigacja i przycisk CTA
  - **Main** (Astro): Zawartość specyficzna dla strony (LandingPage, PrivacyPolicyPage, TermsOfServicePage, AboutPage)
  - **Footer** (Astro): Linki do polityk i kontakt

## 4. Szczegóły komponentów
### Layout
- **Opis komponentu**: Główny layout aplikacji, zapewniający wspólną strukturę dla wszystkich stron. Składa się z header, main i footer. Przeznaczenie: utrzymanie spójności UI i nawigacji.
- **Główne elementy**: `<header>`, `<main>`, `<footer>`, komponenty dzieci Header i Footer.
- **Obsługiwane zdarzenia**: Brak własnych zdarzeń; deleguje do komponentów dzieci.
- **Warunki walidacji**: Brak walidacji, ponieważ statyczny.
- **Typy**: Brak nowych typów; używa istniejących z types.ts jeśli potrzebne.
- **Propsy**: Brak propsów; layout jest samodzielny.

### Header
- **Opis komponentu**: Nagłówek z logo, linkami nawigacyjnymi i przyciskiem "Zarejestruj się". Przeznaczenie: nawigacja po aplikacji i zachęta do rejestracji.
- **Główne elementy**: Logo (SVG), lista linków (`<nav>`), przycisk CTA (shadcn/ui Button).
- **Obsługiwane zdarzenia**: onClick na linkach (przekierowanie), onClick na przycisku CTA (nawigacja do rejestracji).
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; komponent samodzielny.

### Footer
- **Opis komponentu**: Stopka z linkami do polityk, kontaktem i informacjami o aplikacji. Przeznaczenie: zapewnienie dostępu do stron prawnych i kontaktu.
- **Główne elementy**: Sekcje z linkami (`<a>`), informacje kontaktowe.
- **Obsługiwane zdarzenia**: onClick na linkach (przekierowanie).
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; komponent samodzielny.

### LandingPage
- **Opis komponentu**: Główna strona prezentująca produkt CycleGear. Składa się z sekcji hero, funkcji, testimoniali i CTA. Przeznaczenie: przekonanie użytkowników do rejestracji.
- **Główne elementy**: Sekcje `<section>` z tekstem, obrazami, przyciskami CTA (shadcn/ui Button).
- **Obsługiwane zdarzenia**: onClick na przyciskach CTA (przekierowanie do rejestracji).
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; strona samodzielna.

### PrivacyPolicyPage
- **Opis komponentu**: Statyczna strona z polityką prywatności. Przeznaczenie: zapewnienie zgodności z RODO.
- **Główne elementy**: `<article>` z nagłówkami, paragrafami i listami.
- **Obsługiwane zdarzenia**: Brak zdarzeń.
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; strona samodzielna.

### TermsOfServicePage
- **Opis komponentu**: Statyczna strona z warunkami użytkowania. Przeznaczenie: określenie zasad korzystania z aplikacji.
- **Główne elementy**: `<article>` z nagłówkami, paragrafami i listami.
- **Obsługiwane zdarzenia**: Brak zdarzeń.
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; strona samodzielna.

### AboutPage
- **Opis komponentu**: Strona z informacjami o projekcie i zespole. Przeznaczenie: budowanie zaufania i kontaktu.
- **Główne elementy**: `<article>` z tekstem, obrazami zespołu.
- **Obsługiwane zdarzenia**: onClick na linkach kontaktowych (jeśli obecne).
- **Warunki walidacji**: Brak walidacji.
- **Typy**: Brak nowych typów.
- **Propsy**: Brak propsów; strona samodzielna.

## 5. Typy
Dla stron informacyjnych nie są wymagane nowe typy, ponieważ treści są statyczne i nie integrują się z API. Wszystkie komponenty używają standardowych typów HTML i CSS. Jeśli w przyszłości dodane zostaną dynamiczne elementy, można wykorzystać istniejące typy z types.ts, takie jak podstawowe typy dla nawigacji.

## 6. Zarządzanie stanem
Widok nie wymaga zarządzania stanem, ponieważ wszystkie strony są statyczne. Brak zmiennych stanu ani customowych hooków. Wszystkie interakcje ograniczają się do przekierowań i nie wpływają na stan aplikacji.

## 7. Integracja API
Brak integracji API, ponieważ strony są renderowane jako SSG w Astro. Wszystkie dane są wbudowane podczas kompilacji. Nie ma żądań ani odpowiedzi API.

## 8. Interakcje użytkownika
- **Nawigacja**: Użytkownik klika na linki w header lub footer, co powoduje przekierowanie do odpowiedniej strony.
- **CTA na landing page**: Kliknięcie przycisku "Zarejestruj się" przekierowuje do strony rejestracji.
- **Linki kontaktowe**: Na stronie About, kliknięcie linków kontaktowych otwiera email lub stronę kontaktową.

## 9. Warunki i walidacja
Brak warunków do weryfikacji, ponieważ strony są statyczne. Wszystkie treści są predefiniowane i nie zależą od danych użytkownika.

## 10. Obsługa błędów
Potencjalne błędy ograniczają się do problemów z ładowaniem zasobów (np. obrazy). W takim przypadku wyświetlić fallback (np. placeholder SVG). Brak błędów API, ponieważ nie ma integracji.

## 11. Kroki implementacji
1. Utwórz wspólny layout w `src/layouts/Layout.astro` z miejscami na header, main i footer.
2. Zaimplementuj komponent Header jako React Island w `src/components/Header.tsx` z nawigacją i CTA.
3. Zaimplementuj Footer w `src/components/Footer.astro` z linkami.
4. Utwórz strony Astro: `src/pages/index.astro` (landing), `src/pages/legal/privacy.astro`, `src/pages/legal/terms.astro`, `src/pages/about.astro`.
5. Dla każdej strony dodaj odpowiednie treści HTML z użyciem Tailwind CSS i shadcn/ui dla przycisków.
6. Przetestuj responsywność i dostępność (ARIA labels dla linków).
7. Dodaj meta tags w każdej stronie dla SEO (tytuł, opis, Open Graph).
8. Zbuduj aplikację (`astro build`) i sprawdź czasy ładowania.
9. Przeprowadź testy E2E z Playwright dla kluczowych interakcji.
