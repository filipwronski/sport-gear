import { Compass, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface QuickRecommendationCardProps {
  recommendation: string;
  locationId?: string;
}

export function QuickRecommendationCard({
  recommendation,
  locationId,
}: QuickRecommendationCardProps) {
  const handleViewDetails = () => {
    const url = locationId
      ? `/recommendations?location_id=${locationId}`
      : "/recommendations";
    window.location.href = url;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Compass className="h-5 w-5" />
          Szybka rekomendacja
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[80px]">
          <p className="text-sm leading-relaxed">{recommendation}</p>
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
      </CardContent>
    </Card>
  );
}
