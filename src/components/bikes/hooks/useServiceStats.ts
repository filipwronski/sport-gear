import { useState, useEffect, useCallback } from "react";
import type { ServiceStatsDTO, GetServiceStatsParams } from "../../../types";

interface UseServiceStatsResult {
  stats: ServiceStatsDTO | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServiceStats(
  bikeId: string,
  filters: GetServiceStatsParams,
): UseServiceStatsResult {
  const [stats, setStats] = useState<ServiceStatsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters.period) params.append("period", filters.period);
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);

      const response = await fetch(
        `/api/bikes/${bikeId}/services/stats?${params.toString()}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Rower nie został znaleziony lub nie masz do niego dostępu",
          );
        }
        throw new Error("Failed to fetch service statistics");
      }

      const data: ServiceStatsDTO = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [bikeId, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
