import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { GetRecommendationParams, ActivityTypeEnum } from "../types";

/**
 * RecommendationFilters - Interactive filters for recommendation generation
 * Handles location, activity, duration, and date selection with debounced API calls
 */
interface RecommendationFiltersProps {
  onFiltersChange: (params: GetRecommendationParams) => void;
  isLoading?: boolean;
}

const ACTIVITY_TYPES: { value: ActivityTypeEnum; label: string }[] = [
  { value: "recovery", label: "Recovery" },
  { value: "spokojna", label: "Spokojna" },
  { value: "tempo", label: "Tempo" },
  { value: "interwaly", label: "Interwały" },
];

const DURATION_OPTIONS = [
  { value: 60, label: "<1h" },
  { value: 90, label: "1-2h" },
  { value: 150, label: "2-3h" },
  { value: 240, label: ">3h" },
];

export default function RecommendationFilters({
  defaultLocationId,
  onFiltersChange,
  isLoading = false,
}: RecommendationFiltersProps) {
  const [activityType, setActivityType] =
    useState<ActivityTypeEnum>("spokojna");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize filters on mount and call API immediately
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);

      const params: GetRecommendationParams = {
        location_id: "coordinates", // Placeholder - coordinates are handled by useRecommendation hook
        activity_type: activityType,
        duration_minutes: durationMinutes,
      };

      if (selectedDate) {
        params.date = selectedDate;
      }

      onFiltersChange(params);
    }
  }, [
    isInitialized,
    activityType,
    durationMinutes,
    onFiltersChange,
    selectedDate,
  ]);

  // Update filters when they change
  useEffect(() => {
    if (!isInitialized) return;

    const params: GetRecommendationParams = {
      location_id: "coordinates", // Placeholder - coordinates are handled by useRecommendation hook
      activity_type: activityType,
      duration_minutes: durationMinutes,
    };

    if (selectedDate) {
      params.date = selectedDate;
    }

    onFiltersChange(params);
  }, [
    activityType,
    durationMinutes,
    selectedDate,
    onFiltersChange,
    isInitialized,
  ]);

  const handleRefresh = () => {
    const params: GetRecommendationParams = {
      location_id: "coordinates", // Placeholder - coordinates are handled by useRecommendation hook
      activity_type: activityType,
      duration_minutes: durationMinutes,
    };

    if (selectedDate) {
      params.date = selectedDate;
    }

    onFiltersChange(params);
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    return maxDate.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Parametry rekomendacji</h3>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Odśwież
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Location Info */}
        <div className="space-y-2">
          <Label>Lokalizacja</Label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">
              Lokalizacja pobierana automatycznie
            </span>
          </div>
        </div>

        {/* Activity Type Selector */}
        <div className="space-y-2">
          <Label htmlFor="activity">Typ aktywności</Label>
          <Select
            value={activityType}
            onValueChange={(value) =>
              setActivityType(value as ActivityTypeEnum)
            }
          >
            <SelectTrigger id="activity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((activity) => (
                <SelectItem key={activity.value} value={activity.value}>
                  {activity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration Selector */}
        <div className="space-y-2">
          <Label htmlFor="duration">Czas trwania</Label>
          <Select
            value={durationMinutes.toString()}
            onValueChange={(value) => setDurationMinutes(parseInt(value))}
          >
            <SelectTrigger id="duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((duration) => (
                <SelectItem
                  key={duration.value}
                  value={duration.value.toString()}
                >
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label htmlFor="date">Data (opcjonalnie)</Label>
          <input
            id="date"
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            Pozostaw puste dla pogody aktualnej
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-2">
          Aktualizuję rekomendację...
        </div>
      )}
    </div>
  );
}
