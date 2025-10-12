import type {
  GetCommunityOutfitsParams,
  CommunityOutfitsListDTO,
  FeedbackDTO,
  ApiErrorResponse,
  CommunityOutfitDTO,
} from "../../types";

/**
 * Custom error class for community API errors
 */
export class CommunityApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorResponse,
  ) {
    super(body.error.message || body.error.code);
    this.name = "CommunityApiError";
  }
}

/**
 * Handle community API errors and return user-friendly messages
 */
export function handleCommunityApiError(error: CommunityApiError): string {
  switch (error.status) {
    case 400:
      // Validation error - display details
      const details = Object.entries(error.body.error.details || {})
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("; ");
      return `Błąd walidacji: ${details}`;

    case 401:
      // Unauthorized - redirect to login
      window.location.href = "/auth/login";
      return "Sesja wygasła. Proszę zalogować się ponownie.";

    case 404:
      if (error.body.error.code === "LOCATION_NOT_FOUND") {
        return "Wybrana lokalizacja nie została znaleziona. Wybierz inną lokalizację.";
      }
      return "Nie znaleziono wyników dla podanych kryteriów.";

    case 500:
      return "Wystąpił błąd serwera. Spróbuj ponownie za chwilę.";

    default:
      return "Wystąpił nieoczekiwany błąd. Sprawdź połączenie z internetem.";
  }
}

/**
 * Fetch community outfits based on filters
 * GET /api/community/outfits
 */
export async function fetchCommunityOutfits(
  params: GetCommunityOutfitsParams,
): Promise<CommunityOutfitsListDTO> {
  const searchParams = new URLSearchParams();

  // Add all parameters to URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  const response = await fetch(
    `/api/community/outfits?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // for cookies with session
    },
  );

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw new CommunityApiError(response.status, error);
  }

  return response.json();
}

/**
 * Fetch user's shared outfits
 * GET /api/feedbacks (with shared_with_community=true)
 */
export async function fetchMySharedOutfits(
  limit = 20,
  offset = 0,
): Promise<FeedbackDTO[]> {
  const params = new URLSearchParams({
    shared_with_community: "true",
    limit: String(limit),
    offset: String(offset),
    sort: "created_at_desc",
  });

  const response = await fetch(`/api/feedbacks?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      window.location.href = "/auth/login";
      throw new CommunityApiError(response.status, {
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const error: ApiErrorResponse = await response.json();
    throw new CommunityApiError(response.status, error);
  }

  const data = await response.json();
  return data.feedbacks || [];
}

/**
 * Stop sharing an outfit (remove from community)
 * PATCH /api/feedbacks/{id}
 */
export async function stopSharingOutfit(outfitId: string): Promise<void> {
  const response = await fetch(`/api/feedbacks/${outfitId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      shared_with_community: false,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = "/auth/login";
      throw new CommunityApiError(response.status, {
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const error: ApiErrorResponse = await response.json();
    throw new CommunityApiError(response.status, error);
  }
}

/**
 * Utility function to normalize outfit data from API
 * Provides fallbacks for missing data
 */
export function normalizeOutfit(outfit: CommunityOutfitDTO): CommunityOutfitDTO {
  return {
    ...outfit,
    user_pseudonym: outfit.user_pseudonym || "Anonim",
    reputation_badge: outfit.reputation_badge || "nowicjusz",
    feedback_count: Math.max(0, outfit.feedback_count || 0),
    distance_km: Math.max(0, outfit.distance_km || 0),
    overall_rating: Math.max(1, Math.min(5, outfit.overall_rating || 3)),
    weather_conditions: {
      temperature: outfit.weather_conditions?.temperature ?? 0,
      feels_like: outfit.weather_conditions?.feels_like ?? 0,
      wind_speed: outfit.weather_conditions?.wind_speed ?? 0,
      humidity: outfit.weather_conditions?.humidity ?? 50,
      rain_mm: outfit.weather_conditions?.rain_mm ?? 0,
    },
  };
}
