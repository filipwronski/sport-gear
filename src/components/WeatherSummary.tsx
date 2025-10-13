import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeatherDTO } from "../types";

/**
 * WeatherSummary - Displays current weather conditions
 * Shows temperature, feels like, wind speed, humidity, and rain
 */
interface WeatherSummaryProps {
  weather: WeatherDTO;
  compact?: boolean;
}

export default function WeatherSummary({ weather, compact = false }: WeatherSummaryProps) {
  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="text-lg font-semibold">{formatTemperature(weather.temperature)}</div>
        <div className="text-muted-foreground">Odczuwalna: {formatTemperature(weather.feels_like)}</div>
        <div className="text-muted-foreground">💨 {weather.wind_speed} km/h</div>
        {weather.rain_mm && weather.rain_mm > 0 && (
          <div className="text-muted-foreground">🌧️ {weather.rain_mm} mm</div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Aktualne warunki pogodowe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperatura</span>
              <span className="text-lg font-semibold">{formatTemperature(weather.temperature)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Odczuwalna</span>
              <span className="text-sm">{formatTemperature(weather.feels_like)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wiatr</span>
              <span className="text-sm">{weather.wind_speed} km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wilgotność</span>
              <span className="text-sm">{weather.humidity}%</span>
            </div>
            {weather.rain_mm && weather.rain_mm > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Opady</span>
                <span className="text-sm">{weather.rain_mm} mm</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground">{weather.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
