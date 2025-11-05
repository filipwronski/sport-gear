import { Button } from "@/components/ui/button";
import { BikeListControls } from "./BikeListControls";
import type { BikeFilters, SortOption } from "./types";

interface BikeListHeaderProps {
  totalCount: number;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  onAddBikeClick: () => void;
  onFiltersChange: (filters: BikeFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
}

export const BikeListHeader = ({
  totalCount,
  filters,
  sortBy,
  searchQuery,
  onAddBikeClick,
  onFiltersChange,
  onSortChange,
  onSearchChange,
}: BikeListHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Moje rowery</h1>
        <p className="text-sm text-gray-600">
          {totalCount === 0
            ? "Brak rowerów"
            : totalCount === 1
              ? "1 rower"
              : `${totalCount} rowerów`}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <BikeListControls
          filters={filters}
          sortBy={sortBy}
          searchQuery={searchQuery}
          onFiltersChange={onFiltersChange}
          onSortChange={onSortChange}
          onSearchChange={onSearchChange}
        />
        <Button onClick={onAddBikeClick} className="whitespace-nowrap">
          Dodaj rower
        </Button>
      </div>
    </div>
  );
};
