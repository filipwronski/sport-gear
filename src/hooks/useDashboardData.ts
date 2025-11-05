import { useState, useEffect, useCallback } from "react";
import type { DashboardDTO } from "../types";
import type { UseDashboardDataReturn } from "../components/dashboard/types";

export function useDashboardData(
  userId: string,
  locationId?: string,
): UseDashboardDataReturn & { coordinates: { lat: number; lng: number } | null } {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let currentCoordinates: { lat: number; lng: number } | null = null;

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

          currentCoordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          url.searchParams.set("lat", currentCoordinates.lat.toString());
          url.searchParams.set("lng", currentCoordinates.lng.toString());
        } catch (geoError) {
          console.warn("Geolocation not available or denied, using default location (Warsaw)");
          // Fallback to Warsaw coordinates for demo purposes
          currentCoordinates = { lat: 52.237049, lng: 21.017532 };
          url.searchParams.set("lat", currentCoordinates.lat.toString());
          url.searchParams.set("lng", currentCoordinates.lng.toString());
        }
      } else {
        console.warn("Geolocation not supported, using default location (Warsaw)");
        // Fallback to Warsaw coordinates for demo purposes
        currentCoordinates = { lat: 52.237049, lng: 21.017532 };
        url.searchParams.set("lat", currentCoordinates.lat.toString());
        url.searchParams.set("lng", currentCoordinates.lng.toString());
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

      // Store coordinates that were used for weather data
      if (currentCoordinates) {
        setCoordinates(currentCoordinates);
      }
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
    coordinates,
  };
}
