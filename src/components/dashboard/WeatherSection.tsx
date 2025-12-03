import { useState } from "react";
import { WeatherCard } from "./WeatherCard";
import { QuickRecommendationCard } from "./QuickRecommendationCard";
import type { WeatherSectionProps } from "./types";
import type { LocationDTO } from "../../types";

export function WeatherSection({
  data,
  lastRefresh,
  coordinates,
  currentLocationId,
  userLocations = [],
  isLoadingLocations = false,
  onLocationChange,
}: WeatherSectionProps & {
  coordinates?: { lat: number; lng: number } | null;
  currentLocationId?: string;
  userLocations?: LocationDTO[];
  isLoadingLocations?: boolean;
  onLocationChange?: (locationId: string | null) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDaySelect = (date: string) => {
    setSelectedDate(date);
  };
  return (
    <section
      className="mb-6 md:mb-8 space-y-6"
      aria-labelledby="weather-heading"
    >
      <h2 id="weather-heading" className="sr-only">
        Pogoda i rekomendacje ubioru
      </h2>

      {/* Today's Weather and Quick Recommendation */}
      <div className="grid gap-4 md:grid-cols-2 items-stretch">
        <WeatherCard
          weather={data}
          refreshedAt={lastRefresh}
          coordinates={coordinates || undefined}
          currentLocationId={currentLocationId}
          userLocations={userLocations}
          isLoadingLocations={isLoadingLocations}
          onLocationChange={onLocationChange}
          onDaySelect={handleDaySelect}
        />
        <QuickRecommendationCard
          recommendation={data.quick_recommendation}
          locationId={data.location_id}
          coordinates={coordinates || undefined}
          selectedDate={selectedDate}
        />
      </div>
    </section>
  );
}
