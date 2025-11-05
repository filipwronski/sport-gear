import { useState, useCallback } from "react";
import type {
  FeedbackDTO,
  FeedbacksListDTO,
  GetFeedbacksParams,
} from "../../../types";

export interface UseFeedbackHistoryReturn {
  feedbacks: FeedbackDTO[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  filters: GetFeedbacksParams;
  fetchFeedbacks: (params?: Partial<GetFeedbacksParams>) => Promise<void>;
  updateFilters: (newFilters: Partial<GetFeedbacksParams>) => Promise<void>;
  loadNextPage: () => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<void>;
}

/**
 * Custom hook for managing user feedback history
 * Handles fetching, filtering, pagination and deletion of feedback
 */
export function useFeedbackHistory(): UseFeedbackHistoryReturn {
  const [feedbacks, setFeedbacks] = useState<FeedbackDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<GetFeedbacksParams>({
    limit: 10,
    offset: 0,
    sort: "created_at_desc",
  });

  const buildQueryString = useCallback((params: GetFeedbacksParams): string => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.set(key, value.toString());
      }
    });

    return queryParams.toString();
  }, []);

  const fetchFeedbacks = useCallback(
    async (params: Partial<GetFeedbacksParams> = {}) => {
      setIsLoading(true);
      setError(null);

      // Get current filters and merge with new params
      setFilters((currentFilters) => {
        const newFilters = { ...currentFilters, ...params, offset: 0 }; // Reset offset for new fetch

        // Perform the fetch with the new filters
        const performFetch = async () => {
          try {
            const queryString = buildQueryString(newFilters);
            const url = `/api/feedbacks${queryString ? `?${queryString}` : ""}`;

            const response = await fetch(url, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error?.message || `HTTP ${response.status}`,
              );
            }

            const data: FeedbacksListDTO = await response.json();
            setFeedbacks(data.feedbacks);
            setTotal(data.total);
            setHasMore(data.has_more);
          } catch (err) {
            const error =
              err instanceof Error ? err : new Error("Unknown error occurred");
            setError(error);
          } finally {
            setIsLoading(false);
          }
        };

        performFetch();
        return newFilters;
      });
    },
    [buildQueryString],
  );

  const updateFilters = useCallback(
    async (newFilters: Partial<GetFeedbacksParams>) => {
      await fetchFeedbacks(newFilters);
    },
    [fetchFeedbacks],
  );

  const loadNextPage = useCallback(async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Update filters and perform fetch atomically
    setFilters((currentFilters) => {
      const newOffset = currentFilters.offset! + currentFilters.limit!;
      const newFilters = { ...currentFilters, offset: newOffset };

      // Perform the fetch with the new filters
      const performFetch = async () => {
        try {
          const queryString = buildQueryString(newFilters);
          const url = `/api/feedbacks?${queryString}`;

          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error?.message || `HTTP ${response.status}`,
            );
          }

          const data: FeedbacksListDTO = await response.json();
          setFeedbacks((prev) => [...prev, ...data.feedbacks]);
          setTotal(data.total);
          setHasMore(data.has_more);
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error("Unknown error occurred");
          setError(error);
        } finally {
          setIsLoading(false);
        }
      };

      performFetch();
      return newFilters;
    });
  }, [hasMore, isLoading, buildQueryString]);

  const deleteFeedback = useCallback(async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/feedbacks/${feedbackId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      // Remove feedback from local state
      setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error; // Re-throw to allow component-level error handling
    }
  }, []);

  return {
    feedbacks,
    total,
    hasMore,
    isLoading,
    error,
    filters,
    fetchFeedbacks,
    updateFilters,
    loadNextPage,
    deleteFeedback,
  };
}
