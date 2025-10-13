import { useState } from "react";
import { RefreshCw, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ForecastDayCard from "./ForecastDayCard";
import type { ForecastDTO, GetForecastParams } from "../types";

/**
 * WeeklyForecast - 7-day weather forecast component
 * Displays forecast cards in responsive grid with click-to-navigate functionality
 */
interface WeeklyForecastProps {
  locationId?: string;
  onDaySelect?: (date: string) => void;
}

async function fetchForecast(params: GetForecastParams): Promise<ForecastDTO> {
  const queryString = new URLSearchParams({
    location_id: params.location_id,
  }).toString();

  const response = await fetch(`/api/weather/forecast?${queryString}`);
  if (!response.ok) {
    throw new Error('Failed to fetch forecast');
  }
  return response.json();
}

export default function WeeklyForecast({ locationId, onDaySelect }: WeeklyForecastProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const {
    data: forecast,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['forecast', locationId],
    queryFn: () => locationId ? fetchForecast({ location_id: locationId }) : Promise.reject('No location'),
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    enabled: !!locationId,
  });

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    if (onDaySelect) {
      onDaySelect(date);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!locationId) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Wybierz lokalizację aby zobaczyć prognozę
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Prognoza tygodniowa</h3>
          <p className="text-sm text-muted-foreground">
            Kliknij na dzień aby zobaczyć rekomendację dla tej daty
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && !forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Nie udało się pobrać prognozy pogody. Spróbuj odświeżyć.
          </AlertDescription>
        </Alert>
      )}

      {/* Forecast grid */}
      {forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {forecast.forecast.map((day) => (
            <ForecastDayCard
              key={day.date}
              day={day}
              isSelected={selectedDate === day.date}
              onClick={() => handleDayClick(day.date)}
            />
          ))}
        </div>
      )}

      {/* No data state */}
      {!isLoading && !error && !forecast && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Brak danych prognozy dla tej lokalizacji
          </p>
        </div>
      )}
    </div>
  );
}
