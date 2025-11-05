import React, { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { FeedbackFilters } from "./FeedbackFilters";
import { FeedbackList } from "./FeedbackList";
import { FeedbackPagination } from "./FeedbackPagination";
import { useFeedbackHistory } from "./hooks";

export function FeedbackHistorySection() {
  const {
    feedbacks,
    total,
    hasMore,
    isLoading,
    error,
    filters,
    fetchFeedbacks,
    updateFilters,
    loadNextPage,
    deleteFeedback,
  } = useFeedbackHistory();

  // Load initial feedbacks
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleFiltersChange = async (newFilters: Partial<typeof filters>) => {
    await updateFilters(newFilters);
  };

  const handleResetFilters = async () => {
    await fetchFeedbacks({
      activity_type: undefined,
      rating: undefined,
      sort: "created_at_desc",
    });
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    await deleteFeedback(feedbackId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Historia feedbacków
        </CardTitle>
        <CardDescription>
          Twoje opinie po treningach - przegląd i zarządzanie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FeedbackFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error.message || "Wystąpił błąd podczas ładowania feedbacków"}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && feedbacks.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-6 w-16" />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <FeedbackList
              feedbacks={feedbacks}
              onDeleteFeedback={handleDeleteFeedback}
              isDeleting={false}
            />

            <FeedbackPagination
              hasMore={hasMore}
              isLoading={isLoading}
              total={total}
              loaded={feedbacks.length}
              onLoadMore={loadNextPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
