import { useState, useEffect, useCallback } from "react";
import type { ServiceReminderDTO, GetRemindersParams } from "../../../types";

interface UseServiceRemindersResult {
  reminders: ServiceReminderDTO[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServiceReminders(
  bikeId: string,
  filters?: GetRemindersParams,
): UseServiceRemindersResult {
  const [reminders, setReminders] = useState<ServiceReminderDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.service_type)
        params.append("service_type", filters.service_type);
      if (filters?.sort) params.append("sort", filters.sort);

      const response = await fetch(
        `/api/bikes/${bikeId}/reminders?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reminders");
      }

      const data: ServiceReminderDTO[] = await response.json();
      setReminders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [bikeId, filters]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  return {
    reminders,
    isLoading,
    error,
    refetch: fetchReminders,
  };
}
