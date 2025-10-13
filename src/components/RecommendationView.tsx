import { useState, useEffect } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeatherSummary from "./WeatherSummary";
import CyclistSVG from "./CyclistSVG";
import OutfitDetailsList from "./OutfitDetailsList";
import AdditionalTipsSection from "./AdditionalTipsSection";
import AddFeedbackCTA from "./AddFeedbackCTA";
import FeedbackDialog from "./FeedbackDialog";
import type { ZoneType, FeedbackDTO, RecommendationDTO, ApiError } from "../types";

/**
 * Simplified RecommendationView - Shows current weather-based outfit recommendation
 */
export default function RecommendationView() {
  const [selectedZone, setSelectedZone] = useState<ZoneType | undefined>();
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendationDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Fetch recommendation on mount
  useEffect(() => {
    fetchRecommendation();
  }, []);

  const fetchRecommendation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get coordinates
      let params: Record<string, string> = {};

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 300000,
            });
          });
          params.lat = position.coords.latitude.toString();
          params.lng = position.coords.longitude.toString();
        } catch (geoError) {
          // Fallback to Warsaw coordinates
          params.lat = "52.237049";
          params.lng = "21.017532";
        }
      } else {
        // Fallback to Warsaw coordinates
        params.lat = "52.237049";
        params.lng = "21.017532";
      }

      params.activity_type = "spokojna";
      params.duration_minutes = "90";

      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/recommendations?${queryString}`);

      if (!response.ok) {
        const errorData = await response.json();
        const apiError: ApiError = {
          code: errorData.error?.code || "UNKNOWN_ERROR",
          message: errorData.error?.message || "Wystąpił błąd podczas pobierania rekomendacji",
          statusCode: response.status,
          details: errorData.error?.details,
          retryAfter: response.headers.get("Retry-After")
            ? parseInt(response.headers.get("Retry-After")!)
            : undefined,
        };
        throw apiError;
      }

      const data: RecommendationDTO = await response.json();
      setRecommendation(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleZoneClick = (zone: ZoneType) => {
    setSelectedZone(zone);
  };

  const handleFeedbackSubmitted = (feedback: FeedbackDTO) => {
    setFeedbackCount(prev => prev + 1);
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
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
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
        </div>

        {/* Feedback Dialog */}
        <FeedbackDialog
          isOpen={feedbackDialogOpen}
          onClose={() => setFeedbackDialogOpen(false)}
          recommendation={recommendation}
          onSubmitted={handleFeedbackSubmitted}
        />
      </CardContent>
    </Card>
  );
}
