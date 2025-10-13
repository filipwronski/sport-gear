import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRecommendation } from "../hooks/useRecommendation";
import RecommendationFilters from "./RecommendationFilters";
import WeatherSummary from "./WeatherSummary";
import CyclistSVG from "./CyclistSVG";
import OutfitDetailsList from "./OutfitDetailsList";
import AdditionalTipsSection from "./AdditionalTipsSection";
import AddFeedbackCTA from "./AddFeedbackCTA";
import FeedbackDialog from "./FeedbackDialog";
import type { ZoneType, GetRecommendationParams, FeedbackDTO } from "../types";

/**
 * RecommendationView - Main recommendation view component
 * Orchestrates all sub-components and manages recommendation state
 */
interface RecommendationViewProps {
  defaultLocationId?: string;
}

export default function RecommendationView({ defaultLocationId }: RecommendationViewProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneType | undefined>();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0); // TODO: Get from user profile

  const {
    filters,
    recommendation,
    aiTips,
    isLoadingRecommendation,
    isLoadingAiTips,
    error,
    rateLimitedUntil,
    setFilters,
    fetchAiTips,
    refetch,
  } = useRecommendation(defaultLocationId);

  const handleFiltersChange = (params: GetRecommendationParams) => {
    setFilters({
      locationId: params.location_id,
      activityType: params.activity_type || 'spokojna',
      durationMinutes: params.duration_minutes || 90,
      selectedDate: params.date ? new Date(params.date) : null,
    });
  };

  const handleZoneClick = (zone: ZoneType) => {
    setSelectedZone(zone);
  };

  const handleFeedbackSubmitted = (feedback: FeedbackDTO) => {
    // Update feedback count and potentially refetch personalization data
    setFeedbackCount(prev => prev + 1);
    // TODO: Invalidate recommendation to get updated personalization
  };

  if (!recommendation && !isLoadingRecommendation && !error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Wybierz lokalizację aby zobaczyć rekomendację ubioru
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <RecommendationFilters
        defaultLocationId={defaultLocationId}
        onFiltersChange={handleFiltersChange}
        isLoading={isLoadingRecommendation}
      />

      {/* Loading state */}
      {isLoadingRecommendation && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span>Generuję rekomendację...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error.message}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              Spróbuj ponownie
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {recommendation && !isLoadingRecommendation && (
        <>
          {/* Weather Summary */}
          <WeatherSummary weather={recommendation.weather} />

          {/* Main recommendation display */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
            {/* Cyclist SVG */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sylwetka kolarza</h3>
              <div className="flex justify-center">
                <CyclistSVG
                  outfit={recommendation.recommendation}
                  selectedZone={selectedZone}
                  onZoneClick={handleZoneClick}
                />
              </div>
            </div>

            {/* Outfit Details */}
            <div className="space-y-4">
              <OutfitDetailsList
                outfit={recommendation.recommendation}
                expandedZone={selectedZone}
              />
            </div>
          </div>

          {/* Mobile tabs version */}
          <div className="lg:hidden">
            <Tabs defaultValue="sylwetka" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sylwetka">Sylwetka</TabsTrigger>
                <TabsTrigger value="szczegoly">Szczegóły</TabsTrigger>
              </TabsList>
              <TabsContent value="sylwetka" className="mt-4">
                <div className="flex justify-center">
                  <CyclistSVG
                    outfit={recommendation.recommendation}
                    selectedZone={selectedZone}
                    onZoneClick={handleZoneClick}
                  />
                </div>
              </TabsContent>
              <TabsContent value="szczegoly" className="mt-4">
                <OutfitDetailsList
                  outfit={recommendation.recommendation}
                  expandedZone={selectedZone}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Additional AI Tips */}
          <AdditionalTipsSection
            weatherConditions={recommendation.weather}
            onTipsLoad={(tips) => {
              // Tips are managed by the hook
            }}
          />

          {/* Feedback CTA */}
          <AddFeedbackCTA
            onFeedbackClick={() => setFeedbackDialogOpen(true)}
            feedbackCount={feedbackCount}
          />
        </>
      )}

      {/* Feedback Dialog */}
      {recommendation && (
        <FeedbackDialog
          isOpen={feedbackDialogOpen}
          onClose={() => setFeedbackDialogOpen(false)}
          recommendation={recommendation}
          onSubmitted={handleFeedbackSubmitted}
        />
      )}
    </div>
  );
}
