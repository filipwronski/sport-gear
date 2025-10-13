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

      // Try to get user's current location for weather data
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 300000, // 5 minutes
            });
          });

          url.searchParams.set("lat", position.coords.latitude.toString());
          url.searchParams.set("lng", position.coords.longitude.toString());
        } catch (geoError) {
          console.warn("Geolocation not available or denied, using default location (Warsaw)");
          // Fallback to Warsaw coordinates for demo purposes
          url.searchParams.set("lat", "52.237049");
          url.searchParams.set("lng", "21.017532");
        }
      } else {
        console.warn("Geolocation not supported, using default location (Warsaw)");
        // Fallback to Warsaw coordinates for demo purposes
        url.searchParams.set("lat", "52.237049");
        url.searchParams.set("lng", "21.017532");
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
