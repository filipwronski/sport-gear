import { Compass, MessageSquare, Wrench, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuickActionsBarProps } from "./types";

export function QuickActionsBar({ currentLocationId }: QuickActionsBarProps) {
  const handleNewRecommendation = () => {
    const url = currentLocationId
      ? `/recommendations?location_id=${currentLocationId}`
      : "/recommendations";
    window.location.href = url;
  };

  const handleAddFeedback = () => {
    window.location.href = "/feedbacks/new";
  };

  const handleAddService = () => {
    // This would typically open a modal to select bike first
    // For now, redirect to bikes page
    window.location.href = "/bikes";
  };

  const handleViewForecast = () => {
    const url = currentLocationId
      ? `/weather/forecast?location_id=${currentLocationId}`
      : "/weather/forecast";
    window.location.href = url;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg md:static md:mt-8 md:rounded-lg md:border md:shadow-none">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
        <Button onClick={handleNewRecommendation} variant="default">
          <Compass className="mr-2 h-4 w-4" />
          <span className="hidden md:inline">Nowa</span> rekomendacja
        </Button>

        <Button onClick={handleAddFeedback} variant="outline">
          <MessageSquare className="mr-2 h-4 w-4" />
          <span className="hidden md:inline">Dodaj</span> feedback
        </Button>

        <Button onClick={handleAddService} variant="outline">
          <Wrench className="mr-2 h-4 w-4" />
          <span className="hidden md:inline">Dodaj</span> serwis
        </Button>

        <Button onClick={handleViewForecast} variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Prognoza
        </Button>
      </div>
    </div>
  );
}
