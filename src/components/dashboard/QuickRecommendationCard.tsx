import { useState, useEffect } from "react";
import { Compass, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OutfitRecommendationList from "@/components/OutfitRecommendationList";
import type {
  ClothingRecommendationDTO,
  NewRecommendationDTO,
} from "../../types";

interface QuickRecommendationCardProps {
  recommendation: string;
  locationId?: string;
  coordinates?: { lat: number; lng: number };
}

export function QuickRecommendationCard({
  recommendation,
  locationId,
  coordinates,
}: QuickRecommendationCardProps) {
  const [outfitRecommendation, setOutfitRecommendation] =
    useState<ClothingRecommendationDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleViewDetails = () => {
    const url = locationId
      ? `/recommendations?location_id=${locationId}`
      : "/recommendations";
    window.location.href = url;
  };

  useEffect(() => {
    const fetchOutfitRecommendation = async () => {
      if (!coordinates) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use default workout parameters for dashboard recommendation
        const params = new URLSearchParams({
          lat: coordinates.lat.toString(),
          lng: coordinates.lng.toString(),
          workout_intensity: "rekreacyjny",
          workout_duration: "60",
        });

        const response = await fetch(`/api/new-recommendations?${params}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendation: ${response.status}`);
        }

        const data: NewRecommendationDTO = await response.json();
        setOutfitRecommendation(data.recommendation);
      } catch (err) {
        console.warn("Failed to fetch outfit recommendation:", err);
        setError("Nie udało się pobrać rekomendacji ubioru");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutfitRecommendation();
  }, [coordinates]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Szybka rekomendacja ubioru
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Ładowanie rekomendacji...
            </span>
          </div>
        ) : outfitRecommendation ? (
          <div className="space-y-4">
            <OutfitRecommendationList recommendation={outfitRecommendation} />
            <Button
              onClick={handleViewDetails}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <span>Zobacz pełne rekomendacje</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            <div className="min-h-[80px]">
              <p className="text-sm leading-relaxed">
                {error || recommendation}
              </p>
            </div>
            <Button
              onClick={handleViewDetails}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <span>Zobacz pełną rekomendację</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
