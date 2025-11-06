import { useState, useEffect, useMemo, useCallback } from "react";
import type { BikeDTO, CreateBikeCommand } from "../../../types";
import type { BikeFilters, SortOption, UseBikeListReturn } from "../types";
import { filterBikes, sortBikes, transformBikeToDisplayData } from "../utils";
import { fetchBikes, createBike } from "../../../lib/api/bikes";
import { useToast } from "../../auth/useToast";

const DEFAULT_FILTERS: BikeFilters = {
  status: "all",
  type: "all",
};

const DEFAULT_SORT: SortOption = "name_asc";

export const useBikeList = (_userId: string): UseBikeListReturn => {
  // Raw data from API
  const [bikes, setBikes] = useState<BikeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // UI state
  const [filters, setFilters] = useState<BikeFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortOption>(DEFAULT_SORT);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { showToast } = useToast();

  // Fetch bikes from API
  const fetchBikesData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchBikes({ status: undefined, type: undefined });
      setBikes(result.bikes);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bikes"));
      showToast({
        type: "error",
        title: "Błąd",
        description: "Nie udało się pobrać listy rowerów",
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Initial fetch
  useEffect(() => {
    fetchBikesData();
  }, [fetchBikesData]);

  // Computed: filtered and sorted bikes
  const filteredAndSortedBikes = useMemo(() => {
    const filtered = filterBikes(bikes, filters, searchQuery);
    const sorted = sortBikes(filtered, sortBy);
    return sorted;
  }, [bikes, filters, searchQuery, sortBy]);

  // Computed: display data
  const displayBikes = useMemo(() => {
    return filteredAndSortedBikes.map(transformBikeToDisplayData);
  }, [filteredAndSortedBikes]);

  // Dialog handlers
  const openAddDialog = useCallback(() => {
    setIsAddDialogOpen(true);
  }, []);

  const closeAddDialog = useCallback(() => {
    setIsAddDialogOpen(false);
  }, []);

  // Add bike handler
  const addBike = useCallback(
    async (data: CreateBikeCommand): Promise<void> => {
      try {
        const newBike = await createBike(data);

        // Optimistic update
        setBikes((prev) => [newBike, ...prev]);

        showToast({
          type: "success",
          title: "Sukces",
          description: `Rower "${newBike.name}" został dodany`,
        });

        closeAddDialog();

        // Refetch to ensure consistency
        await fetchBikesData();
      } catch (err) {
        showToast({
          type: "error",
          title: "Błąd",
          description: "Nie udało się dodać roweru",
        });
        throw err;
      }
    },
    [showToast, closeAddDialog, fetchBikesData],
  );

  // Navigate to bike details
  const handleBikeClick = useCallback((bikeId: string) => {
    window.location.href = `/gear/${bikeId}`;
  }, []);

  return {
    bikes,
    displayBikes,
    isLoading,
    error,
    filters,
    sortBy,
    searchQuery,
    totalCount: filteredAndSortedBikes.length,
    isAddDialogOpen,
    setFilters,
    setSortBy,
    setSearchQuery,
    openAddDialog,
    closeAddDialog,
    addBike,
    refetchBikes: fetchBikesData,
    handleBikeClick,
  };
};
