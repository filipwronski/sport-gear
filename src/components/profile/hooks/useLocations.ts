import { useState, useCallback } from "react";
import type { LocationDTO } from "../../../types";

export interface UseLocationsReturn {
  locations: LocationDTO[];
  isLoading: boolean;
  error: Error | null;
  fetchLocations: () => Promise<void>;
}

/**
 * Custom hook for managing user locations
 * Handles fetching user locations for profile management
 */
export function useLocations(): UseLocationsReturn {
  const [locations, setLocations] = useState<LocationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/locations", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const locationsData: LocationDTO[] = await response.json();
      setLocations(locationsData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    locations,
    isLoading,
    error,
    fetchLocations,
  };
}
