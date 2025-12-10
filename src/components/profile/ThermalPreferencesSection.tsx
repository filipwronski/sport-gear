import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Thermometer, ChevronDown, RotateCcw } from "lucide-react";
import type { ThermalPreferences, ThermalFeelingEnum } from "../../types";

interface ThermalPreferencesSectionProps {
  preferences: ThermalPreferences | null;
  onUpdate: (preferences: ThermalPreferences) => Promise<void>;
  onStartQuiz: () => void;
}

const THERMAL_FEELING_OPTIONS: { value: ThermalFeelingEnum; label: string }[] =
  [
    { value: "marzlak", label: "Zmarźlak - szybko mi zimno" },
    { value: "neutralnie", label: "Neutralnie - normalna wrażliwość" },
    { value: "szybko_mi_goraco", label: "Szybko mi gorąco - wolniej się pocę" },
  ];

export function ThermalPreferencesSection({
  preferences,
  onUpdate,
  onStartQuiz,
}: ThermalPreferencesSectionProps) {
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localPreferences, setLocalPreferences] = useState<ThermalPreferences>({
    general_feeling: "neutralnie",
    cold_hands: false,
    cold_feet: false,
    cap_threshold_temp: 20,
  });

  // Update local state when preferences change
  useEffect(() => {
    if (preferences) {
      setLocalPreferences(preferences);
    }
  }, [preferences]);

  const hasChanges = preferences
    ? localPreferences.general_feeling !== preferences.general_feeling ||
      localPreferences.cold_hands !== preferences.cold_hands ||
      localPreferences.cold_feet !== preferences.cold_feet ||
      localPreferences.cap_threshold_temp !== preferences.cap_threshold_temp
    : true;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(localPreferences);
    } catch (_error) {
      // Error is handled by parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartQuiz = () => {
    onStartQuiz();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          Preferencje termiczne
        </CardTitle>
        <CardDescription>
          Twoje ustawienia termiczne wpływają na rekomendacje stroju
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={handleStartQuiz}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Przejdź quiz ponownie
          </Button>

          <Collapsible
            open={isManualEditOpen}
            onOpenChange={setIsManualEditOpen}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full sm:w-auto justify-between"
              >
                Ręczna edycja ustawień
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isManualEditOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="general-feeling">Ogólne odczucie ciepła</Label>
                <Select
                  value={localPreferences.general_feeling}
                  onValueChange={(value: ThermalFeelingEnum) =>
                    setLocalPreferences((prev) => ({
                      ...prev,
                      general_feeling: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THERMAL_FEELING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Specyficzne wrażliwości</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cold-hands"
                    checked={localPreferences.cold_hands}
                    onCheckedChange={(checked) =>
                      setLocalPreferences((prev) => ({
                        ...prev,
                        cold_hands: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="cold-hands">Szybko marzną mi ręce</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cold-feet"
                    checked={localPreferences.cold_feet}
                    onCheckedChange={(checked) =>
                      setLocalPreferences((prev) => ({
                        ...prev,
                        cold_feet: checked as boolean,
                      }))
                    }
                  />
                  <Label htmlFor="cold-feet">Szybko marzną mi stopy</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cap-threshold">
                  Próg temperatury dla czapki (°C)
                </Label>
                <Select
                  value={(localPreferences.cap_threshold_temp ?? 20).toString()}
                  onValueChange={(value) =>
                    setLocalPreferences((prev) => ({
                      ...prev,
                      cap_threshold_temp: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i - 10).map(
                      (temp) => (
                        <SelectItem key={temp} value={temp.toString()}>
                          {temp}°C
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Temperatura, poniżej której system będzie rekomendował czapkę
                </p>
              </div>

              {hasChanges && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Zapisywanie..." : "Zapisz zmiany"}
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}
