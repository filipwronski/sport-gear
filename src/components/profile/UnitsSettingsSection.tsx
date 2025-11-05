import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Ruler } from "lucide-react";
import type { UnitsEnum } from "../../types";

interface UnitsSettingsSectionProps {
  units: UnitsEnum | null;
  onUpdate: (units: UnitsEnum) => Promise<void>;
}

const UNITS_OPTIONS = [
  {
    value: "metric" as const,
    label: "Metryczne",
    description: "Kilometry, stopnie Celsjusza",
  },
  {
    value: "imperial" as const,
    label: "Imperialne",
    description: "Mile, stopnie Fahrenheita",
  },
];

export function UnitsSettingsSection({
  units,
  onUpdate,
}: UnitsSettingsSectionProps) {
  const [selectedUnits, setSelectedUnits] = useState<UnitsEnum>(
    units || "metric",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setSelectedUnits(units || "metric");
  }, [units]);

  const handleUnitsChange = async (value: UnitsEnum) => {
    setIsUpdating(true);
    try {
      await onUpdate(value);
      setSelectedUnits(value);
    } catch (_error) {
      // Error is handled by parent component
      // Revert local state on error
      setSelectedUnits(units || "metric");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Jednostki
        </CardTitle>
        <CardDescription>Wybierz preferowany system jednostek</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedUnits}
          onValueChange={handleUnitsChange}
          disabled={isUpdating}
          className="space-y-3"
        >
          {UNITS_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-3">
              <RadioGroupItem value={option.value} id={option.value} />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={option.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
