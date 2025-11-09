import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import {
  POLISH_CITIES,
  getPolishCityByName,
} from "../../constants/location.constants";
import type { LocationDTO } from "../../types";

interface LocationSelectorProps {
  currentLocationId?: string;
  userLocations: LocationDTO[];
  isLoadingLocations?: boolean;
  onLocationChange: (locationId: string | null, coordinates?: { lat: number; lng: number }) => void;
  className?: string;
}

export function LocationSelector({
  currentLocationId,
  userLocations,
  isLoadingLocations = false,
  onLocationChange,
  className = "",
}: LocationSelectorProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [browserLocation, setBrowserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Get current location display name
  const getCurrentLocationDisplay = () => {
    if (!currentLocationId) {
      return "Wybierz lokalizację";
    }

    if (currentLocationId === "browser") {
      return browserLocation ? "Lokalizacja z przeglądarki" : "Pobieranie lokalizacji...";
    }

    // Check if it's a Polish city
    if (currentLocationId.startsWith("polish-city-")) {
      const cityName = currentLocationId.replace("polish-city-", "");
      const cityData = getPolishCityByName(cityName);
      return cityData ? `${cityData.name}, PL` : "Nieznana lokalizacja";
    }

    // Check user locations
    const userLocation = userLocations.find(loc => loc.id === currentLocationId);
    if (userLocation) {
      return `${userLocation.city}, ${userLocation.country_code}`;
    }

    return "Nieznana lokalizacja";
  };

  // Handle browser geolocation
  const handleBrowserLocation = async () => {
    setIsGettingLocation(true);
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolokalizacja nie jest wspierana");
      }

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          });
        },
      );

      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setBrowserLocation(coords);
      onLocationChange("browser", coords);
    } catch (error) {
      console.error("Błąd pobierania lokalizacji:", error);
      // Could show a toast here
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (value: string) => {
    if (value === "browser") {
      handleBrowserLocation();
    } else {
      onLocationChange(value === "none" ? null : value);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />

      <Select
        value={currentLocationId || "none"}
        onValueChange={handleLocationSelect}
        disabled={isLoadingLocations}
      >
        <SelectTrigger className="w-full max-w-xs">
          <SelectValue placeholder="Wybierz lokalizację">
            {isLoadingLocations ? "Ładowanie..." : getCurrentLocationDisplay()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Brak wybranej lokalizacji</SelectItem>

          {/* Browser location option */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Lokalizacja z przeglądarki
          </div>
          <SelectItem value="browser" className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Użyj mojej lokalizacji
            {isGettingLocation && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </SelectItem>

          {/* Polish Cities Section */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
            Największe miasta Polski
          </div>
          {POLISH_CITIES.map((city) => {
            const cityValue = `polish-city-${city.name}`;
            const existingLocation = userLocations.find(
              (loc) =>
                loc.city.toLowerCase() === city.name.toLowerCase() &&
                loc.country_code === "PL",
            );
            return (
              <SelectItem key={cityValue} value={cityValue}>
                {city.name}, {city.country_code}
                {existingLocation && " ✓"}
              </SelectItem>
            );
          })}

          {/* User Locations Section */}
          {userLocations.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
                Moje lokalizacje
              </div>
              {userLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.label ||
                    `${location.city}, ${location.country_code}`}
                  {location.is_default && " (domyślna)"}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
