import { Bike } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  hasFilters: boolean;
  onAddBikeClick: () => void;
}

export const EmptyState = ({ hasFilters, onAddBikeClick }: EmptyStateProps) => {
  const title = hasFilters
    ? "Nie znaleziono rowerów"
    : "Nie masz jeszcze rowerów";

  const description = hasFilters
    ? "Spróbuj zmienić kryteria filtrowania lub dodaj nowy rower."
    : "Dodaj swój pierwszy rower, aby rozpocząć śledzenie serwisów i przejazdów.";

  const buttonText = hasFilters
    ? "Dodaj nowy rower"
    : "Dodaj pierwszy rower";

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Bike className="w-24 h-24 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
        {description}
      </p>
      <Button onClick={onAddBikeClick}>
        {buttonText}
      </Button>
    </div>
  );
};
