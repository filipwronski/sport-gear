import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GetServicesParams,
  ServiceTypeEnum,
  ServiceLocationEnum,
} from "../../types";

interface ServiceFiltersProps {
  filters: GetServicesParams;
  onFiltersChange: (filters: GetServicesParams) => void;
}

export function ServiceFilters({
  filters,
  onFiltersChange,
}: ServiceFiltersProps) {
  const serviceTypes: { value: ServiceTypeEnum; label: string }[] = [
    { value: "lancuch", label: "Łańcuch" },
    { value: "kaseta", label: "Kaseta" },
    { value: "klocki_przod", label: "Klocki przednie" },
    { value: "klocki_tyl", label: "Klocki tylne" },
    { value: "opony", label: "Opony" },
    { value: "przerzutki", label: "Przerzutki" },
    { value: "hamulce", label: "Hamulce" },
    { value: "przeglad_ogolny", label: "Przegląd ogólny" },
    { value: "inne", label: "Inne" },
  ];

  const sortOptions = [
    { value: "service_date_desc", label: "Data (Najnowsze)" },
    { value: "service_date_asc", label: "Data (Najstarsze)" },
    { value: "mileage_desc", label: "Przebieg (Najwyższy)" },
    { value: "mileage_asc", label: "Przebieg (Najniższy)" },
    { value: "cost_desc", label: "Koszt (Najwyższy)" },
    { value: "cost_asc", label: "Koszt (Najniższy)" },
  ];

  const handleClearFilters = () => {
    onFiltersChange({
      limit: 20,
      offset: 0,
      sort: "service_date_desc",
    });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="service-type">Rodzaj usługi</Label>
          <Select
            value={filters.service_type || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                service_type:
                  value === "all" ? undefined : (value as ServiceTypeEnum),
                offset: 0,
              })
            }
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Wszystkie rodzaje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie rodzaje</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="service-location">Lokalizacja</Label>
          <Select
            value={filters.service_location || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                service_location:
                  value === "all" ? undefined : (value as ServiceLocationEnum),
                offset: 0,
              })
            }
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Wszystkie lokalizacje" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie lokalizacje</SelectItem>
              <SelectItem value="warsztat">Warsztat</SelectItem>
              <SelectItem value="samodzielnie">Samodzielnie</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="from-date">Od daty</Label>
          <Input
            id="from-date"
            type="date"
            value={filters.from_date || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                from_date: e.target.value,
                offset: 0,
              })
            }
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="to-date">Do daty</Label>
          <Input
            id="to-date"
            type="date"
            value={filters.to_date || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                to_date: e.target.value,
                offset: 0,
              })
            }
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="sort">Sortuj według</Label>
          <Select
            value={filters.sort || "service_date_desc"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                sort: value as GetServicesParams["sort"],
              })
            }
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleClearFilters}>
          Wyczyść filtry
        </Button>
      </div>
    </div>
  );
}
