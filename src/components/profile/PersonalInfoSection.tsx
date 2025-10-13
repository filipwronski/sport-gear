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
import { User } from "lucide-react";
import type {
  ProfileDTO,
  LocationDTO,
  UpdateProfileCommand,
} from "../../types";

interface PersonalInfoSectionProps {
  profile: ProfileDTO;
  locations: LocationDTO[];
  onUpdate: (command: Partial<UpdateProfileCommand>) => Promise<void>;
}

export function PersonalInfoSection({
  profile,
  locations,
  onUpdate,
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({
        display_name: displayName.trim() || null,
        default_location_id:
          defaultLocationId === "none" ? null : defaultLocationId,
      });
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultLocation =
    defaultLocationId !== "none"
      ? locations.find((loc) => loc.id === defaultLocationId)
      : null;

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
          <Label htmlFor="default-location">Domyślna lokalizacja</Label>
          <Select
            value={defaultLocationId}
            onValueChange={setDefaultLocationId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Wybierz domyślną lokalizację">
                {defaultLocation
                  ? `${defaultLocation.city}, ${defaultLocation.country_code}`
                  : "Brak wybranej lokalizacji"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Brak domyślnej lokalizacji</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.label ||
                    `${location.city}, ${location.country_code}`}
                  {location.is_default && " (domyślna)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Ta lokalizacja będzie używana domyślnie dla rekomendacji pogody
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
