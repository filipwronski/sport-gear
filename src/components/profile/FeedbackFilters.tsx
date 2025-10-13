import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";
import type { ActivityTypeEnum, GetFeedbacksParams } from "../../types";

interface FeedbackFiltersProps {
  filters: GetFeedbacksParams;
  onFiltersChange: (filters: Partial<GetFeedbacksParams>) => Promise<void>;
  onReset: () => Promise<void>;
}

const ACTIVITY_OPTIONS: { value: ActivityTypeEnum; label: string }[] = [
  { value: "recovery", label: "Regeneracja" },
  { value: "spokojna", label: "Spokojna" },
  { value: "tempo", label: "Tempo" },
  { value: "interwaly", label: "Interwały" },
];

const RATING_OPTIONS = [
  { value: 1, label: "1 gwiazdka" },
  { value: 2, label: "2 gwiazdki" },
  { value: 3, label: "3 gwiazdki" },
  { value: 4, label: "4 gwiazdki" },
  { value: 5, label: "5 gwiazdek" },
];

const SORT_OPTIONS = [
  { value: "created_at_desc", label: "Najnowsze pierwsze" },
  { value: "created_at_asc", label: "Najstarsze pierwsze" },
  { value: "rating_desc", label: "Najwyżej oceniane" },
  { value: "rating_asc", label: "Najniżej oceniane" },
];

export function FeedbackFilters({
  filters,
  onFiltersChange,
  onReset,
}: FeedbackFiltersProps) {
  const hasActiveFilters =
    filters.activity_type ||
    filters.rating ||
    filters.sort !== "created_at_desc";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-4 w-4" />
          Filtry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="activity-filter">Typ aktywności</Label>
            <Select
              value={filters.activity_type || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  activity_type:
                    value === "all" ? undefined : (value as ActivityTypeEnum),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie aktywności" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie aktywności</SelectItem>
                {ACTIVITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating-filter">Minimalna ocena</Label>
            <Select
              value={filters.rating?.toString() || "all"}
              onValueChange={(value) =>
                onFiltersChange({
                  rating: value === "all" ? undefined : parseInt(value),
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie oceny" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie oceny</SelectItem>
                {RATING_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="sort-filter">Sortowanie</Label>
            <Select
              value={filters.sort || "created_at_desc"}
              onValueChange={(value) =>
                onFiltersChange({
                  sort: value as GetFeedbacksParams["sort"],
                })
              }
            >
              <SelectTrigger className="w-full">
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
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetuj filtry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
