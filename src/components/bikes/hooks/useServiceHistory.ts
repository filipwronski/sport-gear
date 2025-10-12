import { useState, useEffect, useCallback } from "react";
import type {
  ServiceRecordDTO,
  ServicesListDTO,
  GetServicesParams,
} from "../../../types";

interface UseServiceHistoryResult {
  services: ServiceRecordDTO[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServiceHistory(
  bikeId: string,
  filters: GetServicesParams,
): UseServiceHistoryResult {
  const [services, setServices] = useState<ServiceRecordDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters.service_type)
        params.append("service_type", filters.service_type);
      if (filters.service_location)
        params.append("service_location", filters.service_location);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());
      if (filters.from_date) params.append("from_date", filters.from_date);
      if (filters.to_date) params.append("to_date", filters.to_date);
      if (filters.sort) params.append("sort", filters.sort);

      const response = await fetch(
        `/api/bikes/${bikeId}/services?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }

      const data: ServicesListDTO = await response.json();
      setServices(data.services);
      setTotal(data.total);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [bikeId, filters]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return {
    services,
    total,
    hasMore,
    isLoading,
    error,
    refetch: fetchServices,
  };
}
