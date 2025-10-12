

## Widok 8: Auth (Logowanie/Rejestracja/Reset)

### Opis widoku (z ui-plan.md)



### User Stories (z prd.md)

*

### Endpointy API (z api-plan.md)

---

## Widok 9: Strony informacyjne

### Opis widoku (z ui-plan.md)

- **Nazwa widoku**: Strony informacyjne (Landing/Legal)
- **Ścieżka widoku**: `/`, `/legal/privacy`, `/legal/terms`, `/about`
- **Główny cel**: Informacje o produkcie i politykach.
- **Kluczowe informacje do wyświetlenia**:
  - Treści statyczne SSG; linki w footerze; kontakt.
- **Kluczowe komponenty widoku**:
  - Sekcje treści, nawigacja do rejestracji.
- **UX, dostępność i względy bezpieczeństwa**:
  - SSG szybkie czasy ładowania; SEO; dostępność treści.


---

## Podsumowanie: Mapa widoków → API

| Widok | Główne endpointy | Cache TTL |
|-------|------------------|-----------|
| Dashboard | GET /api/dashboard | 5 min |
| Rekomendacje | GET /api/recommendations, GET /api/weather/forecast, POST /api/feedbacks, GET /api/feedbacks | 30 min (current), 6h (forecast) |
| Społeczność | GET /api/community/outfits, GET /api/feedbacks | 5 min |
| Sprzęt - lista | GET /api/bikes, POST /api/bikes, PUT /api/bikes/{id}, DELETE /api/bikes/{id} | Session cache |
| Sprzęt - szczegóły | GET/POST/PUT/DELETE /api/bikes/{bikeId}/services, GET /api/bikes/{bikeId}/services/stats, GET/POST/PUT/DELETE /api/bikes/{bikeId}/reminders, PATCH /api/bikes/{id}/mileage, GET /api/default-intervals | Session cache |
| Profil | GET/PUT/DELETE /api/profile, GET /api/profile/export, GET/POST/PUT/DELETE /api/locations, GET/DELETE /api/feedbacks | Session cache |
| Onboarding | POST /api/locations, PUT /api/profile, POST /api/bikes | N/A |
| Auth | Supabase Auth SDK (nie własne API) | N/A |
| Strony informacyjne | Brak (SSG) | N/A |

---

**Koniec dokumentu chunks.md**


