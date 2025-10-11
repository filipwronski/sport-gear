# Feedback API Implementation

System feedbacku pozwala użytkownikom na zapisywanie opinii po treningach dotyczących tego, jak czuli się w danym stroju w określonych warunkach pogodowych. Ten system jest kluczowy dla personalizacji AI, ponieważ zbiera dane do obliczania `thermal_adjustment` użytkownika.

## Endpoints

### GET /api/feedbacks
Pobieranie historii feedbacków użytkownika z filtrowaniem i sortowaniem.

**Query Parameters:**
- `limit` (optional): 1-30, default 30
- `offset` (optional): >= 0, default 0
- `activity_type` (optional): recovery|spokojna|tempo|interwaly
- `rating` (optional): 1-5
- `sort` (optional): created_at_desc|created_at_asc|rating_desc|rating_asc

**Response:** `FeedbacksListDTO` with feedbacks array, total count, and has_more flag.

### POST /api/feedbacks
Tworzenie nowego feedbacku po treningu.

**Request Body:**
```typescript
{
  location_id: string;              // UUID, required
  temperature: number;              // Celsius, required, -50 to 50
  feels_like: number;               // Celsius, required, -50 to 50
  wind_speed: number;               // km/h, required, >= 0
  humidity: number;                 // %, required, 0-100
  rain_mm?: number;                 // mm, optional, >= 0
  activity_type: ActivityTypeEnum;  // required
  duration_minutes: number;         // required, > 0
  actual_outfit: OutfitDTO;         // required, complete 7-zone structure
  overall_rating: number;           // required, 1-5
  zone_ratings?: ZoneRatings;       // optional, values 1-5
  notes?: string;                   // optional, max 500 chars
  shared_with_community?: boolean;  // optional, default: false
}
```

**Response:** Created `FeedbackDTO` with 201 status.

### DELETE /api/feedbacks/{id}
Usuwanie feedbacku użytkownika.

**URL Parameters:**
- `id`: UUID of feedback to delete

**Response:** 204 No Content on success.

## Outfit Structure

System obsługuje 7 stref ciała z predefiniowanymi opcjami:

```typescript
{
  head: "czapka" | "opaska" | "buff" | "nic";
  torso: {
    base: "koszulka_kr" | "koszulka_dl" | "termo";
    mid: "kurtka_lekka" | "softshell" | "nic";
    outer: "kurtka_zimowa" | "wiatrowka" | "nic";
  };
  arms: "rekawki" | "naramienniki" | "nic";
  hands: "rekawiczki_zimowe" | "przejsciowe" | "letnie" | "nic";
  legs: "dlugie" | "3/4" | "krotkie" | "getry";
  feet: {
    socks: "zimowe" | "letnie";
    covers: "ochraniacze" | "nic";
  };
  neck: "komin" | "buff" | "nic";
}
```

## Business Logic

### Personalization System
- Po zebraniu 5+ feedbacków system automatycznie personalizuje rekomendacje
- `thermal_adjustment` obliczany na podstawie proporcji ocen "zimno" (1-2) vs "gorąco" (4-5)
- Trigger `update_thermal_adjustment` automatycznie przelicza wartość przy aktualizacji `feedback_count`

### Feedback Limits
- Maksymalnie 30 feedbacków per użytkownik
- Trigger `cleanup_old_feedbacks` automatycznie usuwa najstarsze feedbacki

### Community Sharing
- Feedbacki mogą być udostępniane społeczności (`shared_with_community = true`)
- Trigger `create_shared_outfit_from_feedback` tworzy anonimowy wpis w `shared_outfits`

## Database Integration

### Tables
- `outfit_feedbacks`: główna tabela feedbacków
- `shared_outfits`: anonimowe wpisy społeczności
- `profiles`: przechowuje `thermal_adjustment` i `feedback_count`

### Triggers
- `cleanup_old_feedbacks`: limit 30 feedbacków per użytkownik
- `create_shared_outfit_from_feedback`: udostępnianie społeczności
- `update_thermal_adjustment`: personalizacja AI

### RLS (Row Level Security)
- Wszystkie tabele mają włączone RLS
- Użytkownicy mogą dostępować tylko do swoich feedbacków
- W development używamy `supabaseServiceClient` do bypass RLS

## Testing

### Quick Test
```bash
./feedback_quick_test.sh
```
Podstawowe testy dostępności wszystkich endpointów.

### Comprehensive Test
```bash
./feedback_test_api.sh
```
Pełny zestaw testów z walidacją, edge cases i business logic.

## Implementation Files

- `src/services/feedback.service.ts` - Business logic
- `src/lib/validation/feedback.validator.ts` - Validation utilities
- `src/constants/outfit.constants.ts` - Outfit options constants
- `src/pages/api/feedbacks/index.ts` - GET/POST endpoints
- `src/pages/api/feedbacks/[id].ts` - DELETE endpoint

## Authentication

Wszystkie endpointy wymagają autentyfikacji przez middleware:
- Header: `Authorization: Bearer <supabase_jwt_token>`
- W development: mock tokeny (`test-token`, `mock-jwt-token`, `dev-token`)

## Error Handling

Konsystentne kody błędów:
- 200: Success (GET)
- 201: Created (POST)
- 204: No Content (DELETE)
- 400: Bad Request (invalid parameters)
- 401: Unauthorized (missing/invalid auth)
- 404: Not Found (resource doesn't exist)
- 422: Unprocessable Entity (validation errors)
- 500: Internal Server Error

Wszystkie błędy zwracają strukturę:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [{"field": "field_name", "message": "Field error"}]
  }
}
```
