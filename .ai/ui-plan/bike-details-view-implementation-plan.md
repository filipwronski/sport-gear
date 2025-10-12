<implementation_breakdown>
1. **Analiza sekcji wejściowych:**
   - **PRD**: Aplikacja CycleGear skupia się na zarządzaniu sprzętem rowerowym i rekomendacjach ubioru. Wymaga responsywnego designu, obsługi błędów i stanów pustych. Kluczowe: mobile-first, toast notifications, loading states.
   - **User Stories**: 5 historii (US-020 do US-024) dotyczących zarządzania serwisami rowerów. Wymagają formularzy, tabel, wykresów, filtrów i eksportu. Ograniczenia: walidacja danych, domyślne wartości, paginacja.
   - **Endpoint Description**: Kompletne API REST dla serwisów, przypomnień i kosztów. Wymagania: paginacja (limit/offset), filtry, sortowanie, walidacja (mileage >= current), optimistic updates. Ograniczenia: rate limits, autoryzacja.
   - **Endpoint Implementation**: Brak konkretnej implementacji podanej - będę zakładać standardowe implementacje Supabase Edge Functions.
   - **Type Definitions**: Kompletne typy TypeScript z Supabase. Wszystkie DTO już zdefiniowane, ale mogą wymagać custom ViewModels dla UI.
   - **Tech Stack**: Astro + React Islands, Tailwind + shadcn/ui, Supabase. Wyzwania: Islands architecture (interaktywne komponenty), responsywność, performance.

2. **Kluczowe wymagania z PRD:**
   - Widok szczegółów roweru z zakładkami (Historia, Przypomnienia, Koszty)
   - Quick action aktualizacji przebiegu z walidacją
   - Tabela/karty serwisów z filtrami i sortowaniem
   - Lista przypomnień z kolorowymi statusami
   - Dashboard kosztów z KPI, wykresami kołowymi/liniowymi
   - Responsywność (mobile-first), obsługa błędów, empty states
   - Optimistic UI dla aktualizacji

3. **Główne komponenty:**
   - **BikeDetailsPage**: Główny kontener z routingiem, ładowaniem danych roweru
   - **BikeHeader**: Nagłówek z nazwą, typem, przebiegiem roweru
   - **QuickMileageUpdate**: Formularz aktualizacji przebiegu (PATCH /mileage)
   - **ServiceHistory**: Zakładka z tabelą/kartami serwisów, filtrami, eksportem
   - **ServiceReminders**: Zakładka z listą przypomnień, akcją "oznacz jako zrobione"
   - **ServiceCosts**: Zakładka z KPI, wykresami i tabelą kosztów
   - **ServiceFilters**: Multi-select filtry dla typów serwisów
   - **ServiceTable**: Tabela desktop (data, typ, przebieg, koszt, akcje)
   - **ServiceCards**: Karty mobile dla serwisów
   - **ReminderList**: Lista przypomnień z badge'ami statusów
   - **CostCharts**: Wykresy kołowe (breakdown) i liniowe (timeline)

4. **Diagram drzewa komponentów:**
```
BikeDetailsPage (Astro page)
├── BikeHeader (React Island)
│   ├── BikeInfo (nazwa, typ, przebieg)
│   └── QuickMileageUpdate (form + button)
├── TabsNavigation (shadcn Tabs)
│   ├── ServiceHistoryTab
│   │   ├── ServiceFilters (multi-select + date range)
│   │   ├── ServiceTable (desktop) / ServiceCards (mobile)
│   │   └── ExportButton (CSV download)
│   ├── RemindersTab
│   │   └── ReminderList (z CompleteReminderAction per item)
│   └── CostsTab
│       ├── CostKPIs (suma, koszt/km)
│       ├── CostBreakdownChart (pie chart)
│       ├── CostTimelineChart (line chart)
│       └── CostDetailsTable (filtrable table)
```

5. **DTO i ViewModel:**
   - **BikeDTO** (z types.ts): id, name, type, current_mileage, next_service
   - **ServiceRecordDTO**: id, service_date, mileage_at_service, service_type, cost, etc.
   - **ServiceReminderDTO**: id, service_type, target_mileage, km_remaining, status
   - **ServiceStatsDTO**: total_cost, breakdown_by_type, timeline
   - **Custom ViewModels:**
     - **ServiceFiltersVM**: { serviceTypes: ServiceTypeEnum[], dateFrom?: string, dateTo?: string, sort: string }
     - **ReminderStatusVM**: { id: string, status: 'upcoming'|'due'|'overdue', color: string, label: string }
     - **CostFiltersVM**: { period: 'month'|'quarter'|'year'|'all', serviceType?: ServiceTypeEnum }
     - **BikeDetailsVM**: { bike: BikeDTO, isLoading: boolean, error?: string }

6. **Stan i hooki:**
   - **useBikeDetails**: Custom hook do ładowania BikeDTO, obsługa loading/error states
   - **useServiceHistory**: Hook z paginacją, filtrami, sortowaniem dla GET /services
   - **useServiceReminders**: Hook dla GET /reminders z akcją complete
   - **useServiceStats**: Hook dla GET /services/stats z cachingiem
   - **Local state**: useState dla filtrów UI, modal states, optimistic updates
   - **Custom hook useOptimisticUpdate**: Dla mileage update z rollback na error

7. **API calls i akcje:**
   - GET /api/bikes/{bikeId} -> BikeDTO
   - PATCH /api/bikes/{bikeId}/mileage -> UpdateBikeMileageResponse (optimistic)
   - GET /api/bikes/{bikeId}/services (params: filters) -> ServicesListDTO
   - POST /api/bikes/{bikeId}/services -> ServiceRecordDTO (redirect do historii)
   - PUT /api/bikes/{bikeId}/services/{id} -> ServiceRecordDTO (inline edit)
   - DELETE /api/bikes/{bikeId}/services/{id} -> 204 (remove z listy)
   - GET /api/bikes/{bikeId}/reminders -> ServiceReminderDTO[]
   - PUT /api/bikes/{bikeId}/reminders/{id}/complete -> 200 (update status)
   - GET /api/bikes/{bikeId}/services/stats -> ServiceStatsDTO

8. **Mapowanie US do implementacji:**
   - **US-020**: "Dodaj serwis" button w ServiceHistory -> otwiera modal z formularzem POST /services
   - **US-021**: ServiceHistory komponent -> tabela/karty z GET /services, filtry, eksport CSV
   - **US-022**: ServiceReminders komponent -> lista z GET /reminders, complete action
   - **US-023**: ServiceCosts komponent -> KPI + charts z GET /services/stats
   - **US-024**: BikeHeader + QuickMileageUpdate -> podsumowanie stanu, quick action PATCH /mileage

9. **Interakcje użytkownika:**
   - Kliknięcie "Zaktualizuj przebieg" -> optimistic update, toast success/error
   - Filtrowanie serwisów -> natychmiastowe query z params
   - Sortowanie tabeli -> update sort param, reload data
   - "Oznacz jako zrobione" w przypomnieniu -> optimistic update status
   - Eksport CSV -> download blob z filtered data
   - Przełączanie zakładek -> lazy loading komponentów
   - Mobile: hamburger menu, cards zamiast tabel

10. **Warunki API i walidacja:**
    - Mileage update: current_mileage >= bike.current_mileage (error 400)
    - Service create: service_date, mileage_at_service, service_type wymagane
    - Reminder complete: wymaga completed_service_id
    - Paginacja: limit <=100, offset >=0
    - Frontend walidacja: Form schemas z zod, error boundaries

11. **Scenariusze błędów:**
    - Network error: Retry button, offline message
    - 400 Validation: Highlight fields, show error messages
    - 404 Bike not found: Redirect to /gear with error toast
    - 401 Unauthorized: Redirect to login
    - API timeout: Loading skeleton, then error state
    - Empty states: Custom illustrations + call-to-action buttons

12. **Wyzwania i rozwiązania:**
    - **Responsywność tabel**: Użyj react-table z custom renderer dla mobile (cards)
    - **Wykresy kosztów**: Chart.js lub Recharts z lazy loading
    - **Optimistic updates**: Custom hook z rollback na error, loading states
    - **Performance**: Virtual scrolling dla długich list, caching API responses
    - **Accessibility**: ARIA labels, keyboard navigation, color-blind friendly status colors
    - **State management**: Context API dla shared state między zakładkami, lub Zustand jeśli zbyt złożone
</implementation_breakdown>