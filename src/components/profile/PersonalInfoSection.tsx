import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, MapPin } from "lucide-react";
import {
  POLISH_CITIES,
  getPolishCityByName,
} from "../../constants/location.constants";
import type {
  ProfileDTO,
  LocationDTO,
  UpdateProfileCommand,
  CreateLocationCommand,
  UpdateLocationCommand,
} from "../../types";

interface PersonalInfoSectionProps {
  profile: ProfileDTO;
  locations: LocationDTO[];
  isLoadingLocations?: boolean;
  onUpdate: (command: Partial<UpdateProfileCommand>) => Promise<void>;
  onCreateLocation: (command: CreateLocationCommand) => Promise<LocationDTO>;
  onUpdateLocation: (
    locationId: string,
    command: UpdateLocationCommand,
  ) => Promise<LocationDTO>;
}

export function PersonalInfoSection({
  profile,
  locations,
  isLoadingLocations = false,
  onUpdate,
  onCreateLocation,
  onUpdateLocation,
}: PersonalInfoSectionProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [defaultLocationId, setDefaultLocationId] = useState(
    profile.default_location_id || "none",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when profile changes
  useEffect(() => {
    setDisplayName(profile.display_name || "");
    setDefaultLocationId(profile.default_location_id || "none");
  }, [profile]);

  // Check if there are unsaved changes
  useEffect(() => {
    const nameChanged = displayName !== (profile.display_name || "");
    const locationChanged =
      defaultLocationId !== (profile.default_location_id || "none");
    setHasChanges(nameChanged || locationChanged);
  }, [displayName, defaultLocationId, profile]);

  const handleDefaultLocationChange = (value: string) => {
    setDefaultLocationId(value);
    // Location creation will happen in handleSave when user clicks "Zapisz zmiany"
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let actualLocationId = defaultLocationId;

      // If user selected a Polish city, create it as a location if it doesn't exist
      if (defaultLocationId.startsWith("polish-city-")) {
        const cityName = defaultLocationId.replace("polish-city-", "");
        const cityData = getPolishCityByName(cityName);

        if (cityData) {
          // Check if this city already exists in user's locations
          // Normalize city name for comparison (remove diacritics, lowercase)
          const normalizedCityName = cityName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const existingLocation = locations.find((loc) => {
            const locNormalized = loc.city
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            return (
              locNormalized === normalizedCityName && loc.country_code === "PL"
            );
          });

          if (existingLocation) {
            // City already exists, use its ID
            console.log(
              `Using existing location for ${cityName}:`,
              existingLocation.id,
            );
            actualLocationId = existingLocation.id;
          } else {
            // Create new location (without setting as default)
            console.log(`Creating new location for ${cityName}`);
            const newLocation = await onCreateLocation({
              latitude: cityData.latitude,
              longitude: cityData.longitude,
              city: cityData.name,
              country_code: cityData.country_code,
              is_default: false, // Don't set as default here, will be set via profile update
            });
            actualLocationId = newLocation.id;
            console.log(`Created new location with ID: ${actualLocationId}`);
          }
        }
      }

      await onUpdate({
        display_name: displayName.trim() || undefined,
        default_location_id:
          actualLocationId === "none" ? null : actualLocationId,
      });

      // If we set a default location, update its is_default flag
      if (actualLocationId !== "none") {
        try {
          await onUpdateLocation(actualLocationId, { is_default: true });
        } catch (error) {
          console.warn("Failed to set location as default:", error);
          // Continue anyway - the profile update already set the default_location_id
        }
      }

      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultLocation =
    defaultLocationId !== "none" && !isLoadingLocations
      ? locations.find((loc) => loc.id === defaultLocationId)
      : null;

  // If we have a default location ID but can't find it in locations,
  // it means the location was deleted or there's a data inconsistency
  // In this case, we should reset the default location ID
  // But don't do this during saving operations or if we're in the middle of creating a location
  // Also, add a small delay to avoid race conditions during location updates
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (
        defaultLocationId !== "none" &&
        defaultLocationId &&
        !defaultLocation &&
        locations.length > 0 &&
        !isSaving &&
        !isLoadingLocations
      ) {
        // Check if this is a Polish city that's in the process of being created
        const isPendingPolishCity =
          defaultLocationId.startsWith("polish-city-");
        if (!isPendingPolishCity) {
          console.log("Default location not found, resetting to none");
          onUpdate({ default_location_id: null });
        }
      }
    }, 1000); // Wait 1 second to allow for location updates to complete

    return () => clearTimeout(timeoutId);
  }, [
    defaultLocationId,
    defaultLocation,
    locations.length,
    onUpdate,
    isSaving,
    isLoadingLocations,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Dane osobowe
        </CardTitle>
        <CardDescription>
          Zarządzaj swoją nazwą wyświetlaną i domyślną lokalizacją
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Nazwa wyświetlana</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Wprowadź nazwę wyświetlaną"
            maxLength={50}
          />
          <p className="text-sm text-muted-foreground">
            {displayName.length}/50 znaków
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Domyślna lokalizacja
          </Label>
          <Select
            value={defaultLocationId}
            onValueChange={handleDefaultLocationChange}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz domyślną lokalizację">
                {isLoadingLocations
                  ? "Ładowanie lokalizacji..."
                  : defaultLocation
                    ? `${defaultLocation.city}, ${defaultLocation.country_code}`
                    : defaultLocationId.startsWith("polish-city-")
                      ? getPolishCityByName(
                          defaultLocationId.replace("polish-city-", ""),
                        )?.name + ", PL"
                      : "Brak wybranej lokalizacji"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak domyślnej lokalizacji</SelectItem>

              {/* Polish Cities Section */}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Największe miasta Polski
              </div>
              {POLISH_CITIES.map((city) => {
                const cityValue = `polish-city-${city.name}`;
                const existingLocation = locations.find(
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
              {locations.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t mt-1 pt-2">
                    Moje lokalizacje
                  </div>
                  {locations.map((location) => (
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
          <p className="text-sm text-muted-foreground">
            Ta lokalizacja będzie używana domyślnie dla rekomendacji pogody i
            outfitów
          </p>
        </div>

        {hasChanges && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
