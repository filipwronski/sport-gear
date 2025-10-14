import { useState, useCallback } from "react";
import type { ProfileDTO, UpdateProfileCommand } from "../../../types";

export interface UseProfileReturn {
  profile: ProfileDTO | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: Error | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (command: UpdateProfileCommand) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/**
 * Custom hook for managing user profile data
 * Handles fetching, updating and deleting user profile
 */
export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
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

      const profileData: ProfileDTO = await response.json();
      setProfile(profileData);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (command: UpdateProfileCommand) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
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

      const updatedProfile: ProfileDTO = await response.json();
      setProfile(updatedProfile);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error; // Re-throw to allow component-level error handling
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      // Account deleted successfully - clear local state
      setProfile(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error; // Re-throw to allow component-level error handling
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    profile,
    isLoading,
    isUpdating,
    error,
    fetchProfile,
    updateProfile,
    deleteAccount,
  };
}
