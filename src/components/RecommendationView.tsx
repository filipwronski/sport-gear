import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WeatherSummary from "./WeatherSummary";
import WorkoutSelector, {
  type WorkoutIntensity,
  type WorkoutDuration,
} from "./WorkoutSelector";
import CyclistSVG from "./CyclistSVG";
import OutfitRecommendationList from "./OutfitRecommendationList";
import AdditionalTipsSection from "./AdditionalTipsSection";
import AddFeedbackCTA from "./AddFeedbackCTA";
import FeedbackDialog from "./FeedbackDialog";
import { useDefaultLocation } from "@/hooks/useLocationSelection";
import type {
  ZoneType,
  FeedbackDTO,
  NewRecommendationDTO,
  ApiError,
} from "../types";

/**
 * Simplified RecommendationView - Shows current weather-based outfit recommendation
 */
export default function RecommendationView() {
  const [selectedZone, setSelectedZone] = useState<ZoneType | undefined>();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [recommendation, setRecommendation] =
    useState<NewRecommendationDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [workoutIntensity, setWorkoutIntensity] =
    useState<WorkoutIntensity>("rekreacyjny");
  const [workoutDuration, setWorkoutDuration] = useState<WorkoutDuration>(60);

  // Track original workout parameters to detect changes
  const [originalWorkoutIntensity, setOriginalWorkoutIntensity] =
    useState<WorkoutIntensity>("rekreacyjny");
  const [originalWorkoutDuration, setOriginalWorkoutDuration] =
    useState<WorkoutDuration>(60);

  const { defaultLocation } = useDefaultLocation();

  const fetchRecommendation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get coordinates
      const params: Record<string, string> = {};

      // Use default location if available
      if (defaultLocation) {
        params.lat = defaultLocation.location.latitude.toString();
        params.lng = defaultLocation.location.longitude.toString();
      } else if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 300000,
              });
            },
          );
          params.lat = position.coords.latitude.toString();
          params.lng = position.coords.longitude.toString();
        } catch (_geoError) {
          // Fallback to Warsaw coordinates
          params.lat = "52.237049";
          params.lng = "21.017532";
        }
      } else {
        // Fallback to Warsaw coordinates
        params.lat = "52.237049";
        params.lng = "21.017532";
      }

      params.workout_intensity = workoutIntensity;
      params.workout_duration = workoutDuration.toString();

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/new-recommendations?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json();
        const apiError: ApiError = {
          code: errorData.error?.code || "UNKNOWN_ERROR",
          message:
            errorData.error?.message ||
            "Wystąpił błąd podczas pobierania rekomendacji",
          statusCode: response.status,
          details: errorData.error?.details,
          retryAfter: response.headers.get("Retry-After")
            ? parseInt(response.headers.get("Retry-After"))
            : undefined,
        };
        throw apiError;
      }

      const data: NewRecommendationDTO = await response.json();
      setRecommendation(data);

      // Update original parameters when recommendation is successfully fetched
      setOriginalWorkoutIntensity(workoutIntensity);
      setOriginalWorkoutDuration(workoutDuration);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, [defaultLocation, workoutIntensity, workoutDuration]);

  // Fetch recommendation on mount and location change only
  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  // Track when workout parameters change
  const hasWorkoutParamsChanged =
    workoutIntensity !== originalWorkoutIntensity ||
    workoutDuration !== originalWorkoutDuration;

  const handleZoneClick = (zone: ZoneType) => {
    setSelectedZone(zone);
  };

  const handleFeedbackSubmitted = (_feedback: FeedbackDTO) => {
    setFeedbackCount((prev) => prev + 1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span>Generuję rekomendację...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Błąd</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button variant="outline" size="sm" onClick={fetchRecommendation}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Spróbuj ponownie
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Nie udało się pobrać rekomendacji
          </p>
          <Button onClick={fetchRecommendation}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workout Parameters Selector */}
      <div className="space-y-4">
        <WorkoutSelector
          intensity={workoutIntensity}
          duration={workoutDuration}
          onIntensityChange={setWorkoutIntensity}
          onDurationChange={setWorkoutDuration}
        />

        {/* Update Recommendations Button - always visible, disabled when no changes */}
        <div className="flex justify-center">
          <Button
            onClick={fetchRecommendation}
            disabled={isLoading || !hasWorkoutParamsChanged}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Zaktualizuj rekomendacje
          </Button>
        </div>
      </div>

      {/* Weather Summary */}
      <WeatherSummary weather={recommendation.weather} />

      {/* Main recommendation display */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8">
        {/* Cyclist SVG */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sylwetka kolarza</h3>
          <div className="flex justify-center">
            <CyclistSVG
              recommendation={recommendation.recommendation}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
            />
          </div>
        </div>

        {/* Outfit Recommendation */}
        <div className="space-y-4">
          <OutfitRecommendationList
            recommendation={recommendation.recommendation}
            expandedZone={selectedZone}
          />
        </div>
      </div>

      {/* Additional AI Tips */}
      <AdditionalTipsSection
        weatherConditions={recommendation.weather}
        onTipsLoad={(_tips) => {
          // Tips are managed by the hook
        }}
      />

      {/* Feedback CTA */}
      <AddFeedbackCTA
        onFeedbackClick={() => setFeedbackDialogOpen(true)}
        feedbackCount={feedbackCount}
      />

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={feedbackDialogOpen}
        onClose={() => setFeedbackDialogOpen(false)}
        recommendation={recommendation}
        onSubmitted={handleFeedbackSubmitted}
      />
    </div>
  );
}
