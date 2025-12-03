import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export type WorkoutIntensity =
  | "rekreacyjny"
  | "tempo"
  | "intensywny"
  | "długodystansowy";
export type WorkoutDuration = number; // in minutes

interface WorkoutSelectorProps {
  intensity: WorkoutIntensity;
  duration: WorkoutDuration;
  onIntensityChange: (intensity: WorkoutIntensity) => void;
  onDurationChange: (duration: WorkoutDuration) => void;
  onUpdate?: () => void;
  isLoading?: boolean;
  hasChanges?: boolean;
}

export default function WorkoutSelector({
  intensity,
  duration,
  onIntensityChange,
  onDurationChange,
  onUpdate,
  isLoading = false,
  hasChanges = false,
}: WorkoutSelectorProps) {
  const intensityOptions = [
    {
      value: "rekreacyjny",
      label: "Rekreacyjny",
      description: "Lekki trening, spokojne tempo",
    },
    { value: "tempo", label: "Tempo", description: "Utrzymane średnie tempo" },
    {
      value: "intensywny",
      label: "Intensywny",
      description: "Interwały, wysoki wysiłek",
    },
    {
      value: "długodystansowy",
      label: "Długodystansowy",
      description: "Długi dystans, wytrzymałość",
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Parametry treningu</CardTitle>
          {onUpdate && (
            <Button
              onClick={onUpdate}
              disabled={isLoading || !hasChanges}
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Zaktualizuj rekomendacje
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Intensywność treningu</Label>
          <RadioGroup
            value={intensity}
            onValueChange={onIntensityChange}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {intensityOptions.map((option) => (
              <div
                key={option.value}
                className="flex items-center mt-2 space-x-2"
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs mt-2 text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <Label htmlFor="duration">Długość treningu: {duration} minut</Label>
          <Slider
            id="duration"
            min={15}
            max={300}
            step={15}
            value={[duration]}
            onValueChange={(value) => onDurationChange(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>15 min</span>
            <span>2h</span>
            <span>5h</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
