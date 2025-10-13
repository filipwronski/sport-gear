import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import type { BikeFilters, SortOption } from "./types";

interface BikeListControlsProps {
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  onFiltersChange: (filters: BikeFilters) => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Wszystkie" },
  { value: "active", label: "Aktywne" },
  { value: "archived", label: "Zarchiwizowane" },
  { value: "sold", label: "Sprzedane" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Wszystkie" },
  { value: "szosowy", label: "Szosowy" },
  { value: "gravelowy", label: "Gravelowy" },
  { value: "mtb", label: "MTB" },
  { value: "czasowy", label: "Czasowy" },
] as const;

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nazwa A-Z" },
  { value: "name_desc", label: "Nazwa Z-A" },
  { value: "mileage_asc", label: "Przebieg rosnąco" },
  { value: "mileage_desc", label: "Przebieg malejąco" },
  { value: "created_at_asc", label: "Data dodania" },
  { value: "created_at_desc", label: "Data dodania (od najnowszych)" },
] as const;

export const BikeListControls = ({
  filters,
  sortBy,
  searchQuery,
  onFiltersChange,
  onSortChange,
  onSearchChange,
}: BikeListControlsProps) => {
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Update search when debounced value changes
  React.useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as BikeFilters["status"],
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      type: value as BikeFilters["type"],
    });
  };

  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
      {/* Search Input */}
      <div className="relative flex-1 md:min-w-[250px]">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Szukaj rowerów..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full md:w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type Filter */}
      <Select value={filters.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-full md:w-[140px]">
          <SelectValue placeholder="Typ" />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Select */}
      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Sortuj" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
