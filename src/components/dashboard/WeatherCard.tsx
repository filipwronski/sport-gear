import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WeeklyForecast from "../WeeklyForecast";
import type { WeatherSummaryDTO } from "../../types";

interface WeatherCardProps {
  weather: WeatherSummaryDTO;
  refreshedAt?: Date;
  coordinates?: { lat: number; lng: number };
}

export function WeatherCard({
  weather,
  refreshedAt,
  coordinates,
}: WeatherCardProps) {
  const getWeatherIcon = (description: string) => {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes("clear") || lowerDesc.includes("sunny")) {
      return "☀️";
    } else if (lowerDesc.includes("cloud")) {
      return "☁️";
    } else if (lowerDesc.includes("rain") || lowerDesc.includes("drizzle")) {
      return "🌧️";
    } else if (lowerDesc.includes("snow")) {
      return "❄️";
    } else if (lowerDesc.includes("thunder")) {
      return "⛈️";
    } else {
      return "☁️"; // default cloudy
    }
  };

  const formatLastRefresh = (date: Date | undefined) => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return "Przed chwilą";
    if (diffMins === 1) return "Minutę temu";
    if (diffMins < 60) return `${diffMins} min temu`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "Godzinę temu";
    return `${diffHours} godz temu`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Dzisiejsza pogoda
        </CardTitle>
        {refreshedAt && (
          <p className="text-xs text-muted-foreground">
            Odświeżono {formatLastRefresh(refreshedAt)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">
                {Math.round(weather.current_temperature)}°C
              </p>
              <p className="text-sm text-muted-foreground">
                Odczuwalna: {Math.round(weather.feels_like)}°C
              </p>
            </div>
          </div>
          <div className="text-4xl">{getWeatherIcon(weather.description)}</div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{weather.wind_speed} km/h</p>
              <p className="text-xs text-muted-foreground">Wiatr</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{weather.humidity}%</p>
              <p className="text-xs text-muted-foreground">Wilgotność</p>
            </div>
          </div>
        </div>

        {/* Weekly Forecast */}
        {coordinates && (
          <div className="pt-4 border-t">
            <WeeklyForecast
              location={{
                latitude: coordinates.lat,
                longitude: coordinates.lng,
              }}
              onDaySelect={(date) => {
                // Could navigate to recommendations with specific date
                console.info("Selected forecast date:", date);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
