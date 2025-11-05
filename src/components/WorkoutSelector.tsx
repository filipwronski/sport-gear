import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

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
}

export default function WorkoutSelector({
  intensity,
  duration,
  onIntensityChange,
  onDurationChange,
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
        <CardTitle>Parametry treningu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Intensywność treningu</Label>
          <RadioGroup
            value={intensity}
            onValueChange={onIntensityChange}
            className="grid-flow-col"
          >
            {intensityOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
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
