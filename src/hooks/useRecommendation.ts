import { useState, useCallback } from "react";
import { formatISO } from "date-fns";
import { useDebouncedCallback } from "use-debounce";
import type {
  RecommendationFiltersViewModel,
  RecommendationViewState,
  RecommendationDTO,
  ApiError,
} from "../types";

/**
 * Custom hook for managing recommendation state and API calls
 * Handles debounced fetching, AI tips, and error states
 */
export function useRecommendation(defaultLocationId?: string) {
  const [state, setState] = useState<RecommendationViewState>({
    filters: {
      locationId: defaultLocationId || "",
      activityType: "spokojna",
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
  const fetchRecommendation = useDebouncedCallback(
    async (filters: RecommendationFiltersViewModel) => {
      console.info(
        "useRecommendation: fetchRecommendation called with filters:",
        filters,
      );
      setState((prev) => ({
        ...prev,
        isLoadingRecommendation: true,
        error: null,
      }));

      try {
        const params: Record<string, string> = {
          activity_type: filters.activityType,
          duration_minutes: filters.durationMinutes.toString(),
        };

        // Get coordinates for weather data
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 300000, // 5 minutes
                });
              },
            );

            params.lat = position.coords.latitude.toString();
            params.lng = position.coords.longitude.toString();
            console.info(
              "useRecommendation: Got coordinates from geolocation:",
              params.lat,
              params.lng,
            );
          } catch (_geoError) {
            console.warn(
              "Geolocation not available, using default location (Warsaw)",
            );
            // Fallback to Warsaw coordinates
            params.lat = "52.237049";
            params.lng = "21.017532";
            console.info(
              "useRecommendation: Using fallback coordinates:",
              params.lat,
              params.lng,
            );
          }
        } else {
          console.warn(
            "Geolocation not supported, using default location (Warsaw)",
          );
          // Fallback to Warsaw coordinates
          params.lat = "52.237049";
          params.lng = "21.017532";
          console.info(
            "useRecommendation: Using fallback coordinates:",
            params.lat,
            params.lng,
          );
        }

        if (filters.selectedDate) {
          params.date = formatISO(filters.selectedDate, {
            representation: "date",
          });
        }

        const queryString = new URLSearchParams(params).toString();
        console.info("useRecommendation: Calling API with params:", params);
        const response = await fetch(`/api/recommendations?${queryString}`);

        if (!response.ok) {
          const errorData = await response.json();
          const error: ApiError = {
            code: errorData.error?.code || "UNKNOWN_ERROR",
            message:
              errorData.error?.message ||
              "Wystąpił błąd podczas pobierania rekomendacji",
            statusCode: response.status,
            details: errorData.error?.details,
            retryAfter: response.headers.get("Retry-After")
              ? parseInt(response.headers.get("Retry-After")!)
              : undefined,
          };
          throw error;
        }

        const data: RecommendationDTO = await response.json();

        setState((prev) => ({
          ...prev,
          recommendation: data,
          isLoadingRecommendation: false,
          aiTips: data.additional_tips || [], // May be included in the main response
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error as ApiError,
          isLoadingRecommendation: false,
        }));
      }
    },
    500,
  );

  // Fetch AI tips (optional, on-demand)
  const fetchAiTips = useCallback(async () => {
    if (state.rateLimitedUntil && new Date() < state.rateLimitedUntil) {
      return; // Still rate limited
    }

    setState((prev) => ({ ...prev, isLoadingAiTips: true }));

    try {
      // For MVP, AI tips might be included in the main recommendation response
      // This is a placeholder for future AI tips endpoint
      const response = await fetch("/api/recommendations/ai-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // recommendation_id: state.recommendation?.id, // Not available in current DTO
          weather_conditions: state.recommendation?.weather,
        }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const rateLimitedUntil = retryAfter
          ? new Date(Date.now() + parseInt(retryAfter) * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

        setState((prev) => ({
          ...prev,
          rateLimitedUntil,
          isLoadingAiTips: false,
        }));
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch AI tips");
      }

      const tips: string[] = await response.json();

      setState((prev) => ({
        ...prev,
        aiTips: tips,
        isLoadingAiTips: false,
      }));
    } catch (_error) {
      setState((prev) => ({ ...prev, isLoadingAiTips: false }));
    }
  }, [state.rateLimitedUntil, state.recommendation?.weather]);

  // Update filters
  const setFilters = useCallback(
    (filters: Partial<RecommendationFiltersViewModel>) => {
      const newFilters = { ...state.filters, ...filters };
      setState((prev) => ({ ...prev, filters: newFilters }));
      fetchRecommendation(newFilters);
    },
    [state.filters, fetchRecommendation],
  );

  // Initialize recommendation (for direct calling without filters)
  const initializeRecommendation = useCallback(() => {
    console.info(
      "initializeRecommendation: Calling fetchRecommendation with default filters",
    );
    fetchRecommendation(state.filters);
  }, [state.filters, fetchRecommendation]);

  // Refetch current recommendation
  const refetch = useCallback(() => {
    fetchRecommendation(state.filters);
  }, [state.filters, fetchRecommendation]);

  return {
    ...state,
    setFilters,
    fetchAiTips,
    refetch,
    initializeRecommendation,
  };
}
