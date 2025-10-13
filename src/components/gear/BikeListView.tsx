import React from "react";
import { BikeListHeader } from "./BikeListHeader";
import { BikeGrid } from "./BikeGrid";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { AddBikeDialog } from "./AddBikeDialog";
import { useBikeList } from "./hooks/useBikeList";

interface BikeListViewProps {
  userId: string;
}

export const BikeListView = ({ userId }: BikeListViewProps) => {
  const {
    // Data
    displayBikes,
    isLoading,
    error,

    // State
    filters,
    sortBy,
    searchQuery,
    totalCount,
    isAddDialogOpen,

    // Actions
    setFilters,
    setSortBy,
    setSearchQuery,
    openAddDialog,
    closeAddDialog,
    addBike,
    refetchBikes,
    handleBikeClick,
  } = useBikeList(userId);

  const handleAddBikeSuccess = async (bikeData: any) => {
    await addBike(bikeData);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BikeListHeader
          totalCount={0}
          filters={filters}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onAddBikeClick={openAddDialog}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onSearchChange={handleSearchChange}
        />
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <BikeListHeader
          totalCount={0}
          filters={filters}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onAddBikeClick={openAddDialog}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onSearchChange={handleSearchChange}
        />
        <ErrorState
          error={error}
          onRetry={refetchBikes}
        />
      </div>
    );
  }

  // Success state
  return (
    <div className="container mx-auto px-4 py-8">
      <BikeListHeader
        totalCount={totalCount}
        filters={filters}
        sortBy={sortBy}
        searchQuery={searchQuery}
        onAddBikeClick={openAddDialog}
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
      />

      <BikeGrid
        bikes={displayBikes}
        isLoading={isLoading}
        onBikeClick={handleBikeClick}
        hasActiveFilters={
          filters.status !== "all" ||
          filters.type !== "all" ||
          searchQuery.trim() !== ""
        }
        onAddBikeClick={openAddDialog}
      />

      <AddBikeDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeAddDialog();
          else openAddDialog();
        }}
        onSuccess={handleAddBikeSuccess}
        isSubmitting={false} // TODO: Add proper loading state
      />
    </div>
  );
};
