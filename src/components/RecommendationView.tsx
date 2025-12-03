import { useState, useEffect, useCallback } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { formatISO } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WeatherSummary from "./WeatherSummary";
import WorkoutSelector, {
  type WorkoutIntensity,
  type WorkoutDuration,
} from "./WorkoutSelector";
import CyclistSVG from "./CyclistSVG";
import OutfitRecommendationList from "./OutfitRecommendationList";
import WeeklyForecast from "./WeeklyForecast";
import AddFeedbackCTA from "./AddFeedbackCTA";
import FeedbackDialog from "./FeedbackDialog";
import { useQuery } from "@tanstack/react-query";
import { useLocations } from "./profile/hooks/useLocations";
import { getSuggestedCityByName } from "../constants/location.constants";
import type {
  ZoneType,
  FeedbackDTO,
  NewRecommendationDTO,
  LocationDTO,
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

  // Selected date for forecast recommendations
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Location state for the selector
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(
    null,
  );

  // Current location coordinates for WeeklyForecast
  const [currentCoordinates, setCurrentCoordinates] = useState<
    | {
        latitude: number;
        longitude: number;
      }
    | undefined
  >(undefined);

  const { data: defaultLocation } = useQuery({
    queryKey: ["defaultLocation"],
    queryFn: async () => {
      const response = await fetch("/api/locations?default_only=true", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch default location");
      }
      const locations: LocationDTO[] = await response.json();
      return locations.length > 0 ? locations[0] : null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const {
    locations: userLocations,
    isLoading: isLoadingLocations,
    fetchLocations,
  } = useLocations();

  // Fetch user locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Set currentLocationId based on defaultLocation or first user location
  useEffect(() => {
    if (!currentLocationId && !isLoadingLocations) {
      if (defaultLocation) {
        setCurrentLocationId(defaultLocation.id);
        setCurrentCoordinates(defaultLocation.location);
      } else if (userLocations.length > 0) {
        const firstDefault = userLocations.find((loc) => loc.is_default);
        const selectedLocation = firstDefault || userLocations[0];
        setCurrentLocationId(selectedLocation.id);
        setCurrentCoordinates(selectedLocation.location);
      } else {
        // If no locations exist, set to Warsaw (suggested-city-Warszawa)
        // User can change it later using LocationSelector
        setCurrentLocationId("suggested-city-Warszawa");
        const warsawData = getSuggestedCityByName("Warszawa");
        if (warsawData) {
          setCurrentCoordinates({
            latitude: warsawData.latitude,
            longitude: warsawData.longitude,
          });
        }
      }
    }
  }, [defaultLocation, userLocations, currentLocationId, isLoadingLocations]);

  const fetchRecommendationWithParams = useCallback(
    async (
      intensity: WorkoutIntensity,
      duration: WorkoutDuration,
      date?: string | null,
      selectedCoordinates?: { lat: number; lng: number },
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Get coordinates
        const params: Record<string, string> = {};

        // Use selected coordinates if provided (from location selector)
        if (selectedCoordinates) {
          params.lat = selectedCoordinates.lat.toString();
          params.lng = selectedCoordinates.lng.toString();
        }
        // Use current coordinates if user has selected a location
        else if (currentCoordinates) {
          params.lat = currentCoordinates.latitude.toString();
          params.lng = currentCoordinates.longitude.toString();
        }
        // Use default location if available
        else if (defaultLocation) {
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

        params.workout_intensity = intensity;
        params.workout_duration = duration.toString();

        if (date) {
          params.date = formatISO(new Date(date), { representation: "date" });
        }

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
              ? parseInt(response.headers.get("Retry-After")!)
              : undefined,
          };
          throw apiError;
        }

        const data: NewRecommendationDTO = await response.json();
        setRecommendation(data);

        // Update original parameters when recommendation is successfully fetched
        setOriginalWorkoutIntensity(intensity);
        setOriginalWorkoutDuration(duration);
      } catch (err) {
        setError(err as ApiError);
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoordinates, defaultLocation],
  );

  // Handle location change from selector
  const handleLocationChange = useCallback(
    (locationId: string | null, coordinates?: { lat: number; lng: number }) => {
      setCurrentLocationId(locationId);

      // Resolve coordinates based on locationId
      let selectedCoordinates: { lat: number; lng: number } | undefined =
        coordinates;

      if (!selectedCoordinates && locationId) {
        // Handle suggested cities
        if (locationId.startsWith("suggested-city-")) {
          const cityName = locationId.replace("suggested-city-", "");
          const cityData = getSuggestedCityByName(cityName);
          if (cityData) {
            selectedCoordinates = {
              lat: cityData.latitude,
              lng: cityData.longitude,
            };
          }
        }
        // Handle user locations
        else {
          const userLocation = userLocations.find(
            (loc) => loc.id === locationId,
          );
          if (userLocation) {
            selectedCoordinates = {
              lat: userLocation.location.latitude,
              lng: userLocation.location.longitude,
            };
          }
        }
      }

      // Update current coordinates for WeeklyForecast
      if (selectedCoordinates) {
        setCurrentCoordinates({
          latitude: selectedCoordinates.lat,
          longitude: selectedCoordinates.lng,
        });
      }

      // Refetch recommendations with new coordinates
      fetchRecommendationWithParams(
        workoutIntensity,
        workoutDuration,
        selectedDate,
        selectedCoordinates,
      );
    },
    [
      fetchRecommendationWithParams,
      workoutIntensity,
      workoutDuration,
      selectedDate,
      userLocations,
    ],
  );

  // Fetch function for the button that uses current parameters
  const fetchRecommendation = useCallback(() => {
    fetchRecommendationWithParams(
      workoutIntensity,
      workoutDuration,
      selectedDate,
    );
  }, [
    fetchRecommendationWithParams,
    workoutIntensity,
    workoutDuration,
    selectedDate,
  ]);

  // Fetch recommendation on mount and location change only
  useEffect(() => {
    fetchRecommendationWithParams(
      originalWorkoutIntensity,
      originalWorkoutDuration,
      null, // Start with current day recommendation
    );
  }, [
    fetchRecommendationWithParams,
    originalWorkoutDuration,
    originalWorkoutIntensity,
  ]);

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

  const handleDaySelect = useCallback(
    (date: string) => {
      const newDate = date || null;
      setSelectedDate(newDate);
      // Fetch recommendation for selected date with current workout parameters
      fetchRecommendationWithParams(workoutIntensity, workoutDuration, newDate);
    },
    [fetchRecommendationWithParams, workoutIntensity, workoutDuration],
  );

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
      {/* Workout Parameters and Weather in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workout Parameters Selector */}
        <WorkoutSelector
          intensity={workoutIntensity}
          duration={workoutDuration}
          onIntensityChange={setWorkoutIntensity}
          onDurationChange={setWorkoutDuration}
          onUpdate={fetchRecommendation}
          isLoading={isLoading}
          hasChanges={hasWorkoutParamsChanged}
        />

        {/* Weather Summary */}
        <WeatherSummary
          weather={recommendation.weather}
          currentLocationId={currentLocationId || undefined}
          userLocations={userLocations}
          isLoadingLocations={isLoadingLocations}
          onLocationChange={handleLocationChange}
        />
      </div>

      {/* Update Recommendations Button - moved to WorkoutSelector component */}

      {/* Weekly Forecast - second row */}
      <WeeklyForecast
        location={currentCoordinates || defaultLocation?.location}
        selectedDate={selectedDate || undefined}
        onDaySelect={handleDaySelect}
      />

      {/* Main recommendation display */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 items-stretch">
        {/* Cyclist SVG */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Chronione strefy</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            <CyclistSVG
              recommendation={recommendation.recommendation}
              selectedZone={selectedZone}
              onZoneClick={handleZoneClick}
            />
          </CardContent>
        </Card>

        {/* Outfit Recommendation */}
        <div className="space-y-4 h-full">
          <OutfitRecommendationList
            recommendation={recommendation.recommendation}
            expandedZone={selectedZone}
            selectedDate={selectedDate}
          />
        </div>
      </div>

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
