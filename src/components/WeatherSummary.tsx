import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationSelector } from "./dashboard/LocationSelector";
import type { WeatherDTO, LocationDTO } from "../types";

/**
 * WeatherSummary - Displays current weather conditions
 * Shows temperature, feels like, wind speed, humidity, and rain
 */
interface WeatherSummaryProps {
  weather: WeatherDTO;
  compact?: boolean;
  currentLocationId?: string;
  userLocations?: LocationDTO[];
  isLoadingLocations?: boolean;
  onLocationChange?: (
    locationId: string | null,
    coordinates?: { lat: number; lng: number },
  ) => void;
}

export default function WeatherSummary({
  weather,
  compact = false,
  currentLocationId,
  userLocations = [],
  isLoadingLocations = false,
  onLocationChange,
}: WeatherSummaryProps) {
  const formatTemperature = (temp: number) => `${Math.round(temp)}°C`;
  const formatWindSpeed = (speed: number) => `${Math.round(speed)} km/h`;
  const formatRain = (rain: number) => rain.toFixed(2);
  const getWeatherIcon = (icon: string) =>
    `http://openweathermap.org/img/wn/${icon}@2x.png`;

  const translateWeatherDescription = (description: string): string => {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes("clear sky")) return "bezchmurnie";
    if (lowerDesc.includes("few clouds")) return "kilka chmur";
    if (lowerDesc.includes("scattered clouds")) return "rozproszone chmury";
    if (lowerDesc.includes("broken clouds")) return "zachmurzenie umiarkowane";
    if (lowerDesc.includes("overcast clouds")) return "pochmurnie";
    if (lowerDesc.includes("light rain")) return "lekki deszcz";
    if (lowerDesc.includes("moderate rain")) return "umiarkowany deszcz";
    if (lowerDesc.includes("heavy rain")) return "intensywny deszcz";
    if (lowerDesc.includes("very heavy rain")) return "ulewny deszcz";
    if (lowerDesc.includes("extreme rain")) return "ekstremalne opady";
    if (lowerDesc.includes("freezing rain")) return "marznący deszcz";
    if (lowerDesc.includes("light snow")) return "lekki śnieg";
    if (lowerDesc.includes("moderate snow")) return "umiarkowany śnieg";
    if (lowerDesc.includes("heavy snow")) return "intensywny śnieg";
    if (lowerDesc.includes("sleet")) return "śnieg z deszczem";
    if (lowerDesc.includes("thunderstorm")) return "burza";
    if (lowerDesc.includes("drizzle")) return "mżawka";
    if (lowerDesc.includes("mist")) return "mgiełka";
    if (lowerDesc.includes("fog")) return "mgła";
    if (lowerDesc.includes("haze")) return "zamglenie";

    // Fallback - jeśli nie rozpoznano, zwracamy oryginalny opis
    return description;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <div className="text-lg font-semibold">
          {formatTemperature(weather.temperature)}
        </div>
        <div className="text-muted-foreground">
          Odczuwalna: {formatTemperature(weather.feels_like)}
        </div>
        <div className="text-muted-foreground">
          💨 {formatWindSpeed(weather.wind_speed)}
        </div>
        {weather.rain_mm > 0 && (
          <div className="text-muted-foreground">
            🌧️ {formatRain(weather.rain_mm)} mm
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Aktualne warunki pogodowe</CardTitle>
          {onLocationChange && (
            <div className="flex-shrink-0">
              <LocationSelector
                currentLocationId={currentLocationId}
                userLocations={userLocations}
                isLoadingLocations={isLoadingLocations}
                onLocationChange={onLocationChange}
                className="w-48"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Temperatura</span>
              <span className="text-lg font-semibold">
                {formatTemperature(weather.temperature)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Odczuwalna</span>
              <span className="text-sm">
                {formatTemperature(weather.feels_like)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wiatr</span>
              <span className="text-sm">
                {formatWindSpeed(weather.wind_speed)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Wilgotność</span>
              <span className="text-sm">{weather.humidity}%</span>
            </div>
            {weather.rain_mm > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Opady</span>
                <span className="text-sm">
                  {formatRain(weather.rain_mm)} mm
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t flex items-center gap-3">
          <img
            src={getWeatherIcon(weather.icon)}
            alt={weather.description}
            className="w-12 h-12"
          />
          <p className="text-sm text-muted-foreground capitalize">
            {translateWeatherDescription(weather.description)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
