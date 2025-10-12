import { useState, useEffect, useMemo, useCallback } from "react";
import { useDebounce } from "./useDebounce";
import type {
  CommunityFiltersState,
  CommunityViewState,
  CommunityOutfitDTO,
  GetCommunityOutfitsParams,
  ActivityTypeEnum,
  ReputationBadgeEnum,
} from "../types";
import { DEFAULT_COMMUNITY_FILTERS } from "../types";
import {
  fetchCommunityOutfits,
  handleCommunityApiError,
  CommunityApiError,
} from "../lib/api/community";

interface UseCommunityViewParams {
  defaultLocationId?: string;
}

interface UseCommunityViewReturn {
  // State
  state: CommunityViewState;

  // Filter actions
  setFilters: (filters: Partial<CommunityFiltersState>) => void;
  resetFilters: () => void;
  setLocationId: (id: string) => void;
  setSort: (sort: CommunityFiltersState["sort"]) => void;

  // Pagination actions
  loadMore: () => void;
  goToPage: (page: number) => void;

  // Modal actions
  openOutfitDetail: (id: string) => void;
  closeOutfitDetail: () => void;

  // Utility
  refetch: () => Promise<void>;
  getActiveFiltersCount: () => number;
}

/**
 * Parse filters from URL search params
 */
function parseFiltersFromURL(
  searchParams: URLSearchParams,
  defaultLocationId?: string,
): CommunityFiltersState {
  return {
    location_id: searchParams.get("location_id") || defaultLocationId || "",
    radius_km: parseInt(
      searchParams.get("radius_km") ||
        String(DEFAULT_COMMUNITY_FILTERS.radius_km),
    ),
    temperature: searchParams.get("temperature")
      ? parseFloat(searchParams.get("temperature")!)
      : undefined,
    temperature_range: parseInt(
      searchParams.get("temperature_range") ||
        String(DEFAULT_COMMUNITY_FILTERS.temperature_range),
    ),
    wind_speed: searchParams.get("wind_speed")
      ? parseFloat(searchParams.get("wind_speed")!)
      : undefined,
    activity_type: (searchParams.get("activity_type") as ActivityTypeEnum) || undefined,
    min_rating: searchParams.get("min_rating")
      ? parseInt(searchParams.get("min_rating")!)
      : undefined,
    reputation_filter: searchParams.get("reputation_filter")
      ? (searchParams.get("reputation_filter")!.split(",") as ReputationBadgeEnum[])
      : undefined,
    time_range: parseInt(
      searchParams.get("time_range") ||
        String(DEFAULT_COMMUNITY_FILTERS.time_range),
    ),
    sort: (searchParams.get("sort") as CommunityFiltersState["sort"]) || DEFAULT_COMMUNITY_FILTERS.sort,
    limit: parseInt(
      searchParams.get("limit") || String(DEFAULT_COMMUNITY_FILTERS.limit),
    ),
    offset: parseInt(
      searchParams.get("offset") || String(DEFAULT_COMMUNITY_FILTERS.offset),
    ),
  };
}

/**
 * Sync filters to URL
 */
function syncFiltersToURL(filters: CommunityFiltersState) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, String(value));
      }
    }
  });

  // Update URL without triggering navigation
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * Convert filters to API params
 */
function filtersToApiParams(
  filters: CommunityFiltersState,
): GetCommunityOutfitsParams {
  const {
    location_id,
    radius_km,
    temperature,
    temperature_range,
    wind_speed,
    activity_type,
    min_rating,
    reputation_filter,
    time_range,
    sort,
    limit,
    offset,
  } = filters;

  return {
    location_id,
    radius_km,
    temperature,
    temperature_range,
    wind_speed,
    activity_type,
    min_rating,
    reputation_filter,
    time_range,
    sort,
    limit,
    offset,
  };
}

/**
 * Custom hook for community view state management
 */
export function useCommunityView(
  params: UseCommunityViewParams,
): UseCommunityViewReturn {
  const { defaultLocationId } = params;

  // Initialize filters from URL or defaults
  const initialFilters = useMemo(() => {
    if (typeof window === "undefined") {
      // Server-side - use defaults
      return {
        ...DEFAULT_COMMUNITY_FILTERS,
        location_id: defaultLocationId || "",
      };
    }

    const searchParams = new URLSearchParams(window.location.search);
    return parseFiltersFromURL(searchParams, defaultLocationId);
  }, [defaultLocationId]);

  const [state, setState] = useState<CommunityViewState>({
    filters: initialFilters,
    outfits: [],
    total: 0,
    hasMore: false,
    isLoading: false,
    error: null,
    selectedOutfitId: null,
    selectedOutfit: null,
  });

  // Debounced filters for API calls (exclude pagination)
  const debouncedFilters = useDebounce(
    {
      ...state.filters,
      offset: 0, // Reset offset when filters change
      limit: DEFAULT_COMMUNITY_FILTERS.limit,
    },
    500,
  );

  // Fetch outfits
  const fetchOutfits = useCallback(
    async (filters: CommunityFiltersState, append = false) => {
      try {
        setState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        const apiParams = filtersToApiParams(filters);
        const response = await fetchCommunityOutfits(apiParams);

        setState((prev) => ({
          ...prev,
          outfits: append
            ? [...prev.outfits, ...response.outfits]
            : response.outfits,
          total: response.total,
          hasMore: response.has_more,
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        console.error("Error fetching community outfits:", error);

        const errorMessage =
          error instanceof CommunityApiError
            ? handleCommunityApiError(error)
            : "Wystąpił błąd podczas ładowania danych.";

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    },
    [],
  );

  // Effect to fetch outfits when debounced filters change
  useEffect(() => {
    if (debouncedFilters.location_id) {
      fetchOutfits(debouncedFilters, false);
    }
  }, [debouncedFilters, fetchOutfits]);

  // Filter actions
  const setFilters = useCallback(
    (newFilters: Partial<CommunityFiltersState>) => {
      setState((prev) => {
        const updatedFilters = { ...prev.filters, ...newFilters };

        // Update URL
        if (typeof window !== "undefined") {
          syncFiltersToURL(updatedFilters);
        }

        return {
          ...prev,
          filters: updatedFilters,
          // Reset pagination when filters change
          outfits: [],
          total: 0,
          hasMore: false,
        };
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    const resetFilters = {
      ...DEFAULT_COMMUNITY_FILTERS,
      location_id: state.filters.location_id, // Keep location
    };

    setFilters(resetFilters);
  }, [state.filters.location_id, setFilters]);

  const setLocationId = useCallback(
    (locationId: string) => {
      setFilters({ location_id: locationId });
    },
    [setFilters],
  );

  const setSort = useCallback(
    (sort: CommunityFiltersState["sort"]) => {
      setFilters({ sort });
    },
    [setFilters],
  );

  // Pagination actions
  const loadMore = useCallback(() => {
    if (!state.hasMore || state.isLoading) return;

    const newOffset = state.filters.offset + state.filters.limit;
    const newFilters = { ...state.filters, offset: newOffset };

    fetchOutfits(newFilters, true);
    setState((prev) => ({
      ...prev,
      filters: newFilters,
    }));
  }, [state.hasMore, state.isLoading, state.filters, fetchOutfits]);

  const goToPage = useCallback(
    (page: number) => {
      const newOffset = (page - 1) * state.filters.limit;
      setFilters({ offset: newOffset });
    },
    [state.filters.limit, setFilters],
  );

  // Modal actions
  const openOutfitDetail = useCallback(
    (outfitId: string) => {
      const outfit = state.outfits.find((o) => o.id === outfitId);
      setState((prev) => ({
        ...prev,
        selectedOutfitId: outfitId,
        selectedOutfit: outfit || null,
      }));
    },
    [state.outfits],
  );

  const closeOutfitDetail = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedOutfitId: null,
      selectedOutfit: null,
    }));
  }, []);

  // Utility functions
  const refetch = useCallback(async () => {
    await fetchOutfits(state.filters, false);
  }, [state.filters, fetchOutfits]);

  const getActiveFiltersCount = useCallback(() => {
    const {
      location_id,
      radius_km,
      temperature,
      temperature_range,
      time_range,
      sort,
      limit,
      offset,
      ...filters
    } = state.filters;

    return Object.values(filters).filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0),
    ).length;
  }, [state.filters]);

  return {
    state,
    setFilters,
    resetFilters,
    setLocationId,
    setSort,
    loadMore,
    goToPage,
    openOutfitDetail,
    closeOutfitDetail,
    refetch,
    getActiveFiltersCount,
  };
}
