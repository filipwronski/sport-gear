import React, { useState } from "react";
import {
  MapPin,
  Thermometer,
  Wind,
  Activity,
  Star,
  Award,
  Clock,
  ArrowUpDown,
  RotateCcw,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Slider } from "../ui/slider";
import { Checkbox } from "../ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import type {
  CommunityFiltersState,
  LocationDTO,
  ActivityTypeEnum,
  ReputationBadgeEnum,
} from "../../types";
import { SORT_OPTIONS } from "../../types";
import {
  TIME_RANGE_OPTIONS,
  TEMPERATURE_RANGE_OPTIONS,
  MIN_RATING_OPTIONS,
  ACTIVITY_TYPE_LABELS,
} from "../../constants/community.constants";

interface CommunityFiltersPanelProps {
  filters: CommunityFiltersState;
  onFiltersChange: (filters: Partial<CommunityFiltersState>) => void;
  onReset: () => void;
  userLocations: LocationDTO[];
  isMobile?: boolean;
}

interface LocationSelectorProps {
  locations: LocationDTO[];
  selectedLocationId: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
}

function LocationSelector({
  locations,
  selectedLocationId,
  onChange,
  disabled,
}: LocationSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Lokalizacja centrum
      </Label>
      <Select
        value={selectedLocationId}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Wybierz lokalizację" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.city}, {location.country_code}
              {location.label && ` (${location.label})`}
              {location.is_default && " (domyślna)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function RadiusSlider({ value, onChange }: RadiusSliderProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Promień wyszukiwania: {value} km
      </Label>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={1}
        max={100}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>1 km</span>
        <span>100 km</span>
      </div>
    </div>
  );
}

interface TemperatureRangeInputProps {
  temperature?: number;
  range: number;
  onTemperatureChange: (temp?: number) => void;
  onRangeChange: (range: number) => void;
}

function TemperatureRangeInput({
  temperature,
  range,
  onTemperatureChange,
  onRangeChange,
}: TemperatureRangeInputProps) {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Thermometer className="h-4 w-4" />
        Temperatura powietrza
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input
            type="number"
            placeholder="°C"
            value={temperature || ""}
            onChange={(e) => {
              const val = e.target.value;
              onTemperatureChange(val ? parseFloat(val) : undefined);
            }}
            min={-30}
            max={50}
            step={0.5}
          />
        </div>
        <Select
          value={String(range)}
          onValueChange={(value) => onRangeChange(parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEMPERATURE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                ±{option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface WindSpeedInputProps {
  value?: number;
  onChange: (value?: number) => void;
}

function WindSpeedInput({ value, onChange }: WindSpeedInputProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Wind className="h-4 w-4" />
        Prędkość wiatru (km/h)
      </Label>
      <Input
        type="number"
        placeholder="Opcjonalne"
        value={value || ""}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val ? parseFloat(val) : undefined);
        }}
        min={0}
        max={100}
        step={1}
      />
    </div>
  );
}

interface ActivityTypeSelectProps {
  value?: ActivityTypeEnum;
  onChange: (value?: ActivityTypeEnum) => void;
}

function ActivityTypeSelect({ value, onChange }: ActivityTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Activity className="h-4 w-4" />
        Typ aktywności
      </Label>
      <Select
        value={value || "all"}
        onValueChange={(val) =>
          onChange(val === "all" ? undefined : (val as ActivityTypeEnum))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Wszystkie aktywności" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie aktywności</SelectItem>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface MinRatingSelectProps {
  value?: number;
  onChange: (value?: number) => void;
}

function MinRatingSelect({ value, onChange }: MinRatingSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Star className="h-4 w-4" />
        Minimalna ocena
      </Label>
      <Select
        value={value ? String(value) : "all"}
        onValueChange={(val) => onChange(val === "all" ? undefined : parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Wszystkie oceny" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie oceny</SelectItem>
          {MIN_RATING_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ReputationFilterProps {
  values?: ReputationBadgeEnum[];
  onChange: (values?: ReputationBadgeEnum[]) => void;
}

function ReputationFilter({ values, onChange }: ReputationFilterProps) {
  const reputationOptions: { value: ReputationBadgeEnum; label: string }[] = [
    { value: "nowicjusz", label: "Nowicjusz" },
    { value: "regularny", label: "Regularny" },
    { value: "ekspert", label: "Ekspert" },
    { value: "mistrz", label: "Mistrz" },
  ];

  const handleChange = (badge: ReputationBadgeEnum, checked: boolean) => {
    const currentValues = values || [];
    if (checked) {
      onChange([...currentValues, badge]);
    } else {
      onChange(currentValues.filter((v) => v !== badge));
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Award className="h-4 w-4" />
        Reputacja użytkownika
      </Label>
      <div className="space-y-2">
        {reputationOptions.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={option.value}
              checked={values?.includes(option.value) || false}
              onCheckedChange={(checked) =>
                handleChange(option.value, checked as boolean)
              }
            />
            <Label htmlFor={option.value} className="text-sm">
              {option.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimeRangeSelectProps {
  value: number;
  onChange: (value: number) => void;
}

function TimeRangeSelect({ value, onChange }: TimeRangeSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Zakres czasowy
      </Label>
      <Select
        value={String(value)}
        onValueChange={(val) => onChange(parseInt(val))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SortSelectProps {
  value: CommunityFiltersState["sort"];
  onChange: (value: CommunityFiltersState["sort"]) => void;
}

function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4" />
        Sortowanie
      </Label>
      <Select
        value={value}
        onValueChange={(val) => onChange(val as CommunityFiltersState["sort"])}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface FilterActionsProps {
  onReset: () => void;
  onApply?: () => void;
}

function FilterActions({ onReset, onApply }: FilterActionsProps) {
  return (
    <div className="flex gap-2 pt-4 border-t">
      <Button variant="outline" onClick={onReset} className="flex-1">
        <RotateCcw className="h-4 w-4 mr-2" />
        Resetuj
      </Button>
      {onApply && (
        <Button onClick={onApply} className="flex-1">
          <Check className="h-4 w-4 mr-2" />
          Zastosuj
        </Button>
      )}
    </div>
  );
}

export default function CommunityFiltersPanel({
  filters,
  onFiltersChange,
  onReset,
  userLocations,
  isMobile = false,
}: CommunityFiltersPanelProps) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isOpen, setIsOpen] = useState(false);

  // Update local filters when props change
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof CommunityFiltersState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);

    if (!isMobile) {
      // Immediate update for desktop
      onFiltersChange({ [key]: value });
    }
  };

  const handleApplyFilters = () => {
    // Apply all local changes at once for mobile
    const changes: Partial<CommunityFiltersState> = {};
    Object.keys(localFilters).forEach((key) => {
      if (
        localFilters[key as keyof CommunityFiltersState] !==
        filters[key as keyof CommunityFiltersState]
      ) {
        changes[key as keyof CommunityFiltersState] =
          localFilters[key as keyof CommunityFiltersState];
      }
    });
    onFiltersChange(changes);
    setIsOpen(false);
  };

  const filterContent = (
    <div className="space-y-6">
      {/* Lokalizacja */}
      <LocationSelector
        locations={userLocations}
        selectedLocationId={localFilters.location_id}
        onChange={(value) => handleFilterChange("location_id", value)}
      />

      {/* Promień */}
      <RadiusSlider
        value={localFilters.radius_km}
        onChange={(value) => handleFilterChange("radius_km", value)}
      />

      {/* Pogoda */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Warunki pogodowe</h4>

        <TemperatureRangeInput
          temperature={localFilters.temperature}
          range={localFilters.temperature_range}
          onTemperatureChange={(value) =>
            handleFilterChange("temperature", value)
          }
          onRangeChange={(value) =>
            handleFilterChange("temperature_range", value)
          }
        />

        <WindSpeedInput
          value={localFilters.wind_speed}
          onChange={(value) => handleFilterChange("wind_speed", value)}
        />
      </div>

      {/* Preferencje */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-gray-900">Preferencje</h4>

        <ActivityTypeSelect
          value={localFilters.activity_type}
          onChange={(value) => handleFilterChange("activity_type", value)}
        />

        <MinRatingSelect
          value={localFilters.min_rating}
          onChange={(value) => handleFilterChange("min_rating", value)}
        />

        <ReputationFilter
          values={localFilters.reputation_filter}
          onChange={(value) => handleFilterChange("reputation_filter", value)}
        />

        <TimeRangeSelect
          value={localFilters.time_range}
          onChange={(value) => handleFilterChange("time_range", value)}
        />

        <SortSelect
          value={localFilters.sort}
          onChange={(value) => handleFilterChange("sort", value)}
        />
      </div>

      {/* Actions */}
      <FilterActions
        onReset={() => {
          setLocalFilters(filters); // Reset local to current filters
          onReset();
        }}
        onApply={isMobile ? handleApplyFilters : undefined}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full">
            Filtry
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtry społeczności</SheetTitle>
          </SheetHeader>
          <div className="py-6">{filterContent}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Filtry</CardTitle>
      </CardHeader>
      <CardContent>{filterContent}</CardContent>
    </Card>
  );
}
