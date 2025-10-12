import { WeatherCard } from "./WeatherCard";
import { QuickRecommendationCard } from "./QuickRecommendationCard";
import type { WeatherSectionProps } from "./types";

export function WeatherSection({ data, lastRefresh }: WeatherSectionProps) {
  return (
    <section className="mb-6 md:mb-8" aria-labelledby="weather-heading">
      <h2 id="weather-heading" className="sr-only">
        Dzisiejsza pogoda i rekomendacja
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <WeatherCard weather={data} refreshedAt={lastRefresh} />
        <QuickRecommendationCard
          recommendation={data.quick_recommendation}
          locationId={data.location_id}
        />
      </div>
    </section>
  );
}
