import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    { value: "lancuch", label: "Chain" },
    { value: "kaseta", label: "Cassette" },
    { value: "klocki_przod", label: "Front Brake Pads" },
    { value: "klocki_tyl", label: "Rear Brake Pads" },
    { value: "opony", label: "Tires" },
    { value: "przerzutki", label: "Derailleurs" },
    { value: "hamulce", label: "Brakes" },
    { value: "przeglad_ogolny", label: "General Service" },
    { value: "inne", label: "Other" },
  ];

  const sortOptions = [
    { value: "service_date_desc", label: "Date (Newest)" },
    { value: "service_date_asc", label: "Date (Oldest)" },
    { value: "mileage_desc", label: "Mileage (High to Low)" },
    { value: "mileage_asc", label: "Mileage (Low to High)" },
    { value: "cost_desc", label: "Cost (High to Low)" },
    { value: "cost_asc", label: "Cost (Low to High)" },
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
          <Label htmlFor="service-type">Service Type</Label>
          <select
            id="service-type"
            value={filters.service_type || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                service_type: e.target.value as ServiceTypeEnum | undefined,
                offset: 0,
              })
            }
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {serviceTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="service-location">Location</Label>
          <select
            id="service-location"
            value={filters.service_location || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                service_location: e.target.value as
                  | ServiceLocationEnum
                  | undefined,
                offset: 0,
              })
            }
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Locations</option>
            <option value="warsztat">Workshop</option>
            <option value="samodzielnie">Self-Service</option>
          </select>
        </div>

        <div>
          <Label htmlFor="from-date">From Date</Label>
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
          />
        </div>

        <div>
          <Label htmlFor="to-date">To Date</Label>
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
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="sort">Sort By</Label>
          <select
            id="sort"
            value={filters.sort || "service_date_desc"}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sort: e.target.value as GetServicesParams["sort"],
              })
            }
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Button variant="outline" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
