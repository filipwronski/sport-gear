import { Card, CardContent } from "@/components/ui/card";
import type { ForecastDayDTO } from "../types";

/**
 * ForecastDayCard - Displays weather forecast for a single day
 * Shows temperature range, wind, rain, and quick recommendation
 */
interface ForecastDayCardProps {
  day: ForecastDayDTO;
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ForecastDayCard({ day, isSelected = false, onClick }: ForecastDayCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Dzisiaj";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Jutro";
    } else {
      return date.toLocaleDateString("pl-PL", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
    }
  };

  const getWeatherIcon = (description: string) => {
    // Simple weather icon mapping based on description
    const desc = description.toLowerCase();
    if (desc.includes("deszcz") || desc.includes("rain")) return "🌧️";
    if (desc.includes("śnieg") || desc.includes("snow")) return "❄️";
    if (desc.includes("zachmurz") || desc.includes("cloud")) return "☁️";
    if (desc.includes("słonecz") || desc.includes("sun")) return "☀️";
    return "🌤️"; // default partly cloudy
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${onClick ? "hover:bg-accent/50" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardContent className="p-4">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {formatDate(day.date)}
          </div>

          <div className="text-2xl">
            {getWeatherIcon(day.description)}
          </div>

          <div className="text-sm font-semibold">
            {Math.round(day.temperature_min)}° - {Math.round(day.temperature_max)}°
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>💨 {day.wind_speed} km/h</div>
            {day.rain_mm > 0 && (
              <div>🌧️ {day.rain_mm} mm</div>
            )}
          </div>

          <div className="text-xs text-center leading-tight">
            {day.quick_recommendation}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
