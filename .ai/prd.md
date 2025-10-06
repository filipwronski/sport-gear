# Dokument wymagań produktu (PRD) - CycleGear

## 1. Przegląd produktu

Nazwa produktu: CycleGear - Asystent Kolarza Szosowego

Wersja: 1.0 (MVP)

Data powstania: Październik 2025

Planowany czas realizacji: 6 tygodni

Cel produktu:
CycleGear to aplikacja webowa zaprojektowana dla kolarzy szosowych, która rozwiązuje dwa kluczowe problemy: niepewność przy doborze odpowiedniego ubioru do aktualnych warunków pogodowych oraz brak systematycznego zarządzania serwisem roweru. System wykorzystuje sztuczną inteligencję do personalizowanych rekomendacji i uczy się indywidualnych preferencji termicznych użytkownika na podstawie feedbacku po każdym treningu.

Wizja długoterminowa:
Stworzenie uniwersalnej platformy dla sportowców outdoor (biegacze, kolarze MTB, triatloniści), która stanowi kompleksowe rozwiązanie do zarządzania ekwipunkiem osobistym i sprzętowym.

Grupa docelowa:
- Primary: Aktywni kolarze szosowi (amatorzy i półprofesjonaliści) jeżdżący regularnie przez cały rok, w wieku 25-45 lat
- Secondary: Początkujący kolarze potrzebujący wsparcia w doborze ubioru, w wieku 20-50 lat
- Future: Biegacze, kolarze MTB, triatloniści i inni sportowcy outdoor

Stack technologiczny:
- Frontend: Astro (SSG/SSR) z React Islands architecture
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- API zewnętrzne: OpenWeather API (dane pogodowe), OpenRouter
- Deployment: Github Action i Cloudflare

Unikalna wartość produktu (USP):
- Personalizacja oparta na AI i uczeniu maszynowym - każdy użytkownik ma unikalny profil termiczny
- Aspekt społecznościowy - uczenie się od lokalnej społeczności kolarzy
- Holistyczne podejście - połączenie zarządzania ekwipunkiem osobistym i serwisem sprzętu
- Architektura przygotowana na skalowanie na inne sporty outdoor

## 2. Problem użytkownika

Problem 1: Niepewność przy doborze ubioru do warunków pogodowych

Opis problemu:
Kolarze szosowi codziennie borykają się z dylematem doboru odpowiedniej odzieży przed wyjazdem na trening. Błędny wybór może prowadzić do poważnych konsekwencji:
- Przegrzanie organizmu podczas intensywnego wysiłku
- Wychłodzenie ciała przy złym doborze warstw
- Zmarnowany trening i obniżona motywacja
- W skrajnych przypadkach - problemy zdrowotne (hipotermia, udar cieplny)

Obecne rozwiązania i ich ograniczenia:
- Fora internetowe i grupy Facebook - porady są ogólne, nie uwzględniają indywidualnych różnic metabolicznych
- Aplikacje pogodowe - pokazują tylko surowe dane meteorologiczne, bez kontekstu sportowego
- Doświadczenie osobiste - wymaga lat treningów, zawodzi przy nietypowych warunkach

Skala problemu:
Każdy kolarz musi podejmować tę decyzję przed każdym treningiem. Przy 3-5 treningach tygodniowo to 150-250 decyzji rocznie, z czego znaczna część kończy się dyskomfortem.

Problem 2: Chaos w zarządzaniu serwisem roweru

Opis problemu:
Brak systematycznego śledzenia wymiany części i konserwacji roweru prowadzi do:
- Nieoczekiwanych awarii podczas jazdy (zerwany łańcuch, zużyte klocki hamulcowe)
- Zagrożenia bezpieczeństwa (np. zużyte opony, uszkodzone hamulce)
- Wyższych kosztów napraw (brak prewencji prowadzi do uszkodzeń wtórnych)
- Braku kontroli nad budżetem przeznaczonym na utrzymanie sprzętu

Obecne rozwiązania i ich ograniczenia:
- Notatniki papierowe - łatwo zgubić, brak przypomnień
- Arkusze Excel/Google Sheets - wymaga dyscypliny, brak automatycznych alertów
- Pamięć - zawodna, szczególnie przy kilku rowerach

Grupa docelowa szczegółowo:

Persona 1: Aktywny kolarz amator (Primary)
- Wiek: 25-45 lat
- Poziom: średniozaawansowany/zaawansowany
- Częstotliwość: 3-5 razy w tygodniu, cały rok
- Roczny przebieg: 5000-10000 km
- Potrzeby: Szybka, trafna decyzja o ubiorze; proaktywne zarządzanie serwisem
- Cytat: "Mam 30 minut przed pracą na trening. Muszę wiedzieć od razu, co ubrać."

Persona 2: Początkujący kolarz (Secondary)
- Wiek: 20-50 lat
- Częstotliwość: 1-2 razy w tygodniu, sezonowy
- Roczny przebieg: 1000-3000 km
- Potrzeby: Edukacja, wsparcie w decyzjach
- Cytat: "Nie wiem czy to jeszcze czapka pod kask czy już opaska. Boję się że będzie mi za zimno."

## 3. Wymagania funkcjonalne

Moduł 1: Inteligentny Asystent Ubioru

FR-001: Pobieranie danych pogodowych
System musi pobierać aktualne dane pogodowe z OpenWeather API dla lokalizacji użytkownika: temperatura, temperatura odczuwalna, prędkość wiatru, opady, wilgotność.

FR-002: Generowanie rekomendacji AI dla 7 stref ciała
System musi generować spersonalizowane rekomendacje ubioru dla 7 stref:
1. Głowa (czapka/opaska/buff/nic)
2. Tułów - 3 warstwy (bielizna/środkowa/zewnętrzna)
3. Ręce (rękawy/naramienniki/nic)
4. Dłonie (rękawiczki zimowe/przejściowe/letnie/nic)
5. Nogi (spodnie długie/3/4/krótkie spodenki/getry)
6. Stopy (skarpety zimowe/letnie, ochraniacze/nic)
7. Szyja (komin/buff/nic)

FR-003: Parametryzacja rekomendacji
System musi uwzględniać: typ aktywności (recovery/spokojna/tempo/interwały), czas trwania (<1h, 1-2h, 2-3h, >3h), indywidualny profil termiczny użytkownika.

FR-004: Wizualizacja rekomendacji
System musi wyświetlać interaktywną grafikę SVG kolarza z 7 strefami i listę tekstową rekomendacji.

FR-005: System feedbacku po treningu
System musi umożliwiać ocenę komfortu termicznego: ocena ogólna 1-5 (bardzo zimno → bardzo gorąco), opcjonalna ocena per strefa, pole na uwagi.

FR-006: Algorytm personalizacji
System musi dostosowywać przyszłe rekomendacje po zebraniu minimum 5 feedbacków, z większą wagą dla nowszych ocen (70% dla ostatnich 3).

FR-007: Historia zestawów ubioru
System musi automatycznie zapisywać zestawy z oceną ≥4/5 i wyświetlać sugestie "Ostatnio przy podobnej pogodzie".

FR-008: Prognoza tygodniowa
System musi wyświetlać prognozę pogody na 7 dni z szybkimi rekomendacjami.

Moduł 2: Społeczność Lokalna

FR-009: Udostępnianie wyborów ubioru
System musi umożliwiać opcjonalne udostępnianie zestawów społeczności (anonimizowane, tylko kategorie ubrań).

FR-010: Przeglądanie wyborów innych użytkowników
System musi pokazywać wybory użytkowników w promieniu 50km przy podobnych warunkach (±3°C).

FR-011: System reputacji społeczności
System musi implementować badge'y reputacji: Nowicjusz (<10 feedbacków), Regularny (10-50), Ekspert (50-100), Mistrz (>100).

Moduł 3: Zarządzanie Sprzętem

FR-012: Rejestracja sprzętu
System musi umożliwiać dodawanie rowerów: nazwa, typ (szosowy/gravelowy/MTB/czasowy), data zakupu, aktualny przebieg, zdjęcie (opcjonalnie).

FR-013: Historia serwisów
System musi umożliwiać rejestrację serwisów: data, przebieg, typ serwisu (predefiniowana lista + "Inne"), koszt (opcjonalnie), miejsce (warsztat/samodzielnie), notatki.

FR-014: Inteligentne przypomnienia o serwisie
System musi automatycznie powiadamiać o zbliżających się terminach serwisów z domyślnymi interwałami (łańcuch: 3000km, klocki: 2000km, opony: 4000km).

FR-015: Monitoring kosztów
System musi zapewniać widok kosztów: suma za okres, koszt/km, breakdown po kategoriach, eksport do CSV.

FR-016: Dashboard serwisowy
System musi wyświetlać podsumowanie stanu sprzętu: lista rowerów z przebiegiem, top 3 najbliższe serwisy, alerty o przeterminowanych.

Moduł 4: Autentykacja i Profil

FR-017: Rejestracja i logowanie
System musi zapewnić rejestrację przez email+hasło oraz Google OAuth, weryfikację email, reset hasła.

FR-018: Quiz onboardingowy
System musi przeprowadzić nowego użytkownika przez: wybór sportu (MVP: tylko kolarstwo), lokalizację, quiz preferencji termicznych (3-4 pytania), opcjonalne dodanie pierwszego roweru.

FR-019: Profil użytkownika
System musi umożliwiać zarządzanie profilem: dane osobowe, preferencje termiczne, ustawienia prywatności (udostępnianie społeczności), jednostki (metryczne/imperialne).

Moduł 5: Dashboard i UX

FR-020: Dashboard główny
System musi wyświetlać: sekcję "Dzisiejsza pogoda" z rekomendacją, "Stan sprzętu" z najbliższymi serwisami, "Co ubierają inni", quick actions.

FR-021: Nawigacja responsywna
System musi zapewnić: navbar z menu głównym (Dashboard/Rekomendacje/Społeczność/Sprzęt/Profil), hamburger menu na mobile, breadcrumbs, pełną responsywność (mobile-first).

FR-022: Obsługa błędów i stanów pustych
System musi implementować: empty states dla wszystkich list, loadery/skeletons, toast notifications (success/error/warning), obsługę błędów API.

## 4. Granice produktu

Zakres MVP (co JEST w pierwszej wersji):

In Scope - Funkcjonalności:
- Rekomendacje ubioru dla kolarstwa szosowego
- Profil termiczny użytkownika z personalizacją AI
- System feedbacku i uczenia się preferencji
- Społeczność lokalna (udostępnianie i przeglądanie wyborów w promieniu 50km)
- Zarządzanie wieloma rowerami
- Historia serwisów i wymian części
- Inteligentne przypomnienia o serwisach
- Monitoring kosztów utrzymania sprzętu
- Dashboard z podsumowaniem
- Prognoza tygodniowa
- Responsywny web design (mobile + desktop)
- Autentykacja email + Google OAuth

In Scope - Technologie:
- Astro + React (web only)
- Supabase (backend-as-a-service)
- OpenWeather API, OpenRouter
- Tailwind CSS + shadcn/ui

Poza zakresem MVP (co NIE JEST w pierwszej wersji):

Out of Scope - Funkcjonalności:
- Panel administracyjny (moderacja będzie ręczna)
- Integracja ze Strava/Garmin Connect
- Aplikacja mobilna natywna (iOS/Android)
- PWA z offline mode
- Inne sporty poza kolarstwem szosowym
- Predykcje pogody dla konkretnych tras
- Marketplace afiliacyjny
- Chat między użytkownikami
- Grupy/kluby kolarskie
- Premium subscription model
- Powiadomienia push (tylko in-app)
- Multi-language support (tylko polski w MVP)
- Dark mode
- API publiczne dla deweloperów
- Zaawansowana analityka treningu
- Historia ładowania baterii przerzutek elektronicznych (post-MVP)

Ograniczenia techniczne MVP:

Limity Free Tier:
- OpenWeather API: 1000 calls/day (wystarczające z cachingiem 1h)
- OpenRouter
- Supabase: 500MB bazy danych, 1GB transfer/miesiąc
- Maksymalnie 100-200 aktywnych użytkowników w MVP

Compliance:
- RODO compliance (zgody, prawo do usunięcia danych)
- Terms of Service i Privacy Policy
- Dane społeczności są anonimizowane

## 5. Historyjki użytkowników

Epic 1: Autentykacja i Onboarding

US-001: Rejestracja przez email
Jako nowy użytkownik
Chcę zarejestrować się używając adresu email i hasła
Aby móc korzystać z aplikacji

Kryteria akceptacji:
- Formularz z polami: email, hasło, potwierdzenie hasła
- Walidacja emaila (format, unikalność) i hasła (min 8 znaków, wielka, mała, cyfra)
- Wysyłka emaila weryfikacyjnego z linkiem aktywacyjnym (ważny 24h)
- Po aktywacji przekierowanie do quizu onboardingowego
- Czytelne komunikaty błędów

US-002: Rejestracja przez Google
Jako nowy użytkownik
Chcę zarejestrować się używając konta Google
Aby szybciej uzyskać dostęp do aplikacji

Kryteria akceptacji:
- Przycisk "Zarejestruj się przez Google"
- Google OAuth popup
- Automatyczne utworzenie konta z danymi z Google (imię, email)
- Brak wymogu weryfikacji emaila
- Przekierowanie do quizu onboardingowego

US-003: Logowanie do aplikacji
Jako zarejestrowany użytkownik
Chcę zalogować się do aplikacji
Aby uzyskać dostęp do mojego profilu

Kryteria akceptacji:
- Formularz: email, hasło, checkbox "Zapamiętaj mnie"
- Link "Zapomniałeś hasła?"
- Po poprawnym logowaniu przekierowanie do dashboardu
- Komunikat błędu przy nieprawidłowych danych
- Blokada po 5 nieudanych próbach (15 minut)

US-004: Reset hasła
Jako użytkownik
Chcę zresetować zapomniane hasło
Aby odzyskać dostęp do konta

Kryteria akceptacji:
- Formularz z polem email
- Email z linkiem resetującym (ważny 1h)
- Formularz ustawienia nowego hasła z walidacją
- Komunikat sukcesu i przekierowanie do logowania
- Unieważnienie starego linku po użyciu

US-005: Quiz onboardingowy
Jako nowy użytkownik
Chcę szybko skonfigurować profil
Aby aplikacja była dostosowana do moich potrzeb

Kryteria akceptacji:
- Krok 1/4: Wybór sportu (MVP: tylko kolarstwo szosowe aktywne, inne disabled z "Wkrótce")
- Krok 2/4: Lokalizacja (autocomplete + przycisk "Użyj mojej lokalizacji")
- Krok 3/4: Quiz preferencji termicznych - 4 pytania:
  - "Jak zwykle czujesz się termicznie?" (marzlak/neutralnie/szybko mi gorąco)
  - "Czy zwykle masz zimne ręce?" (tak/nie)
  - "Czy zwykle masz zimne stopy?" (tak/nie)
  - "Przy jakiej temperaturze przestajesz nosić czapkę?" (<5°C/5-10°C/10-15°C/>15°C)
- Krok 4/4: Opcjonalne dodanie pierwszego roweru (nazwa, typ, przebieg)
- Progress bar, przyciski "Wstecz"/"Dalej", możliwość pominięcia
- Po zakończeniu przekierowanie do dashboardu

US-006: Edycja profilu
Jako użytkownik
Chcę edytować mój profil
Aby zaktualizować dane lub preferencje

Kryteria akceptacji:
- Sekcja "Dane osobowe": imię, lokalizacja
- Sekcja "Preferencje termiczne": możliwość ponowienia quizu lub ręczna edycja
- Sekcja "Prywatność": checkbox "Udostępniaj moje zestawy społeczności"
- Sekcja "Jednostki": radio buttons (metryczne/imperialne)
- Przycisk "Zapisz zmiany", komunikat sukcesu, walidacja

US-007: Usunięcie konta
Jako użytkownik
Chcę usunąć moje konto
Aby moje dane zostały całkowicie usunięte

Kryteria akceptacji:
- Przycisk "Usuń konto" w profilu
- Modal z ostrzeżeniem o nieodwracalności
- Wymagane wpisanie hasła i checkbox potwierdzenia
- Po usunięciu: usunięcie wszystkich danych, anonimizacja udostępnionych zestawów, email potwierdzający

Epic 2: Rekomendacje Ubioru

US-008: Aktualna rekomendacja ubioru
Jako użytkownik
Chcę otrzymać rekomendację ubioru na dzisiaj
Aby wiedzieć co ubrać przed treningiem

Kryteria akceptacji:
- Automatyczne pobranie danych pogodowych dla lokalizacji użytkownika
- Wyświetlenie: temperatura, wiatr, opady, wilgotność
- Dropdowny: typ aktywności (recovery/spokojna/tempo/interwały), czas trwania (<1h/1-2h/2-3h/>3h)
- Domyślnie: "spokojna", "1-2h"
- Automatyczne przeliczenie po zmianie parametrów
- Loader podczas ładowania, obsługa błędów API

US-009: Wizualizacja na sylwetce SVG
Jako użytkownik
Chcę zobaczyć wizualizację rekomendowanego ubioru
Aby szybko zrozumieć które partie ciała wymagają ocieplenia

Kryteria akceptacji:
- Sylwetka kolarza w pozycji na rowerze (SVG)
- 7 klikanych stref z kolorowaniem:
  - Niebieski (cold): może być zimno
  - Zielony (optimal): optymalnie
  - Czerwony (hot): może być gorąco
- Hover na strefie: tooltip z rekomendacją
- Klik: rozwinięcie szczegółów w panelu
- Responsywność na mobile

US-010: Lista rekomendacji per strefa
Jako użytkownik
Chcę zobaczyć szczegółową listę rekomendacji
Aby dokładnie wiedzieć co ubrać

Kryteria akceptacji:
- Lista 7 sekcji (głowa, tułów-3 warstwy, ręce, dłonie, nogi, stopy, szyja)
- Ikona dla każdej części garderoby
- Sekcja "Dodatkowe wskazówki" (np. "Weź kurtkę - możliwe opady")
- Możliwość rozwijania/zwijania sekcji

US-011: Feedback po treningu
Jako użytkownik
Chcę ocenić komfort termiczny po treningu
Aby system uczył się moich preferencji

Kryteria akceptacji:
- Przycisk "Dodaj feedback po treningu"
- Przypomnienie warunków i rekomendacji
- Pytanie "Czy zastosowałeś się do rekomendacji?" (tak/nie, jeśli nie - możliwość edycji)
- Ocena ogólna 1-5 (emotikony: bardzo zimno → bardzo gorąco)
- Opcjonalnie: ocena per strefa
- Pole na uwagi
- Checkbox "Udostępnij społeczności" (jeśli włączone w ustawieniach)
- Po zapisaniu: komunikat + licznik do personalizacji "Jeszcze 3 feedback'i do pełnej personalizacji!"

US-012: Personalizacja rekomendacji
Jako użytkownik
Chcę aby system uczył się moich preferencji
Aby otrzymywać coraz trafniejsze sugestie

Kryteria akceptacji:
- Aktywacja po zebraniu minimum 5 feedbacków
- Obliczanie thermal adjustment (-2°C do +2°C):
  - >60% ocen "zimno" (1-2) → adjustment +1°C do +2°C
  - >60% ocen "gorąco" (4-5) → adjustment -1°C do -2°C
- Nowsze oceny mają większą wagę (ostatnie 3 = 70%)
- Badge "Personalizacja aktywna" na profilu
- Dymek "Dostosowano do Twoich preferencji" w rekomendacjach

US-013: Historia moich zestawów
Jako użytkownik
Chcę przeglądać historię sprawdzonych zestawów
Aby szybko odtworzyć sprawdzone kombinacje

Kryteria akceptacji:
- Menu "Moje zestawy"
- Automatyczny zapis zestawów z oceną ≥4/5
- Każdy zestaw: data, warunki pogodowe, ubiór (7 stref), ocena
- Filtrowanie: temperatura (slider), pora roku, typ aktywności
- Sortowanie: najnowsze, najstarsze, temperatura
- Kliknięcie: pełny podgląd + przycisk "Użyj tego zestawu"

US-014: Prognoza tygodniowa
Jako użytkownik
Chcę zobaczyć prognozę na 7 dni
Aby zaplanować treningi z wyprzedzeniem

Kryteria akceptacji:
- Zakładka "Prognoza tygodniowa"
- 7 kafelków (dzisiaj + 6 kolejnych dni)
- Każdy kafelek: dzień, ikona pogody, temp min/max, wiatr, opady, szybka rekomendacja (1 linia)
- Kliknięcie: generowanie pełnej rekomendacji dla tego dnia
- Przycisk refresh do odświeżenia prognozy

Epic 3: Społeczność Lokalna

US-015: Udostępnianie zestawu społeczności
Jako użytkownik
Chcę udostępnić mój zestaw innym w okolicy
Aby pomóc im w podejmowaniu decyzji

Kryteria akceptacji:
- Checkbox "Udostępnij społeczności" podczas zapisywania feedbacku (domyślnie checked jeśli włączone w ustawieniach)
- Udostępniane dane: pseudonim, warunki, ubiór (kategorie, bez marek), ocena, typ aktywności
- Anonimizacja - brak możliwości identyfikacji
- Widok "Moje udostępnione zestawy" z możliwością usunięcia

US-016: Przeglądanie zestawów innych
Jako użytkownik
Chcę zobaczyć co ubierają inni w mojej okolicy
Aby podjąć lepszą decyzję

Kryteria akceptacji:
- Sekcja "Co ubierają inni dziś" na dashboardzie
- Filtrowanie: radius 50km, temperatura ±3°C, wiatr ±5km/h, ostatnie 24h
- Lista max 10 zestawów: pseudonim z badge'em reputacji, timestamp, warunki, ikony ubioru, ocena
- Kliknięcie: pełny podgląd
- Sortowanie: po reputacji (domyślnie), po czasie, po podobieństwie

US-017: System reputacji
Jako użytkownik
Chcę wiedzieć którym użytkownikom mogę zaufać
Aby polegać na zestawach od doświadczonych osób

Kryteria akceptacji:
- Badge'y reputacji bazujące na liczbie feedbacków:
  - Nowicjusz (<10): szara odznaka
  - Regularny (10-50): brązowa odznaka
  - Ekspert (50-100): srebrna odznaka
  - Mistrz (>100): złota odznaka
- Badge wyświetlany przy pseudonimie
- Tooltip po hover: "Ekspert - 67 feedbacków"
- Wyższa pozycja dla wyższej reputacji
- Możliwość filtrowania "Pokaż tylko Ekspertów i Mistrzów"

Epic 4: Zarządzanie Sprzętem

US-018: Dodanie roweru
Jako użytkownik
Chcę dodać rower do profilu
Aby śledzić jego serwis i przebieg

Kryteria akceptacji:
- Przycisk "Dodaj rower" w sekcji "Sprzęt"
- Formularz: nazwa (wymagane, max 50 znaków), typ (dropdown: szosowy/gravelowy/MTB/czasowy), data zakupu (opcjonalnie), przebieg (domyślnie 0), zdjęcie (opcjonalnie, max 5MB), notatki (opcjonalnie)
- Walidacja: nazwa nie może być pusta
- Po dodaniu: komunikat sukcesu, przekierowanie do widoku roweru, status "aktywny"

US-019: Lista rowerów
Jako użytkownik
Chcę zobaczyć listę moich rowerów
Aby szybko przejść do szczegółów konkretnego

Kryteria akceptacji:
- Widok listy w sekcji "Sprzęt"
- Każdy rower jako karta: miniatura, nazwa, typ (ikona+tekst), przebieg, status (badge), data ostatniego serwisu, najbliższy serwis
- Filtrowanie: wszystkie/aktywne/nieaktywne
- Sortowanie: nazwa, przebieg, data dodania
- Kliknięcie: szczegóły roweru
- Przycisk "Dodaj rower" u góry

US-020: Dodanie serwisu
Jako użytkownik
Chcę zarejestrować wykonany serwis
Aby śledzić historię utrzymania roweru

Kryteria akceptacji:
- Przycisk "Dodaj serwis" w widoku roweru
- Formularz: data (domyślnie dzisiaj), przebieg (domyślnie aktualny), typ serwisu (dropdown: łańcuch/kaseta/klocki przód/klocki tył/opony/przerzutki/hamulce/przegląd ogólny/inne), miejsce (warsztat/samodzielnie), koszt (opcjonalnie), notatki (opcjonalnie)
- Checkbox "Ustaw przypomnienie" (domyślnie checked) + pole "Za ile km" (domyślne wartości per typ)
- Walidacja: data, przebieg, typ wymagane
- Po dodaniu: komunikat sukcesu, aktualizacja przebiegu roweru, utworzenie przypomnienia, przekierowanie do historii

US-021: Historia serwisów
Jako użytkownik
Chcę zobaczyć pełną historię serwisów roweru
Aby śledzić co było robione i kiedy

Kryteria akceptacji:
- Zakładka "Historia serwisów" w widoku roweru
- Lista chronologiczna (najnowsze na górze): data, typ (ikona+tekst), przebieg, miejsce (ikona), koszt, notatka (skrócona), przyciski "Edytuj"/"Usuń"
- Filtrowanie po typie serwisu (multi-select)
- Przycisk "Eksportuj do CSV"
- Pusty stan: "Nie masz jeszcze serwisów. Dodaj pierwszy!"
- Kliknięcie: pełny widok szczegółów

US-022: Przypomnienia o serwisie
Jako użytkownik
Chcę otrzymywać przypomnienia o nadchodzących serwisach
Aby nie przegapić terminów

Kryteria akceptacji:
- Automatyczne tworzenie przy dodawaniu serwisu (jeśli checkbox)
- Domyślne interwały: łańcuch 3000km, klocki 2000km, opony 4000km, przegląd 5000km
- Trzy stany:
  - Zbliżające się (200km przed): żółty badge "Wkrótce"
  - Termin (0-200km po): pomarańczowy badge "Do zrobienia"
  - Przeterminowane (>200km po): czerwony badge "Przeterminowane"
- Widok "Nadchodzące serwisy" na dashboardzie (top 3)
- Pełna lista w sekcji "Przypomnienia" w widoku roweru
- Po wykonaniu serwisu: automatyczne usunięcie i utworzenie nowego

US-023: Monitoring kosztów
Jako użytkownik
Chcę zobaczyć ile wydaję na utrzymanie roweru
Aby kontrolować budżet

Kryteria akceptacji:
- Zakładka "Koszty" w widoku roweru
- Dashboard: suma za okres (miesiąc/3 miesiące/rok/wszystko), koszt/km, breakdown po kategoriach (wykres kołowy), timeline wydatków (wykres liniowy - 12 miesięcy)
- Filtrowanie po okresie i typie wydatku
- Lista szczegółowa (tabela): data, typ, koszt, miejsce, notatki
- Sortowanie po wszystkich kolumnach
- Przycisk "Eksportuj do CSV"
- Pusty stan: "Nie masz jeszcze wydatków"

US-024: Dashboard serwisowy
Jako użytkownik
Chcę mieć centralne miejsce z podsumowaniem stanu sprzętu
Aby szybko zobaczyć co wymaga uwagi

Kryteria akceptacji:
- Sekcja "Stan sprzętu" na głównym dashboardzie
- Lista aktywnych rowerów: nazwa, typ, przebieg, ikona stanu (zielona=OK/żółta=wkrótce/czerwona=przeterminowane), najbliższy serwis
- Top 3 najbliższe/przeterminowane serwisy (all bikes): nazwa roweru, typ serwisu, status badge, przebieg do serwisu
- Quick actions: "Dodaj serwis" (dropdown wyboru roweru), "Zaktualizuj przebieg"
- Alert jeśli przeterminowane: "Masz 2 przeterminowane serwisy!"
- Kliknięcia prowadzą do odpowiednich widoków

Epic 5: Dashboard i UX

US-025: Dashboard główny
Jako użytkownik
Chcę mieć centralny ekran z najważniejszymi informacjami
Aby szybko zobaczyć wszystko co istotne

Kryteria akceptacji:
- 4 główne sekcje:
  1. "Dzisiejsza pogoda i rekomendacja" (pełna szerokość): warunki, sylwetka SVG, quick toggles, przyciski akcji
  2. "Stan sprzętu" (50%): lista rowerów, alerty o serwisach
  3. "Co ubierają inni" (50%): top 3 zestawy społeczności
  4. "Szybkie akcje" (footer): przyciski "Nowa rekomendacja"/"Dodaj feedback"/"Dodaj serwis"/"Prognoza"
- Responsywność: na mobile sekcje wertykalnie
- Auto-refresh pogody co 1h

US-026: Nawigacja responsywna
Jako użytkownik
Chcę łatwo poruszać się po aplikacji
Aby szybko dotrzeć do potrzebnych funkcji

Kryteria akceptacji:
- Navbar (sticky): logo, menu (Dashboard/Rekomendacje/Społeczność/Sprzęt/Profil), avatar z dropdown (Profil/Ustawienia/Wyloguj)
- Breadcrumbs pod navbarem dla głębszych poziomów
- Mobile: hamburger menu
- Podświetlenie aktywnej sekcji
- Footer: O nas, Kontakt, Privacy Policy, Terms of Service

US-027: Obsługa błędów i stanów pustych
Jako użytkownik
Chcę być informowany o błędach i widzieć pomocne komunikaty
Aby rozumieć co się dzieje

Kryteria akceptacji:
- Empty states dla list: grafika (ikona SVG), tytuł, opis, przycisk akcji
- Loadery: spinner (<2s), skeleton screens (>2s)
- Toast notifications u góry (auto-hide 5s): success (zielony), error (czerwony), warning (żółty), info (niebieski)
- Obsługa błędów API:
  - Brak sieci: "Brak połączenia z internetem"
  - Błąd serwera: "Coś poszło nie tak. Spróbuj później."
  - Rate limit: "Osiągnąłeś dzienny limit rekomendacji"
  - 404: Dedykowana strona "Nie znaleziono" z linkiem do dashboardu
- Możliwość retry (przycisk "Spróbuj ponownie")

US-028: Mobile-first design
Jako użytkownik mobilny
Chcę aby aplikacja działała płynnie na telefonie
Aby móc używać jej wszędzie

Kryteria akceptacji:
- Breakpoints: mobile <768px, tablet 768-1024px, desktop >1024px
- Navbar mobile: logo + hamburger
- Dashboard mobile: sekcje wertykalnie, SVG proporcjonalne, buttony touch-friendly (min 44x44px)
- Formularze mobile: pola full-width, natywne dropdowny i date pickery
- Tabele mobile: card layout lub horizontal scroll
- Wszystkie funkcjonalności dostępne na mobile
- Testy na iOS Safari i Android Chrome

## 6. Metryki sukcesu

Cele biznesowe:
- 100 aktywnych użytkowników w ciągu 3 miesięcy
- 40% retencja miesięczna
- >80% pozytywnych ocen rekomendacji (feedback 4-5)
- Średnio 3 sesje/tydzień na użytkownika

Kluczowe metryki (KPIs):

| Metryka | Cel | Metoda pomiaru |
|---------|-----|----------------|
| Rejestracje | 100 użytkowników w 3 miesiące | Supabase Auth |
| Daily Active Users | 30 DAU po miesiącu | Analytics |
| Aktywność | 3 sesje/tydzień/użytkownik | Analytics |
| Retencja | 40% po miesiącu | Cohort analysis |
| Satysfakcja | >80% feedbacków 4-5 | Analiza feedbacku w bazie |
| Dokładność AI | <20% modyfikacji rekomendacji | Tracking edycji rekomendacji |
| Engagement społeczności | 30% użytkowników udostępnia | Liczba shared_outfits |
| Dodane serwisy | Średnio 2 serwisy/user/miesiąc | Liczba service_records |

Definicja sukcesu MVP:

MVP uznajemy za sukces gdy:
1. 50+ użytkowników aktywnie korzysta z rekomendacji
2. >80% feedbacków potwierdza trafność rekomendacji (ocena 3-5)
3. Średni czas onboardingu <2 minuty
4. Zero krytycznych bugów w produkcji przez 2 tygodnie
5. Koszt infrastruktury <$50/miesiąc
6. Minimum 20% użytkowników dodało przynajmniej 1 serwis
7. Minimum 15% użytkowników udostępnia zestawy społeczności

Metryki techniczne:

| Metryka | Cel |
|---------|-----|
| Page Load Time | <2s (desktop), <3s (mobile) |
| Time to Interactive | <3s |
| API Response Time | <500ms (median) |
| Uptime | >99% |
| Error Rate | <1% |
| OpenWeather API usage | <800 calls/day |
| OpenRouter API usage | <1000 rekomendacji/dzień |

Post-launch monitoring (pierwsze 4 tygodnie):
- Tydzień 1: Focus na stabilność, fixing critical bugs
- Tydzień 2: Monitoring dokładności AI, adjustacja promptów
- Tydzień 3: Analiza user flow, optymalizacja onboardingu
- Tydzień 4: Ocena retencji, przygotowanie do skalowania

Roadmap post-MVP (po osiągnięciu celów MVP):

Faza 1 (miesiące 3-6):
- Integracja Strava/Garmin (automatyczny import przebiegu)
- PWA z offline mode
- Dark mode
- Wsparcie dla biegania

Faza 2 (miesiące 6-12):
- MTB, triathlon
- Historia ładowania baterii przerzutek elektronicznych
- Panel administracyjny (moderacja)
- Premium tier

Faza 3 (rok 2):
- API dla developerów
- Marketplace afiliacyjny
- Predykcje pogody dla tras
- Zaawansowany AI coach

---

Status dokumentu: Wersja 1.0 MVP - Gotowy do implementacji  
Ostatnia aktualizacja: Październik 2025  
Liczba user stories: 28 (zredukowane do MVP)  
Następny przegląd: Po 2 tygodniach developmentu
