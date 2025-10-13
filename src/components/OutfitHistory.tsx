import { useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { History, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import OutfitHistoryCard from "./OutfitHistoryCard";
import type { FeedbackDTO, GetFeedbacksParams, ActivityTypeEnum } from "../types";

/**
 * HistoryFilters - Filter controls for outfit history
 */
interface HistoryFiltersProps {
  filters: {
    temperatureMin: number;
    temperatureMax: number;
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
    activityType?: ActivityTypeEnum;
    sort: 'created_at_desc' | 'created_at_asc' | 'rating_desc' | 'rating_asc';
  };
  onChange: (filters: GetFeedbacksParams) => void;
}

function HistoryFilters({ filters, onChange }: HistoryFiltersProps) {
  const handleTemperatureChange = (value: number[]) => {
    onChange({
      ...filters,
      // Note: API might need different field names, this is a mapping
      rating: undefined, // We'll use temperature range instead
    });
  };

  const handleSeasonChange = (season: string) => {
    let fromDate: string | undefined;
    let toDate: string | undefined;
    const year = new Date().getFullYear();

    switch (season) {
      case 'spring':
        fromDate = `${year}-03-21`;
        toDate = `${year}-06-20`;
        break;
      case 'summer':
        fromDate = `${year}-06-21`;
        toDate = `${year}-09-22`;
        break;
      case 'autumn':
        fromDate = `${year}-09-23`;
        toDate = `${year}-12-20`;
        break;
      case 'winter':
        fromDate = `${year}-12-21`;
        toDate = `${year + 1}-03-20`;
        break;
    }

    onChange({
      ...filters,
      from_date: fromDate,
      to_date: toDate,
    });
  };

  const handleActivityTypeChange = (activityType: string) => {
    onChange({
      ...filters,
      activity_type: activityType === 'all' ? undefined : (activityType as ActivityTypeEnum),
    });
  };

  const handleSortChange = (sort: string) => {
    onChange({
      ...filters,
      sort: sort as any,
    });
  };

  const handleReset = () => {
    onChange({
      limit: 30,
      offset: 0,
      sort: 'created_at_desc',
    });
  };

  const hasActiveFilters = filters.temperatureMin !== -10 ||
    filters.temperatureMax !== 35 ||
    filters.season ||
    filters.activityType ||
    filters.sort !== 'created_at_desc';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtry historii
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Temperature Range */}
          <div className="space-y-2">
            <Label>Temperatura (°C)</Label>
            <Slider
              value={[filters.temperatureMin, filters.temperatureMax]}
              onValueChange={handleTemperatureChange}
              min={-10}
              max={35}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground text-center">
              {filters.temperatureMin}° - {filters.temperatureMax}°
            </div>
          </div>

          {/* Season */}
          <div className="space-y-2">
            <Label>Pora roku</Label>
            <Select value={filters.from_date ? 'filtered' : ''} onValueChange={handleSeasonChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Wszystkie</SelectItem>
                <SelectItem value="spring">Wiosna</SelectItem>
                <SelectItem value="summer">Lato</SelectItem>
                <SelectItem value="autumn">Jesień</SelectItem>
                <SelectItem value="winter">Zima</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity Type */}
          <div className="space-y-2">
            <Label>Typ aktywności</Label>
            <Select value={filters.activityType || ''} onValueChange={handleActivityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Wszystkie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
                <SelectItem value="spokojna">Spokojna</SelectItem>
                <SelectItem value="tempo">Tempo</SelectItem>
                <SelectItem value="interwaly">Interwały</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Label>Sortowanie</Label>
            <Select value={filters.sort} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Najnowsze</SelectItem>
                <SelectItem value="created_at_asc">Najstarsze</SelectItem>
                <SelectItem value="rating_desc">Najwyższa ocena</SelectItem>
                <SelectItem value="rating_asc">Najniższa ocena</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Resetuj filtry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * OutfitHistory - Browse past outfits from feedback history
 */
interface OutfitHistoryProps {
  defaultFilters?: GetFeedbacksParams;
  onOutfitClick?: (outfit: FeedbackDTO) => void;
}

async function fetchFeedbacks(params: GetFeedbacksParams): Promise<{ feedbacks: FeedbackDTO[], total: number, has_more: boolean }> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, value.toString());
    }
  });

  const response = await fetch(`/api/feedbacks?${searchParams}`);
  if (!response.ok) {
    throw new Error('Failed to fetch feedback history');
  }
  return response.json();
}

export default function OutfitHistory({ defaultFilters, onOutfitClick }: OutfitHistoryProps) {
  const [filters, setFilters] = useState<GetFeedbacksParams>({
    limit: 30,
    offset: 0,
    sort: 'created_at_desc',
    ...defaultFilters,
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feedbacks', filters],
    queryFn: ({ pageParam = 0 }) =>
      fetchFeedbacks({ ...filters, offset: pageParam }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.has_more) {
        return pages.length * 30;
      }
      return undefined;
    },
    initialPageParam: 0,
  });

  const allFeedbacks = useMemo(() => {
    return data?.pages.flatMap(page => page.feedbacks) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.total || 0;

  const handleFiltersChange = (newFilters: GetFeedbacksParams) => {
    setFilters({ ...newFilters, offset: 0 }); // Reset pagination when filters change
  };

  const handleOutfitClick = (outfit: FeedbackDTO) => {
    if (onOutfitClick) {
      onOutfitClick(outfit);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <History className="w-6 h-6" />
        <div>
          <h3 className="text-lg font-semibold">Historia zestawów</h3>
          <p className="text-sm text-muted-foreground">
            Twoje poprzednie treningi i oceny komfortu ({totalCount} zapisanych)
          </p>
        </div>
      </div>

      {/* Filters */}
      <Accordion type="single" collapsible defaultValue="filters">
        <AccordionItem value="filters">
          <AccordionTrigger>Filtry i sortowanie</AccordionTrigger>
          <AccordionContent>
            <HistoryFilters
              filters={{
                temperatureMin: -10,
                temperatureMax: 35,
                season: filters.season,
                activityType: filters.activity_type,
                sort: filters.sort || 'created_at_desc',
              }}
              onChange={handleFiltersChange}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Content */}
      {isLoading && allFeedbacks.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Nie udało się pobrać historii treningów. Spróbuj odświeżyć stronę.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && allFeedbacks.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">Brak zapisanych treningów</h4>
            <p className="text-muted-foreground mb-4">
              Twoje treningi z ocenami 4 lub 5 będą automatycznie zapisywane w historii.
            </p>
            <p className="text-sm text-muted-foreground">
              Rozpocznij treningi i dodawaj feedback aby budować swoją historię!
            </p>
          </CardContent>
        </Card>
      )}

      {allFeedbacks.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {allFeedbacks.map((feedback) => (
              <OutfitHistoryCard
                key={feedback.id}
                outfit={feedback}
                onClick={() => handleOutfitClick(feedback)}
              />
            ))}
          </div>

          {hasNextPage && (
            <div className="text-center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? 'Ładowanie...' : 'Załaduj więcej'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
