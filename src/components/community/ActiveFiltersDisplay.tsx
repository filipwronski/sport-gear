import React from "react";
import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CommunityFiltersState, DEFAULT_COMMUNITY_FILTERS } from "../../types";
import { ACTIVITY_TYPE_LABELS } from "../../constants/community.constants";

interface ActiveFiltersDisplayProps {
  filters: CommunityFiltersState;
  onRemoveFilter: (filterKey: keyof CommunityFiltersState) => void;
  onClearAll: () => void;
}

export default function ActiveFiltersDisplay({
  filters,
  onRemoveFilter,
  onClearAll,
}: ActiveFiltersDisplayProps) {
  // Get active filters (different from defaults)
  const getActiveFilters = (): {
    key: keyof CommunityFiltersState;
    label: string;
    value: unknown;
  }[] => {
    const activeFilters = [];

    // Location (skip if empty)
    if (filters.location_id && filters.location_id !== "") {
      activeFilters.push({
        key: "location_id",
        label: "Lokalizacja",
        value: filters.location_id,
      });
    }

    // Radius
    if (filters.radius_km !== DEFAULT_COMMUNITY_FILTERS.radius_km) {
      activeFilters.push({
        key: "radius_km",
        label: `Promień: ${filters.radius_km} km`,
        value: filters.radius_km,
      });
    }

    // Temperature
    if (filters.temperature !== undefined) {
      activeFilters.push({
        key: "temperature",
        label: `Temperatura: ${filters.temperature}°C ±${filters.temperature_range}°C`,
        value: filters.temperature,
      });
    }

    // Wind speed
    if (filters.wind_speed !== undefined) {
      activeFilters.push({
        key: "wind_speed",
        label: `Wiatr: ${filters.wind_speed} km/h`,
        value: filters.wind_speed,
      });
    }

    // Activity type
    if (filters.activity_type) {
      activeFilters.push({
        key: "activity_type",
        label: `Aktywność: ${ACTIVITY_TYPE_LABELS[filters.activity_type]}`,
        value: filters.activity_type,
      });
    }

    // Minimum rating
    if (filters.min_rating) {
      activeFilters.push({
        key: "min_rating",
        label: `Ocena min.: ${filters.min_rating}★`,
        value: filters.min_rating,
      });
    }

    // Reputation filter
    if (filters.reputation_filter && filters.reputation_filter.length > 0) {
      const reputationLabels = {
        nowicjusz: "Nowicjusz",
        regularny: "Regularny",
        ekspert: "Ekspert",
        mistrz: "Mistrz",
      };

      activeFilters.push({
        key: "reputation_filter",
        label: `Reputacja: ${filters.reputation_filter.map((r) => reputationLabels[r]).join(", ")}`,
        value: filters.reputation_filter,
      });
    }

    // Time range
    if (filters.time_range !== DEFAULT_COMMUNITY_FILTERS.time_range) {
      const timeLabels = {
        6: "6h",
        24: "24h",
        48: "48h",
        168: "7 dni",
      };

      activeFilters.push({
        key: "time_range",
        label: `Czas: ostatnie ${timeLabels[filters.time_range as keyof typeof timeLabels] || filters.time_range + "h"}`,
        value: filters.time_range,
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-sm font-medium text-gray-700 mr-2">
        Aktywne filtry:
      </span>

      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          <span className="text-xs">{filter.label}</span>
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
            aria-label={`Usuń filtr ${filter.label}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {activeFilters.length > 1 && (
        <Button
          onClick={onClearAll}
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2 ml-2"
        >
          Wyczyść wszystkie
        </Button>
      )}
    </div>
  );
}
