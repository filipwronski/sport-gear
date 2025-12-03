import { useState, useEffect } from "react";
import { RefreshCw, Calendar } from "lucide-react";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ForecastDayCard from "./ForecastDayCard";
import type { ForecastDTO, GetForecastParams, Coordinates } from "../types";

// Create a client for forecast
const forecastQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes
      retry: (failureCount, error: unknown) => {
        const status = (error as any)?.status;
        if (status >= 400 && status < 500) {
          return status === 408 || status === 429;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * WeeklyForecast - 7-day weather forecast component
 * Displays forecast cards in responsive grid with click-to-navigate functionality
 */
interface WeeklyForecastProps {
  location?: Coordinates;
  selectedDate?: string | null;
  onDaySelect?: (date: string) => void;
}

async function fetchForecast(params: GetForecastParams): Promise<ForecastDTO> {
  const queryString = new URLSearchParams({
    lat: params.lat.toString(),
    lng: params.lng.toString(),
  }).toString();

  const response = await fetch(`/api/weather/forecast?${queryString}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch forecast");
  }
  return response.json();
}

// Internal component that uses React Query
function WeeklyForecastInternal({
  location,
  selectedDate,
  onDaySelect,
}: WeeklyForecastProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    data: forecast,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [
      "forecast",
      location ? `${location.latitude},${location.longitude}` : "geolocation",
    ],
    queryFn: async () => {
      // Use provided location coordinates if available
      if (location) {
        return fetchForecast({
          lat: location.latitude,
          lng: location.longitude,
        });
      }

      // Fallback to geolocation
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 300000, // 5 minutes
              });
            },
          );

          return fetchForecast({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        } catch {
          console.warn(
            "Geolocation not available, using default location (Warsaw)",
          );
          // Fallback to Warsaw coordinates
          return fetchForecast({
            lat: 52.237049,
            lng: 21.017532,
          });
        }
      } else {
        console.warn(
          "Geolocation not supported, using default location (Warsaw)",
        );
        // Fallback to Warsaw coordinates
        return fetchForecast({
          lat: 52.237049,
          lng: 21.017532,
        });
      }
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
    enabled: isMounted,
  });

  const handleDayClick = (date: string) => {
    if (onDaySelect) {
      onDaySelect(date);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  if (!isMounted) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Ładowanie prognozy pogody...</p>
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
            Kliknij na dzień aby zobaczyć rekomendację ubioru dla tej daty
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`}
          />
          Odśwież
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && !forecast && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
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

// Wrapper component with QueryClientProvider
export default function WeeklyForecast(props: WeeklyForecastProps) {
  return (
    <QueryClientProvider client={forecastQueryClient}>
      <WeeklyForecastInternal {...props} />
    </QueryClientProvider>
  );
}
