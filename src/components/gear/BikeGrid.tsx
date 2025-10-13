import { BikeCard } from "./BikeCard";
import { EmptyState } from "./EmptyState";
import type { BikeCardDisplayData } from "./types";

interface BikeGridProps {
  bikes: BikeCardDisplayData[];
  isLoading: boolean;
  onBikeClick: (bikeId: string) => void;
  hasActiveFilters?: boolean;
  onAddBikeClick?: () => void;
}

export const BikeGrid = ({
  bikes,
  isLoading,
  onBikeClick,
  hasActiveFilters = false,
  onAddBikeClick = () => {},
}: BikeGridProps) => {
  if (bikes.length === 0 && !isLoading) {
    return (
      <EmptyState
        hasFilters={hasActiveFilters}
        onAddBikeClick={onAddBikeClick}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bikes.map((bike) => (
        <BikeCard key={bike.id} bike={bike} onClick={onBikeClick} />
      ))}
    </div>
  );
};
