import { useState, useEffect } from "react";
import type { LocationDTO } from "../types";

export interface UseLocationSelectionReturn {
  defaultLocation: LocationDTO | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Custom hook for getting user's default location
 * Used for weather data and recommendations
 */
export function useDefaultLocation(): UseLocationSelectionReturn {
  const [defaultLocation, setDefaultLocation] = useState<LocationDTO | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDefaultLocation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/locations?default_only=true", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error?.message || `HTTP ${response.status}`,
          );
        }

        const locations: LocationDTO[] = await response.json();
        setDefaultLocation(locations.length > 0 ? locations[0] : null);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error occurred");
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDefaultLocation();
  }, []);

  return {
    defaultLocation,
    isLoading,
    error,
  };
}
