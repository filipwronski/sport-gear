# Plan implementacji widoku Rekomendacji

## 1. Przegląd

Widok Rekomendacji to główna funkcjonalność aplikacji CycleGear, umożliwiająca użytkownikom otrzymywanie spersonalizowanych rekomendacji ubioru na podstawie warunków pogodowych, typu aktywności i czasu trwania treningu. Widok wykorzystuje hybrydowe podejście: szybki algorytm rule-based do generowania podstawowych rekomendacji oraz opcjonalne wskazówki AI.

**Główne funkcjonalności:**
- Generowanie rekomendacji dla aktualnej i przyszłej daty (do 7 dni)
- Wizualizacja na interaktywnej sylwetce SVG (7 stref ciała)
- Szczegółowa lista rekomendacji per strefa
- Prognoza tygodniowa (7 dni)
- Dodawanie feedbacku po treningu
- Przeglądanie historii sprawdzonych zestawów

## 2. Routing widoku

- **Główna strona rekomendacji**: `/recommendations` (domyślnie: dzisiejsza data, spokojna aktywność)
- **Prognoza tygodniowa**: `/recommendations/forecast` (zakładka w głównym widoku)
- **Historia zestawów**: `/recommendations/history` (zakładka w głównym widoku)

Widok będzie stroną Astro (`src/pages/recommendations.astro`) z zagnieżdżonymi React Islands dla interaktywnych komponentów.

## 3. Struktura komponentów

```
RecommendationsPage (Astro)
├── RecommendationsLayout (Astro) - główny layout strony
│   ├── Tabs (shadcn/ui) - zakładki nawigacyjne
│   └── TabContent (React) - zawartość aktywnej zakładki
│       ├── [Tab: Aktualna rekomendacja]
│       │   ├── RecommendationFilters (React Island)
│       │   │   ├── LocationSelect (shadcn/ui Select)
│       │   │   ├── ActivityTypeSelect (shadcn/ui Select)
│       │   │   ├── DurationSelect (shadcn/ui Select)
│       │   │   └── DatePicker (shadcn/ui Calendar)
│       │   ├── WeatherSummary (React Component)
│       │   ├── RecommendationView (React Island)
│       │   │   ├── [Desktop: 2 kolumny]
│       │   │   │   ├── CyclistSVG (React Component)
│       │   │   │   └── OutfitDetailsList (React Component)
│       │   │   └── [Mobile: Tabs/Accordion]
│       │   │       ├── Tab: Sylwetka
│       │   │       └── Tab: Szczegóły
│       │   ├── AdditionalTipsSection (React Component)
│       │   │   └── LoadAITipsButton (React Component)
│       │   └── AddFeedbackCTA (React Component)
│       ├── [Tab: Prognoza tygodniowa]
│       │   └── WeeklyForecast (React Island)
│       │       └── ForecastDayCard[] (React Component)
│       └── [Tab: Historia zestawów]
│           └── OutfitHistory (React Island)
│               ├── HistoryFilters (React Component)
│               └── OutfitHistoryCard[] (React Component)
└── FeedbackDialog (React Island) - modal dla feedbacku
    ├── FeedbackForm (React Component)
    ├── ZoneRatingsInput (React Component)
    └── ShareToggle (React Component)
```

## 4. Szczegóły komponentów

### 4.1. RecommendationsPage (Astro)

**Opis:** Główna strona widoku, kontener dla wszystkich podstron/zakładek. Renderuje layout i zarządza nawigacją między zakładkami.

**Główne elementy:**
- Layout wrapper z nagłówkiem strony
- Komponent Tabs (shadcn/ui) z trzema zakładkami
- Obsługa routingu zakładek przez query params (?tab=current|forecast|history)

**Obsługiwane interakcje:**
- Zmiana aktywnej zakładki

**Walidacja:** Brak (strona kontenerowa)

**Typy:** Brak specyficznych typów

**Props:** Brak (strona Astro)

---

### 4.2. RecommendationFilters (React Island)

**Opis:** Formularz z filtrami do generowania rekomendacji: lokalizacja, typ aktywności, czas trwania, data. Automatycznie pobiera rekomendację po zmianie parametrów (debounced 500ms).

**Główne elementy:**
```tsx
<div className="filters-container">
  <Select value={locationId} onChange={handleLocationChange}>
    {/* Lista lokalizacji użytkownika */}
  </Select>
  <Select value={activityType} onChange={handleActivityChange}>
    <option value="recovery">Recovery</option>
    <option value="spokojna">Spokojna</option>
    <option value="tempo">Tempo</option>
    <option value="interwaly">Interwały</option>
  </Select>
  <Select value={durationMinutes} onChange={handleDurationChange}>
    <option value="60"><1h</option>
    <option value="90">1-2h</option>
    <option value="150">2-3h</option>
    <option value="240">>3h</option>
  </Select>
  <DatePicker 
    value={selectedDate} 
    onChange={handleDateChange}
    minDate={today}
    maxDate={today + 7 days}
  />
  <Button onClick={handleRefresh}>Odśwież</Button>
</div>
```

**Obsługiwane interakcje:**
- Zmiana lokalizacji → fetch rekomendacji
- Zmiana typu aktywności → fetch rekomendacji
- Zmiana czasu trwania → fetch rekomendacji
- Zmiana daty → fetch rekomendacji (forecast dla przyszłych dat)
- Kliknięcie przycisku Odśwież → force refetch

**Walidacja:**
- `location_id`: UUID, wymagane, musi należeć do użytkownika
- `activity_type`: enum ('recovery'|'spokojna'|'tempo'|'interwaly'), domyślnie 'spokojna'
- `duration_minutes`: integer (60|90|150|240), domyślnie 90
- `date`: ISO 8601 date, opcjonalne, max +7 dni od dziś

**Typy:**
- `GetRecommendationParams` (wejście)
- `LocationDTO[]` (lista lokalizacji)
- `RecommendationFiltersViewModel` (stan komponentu)

**Props:**
```typescript
interface RecommendationFiltersProps {
  defaultLocationId?: string;
  onFiltersChange: (params: GetRecommendationParams) => void;
  isLoading: boolean;
}
```

---

### 4.3. WeatherSummary (React Component)

**Opis:** Wyświetla podsumowanie warunków pogodowych: temperatura, temperatura odczuwalna, wiatr, wilgotność, opady, opis i ikona.

**Główne elementy:**
```tsx
<Card>
  <div className="weather-icon">
    <img src={iconUrl} alt={description} />
  </div>
  <div className="weather-main">
    <span className="temperature">{temperature}°C</span>
    <span className="feels-like">Odczuwalna: {feelsLike}°C</span>
  </div>
  <div className="weather-details">
    <span>Wiatr: {windSpeed} km/h</span>
    <span>Wilgotność: {humidity}%</span>
    <span>Opady: {rainMm} mm</span>
  </div>
  <p className="description">{description}</p>
</Card>
```

**Obsługiwane interakcje:** Brak (komponent prezentacyjny)

**Walidacja:** Brak (wyświetla dane z API)

**Typy:**
- `WeatherDTO` (dane wejściowe)

**Props:**
```typescript
interface WeatherSummaryProps {
  weather: WeatherDTO;
}
```

---

### 4.4. CyclistSVG (React Component)

**Opis:** Interaktywna sylwetka kolarza z 7 klikanymi strefami ciała, kolorowanymi według komfortu termicznego (niebieski/zielony/czerwony). Hover pokazuje tooltip z rekomendacją, klik rozszerza szczegóły w panelu bocznym.

**Główne elementy:**
```tsx
<svg viewBox="0 0 400 600" role="img" aria-label="Sylwetka kolarza z rekomendacjami">
  {/* Strefa głowy */}
  <g 
    id="zone-head"
    className={getZoneColorClass('head')}
    onClick={() => onZoneClick('head')}
    onMouseEnter={() => setHoveredZone('head')}
    onMouseLeave={() => setHoveredZone(null)}
    role="button"
    aria-label="Głowa"
    tabIndex={0}
  >
    <path d="..." />
  </g>
  {/* Pozostałe 6 stref: torso, arms, hands, legs, feet, neck */}
  
  {hoveredZone && (
    <Tooltip zone={hoveredZone} recommendation={outfit[hoveredZone]} />
  )}
</svg>
```

**Obsługiwane interakcje:**
- Hover na strefie → wyświetl tooltip z rekomendacją
- Klik na strefie → rozwiń szczegóły w panelu
- Focus (klawiatura) → wyświetl tooltip

**Walidacja:** Brak

**Typy:**
- `OutfitDTO` (dane wejściowe)
- `ZoneType` = 'head'|'torso'|'arms'|'hands'|'legs'|'feet'|'neck'

**Props:**
```typescript
interface CyclistSVGProps {
  outfit: OutfitDTO;
  selectedZone?: ZoneType;
  onZoneClick: (zone: ZoneType) => void;
}
```

---

### 4.5. OutfitDetailsList (React Component)

**Opis:** Lista szczegółowych rekomendacji dla wszystkich 7 stref z ikonami. Każda sekcja jest rozwijalna (accordion). Dla strefy tułów pokazuje 3 warstwy.

**Główne elementy:**
```tsx
<Accordion type="multiple" defaultValue={['torso']}>
  <AccordionItem value="head">
    <AccordionTrigger>
      <Icon name="head" />
      Głowa
    </AccordionTrigger>
    <AccordionContent>
      {outfit.head} {/* np. "czapka" */}
    </AccordionContent>
  </AccordionItem>
  
  <AccordionItem value="torso">
    <AccordionTrigger>
      <Icon name="torso" />
      Tułów (3 warstwy)
    </AccordionTrigger>
    <AccordionContent>
      <div>Warstwa 1 (bielizna): {outfit.torso.base}</div>
      <div>Warstwa 2 (środkowa): {outfit.torso.mid}</div>
      <div>Warstwa 3 (zewnętrzna): {outfit.torso.outer}</div>
    </AccordionContent>
  </AccordionItem>
  
  {/* arms, hands, legs, feet, neck */}
</Accordion>
```

**Obsługiwane interakcje:**
- Kliknięcie nagłówka sekcji → rozwiń/zwiń szczegóły
- Programatyczne rozwinięcie strefy (gdy kliknięto na SVG)

**Walidacja:** Brak

**Typy:**
- `OutfitDTO` (dane wejściowe)

**Props:**
```typescript
interface OutfitDetailsListProps {
  outfit: OutfitDTO;
  expandedZone?: ZoneType; // z zewnątrz (np. klik na SVG)
}
```

---

### 4.6. AdditionalTipsSection (React Component)

**Opis:** Sekcja z dodatkowymi wskazówkami AI. Domyślnie pusta, użytkownik klika przycisk "Pokaż wskazówki AI" aby załadować tips z AI. Obsługuje loading state i limity API.

**Główne elementy:**
```tsx
<Card>
  <h3>Dodatkowe wskazówki</h3>
  {tips.length === 0 && !loading && (
    <Button onClick={handleLoadTips} disabled={rateLimited}>
      Pokaż wskazówki AI
    </Button>
  )}
  {loading && <Spinner />}
  {tips.length > 0 && (
    <ul>
      {tips.map(tip => <li key={tip}>{tip}</li>)}
    </ul>
  )}
  {rateLimited && (
    <Alert variant="warning">
      Osiągnięto dzienny limit zapytań AI. Spróbuj ponownie jutro.
    </Alert>
  )}
</Card>
```

**Obsługiwane interakcje:**
- Kliknięcie przycisku → fetch AI tips z backend
- Obsługa błędów (rate limit 429, service unavailable 503)

**Walidacja:** Brak (opcjonalna funkcjonalność)

**Typy:**
- `string[]` (tips)

**Props:**
```typescript
interface AdditionalTipsSectionProps {
  recommendationId?: string; // do cachowania
  weatherConditions: WeatherDTO;
}
```

---

### 4.7. AddFeedbackCTA (React Component)

**Opis:** Call-to-action button otwierający modal z formularzem feedbacku po treningu.

**Główne elementy:**
```tsx
<div className="feedback-cta">
  <p>Czy już trenowałeś? Oceń komfort rekomendacji!</p>
  <Button onClick={openFeedbackDialog} size="lg">
    Dodaj feedback po treningu
  </Button>
</div>
```

**Obsługiwane interakcje:**
- Kliknięcie przycisku → otwórz FeedbackDialog

**Walidacja:** Brak

**Typy:** Brak

**Props:**
```typescript
interface AddFeedbackCTAProps {
  recommendation: RecommendationDTO; // przekazane do dialogu
  onFeedbackSubmitted: () => void;
}
```

---

### 4.8. FeedbackDialog (React Island)

**Opis:** Modal z formularzem feedbacku. Wyświetla przypomnienie warunków pogodowych i rekomendacji, pozwala ocenić komfort ogólny (1-5), opcjonalnie per strefa, dodać notatki i udostępnić społeczności.

**Główne elementy:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Oceń komfort rekomendacji</DialogTitle>
    </DialogHeader>
    
    {/* Przypomnienie warunków */}
    <WeatherSummary weather={recommendation.weather} compact />
    
    {/* Pytanie o zastosowanie rekomendacji */}
    <div>
      <label>Czy zastosowałeś się do rekomendacji?</label>
      <RadioGroup value={followedRecommendation} onChange={setFollowedRecommendation}>
        <Radio value="yes">Tak</Radio>
        <Radio value="no">Nie (możesz edytować ubiór poniżej)</Radio>
      </RadioGroup>
    </div>
    
    {/* Edycja ubioru (jeśli nie zastosował się) */}
    {followedRecommendation === 'no' && (
      <OutfitEditor outfit={actualOutfit} onChange={setActualOutfit} />
    )}
    
    {/* Ocena ogólna */}
    <div>
      <label>Jak czułeś się termicznie?</label>
      <RatingEmojis value={overallRating} onChange={setOverallRating} />
      {/* 1: bardzo zimno, 2: zimno, 3: ok, 4: gorąco, 5: bardzo gorąco */}
    </div>
    
    {/* Opcjonalne oceny per strefa */}
    <Accordion>
      <AccordionItem value="zone-ratings">
        <AccordionTrigger>Oceń poszczególne strefy (opcjonalnie)</AccordionTrigger>
        <AccordionContent>
          <ZoneRatingsInput value={zoneRatings} onChange={setZoneRatings} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
    
    {/* Notatki */}
    <Textarea 
      placeholder="Dodatkowe uwagi (opcjonalnie)"
      value={notes}
      onChange={setNotes}
    />
    
    {/* Udostępnianie społeczności */}
    <div>
      <Switch 
        checked={shareWithCommunity} 
        onChange={setShareWithCommunity}
        disabled={!userSettings.share_with_community}
      />
      <label>Udostępnij społeczności</label>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>Anuluj</Button>
      <Button onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : 'Zapisz feedback'}
      </Button>
    </DialogFooter>
    
    {/* Komunikat po zapisaniu */}
    {submitted && (
      <Alert variant="success">
        Feedback zapisany! {feedbackCountMessage}
      </Alert>
    )}
  </DialogContent>
</Dialog>
```

**Obsługiwane interakcje:**
- Wybór "Tak/Nie" na pytanie o zastosowanie rekomendacji
- Edycja ubioru (jeśli nie zastosował się)
- Ocena ogólna (1-5 emoji)
- Opcjonalne oceny per strefa
- Dodanie notatek
- Toggle udostępniania społeczności
- Submit formularza → POST /api/feedbacks
- Cancel → zamknij dialog

**Walidacja:**
- `overall_rating`: required, integer 1-5
- `zone_ratings`: optional, każda strefa 1-5 lub null
- `notes`: optional, max 500 znaków
- `actual_outfit`: required, musi być poprawny OutfitDTO
- `temperature`, `feels_like`, `wind_speed`, etc.: skopiowane z recommendation.weather

**Typy:**
- `CreateFeedbackCommand` (request body)
- `FeedbackDTO` (response)
- `FeedbackFormViewModel` (stan formularza)

**Props:**
```typescript
interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: RecommendationDTO;
  onSubmitted: (feedback: FeedbackDTO) => void;
}
```

---

### 4.9. WeeklyForecast (React Island)

**Opis:** Wyświetla prognozę pogody na 7 dni (dzisiaj + 6 kolejnych). Każdy dzień to kafelek z podstawowymi danymi pogodowymi i quick recommendation. Kliknięcie na dzień generuje pełną rekomendację.

**Główne elementy:**
```tsx
<div className="forecast-grid">
  <div className="forecast-header">
    <h2>Prognoza tygodniowa</h2>
    <Button onClick={handleRefresh} variant="ghost">
      <RefreshIcon />
    </Button>
  </div>
  
  {forecast.map(day => (
    <ForecastDayCard 
      key={day.date}
      day={day}
      onClick={() => handleDayClick(day.date)}
      isSelected={selectedDate === day.date}
    />
  ))}
</div>
```

**Obsługiwane interakcje:**
- Kliknięcie na dzień → przekierowanie do głównej zakładki z datą w filtrach
- Kliknięcie Odśwież → refetch forecast

**Walidacja:** Brak (dane z API)

**Typy:**
- `ForecastDTO` (response z API)
- `ForecastDayDTO[]` (lista dni)

**Props:**
```typescript
interface WeeklyForecastProps {
  locationId: string;
  onDaySelect: (date: string) => void;
}
```

---

### 4.10. ForecastDayCard (React Component)

**Opis:** Pojedynczy kafelek z prognozą dla danego dnia.

**Główne elementy:**
```tsx
<Card 
  className={cn('forecast-card', isSelected && 'selected')}
  onClick={onClick}
  role="button"
  tabIndex={0}
>
  <div className="day-label">{formatDate(day.date)}</div>
  <img src={getWeatherIcon(day.description)} alt={day.description} />
  <div className="temperature-range">
    {day.temperature_min}° - {day.temperature_max}°
  </div>
  <div className="wind">Wiatr: {day.wind_speed} km/h</div>
  {day.rain_mm > 0 && (
    <div className="rain">Opady: {day.rain_mm} mm</div>
  )}
  <p className="quick-recommendation">{day.quick_recommendation}</p>
</Card>
```

**Obsługiwane interakcje:**
- Kliknięcie → wywołaj callback z datą

**Walidacja:** Brak

**Typy:**
- `ForecastDayDTO` (dane dnia)

**Props:**
```typescript
interface ForecastDayCardProps {
  day: ForecastDayDTO;
  isSelected: boolean;
  onClick: () => void;
}
```

---

### 4.11. OutfitHistory (React Island)

**Opis:** Lista zapisanych zestawów ubioru z feedbackiem ≥4/5. Umożliwia filtrowanie i sortowanie. Kliknięcie na zestaw pokazuje szczegóły i przycisk "Użyj tego zestawu".

**Główne elementy:**
```tsx
<div className="history-container">
  <HistoryFilters 
    filters={filters}
    onChange={setFilters}
  />
  
  <div className="history-list">
    {outfits.length === 0 && (
      <EmptyState 
        icon={<HistoryIcon />}
        title="Brak zapisanych zestawów"
        description="Zestawy z oceną 4 lub 5 zapisują się automatycznie"
      />
    )}
    
    {outfits.map(outfit => (
      <OutfitHistoryCard 
        key={outfit.id}
        outfit={outfit}
        onClick={() => handleOutfitClick(outfit)}
      />
    ))}
    
    {hasMore && (
      <Button onClick={loadMore} variant="outline">
        Załaduj więcej
      </Button>
    )}
  </div>
</div>
```

**Obsługiwane interakcje:**
- Zmiana filtrów → refetch z nowymi parametrami
- Kliknięcie na zestaw → pokazuje szczegóły
- Load more → pagination

**Walidacja:** Brak (dane z API)

**Typy:**
- `FeedbacksListDTO` (response z GET /api/feedbacks)
- `FeedbackDTO[]` (lista zestawów)
- `HistoryFiltersViewModel` (stan filtrów)

**Props:**
```typescript
interface OutfitHistoryProps {
  defaultFilters?: GetFeedbacksParams;
}
```

---

### 4.12. HistoryFilters (React Component)

**Opis:** Formularz filtrów dla historii zestawów: temperatura (slider), pora roku, typ aktywności, sortowanie.

**Główne elementy:**
```tsx
<div className="history-filters">
  <div className="filter-group">
    <label>Temperatura</label>
    <Slider 
      range
      min={-10}
      max={35}
      value={temperatureRange}
      onChange={handleTemperatureChange}
    />
    <span>{temperatureRange[0]}° - {temperatureRange[1]}°</span>
  </div>
  
  <Select value={season} onChange={handleSeasonChange}>
    <option value="all">Wszystkie pory roku</option>
    <option value="spring">Wiosna</option>
    <option value="summer">Lato</option>
    <option value="autumn">Jesień</option>
    <option value="winter">Zima</option>
  </Select>
  
  <Select value={activityType} onChange={handleActivityTypeChange}>
    <option value="">Wszystkie typy</option>
    <option value="recovery">Recovery</option>
    <option value="spokojna">Spokojna</option>
    <option value="tempo">Tempo</option>
    <option value="interwaly">Interwały</option>
  </Select>
  
  <Select value={sort} onChange={handleSortChange}>
    <option value="created_at_desc">Najnowsze</option>
    <option value="created_at_asc">Najstarsze</option>
    <option value="rating_desc">Najwyższa ocena</option>
  </Select>
</div>
```

**Obsługiwane interakcje:**
- Zmiana dowolnego filtra → wywołaj callback z nowymi filtrami (debounced 300ms dla slidera)

**Walidacja:**
- `temperatureRange`: array [min, max], -10 do 35
- `activityType`: enum lub empty string
- `sort`: enum wartości sortowania

**Typy:**
- `GetFeedbacksParams` (parametry API)
- `HistoryFiltersViewModel` (lokalny stan + pora roku)

**Props:**
```typescript
interface HistoryFiltersProps {
  filters: HistoryFiltersViewModel;
  onChange: (filters: GetFeedbacksParams) => void;
}
```

---

### 4.13. OutfitHistoryCard (React Component)

**Opis:** Pojedynczy kafelek z zapisanym zestawem: data, warunki, mini-wizualizacja ubioru, ocena.

**Główne elementy:**
```tsx
<Card 
  className="history-card"
  onClick={onClick}
  role="button"
>
  <div className="card-header">
    <span className="date">{formatDate(outfit.created_at)}</span>
    <Badge variant="success">{outfit.overall_rating}/5</Badge>
  </div>
  
  <div className="weather-mini">
    {outfit.temperature}°C, {outfit.wind_speed} km/h
  </div>
  
  <div className="outfit-preview">
    {/* Ikony reprezentujące ubiór */}
    <Icon name={outfit.actual_outfit.head} />
    <Icon name={outfit.actual_outfit.hands} />
    {/* ... */}
  </div>
  
  <p className="activity-type">{outfit.activity_type}</p>
  
  {outfit.notes && (
    <p className="notes-preview">{truncate(outfit.notes, 50)}</p>
  )}
</Card>
```

**Obsługiwane interakcje:**
- Kliknięcie → wywołaj callback z pełnym obiektem FeedbackDTO

**Walidacja:** Brak

**Typy:**
- `FeedbackDTO` (dane zestawu)

**Props:**
```typescript
interface OutfitHistoryCardProps {
  outfit: FeedbackDTO;
  onClick: () => void;
}
```

---

## 5. Typy

### 5.1. Istniejące typy (z types.ts)

Większość typów jest już zdefiniowana w `src/types.ts`:

- **RecommendationDTO**: pełna rekomendacja z weather + outfit + tips
- **WeatherDTO**: dane pogodowe (temperatura, wiatr, etc.)
- **OutfitDTO**: kompletny zestaw ubioru (7 stref)
- **OutfitTorso**: 3 warstwy tułowia (base, mid, outer)
- **OutfitFeet**: skarpety + ochraniacze
- **FeedbackDTO**: zapisany feedback
- **CreateFeedbackCommand**: dane do utworzenia feedbacku
- **FeedbacksListDTO**: lista feedbacków z paginacją
- **ForecastDTO**: prognoza 7-dniowa
- **ForecastDayDTO**: pojedynczy dzień prognozy
- **GetRecommendationParams**: parametry GET /api/recommendations
- **GetFeedbacksParams**: parametry GET /api/feedbacks
- **ActivityTypeEnum**: 'recovery' | 'spokojna' | 'tempo' | 'interwaly'
- **ZoneRatings**: oceny per strefa (opcjonalne)

### 5.2. Nowe typy (ViewModels)

**RecommendationFiltersViewModel**
```typescript
interface RecommendationFiltersViewModel {
  locationId: string;
  activityType: ActivityTypeEnum;
  durationMinutes: number;
  selectedDate: Date | null; // null = dziś
}
```
Pola:
- `locationId`: UUID lokalizacji użytkownika
- `activityType`: typ aktywności (domyślnie 'spokojna')
- `durationMinutes`: czas treningu w minutach (domyślnie 90)
- `selectedDate`: data dla prognozy (null = aktualna pogoda)

---

**RecommendationViewState**
```typescript
interface RecommendationViewState {
  filters: RecommendationFiltersViewModel;
  recommendation: RecommendationDTO | null;
  aiTips: string[];
  isLoadingRecommendation: boolean;
  isLoadingAiTips: boolean;
  error: ApiError | null;
  rateLimitedUntil: Date | null;
}
```
Pola:
- `filters`: aktualne filtry
- `recommendation`: załadowana rekomendacja (null podczas ładowania)
- `aiTips`: wskazówki AI (puste domyślnie)
- `isLoadingRecommendation`: loading state dla głównej rekomendacji
- `isLoadingAiTips`: loading state dla AI tips
- `error`: błąd API (404, 503, etc.)
- `rateLimitedUntil`: timestamp do kiedy użytkownik ma rate limit (429)

---

**FeedbackFormViewModel**
```typescript
interface FeedbackFormViewModel {
  followedRecommendation: 'yes' | 'no';
  actualOutfit: OutfitDTO;
  overallRating: number; // 1-5
  zoneRatings: ZoneRatings;
  notes: string;
  shareWithCommunity: boolean;
}
```
Pola:
- `followedRecommendation`: czy zastosował się do rekomendacji
- `actualOutfit`: rzeczywisty ubiór (edytowalny jeśli 'no')
- `overallRating`: ocena ogólna (1=bardzo zimno, 5=bardzo gorąco)
- `zoneRatings`: opcjonalne oceny per strefa
- `notes`: dodatkowe uwagi użytkownika
- `shareWithCommunity`: czy udostępnić społeczności

---

**HistoryFiltersViewModel**
```typescript
interface HistoryFiltersViewModel {
  temperatureMin: number; // -10
  temperatureMax: number; // 35
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  activityType?: ActivityTypeEnum;
  sort: 'created_at_desc' | 'created_at_asc' | 'rating_desc' | 'rating_asc';
  limit: number; // 30
  offset: number; // 0
}
```
Pola:
- `temperatureMin`, `temperatureMax`: zakres temperatury dla filtra
- `season`: opcjonalny filtr pory roku (mapowany na zakresy dat)
- `activityType`: opcjonalny filtr typu aktywności
- `sort`: sposób sortowania
- `limit`, `offset`: paginacja

Mapowanie season → date range:
- spring: 03-21 do 06-20
- summer: 06-21 do 09-22
- autumn: 09-23 do 12-20
- winter: 12-21 do 03-20

---

**ZoneType**
```typescript
type ZoneType = 'head' | 'torso' | 'arms' | 'hands' | 'legs' | 'feet' | 'neck';
```

---

**ApiError**
```typescript
interface ApiError {
  code: string; // 'VALIDATION_ERROR', 'LOCATION_NOT_FOUND', etc.
  message: string;
  statusCode: number;
  details?: Array<{ field?: string; message: string }>;
  retryAfter?: number; // dla 503, 429
}
```

---

## 6. Zarządzanie stanem

### 6.1. Custom Hook: useRecommendation

Centralny hook zarządzający stanem głównej rekomendacji.

```typescript
function useRecommendation(defaultLocationId?: string) {
  const [state, setState] = useState<RecommendationViewState>({
    filters: {
      locationId: defaultLocationId || '',
      activityType: 'spokojna',
      durationMinutes: 90,
      selectedDate: null,
    },
    recommendation: null,
    aiTips: [],
    isLoadingRecommendation: false,
    isLoadingAiTips: false,
    error: null,
    rateLimitedUntil: null,
  });

  // Fetch recommendation (debounced 500ms)
  const fetchRecommendation = useDebouncedCallback(async (filters: RecommendationFiltersViewModel) => {
    setState(prev => ({ ...prev, isLoadingRecommendation: true, error: null }));
    
    try {
      const params: GetRecommendationParams = {
        location_id: filters.locationId,
        activity_type: filters.activityType,
        duration_minutes: filters.durationMinutes,
        date: filters.selectedDate ? formatISO(filters.selectedDate) : undefined,
      };
      
      const response = await fetch(`/api/recommendations?${new URLSearchParams(params)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error);
      }
      
      const data: RecommendationDTO = await response.json();
      
      setState(prev => ({
        ...prev,
        recommendation: data,
        isLoadingRecommendation: false,
        aiTips: data.additional_tips || [], // może być z backend
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as ApiError,
        isLoadingRecommendation: false,
      }));
    }
  }, 500);

  // Fetch AI tips (optional, on-demand)
  const fetchAiTips = async () => {
    if (state.rateLimitedUntil && new Date() < state.rateLimitedUntil) {
      return; // Still rate limited
    }
    
    setState(prev => ({ ...prev, isLoadingAiTips: true }));
    
    try {
      // Teoretycznie endpoint GET /api/recommendations/ai-tips?recommendation_id=...
      // Dla MVP możemy zwracać tips już w głównym endpoincie
      // Ten fetch jest placeholder
      const response = await fetch(`/api/recommendations/ai-tips?...`);
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const rateLimitedUntil = retryAfter 
          ? new Date(Date.now() + parseInt(retryAfter) * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
        
        setState(prev => ({ 
          ...prev, 
          rateLimitedUntil,
          isLoadingAiTips: false,
        }));
        return;
      }
      
      const tips: string[] = await response.json();
      
      setState(prev => ({
        ...prev,
        aiTips: tips,
        isLoadingAiTips: false,
      }));
    } catch (error) {
      setState(prev => ({ ...prev, isLoadingAiTips: false }));
    }
  };

  // Update filters
  const setFilters = (filters: Partial<RecommendationFiltersViewModel>) => {
    const newFilters = { ...state.filters, ...filters };
    setState(prev => ({ ...prev, filters: newFilters }));
    fetchRecommendation(newFilters);
  };

  // Initial fetch
  useEffect(() => {
    if (state.filters.locationId) {
      fetchRecommendation(state.filters);
    }
  }, []); // Only on mount

  return {
    ...state,
    setFilters,
    fetchAiTips,
    refetch: () => fetchRecommendation(state.filters),
  };
}
```

**Wykorzystanie:**
- Używany w głównym komponencie RecommendationsView
- Cache: React Query lub SWR (opcjonalnie, dla automatycznego cache i refetch)
- Refetch strategia: on focus, co 60 min dla current weather

---

### 6.2. Custom Hook: useFeedback

Hook do obsługi formularza feedbacku.

```typescript
function useFeedback(recommendation: RecommendationDTO) {
  const [formState, setFormState] = useState<FeedbackFormViewModel>({
    followedRecommendation: 'yes',
    actualOutfit: recommendation.recommendation,
    overallRating: 3,
    zoneRatings: {},
    notes: '',
    shareWithCommunity: true, // z ustawień użytkownika
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const command: CreateFeedbackCommand = {
        location_id: recommendation.weather.location_id, // TODO: dodać do WeatherDTO
        temperature: recommendation.weather.temperature,
        feels_like: recommendation.weather.feels_like,
        wind_speed: recommendation.weather.wind_speed,
        humidity: recommendation.weather.humidity,
        rain_mm: recommendation.weather.rain_mm,
        activity_type: /* z filtrów */ 'spokojna',
        duration_minutes: /* z filtrów */ 90,
        actual_outfit: formState.actualOutfit,
        overall_rating: formState.overallRating,
        zone_ratings: formState.zoneRatings,
        notes: formState.notes || undefined,
        shared_with_community: formState.shareWithCommunity,
      };
      
      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error);
      }
      
      const feedback: FeedbackDTO = await response.json();
      
      setSubmitted(true);
      setIsSubmitting(false);
      
      // Pokaż komunikat z licznikiem do personalizacji
      // TODO: fetch user profile dla feedback_count
      
      return feedback;
    } catch (error) {
      setError(error as ApiError);
      setIsSubmitting(false);
      throw error;
    }
  };

  return {
    formState,
    setFormState,
    isSubmitting,
    submitted,
    error,
    submit,
  };
}
```

---

### 6.3. Cache Strategy

**React Query (Tanstack Query)** - zalecana biblioteka do zarządzania cache i server state:

```typescript
// queries/recommendations.ts
export const recommendationKeys = {
  all: ['recommendations'] as const,
  current: (locationId: string, activityType: ActivityTypeEnum, duration: number) =>
    [...recommendationKeys.all, 'current', locationId, activityType, duration] as const,
  forecast: (locationId: string, date: string) =>
    [...recommendationKeys.all, 'forecast', locationId, date] as const,
};

export function useRecommendationQuery(params: GetRecommendationParams) {
  return useQuery({
    queryKey: recommendationKeys.current(params.location_id, params.activity_type, params.duration_minutes),
    queryFn: () => fetchRecommendation(params),
    staleTime: params.date ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000, // 6h forecast, 30min current
    refetchInterval: params.date ? false : 60 * 60 * 1000, // refetch co 1h dla current
    refetchOnWindowFocus: true,
  });
}
```

**Korzyści React Query:**
- Automatyczny cache z konfigurowalnymi staleTime
- Refetch on focus / reconnect
- Deduplication requests
- Loading/error states out-of-the-box
- Invalidation po submit feedbacku

---

## 7. Integracja API

### 7.1. GET /api/recommendations

**Cel:** Pobranie rekomendacji ubioru dla aktualnej lub przyszłej daty.

**Request:**
- Method: GET
- Query params: `GetRecommendationParams`
  ```typescript
  {
    location_id: string; // UUID, required
    activity_type?: 'recovery' | 'spokojna' | 'tempo' | 'interwaly'; // default: 'spokojna'
    duration_minutes?: number; // default: 90
    date?: string; // ISO 8601, optional, max +7 dni
  }
  ```

**Response (200 OK):**
```typescript
RecommendationDTO {
  weather: WeatherDTO;
  recommendation: OutfitDTO;
  additional_tips: string[];
  personalized: boolean;
  thermal_adjustment: number;
  computation_time_ms: number;
}
```

**Errors:**
- 400 Bad Request: Invalid query parameters
- 401 Unauthorized: Not authenticated
- 404 Not Found: Location not found or doesn't belong to user
- 429 Rate Limited: Too many requests (AI tips limit)
- 503 Service Unavailable: Weather API down

**Wywołanie z komponentu:**
```typescript
const { data, isLoading, error } = useRecommendationQuery({
  location_id: filters.locationId,
  activity_type: filters.activityType,
  duration_minutes: filters.durationMinutes,
  date: filters.selectedDate ? formatISO(filters.selectedDate) : undefined,
});
```

---

### 7.2. GET /api/weather/forecast

**Cel:** Pobranie prognozy 7-dniowej.

**Request:**
- Method: GET
- Query params: `GetForecastParams`
  ```typescript
  {
    location_id: string; // UUID, required
  }
  ```

**Response (200 OK):**
```typescript
ForecastDTO {
  forecast: ForecastDayDTO[];
}

ForecastDayDTO {
  date: string; // ISO 8601
  temperature_min: number;
  temperature_max: number;
  wind_speed: number;
  rain_mm: number;
  description: string;
  quick_recommendation: string; // 1-line summary
}
```

**Errors:**
- 400 Bad Request
- 401 Unauthorized
- 404 Not Found

**Wywołanie:**
```typescript
const { data } = useQuery({
  queryKey: ['forecast', locationId],
  queryFn: () => fetch(`/api/weather/forecast?location_id=${locationId}`).then(r => r.json()),
  staleTime: 6 * 60 * 60 * 1000, // 6h
});
```

---

### 7.3. POST /api/feedbacks

**Cel:** Dodanie feedbacku po treningu.

**Request:**
- Method: POST
- Body: `CreateFeedbackCommand`
  ```typescript
  {
    location_id?: string;
    temperature: number;
    feels_like: number;
    wind_speed: number;
    humidity: number;
    rain_mm?: number;
    activity_type: ActivityTypeEnum;
    duration_minutes: number;
    actual_outfit: OutfitDTO;
    overall_rating: number; // 1-5, required
    zone_ratings?: ZoneRatings;
    notes?: string;
    shared_with_community?: boolean;
  }
  ```

**Response (201 Created):**
```typescript
FeedbackDTO {
  id: string;
  temperature: number;
  // ... (pełny feedback)
  created_at: string;
}
```

**Errors:**
- 400 Bad Request: Invalid JSON
- 401 Unauthorized
- 404 Not Found: Location not found
- 422 Validation Error: Invalid data

**Wywołanie:**
```typescript
const mutation = useMutation({
  mutationFn: (command: CreateFeedbackCommand) =>
    fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    }).then(r => r.json()),
  onSuccess: () => {
    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] }); // feedback_count
  },
});
```

---

### 7.4. GET /api/feedbacks

**Cel:** Pobranie historii feedbacków użytkownika (dla zakładki Historia).

**Request:**
- Method: GET
- Query params: `GetFeedbacksParams`
  ```typescript
  {
    limit?: number; // default: 30, max: 30
    offset?: number; // default: 0
    activity_type?: ActivityTypeEnum;
    rating?: number; // 1-5
    sort?: 'created_at_desc' | 'created_at_asc' | 'rating_desc' | 'rating_asc';
  }
  ```

**Response (200 OK):**
```typescript
FeedbacksListDTO {
  feedbacks: FeedbackDTO[];
  total: number;
  has_more: boolean;
}
```

**Errors:**
- 401 Unauthorized

**Wywołanie:**
```typescript
const { data } = useInfiniteQuery({
  queryKey: ['feedbacks', filters],
  queryFn: ({ pageParam = 0 }) =>
    fetch(`/api/feedbacks?${new URLSearchParams({ ...filters, offset: pageParam })}`).then(r => r.json()),
  getNextPageParam: (lastPage, pages) =>
    lastPage.has_more ? pages.length * 30 : undefined,
});
```

---

## 8. Interakcje użytkownika

### 8.1. Zmiana parametrów rekomendacji

**Scenariusz:** Użytkownik zmienia lokalizację, typ aktywności, czas trwania lub datę.

**Flow:**
1. Użytkownik wybiera nową wartość z dropdown/date picker
2. Hook `useRecommendation` aktualizuje `filters` w stanie
3. Debounced callback (500ms) wywołuje `fetchRecommendation`
4. Komponent pokazuje loader (skeleton screen dla SVG i listy)
5. Po otrzymaniu danych: aktualizacja `recommendation` w stanie
6. Render nowych danych: SVG z kolorami, lista szczegółów, weather summary

**Obsługa błędów:**
- 404 Location Not Found → Toast "Lokalizacja nie istnieje"
- 503 Weather Service → Toast "Serwis pogodowy chwilowo niedostępny, spróbuj ponownie"

---

### 8.2. Kliknięcie na strefę SVG

**Scenariusz:** Użytkownik klika na strefę ciała na sylwetce.

**Flow:**
1. Klik na `<g id="zone-head">` wywołuje `onZoneClick('head')`
2. Komponent `RecommendationView` aktualizuje `selectedZone` w stanie
3. `OutfitDetailsList` automatycznie rozwija accordion dla danej strefy
4. Opcjonalnie: scroll do sekcji (smooth scroll)

**Dostępność:**
- Strefy mają `role="button"` i `tabIndex={0}`
- Focus pokazuje outline
- Enter/Space trigger click

---

### 8.3. Hover na strefie SVG

**Scenariusz:** Użytkownik najeżdża myszką na strefę.

**Flow:**
1. `onMouseEnter` ustawia `hoveredZone` w local state komponentu
2. Render tooltip z rekomendacją dla tej strefy
3. `onMouseLeave` usuwa tooltip

---

### 8.4. Kliknięcie "Pokaż wskazówki AI"

**Scenariusz:** Użytkownik chce zobaczyć dodatkowe wskazówki AI.

**Flow:**
1. Klik na przycisk wywołuje `fetchAiTips()`
2. Sprawdzenie `rateLimitedUntil` - jeśli aktywny, pokazuje alert
3. Jeśli OK: fetch tips z backend (lub już są w `recommendation.additional_tips`)
4. Loader podczas ładowania
5. Po otrzymaniu: render listy `<li>` z tips

**Obsługa rate limit (429):**
- Backend zwraca header `Retry-After: 86400` (24h)
- Frontend ustawia `rateLimitedUntil = Date.now() + 86400s`
- Alert: "Osiągnięto dzienny limit zapytań AI. Spróbuj jutro."
- Przycisk disabled

---

### 8.5. Kliknięcie "Dodaj feedback po treningu"

**Scenariusz:** Użytkownik chce ocenić rekomendację po treningu.

**Flow:**
1. Klik na przycisk CTA otwiera `FeedbackDialog`
2. Dialog pokazuje przypomnienie warunków i rekomendacji
3. Użytkownik odpowiada na pytanie "Czy zastosowałeś się?" (Yes/No)
4. Jeśli No: pokazuje `OutfitEditor` do edycji rzeczywistego ubioru
5. Użytkownik wybiera ocenę ogólną (1-5 emoji)
6. Opcjonalnie: rozwija accordion i ocenia poszczególne strefy
7. Opcjonalnie: dodaje notatki (textarea)
8. Toggle "Udostępnij społeczności" (domyślnie checked jeśli włączone w profilu)
9. Klik "Zapisz feedback" → POST /api/feedbacks
10. Loading state na przycisku
11. Po sukcesie:
    - Alert "Feedback zapisany!"
    - Komunikat "Jeszcze X feedbacków do pełnej personalizacji!" (jeśli <5)
    - Automatyczne zamknięcie dialogu po 2s

**Walidacja:**
- `overall_rating` required (disabled submit button jeśli nie wybrano)
- `zone_ratings` opcjonalne (każda strefa 1-5 lub pusta)
- `notes` max 500 znaków

**Obsługa błędów:**
- 422 Validation Error → pokazuje błędy pod polami
- 404 Location Not Found → Toast
- 500 Internal Error → Toast "Coś poszło nie tak"

---

### 8.6. Kliknięcie na dzień w prognozie

**Scenariusz:** Użytkownik klika na kafelek dnia w prognozie tygodniowej.

**Flow:**
1. Klik na `ForecastDayCard` wywołuje `onDaySelect(date)`
2. Przełączenie na zakładkę "Aktualna rekomendacja"
3. Ustawienie `selectedDate` w filtrach na wybraną datę
4. Automatyczny fetch rekomendacji dla tego dnia (forecast data)

---

### 8.7. Filtrowanie historii zestawów

**Scenariusz:** Użytkownik zmienia filtry w zakładce Historia.

**Flow:**
1. Użytkownik przesuwa slider temperatury lub zmienia dropdown
2. Debounced callback (300ms) aktualizuje `filters`
3. Hook wywołuje refetch z nowymi parametrami `GetFeedbacksParams`
4. Loader na liście
5. Render nowych wyników

**Filtr pory roku:** Mapowanie na zakresy dat:
```typescript
const seasonToDateRange = (season: string) => {
  const year = new Date().getFullYear();
  switch (season) {
    case 'spring': return { from: `${year}-03-21`, to: `${year}-06-20` };
    case 'summer': return { from: `${year}-06-21`, to: `${year}-09-22` };
    case 'autumn': return { from: `${year}-09-23`, to: `${year}-12-20` };
    case 'winter': return { from: `${year}-12-21`, to: `${year+1}-03-20` };
  }
};
```

---

### 8.8. Kliknięcie na zestaw w historii

**Scenariusz:** Użytkownik klika na zapisany zestaw.

**Flow:**
1. Klik na `OutfitHistoryCard` wywołuje callback z pełnym `FeedbackDTO`
2. Otwiera modal/drawer z pełnymi szczegółami:
   - Data i godzina
   - Warunki pogodowe
   - Rzeczywisty ubiór (wszystkie strefy)
   - Ocena ogólna + oceny per strefa
   - Notatki
3. Przycisk "Użyj tego zestawu" → przekierowanie do głównej zakładki z pre-filled outfit (TBD w przyszłości)

---

## 9. Warunki i walidacja

### 9.1. Walidacja w RecommendationFilters

**Komponent:** RecommendationFilters

**Warunki:**
1. **location_id** (Select):
   - Required: tak
   - Typ: UUID
   - Walidacja: musi być w liście lokalizacji użytkownika
   - Błąd: "Wybierz lokalizację"

2. **activity_type** (Select):
   - Required: tak
   - Typ: enum ('recovery' | 'spokojna' | 'tempo' | 'interwaly')
   - Domyślna: 'spokojna'
   - Walidacja: musi być jedną z 4 wartości
   - Błąd: brak (predefiniowane opcje)

3. **duration_minutes** (Select):
   - Required: tak
   - Typ: integer (60 | 90 | 150 | 240)
   - Domyślna: 90
   - Walidacja: musi być jedną z 4 wartości
   - Błąd: brak (predefiniowane opcje)

4. **date** (DatePicker):
   - Required: nie (null = dziś)
   - Typ: Date
   - Walidacja:
     - Min: dzisiaj
     - Max: dzisiaj + 7 dni
     - Disabled dates: >7 dni w przyszłość, przeszłość
   - Błąd: "Data musi być w ciągu najbliższych 7 dni"

**Wpływ na UI:**
- Przycisk "Odśwież" disabled jeśli `!location_id`
- Podczas ładowania rekomendacji: wszystkie selecty disabled

---

### 9.2. Walidacja w FeedbackDialog

**Komponent:** FeedbackDialog / FeedbackForm

**Warunki:**
1. **followedRecommendation** (RadioGroup):
   - Required: tak (domyślnie 'yes')
   - Typ: 'yes' | 'no'
   - Walidacja: brak
   - Wpływ: jeśli 'no' → pokazuje OutfitEditor

2. **actualOutfit** (OutfitEditor):
   - Required: tak
   - Typ: OutfitDTO (7 stref)
   - Walidacja:
     - Każda strefa musi mieć wartość (nie null)
     - torso.base, torso.mid, torso.outer: required
     - feet.socks: required, feet.covers: opcjonalne ("nic" allowed)
   - Błąd: "Wybierz ubiór dla wszystkich stref"

3. **overall_rating** (RatingEmojis):
   - Required: tak
   - Typ: integer 1-5
   - Walidacja: musi być wybrane
   - Błąd: brak (wymusza wybór przed submit)
   - Wpływ: przycisk "Zapisz" disabled jeśli nie wybrano

4. **zone_ratings** (ZoneRatingsInput):
   - Required: nie
   - Typ: ZoneRatings (partial)
   - Walidacja: każda ocena 1-5 lub undefined
   - Błąd: brak

5. **notes** (Textarea):
   - Required: nie
   - Typ: string
   - Walidacja:
     - Max: 500 znaków
   - Błąd: "Maksymalnie 500 znaków" (live counter pod textarea)

6. **shareWithCommunity** (Switch):
   - Required: nie
   - Typ: boolean
   - Domyślna: true (z profilu użytkownika)
   - Walidacja: brak
   - Disabled: jeśli użytkownik ma wyłączone w ustawieniach profilu

**Wpływ na UI:**
- Przycisk "Zapisz feedback" disabled jeśli: `!overall_rating || isSubmitting`
- Po submit: disable całego formularza, pokazuje spinner na przycisku

---

### 9.3. Walidacja w HistoryFilters

**Komponent:** HistoryFilters

**Warunki:**
1. **temperatureRange** (Slider):
   - Required: nie (opcjonalny filtr)
   - Typ: [number, number]
   - Walidacja:
     - Min: -10
     - Max: 35
     - Range: min < max
   - Domyślne: [-10, 35] (brak filtra)

2. **season** (Select):
   - Required: nie
   - Typ: 'all' | 'spring' | 'summer' | 'autumn' | 'winter'
   - Domyślna: 'all'
   - Walidacja: brak

3. **activityType** (Select):
   - Required: nie
   - Typ: ActivityTypeEnum | ''
   - Domyślna: ''
   - Walidacja: brak

4. **sort** (Select):
   - Required: tak
   - Typ: 'created_at_desc' | 'created_at_asc' | 'rating_desc' | 'rating_asc'
   - Domyślna: 'created_at_desc'
   - Walidacja: brak (predefiniowane)

**Wpływ na UI:**
- Live update liczby wyników po zmianie filtrów
- Przycisk "Resetuj filtry" (jeśli jakiś filtr != default)

---

## 10. Obsługa błędów

### 10.1. Błędy API - GET /api/recommendations

**400 Bad Request (Validation Error):**
- **Przyczyna:** Nieprawidłowe query params (np. zły format UUID, date > +7 dni)
- **Obsługa:** Toast z komunikatem błędu, pokazuje szczegóły walidacji
- **UI:** Podświetlenie błędnego pola w filtrach

**401 Unauthorized:**
- **Przyczyna:** Brak autoryzacji (sesja wygasła)
- **Obsługa:** Redirect do /login z query param `?redirect=/recommendations`
- **UI:** Loader znika, pokazuje komunikat "Sesja wygasła. Zaloguj się ponownie."

**404 Location Not Found:**
- **Przyczyna:** `location_id` nie istnieje lub nie należy do użytkownika
- **Obsługa:** Toast "Lokalizacja nie została znaleziona"
- **UI:** Reset filtra `location_id` do pierwszej dostępnej lokalizacji

**429 Rate Limited (AI Tips):**
- **Przyczyna:** Przekroczono dzienny limit zapytań AI
- **Obsługa:** Przechowaj `rateLimitedUntil` w state (z header `Retry-After`)
- **UI:** Przycisk "Pokaż wskazówki AI" disabled, Alert "Osiągnięto limit. Spróbuj jutro."

**503 Service Unavailable (Weather API):**
- **Przyczyna:** OpenWeather API down
- **Obsługa:** Toast "Serwis pogodowy niedostępny. Spróbuj za chwilę." + przycisk Retry
- **UI:** Placeholder z ikoną błędu i przyciskiem "Odśwież"

**500 Internal Server Error:**
- **Przyczyna:** Nieoczekiwany błąd backendu
- **Obsługa:** Toast "Coś poszło nie tak. Spróbuj ponownie."
- **UI:** Przycisk "Spróbuj ponownie"

---

### 10.2. Błędy API - POST /api/feedbacks

**400 Bad Request (Invalid JSON):**
- **Obsługa:** Toast "Błąd wysyłania danych"

**401 Unauthorized:**
- **Obsługa:** Redirect do /login

**404 Location Not Found:**
- **Obsługa:** Toast "Lokalizacja nie istnieje", zamknij dialog

**422 Validation Error:**
- **Przyczyna:** Nieprawidłowe dane (np. `overall_rating` poza zakresem 1-5)
- **Obsługa:** Pokazuje błędy pod polami formularza
- **UI:** 
  ```tsx
  {error?.details?.overall_rating && (
    <p className="error">{error.details.overall_rating}</p>
  )}
  ```

**500 Internal Error:**
- **Obsługa:** Toast "Nie udało się zapisać feedbacku. Spróbuj ponownie."

---

### 10.3. Błędy sieciowe (Network Error)

**Brak połączenia:**
- **Detekcja:** `fetch()` rzuca `TypeError: Failed to fetch`
- **Obsługa:** Toast "Brak połączenia z internetem" + ikona offline
- **UI:** Przycisk "Spróbuj ponownie" po przywróceniu połączenia

**Timeout:**
- **Detekcja:** AbortController z timeout 10s
- **Obsługa:** Toast "Żądanie trwa zbyt długo. Spróbuj ponownie."

---

### 10.4. Empty States

**Brak lokalizacji użytkownika:**
- **Warunek:** Lista lokalizacji pusta
- **UI:**
  ```tsx
  <EmptyState
    icon={<MapPinIcon />}
    title="Brak lokalizacji"
    description="Dodaj lokalizację aby otrzymywać rekomendacje"
    action={<Button onClick={redirectToProfile}>Dodaj lokalizację</Button>}
  />
  ```

**Brak feedbacków w historii:**
- **Warunek:** `feedbacks.length === 0` po fetch
- **UI:**
  ```tsx
  <EmptyState
    icon={<HistoryIcon />}
    title="Brak zapisanych zestawów"
    description="Zestawy z oceną 4 lub 5 zapisują się automatycznie"
  />
  ```

**Brak wyników w historii (po filtrach):**
- **Warunek:** `feedbacks.length === 0` po zastosowaniu filtrów
- **UI:**
  ```tsx
  <EmptyState
    icon={<SearchIcon />}
    title="Brak wyników"
    description="Zmień filtry aby zobaczyć więcej zestawów"
    action={<Button onClick={resetFilters}>Resetuj filtry</Button>}
  />
  ```

---

### 10.5. Loading States

**Skeleton Screens:**
- Podczas ładowania rekomendacji:
  - SVG: skeleton z 7 szarymi strefami
  - Weather summary: skeleton card
  - Outfit list: 7× skeleton accordion items

**Spinners:**
- Przycisk "Zapisz feedback": spinner + disabled
- Przycisk "Pokaż wskazówki AI": spinner
- Load more w historii: spinner pod listą

**Progress Indicators:**
- Długi fetch (>2s): pokazuje progress bar u góry strony (NProgress)

---

## 11. Kroki implementacji

### Krok 1: Setup projektu i routing

1. Utworzyć stronę `src/pages/recommendations.astro`
2. Dodać do nawigacji link `/recommendations`
3. Zainstalować zależności:
   - `@tanstack/react-query` (cache i server state)
   - `date-fns` (formatowanie dat)
   - `use-debounce` (debounced callbacks)
4. Setup React Query provider w layout

### Krok 2: Typy i ViewModels

1. Dodać do `src/types.ts` nowe typy ViewModels:
   - `RecommendationFiltersViewModel`
   - `RecommendationViewState`
   - `FeedbackFormViewModel`
   - `HistoryFiltersViewModel`
   - `ZoneType`
   - `ApiError`

### Krok 3: Custom Hooks

1. Utworzyć `src/hooks/useRecommendation.ts`:
   - State management dla rekomendacji
   - Fetch recommendation (debounced)
   - Fetch AI tips
   - Refetch logic

2. Utworzyć `src/hooks/useFeedback.ts`:
   - State management dla formularza feedbacku
   - Submit logic
   - Validation helpers

3. Utworzyć React Query hooks w `src/queries/recommendations.ts`:
   - `useRecommendationQuery`
   - `useForecastQuery`
   - `useFeedbacksQuery` (infinite scroll)
   - `useSubmitFeedbackMutation`

### Krok 4: Komponenty prezentacyjne (bez logiki)

1. `WeatherSummary.tsx` - karta pogody
2. `ForecastDayCard.tsx` - kafelek dnia prognozy
3. `OutfitHistoryCard.tsx` - kafelek zestawu w historii

Wykorzystać shadcn/ui komponenty: Card, Badge, Separator

### Krok 5: CyclistSVG - sylwetka kolarza

1. Utworzyć `src/components/CyclistSVG.tsx`:
   - Narysować sylwetkę kolarza w pozycji na rowerze (SVG path)
   - Zdefiniować 7 stref jako osobne `<g>` elementy
   - Implementować kolory (niebieski/zielony/czerwony) bazując na `OutfitDTO`
   - Hover state → tooltip (shadcn/ui Tooltip)
   - Click handler → `onZoneClick`
   - Accessibility: `role="button"`, `tabIndex`, `aria-label`

2. Logika kolorowania (przykład):
   ```typescript
   const getZoneColor = (zone: ZoneType, outfit: OutfitDTO) => {
     const item = getOutfitItem(zone, outfit);
     
     // Przykładowa logika (do dostosowania):
     if (item === 'nic') return 'text-red-500'; // może być gorąco
     if (item.includes('zimowe') || item.includes('czapka')) return 'text-blue-500'; // ochrona przed zimnem
     return 'text-green-500'; // optymalnie
   };
   ```

### Krok 6: OutfitDetailsList - lista szczegółów

1. Utworzyć `src/components/OutfitDetailsList.tsx`:
   - Accordion (shadcn/ui) z 7 sekcjami
   - Każda sekcja: ikona + nazwa strefy + szczegóły
   - Tułów: 3 warstwy (base, mid, outer)
   - Stopy: skarpety + ochraniacze
   - Programatyczne rozwijanie na `expandedZone` prop

2. Ikony dla części garderoby:
   - Lucide React icons lub custom SVG icons
   - Mapowanie nazwy ubioru → ikona (helper function)

### Krok 7: RecommendationFilters - filtry

1. Utworzyć `src/components/RecommendationFilters.tsx`:
   - 4 selecty: LocationSelect, ActivityTypeSelect, DurationSelect, DatePicker
   - Wykorzystać shadcn/ui: Select, Calendar, Popover
   - DatePicker: minDate=today, maxDate=today+7, disabled past dates
   - Callback `onFiltersChange` (debounced 500ms)
   - Przycisk Odśwież

2. Fetch listy lokalizacji użytkownika:
   - Endpoint: GET /api/locations (zakładam, że istnieje)
   - Query: `useQuery({ queryKey: ['locations'], queryFn: fetchLocations })`

### Krok 8: AdditionalTipsSection - wskazówki AI

1. Utworzyć `src/components/AdditionalTipsSection.tsx`:
   - Domyślnie: przycisk "Pokaż wskazówki AI"
   - Po kliknięciu: loader → fetch tips
   - Wyświetlanie listy tips (`<ul><li>`)
   - Obsługa rate limit: disabled button + Alert

### Krok 9: AddFeedbackCTA - call to action

1. Utworzyć `src/components/AddFeedbackCTA.tsx`:
   - Button "Dodaj feedback po treningu"
   - Callback: `onClick={() => setFeedbackDialogOpen(true)}`

### Krok 10: FeedbackDialog - modal feedbacku

1. Utworzyć `src/components/FeedbackDialog.tsx`:
   - Dialog (shadcn/ui) z formularzem
   - Sekcja 1: Przypomnienie warunków (WeatherSummary compact)
   - Sekcja 2: Radio "Czy zastosowałeś się?"
   - Sekcja 3: OutfitEditor (jeśli "Nie")
   - Sekcja 4: RatingEmojis (1-5)
   - Sekcja 5: Accordion z ZoneRatingsInput
   - Sekcja 6: Textarea (notatki)
   - Sekcja 7: Switch (udostępnij społeczności)
   - Footer: Anuluj, Zapisz (loading state)

2. Utworzyć `src/components/RatingEmojis.tsx`:
   - 5 przycisków z emoji (🥶 😰 😊 🥵 🔥)
   - Selected state (większy rozmiar, border)

3. Utworzyć `src/components/ZoneRatingsInput.tsx`:
   - 7× mini RatingEmojis (po jednym na strefę)
   - Opcjonalne (można zostawić puste)

4. Utworzyć `src/components/OutfitEditor.tsx`:
   - Mini formularz z selectami dla wszystkich 7 stref
   - Tułów: 3 selecty (base, mid, outer)
   - Wykorzystać predefiniowane opcje (z `src/constants/outfit.constants.ts`)

### Krok 11: RecommendationView - główny widok rekomendacji

1. Utworzyć `src/components/RecommendationView.tsx` (React Island):
   - Layout: desktop 2 kolumny (Grid), mobile stack
   - Lewa kolumna: CyclistSVG
   - Prawa kolumna: OutfitDetailsList
   - Mobile: Tabs (shadcn/ui) → "Sylwetka" | "Szczegóły"
   - State: `selectedZone` (synchronizacja między SVG a listą)

2. Wykorzystać hook `useRecommendation`:
   ```typescript
   const {
     recommendation,
     isLoadingRecommendation,
     error,
     setFilters,
     fetchAiTips,
   } = useRecommendation(defaultLocationId);
   ```

3. Conditional rendering:
   - Loading: skeleton screens
   - Error: error alert + retry button
   - Success: render SVG + lista

### Krok 12: WeeklyForecast - prognoza tygodniowa

1. Utworzyć `src/components/WeeklyForecast.tsx` (React Island):
   - Grid 7 kart (1 per dzień)
   - Fetch: `useForecastQuery(locationId)`
   - Render: `ForecastDayCard` × 7
   - Click handler: `onDaySelect(date)` → przełącz na zakładkę "Aktualna"

### Krok 13: OutfitHistory - historia zestawów

1. Utworzyć `src/components/OutfitHistory.tsx` (React Island):
   - Fetch: `useFeedbacksQuery(filters)` z infinite scroll
   - Render: `OutfitHistoryCard[]`
   - Load more button
   - HistoryFilters component
   - Empty state

2. Utworzyć `src/components/HistoryFilters.tsx`:
   - Temperature slider (shadcn/ui Slider)
   - Season select
   - Activity type select
   - Sort select
   - Reset button

### Krok 14: Główna strona - RecommendationsPage

1. W `src/pages/recommendations.astro`:
   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
   import RecommendationView from '../components/RecommendationView';
   import WeeklyForecast from '../components/WeeklyForecast';
   import OutfitHistory from '../components/OutfitHistory';
   
   // Get default location from user profile (server-side)
   const defaultLocationId = await getDefaultLocation(Astro.locals.userId);
   ---
   
   <Layout title="Rekomendacje - CycleGear">
     <div class="container mx-auto py-8">
       <h1 class="text-3xl font-bold mb-6">Rekomendacje ubioru</h1>
       
       <Tabs defaultValue="current" client:load>
         <TabsList>
           <TabsTrigger value="current">Aktualna rekomendacja</TabsTrigger>
           <TabsTrigger value="forecast">Prognoza tygodniowa</TabsTrigger>
           <TabsTrigger value="history">Historia zestawów</TabsTrigger>
         </TabsList>
         
         <TabsContent value="current">
           <RecommendationView defaultLocationId={defaultLocationId} client:load />
         </TabsContent>
         
         <TabsContent value="forecast">
           <WeeklyForecast locationId={defaultLocationId} client:load />
         </TabsContent>
         
         <TabsContent value="history">
           <OutfitHistory client:load />
         </TabsContent>
       </Tabs>
     </div>
   </Layout>
   ```

### Krok 15: Styling i responsywność

1. Desktop layout (≥1024px):
   - RecommendationView: CSS Grid 2 kolumny (50/50)
   - Forecast: Grid 7 kolumn (auto-fit)
   - History: Grid 2-3 kolumny

2. Tablet layout (768-1023px):
   - RecommendationView: 2 kolumny (40/60)
   - Forecast: Grid 3-4 kolumny
   - History: Grid 2 kolumny

3. Mobile layout (<768px):
   - RecommendationView: Tabs (Sylwetka | Szczegóły)
   - Forecast: Scroll horizontal (snap)
   - History: Single column, cards

4. Tailwind classes:
   ```tsx
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
     {/* SVG + Lista */}
   </div>
   ```

### Krok 16: Obsługa błędów i edge cases

1. Implementować error boundaries (React):
   ```tsx
   <ErrorBoundary fallback={<ErrorFallback />}>
     <RecommendationView />
   </ErrorBoundary>
   ```

2. Toast notifications:
   - Wykorzystać shadcn/ui Toaster + useToast hook
   - Pokazywać dla błędów API, sukcesów (feedback submitted)

3. Empty states:
   - Komponent `EmptyState.tsx` (reusable)
   - Wykorzystywać w historii, prognozie (jeśli brak danych)

### Krok 17: Testy

1. Unit testy (Vitest):
   - Hooks: `useRecommendation.test.ts`, `useFeedback.test.ts`
   - Utils: funkcje mapowania, walidacji

2. Component testy (React Testing Library):
   - `CyclistSVG.test.tsx`: render, click zones, tooltips
   - `FeedbackDialog.test.tsx`: form submission, walidacja
   - `RecommendationFilters.test.tsx`: zmiana filtrów

3. E2E testy (Playwright):
   - Flow: otwórz rekomendacje → zmień parametry → zobacz rekomendację → dodaj feedback
   - Flow: prognoza → kliknij dzień → generuj rekomendację
   - Flow: historia → filtruj → kliknij zestaw

### Krok 18: Optymalizacja wydajności

1. React Query cache:
   - staleTime: 30 min (current), 6h (forecast)
   - Refetch on window focus
   - Deduplikacja requests

2. Debouncing:
   - Filtry: 500ms
   - History filters: 300ms (slider)

3. Lazy loading:
   - Infinite scroll w historii (React Query `useInfiniteQuery`)
   - Load more button

4. Code splitting:
   - Astro Islands automatycznie robią code splitting
   - Dynamic import dla ciężkich komponentów (jeśli potrzeba)

### Krok 19: Accessibility (a11y)

1. SVG zones:
   - `role="button"`, `tabIndex={0}`, `aria-label`
   - Focus visible (outline)
   - Keyboard navigation (Enter/Space)

2. Formularze:
   - Labels powiązane z inputami (`<label htmlFor>`)
   - Error messages z `aria-describedby`
   - Required fields z `aria-required`

3. Dialog:
   - Focus trap (shadcn/ui Dialog ma to built-in)
   - Escape zamyka dialog
   - Focus powraca do triggera po zamknięciu

4. Testy a11y:
   - axe-core w testach (jest-axe)

### Krok 20: Dokumentacja

1. Dodać komentarze JSDoc do komponentów:
   ```typescript
   /**
    * CyclistSVG - Interactive cyclist silhouette with 7 clickable zones
    * @param outfit - Complete outfit recommendation (7 zones)
    * @param selectedZone - Currently selected zone (for highlighting)
    * @param onZoneClick - Callback when zone is clicked
    */
   ```

2. README dla komponentów (jeśli complex logic)

3. Storybook (opcjonalnie):
   - Stories dla każdego komponentu
   - Różne stany (loading, error, empty)

---

## Podsumowanie

Plan implementacji widoku Rekomendacji obejmuje:

- **20 kroków implementacji** od setup projektu do dokumentacji
- **13 głównych komponentów** (5 React Islands, 8 komponentów prezentacyjnych)
- **4 custom hooki** (useRecommendation, useFeedback, React Query hooks)
- **5 nowych typów ViewModels**
- **4 endpointy API** (recommendations, forecast, feedbacks GET/POST)
- **Pełną obsługę błędów** (10+ scenariuszy)
- **Responsywność** (mobile/tablet/desktop)
- **Accessibility** (ARIA, keyboard navigation)

Szacowany czas implementacji: **3-4 tygodnie** (1 developer full-time).

Priorytet implementacji:
1. **Tydzień 1:** Kroki 1-7 (setup, typy, hooki, komponenty prezentacyjne, SVG)
2. **Tydzień 2:** Kroki 8-11 (AI tips, feedback dialog, główny widok)
3. **Tydzień 3:** Kroki 12-14 (prognoza, historia, strona główna)
4. **Tydzień 4:** Kroki 15-20 (styling, błędy, testy, a11y, optymalizacja)

