import { useState, useCallback } from "react";
import type { LocationDTO, CreateLocationCommand, UpdateLocationCommand } from "../../../types";

export interface UseLocationsReturn {
  locations: LocationDTO[];
  isLoading: boolean;
  error: Error | null;
  fetchLocations: () => Promise<void>;
  createLocation: (command: CreateLocationCommand) => Promise<LocationDTO>;
  updateLocation: (locationId: string, command: UpdateLocationCommand) => Promise<LocationDTO>;
}

/**
 * Custom hook for managing user locations
 * Handles fetching user locations for profile management
 */
export function useLocations(initialLocations?: LocationDTO[]): UseLocationsReturn {
  const [locations, setLocations] = useState<LocationDTO[]>(initialLocations || []);
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
        credentials: "include",
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

  const createLocation = useCallback(async (command: CreateLocationCommand): Promise<LocationDTO> => {
    setError(null);

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const newLocation: LocationDTO = await response.json();

      // Add to local state
      setLocations(prev => [newLocation, ...prev]);

      return newLocation;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error;
    }
  }, []);

  const updateLocation = useCallback(async (locationId: string, command: UpdateLocationCommand): Promise<LocationDTO> => {
    setError(null);

    try {
      const response = await fetch(`/api/locations/${locationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const updatedLocation: LocationDTO = await response.json();

      // Update in local state
      setLocations(prev => prev.map(loc => loc.id === locationId ? updatedLocation : loc));

      return updatedLocation;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error;
    }
  }, []);

  return {
    locations,
    isLoading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
  };
}
