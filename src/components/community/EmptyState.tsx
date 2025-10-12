import React from "react";
import { Search, Users, RotateCcw, Expand } from "lucide-react";
import { Button } from "../ui/button";
import { CommunityFiltersState } from "../../types";

interface EmptyStateProps {
  currentFilters: Partial<CommunityFiltersState>;
  onExpandRadius: () => void;
  onResetFilters: () => void;
}

export default function EmptyState({
  currentFilters,
  onExpandRadius,
  onResetFilters,
}: EmptyStateProps) {
  const hasActiveFilters = Object.values(currentFilters).some(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0),
  );

  if (!hasActiveFilters) {
    // No filters applied - show general empty state
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-blue-600" />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Brak zestawów w okolicy
        </h3>

        <p className="text-gray-600 mb-6 max-w-md">
          W promieniu {currentFilters.radius_km || 50} km nie ma jeszcze
          udostępnionych zestawów ubioru.
        </p>

        <div className="space-y-3">
          <Button onClick={onExpandRadius} variant="default">
            <Expand className="w-4 h-4 mr-2" />
            Rozszerz promień do {(currentFilters.radius_km || 50) * 2} km
          </Button>

          <p className="text-sm text-gray-500">
            Bądź pierwszy! Dodaj feedback po treningu i udostępnij go
            społeczności.
          </p>
        </div>
      </div>
    );
  }

  // Filters applied but no results - show filtered empty state
  const suggestions = [];

  if ((currentFilters.temperature_range || 3) < 5) {
    suggestions.push({
      text: "Rozszerz zakres temperatury (±5°C zamiast ±3°C)",
      action: onResetFilters, // TODO: implement specific filter changes
    });
  }

  if (
    currentFilters.reputation_filter &&
    currentFilters.reputation_filter.length > 0
  ) {
    suggestions.push({
      text: "Usuń filtr reputacji lub wybierz niższe poziomy",
      action: onResetFilters, // TODO: implement specific filter changes
    });
  }

  if ((currentFilters.time_range || 24) < 168) {
    suggestions.push({
      text: "Rozszerz zakres czasowy do ostatniego tygodnia",
      action: onResetFilters, // TODO: implement specific filter changes
    });
  }

  if ((currentFilters.radius_km || 50) < 100) {
    suggestions.push({
      text: `Zwiększ promień wyszukiwania (aktualnie ${currentFilters.radius_km || 50} km)`,
      action: onExpandRadius,
    });
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Search className="w-8 h-8 text-gray-400" />
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Brak pasujących zestawów
      </h3>

      <p className="text-gray-600 mb-6 max-w-md">
        Nie znaleźliśmy zestawów spełniających wszystkie wybrane kryteria
        filtrowania.
      </p>

      <div className="space-y-3 w-full max-w-sm">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <button
            key={index}
            onClick={suggestion.action}
            className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            {suggestion.text}
          </button>
        ))}

        <div className="pt-2 border-t border-gray-200">
          <Button onClick={onResetFilters} variant="outline" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetuj wszystkie filtry
          </Button>
        </div>
      </div>
    </div>
  );
}
