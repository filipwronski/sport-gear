import { useState, useEffect, useCallback } from "react";
import type { DashboardDTO } from "../types";
import type { UseDashboardDataReturn } from "../components/dashboard/types";

export function useDashboardData(
  _userId: string,
  _locationId?: string,
  _browserCoordinates?: { lat: number; lng: number } | null,
): UseDashboardDataReturn & {
  coordinates: { lat: number; lng: number } | null;
} {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let currentCoordinates: { lat: number; lng: number } | null = null;

    try {
      const url = new URL("/api/dashboard", window.location.origin);

      // Priority order for location:
      // 1. Location passed via props/URL parameter
      // 2. Browser coordinates (when locationId is "browser")
      // 3. User's default location from profile
      // 4. Browser geolocation
      // 5. Warsaw as fallback

      let locationIdToUse: string | null = null;
      let coordinatesToUse: { lat: number; lng: number } | null = null;

      // Check if browser coordinates are provided (from location selector)
      if (_browserCoordinates) {
        coordinatesToUse = _browserCoordinates;
        console.info(`Using browser coordinates:`, coordinatesToUse);
      }
      // Check if location_id is provided via props
      else if (_locationId) {
        if (_locationId === "browser") {
          // Browser was selected but no coordinates provided yet
          // This shouldn't happen in normal flow, but handle gracefully
          console.warn("Browser location selected but no coordinates provided");
        } else {
          locationIdToUse = _locationId;
          console.info(`Using location from props: ${locationIdToUse}`);
        }
      } else {
        // Try to get user's default location from profile
        try {
          const profileResponse = await fetch("/api/profile", {
            credentials: "include",
          });
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            if (profile.default_location_id) {
              locationIdToUse = profile.default_location_id;
              console.info(`Using user's default location: ${locationIdToUse}`);
            }
          }
        } catch (profileError) {
          console.warn("Could not fetch user profile for default location:", profileError);
        }
      }

      // If we have coordinates from browser selection, use them
      if (coordinatesToUse) {
        currentCoordinates = coordinatesToUse;
        url.searchParams.set("lat", currentCoordinates.lat.toString());
        url.searchParams.set("lng", currentCoordinates.lng.toString());
      }
      // If we have a location ID, fetch its coordinates
      else if (locationIdToUse) {
        try {
          const locationResponse = await fetch(`/api/locations/${locationIdToUse}`, {
            credentials: "include",
          });
          if (locationResponse.ok) {
            const location = await locationResponse.json();
            currentCoordinates = {
              lat: location.location.latitude,
              lng: location.location.longitude,
            };
            url.searchParams.set("lat", currentCoordinates.lat.toString());
            url.searchParams.set("lng", currentCoordinates.lng.toString());
            console.info(`Using coordinates from location ${locationIdToUse}:`, currentCoordinates);
          } else {
            console.warn(`Could not fetch location ${locationIdToUse}, falling back to geolocation`);
            locationIdToUse = null; // Reset to try geolocation
          }
        } catch (locationError) {
          console.warn(`Error fetching location ${locationIdToUse}:`, locationError);
          locationIdToUse = null; // Reset to try geolocation
        }
      }

      // If no coordinates or location ID, try browser geolocation or use profile default
      if (!coordinatesToUse && !locationIdToUse) {
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

            currentCoordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            url.searchParams.set("lat", currentCoordinates.lat.toString());
            url.searchParams.set("lng", currentCoordinates.lng.toString());
            console.info("Using coordinates from browser geolocation:", currentCoordinates);
          } catch (_geoError) {
            console.warn(
              "Geolocation not available or denied, using default location (Warsaw)",
            );
            // Fallback to Warsaw coordinates for demo purposes
            currentCoordinates = { lat: 52.237049, lng: 21.017532 };
            url.searchParams.set("lat", currentCoordinates.lat.toString());
            url.searchParams.set("lng", currentCoordinates.lng.toString());
          }
        } else {
          console.warn(
            "Geolocation not supported, using default location (Warsaw)",
          );
          // Fallback to Warsaw coordinates for demo purposes
          currentCoordinates = { lat: 52.237049, lng: 21.017532 };
          url.searchParams.set("lat", currentCoordinates.lat.toString());
          url.searchParams.set("lng", currentCoordinates.lng.toString());
        }
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
  }, []);

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
