import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown } from "lucide-react";

interface FeedbackPaginationProps {
  hasMore: boolean;
  isLoading: boolean;
  total: number;
  loaded: number;
  onLoadMore: () => Promise<void>;
}

export function FeedbackPagination({
  hasMore,
  isLoading,
  total,
  loaded,
  onLoadMore,
}: FeedbackPaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="text-sm text-muted-foreground">
        Wyświetlono {loaded} z {total} feedbacków
      </div>

      {hasMore && (
        <Button
          variant="outline"
          onClick={onLoadMore}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie...
            </>
          ) : (
            <>
              Załaduj więcej
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </Button>
      )}

      {!hasMore && loaded > 0 && (
        <div className="text-sm text-muted-foreground">
          Wszystkie feedbacki zostały załadowane
        </div>
      )}
    </div>
  );
}
