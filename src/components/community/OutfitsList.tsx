import React from "react";
import { RefreshCw, Users, Search } from "lucide-react";
import { Button } from "../ui/button";
import OutfitCard from "./OutfitCard";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { CommunityOutfitDTO } from "../../types";

interface OutfitsListProps {
  outfits: CommunityOutfitDTO[];
  isLoading: boolean;
  error?: string;
  onOutfitClick: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  currentFilters?: any; // For empty state suggestions
  onExpandRadius?: () => void;
  onResetFilters?: () => void;
}

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

function ErrorStateComponent({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-red-500 mb-4">
        <svg
          className="w-12 h-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Wystąpił błąd</h3>
      <p className="text-gray-600 text-center mb-4 max-w-md">{error}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Spróbuj ponownie
        </Button>
      )}
    </div>
  );
}

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  isLoading: boolean;
}

function LoadMoreButton({ onLoadMore, isLoading }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center py-8">
      <Button
        onClick={onLoadMore}
        disabled={isLoading}
        variant="outline"
        size="lg"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Ładowanie...
          </>
        ) : (
          "Załaduj więcej"
        )}
      </Button>
    </div>
  );
}

export default function OutfitsList({
  outfits,
  isLoading,
  error,
  onOutfitClick,
  onLoadMore,
  hasMore = false,
  currentFilters,
  onExpandRadius,
  onResetFilters,
}: OutfitsListProps) {
  // Show loading state for initial load
  if (isLoading && outfits.length === 0) {
    return <LoadingState count={9} />;
  }

  // Show error state
  if (error && outfits.length === 0) {
    return <ErrorStateComponent error={error} onRetry={onLoadMore} />;
  }

  // Show empty state
  if (!isLoading && !error && outfits.length === 0) {
    return (
      <EmptyState
        currentFilters={currentFilters || {}}
        onExpandRadius={onExpandRadius ?? (() => undefined)}
        onResetFilters={onResetFilters ?? (() => undefined)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>Znaleziono {outfits.length} zestawów</span>
        </div>
      </div>

      {/* Outfits grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {outfits.map((outfit) => (
          <OutfitCard key={outfit.id} outfit={outfit} onClick={onOutfitClick} />
        ))}
      </div>

      {/* Loading overlay for additional loads */}
      {isLoading && outfits.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-gray-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Ładowanie kolejnych wyników...</span>
          </div>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && onLoadMore && (
        <LoadMoreButton onLoadMore={onLoadMore} isLoading={false} />
      )}

      {/* No more results message */}
      {!hasMore && outfits.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>To już wszystkie wyniki dla wybranych filtrów.</p>
        </div>
      )}
    </div>
  );
}
