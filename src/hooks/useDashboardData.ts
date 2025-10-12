import { useState, useEffect, useCallback } from "react";
import type { DashboardDTO } from "../types";
import type { UseDashboardDataReturn } from "../components/dashboard/types";

export function useDashboardData(
  userId: string,
  locationId?: string,
): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = new URL("/api/dashboard", window.location.origin);
      if (locationId) {
        url.searchParams.set("location_id", locationId);
      }

      const response = await fetch(url.toString(), {
        credentials: "include", // Include JWT cookie
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = "/";
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const dashboardData: DashboardDTO = await response.json();
      setData(dashboardData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [userId, locationId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchDashboard,
    lastRefresh,
  };
}
