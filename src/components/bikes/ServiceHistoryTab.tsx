import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceFilters } from "./ServiceFilters";
import { ServiceTable } from "./ServiceTable";
import { ServiceCards } from "./ServiceCards";
import { useServiceHistory } from "./hooks/useServiceHistory";
import { toast } from "sonner";
import type { GetServicesParams, ServiceRecordDTO } from "../../types";

interface ServiceHistoryTabProps {
  bikeId: string;
}

export function ServiceHistoryTab({ bikeId }: ServiceHistoryTabProps) {
  const [filters, setFilters] = useState<GetServicesParams>({
    limit: 20,
    offset: 0,
    sort: "service_date_desc",
  });
  const [isMobile, setIsMobile] = useState(false);

  const { services, total, hasMore, isLoading, error, refetch } =
    useServiceHistory(bikeId, filters);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleExportCSV = () => {
    if (services.length === 0) {
      toast.error("No services to export");
      return;
    }

    const headers = [
      "Date",
      "Service Type",
      "Mileage",
      "Location",
      "Cost",
      "Currency",
      "Notes",
    ];
    const rows = services.map((service) => [
      service.service_date,
      service.service_type,
      service.mileage_at_service,
      service.service_location || "",
      service.cost || "",
      service.currency || "",
      service.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bike-services-${bikeId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Services exported successfully");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service record?")) {
      return;
    }

    try {
      const response = await fetch(`/api/bikes/${bikeId}/services/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete service");
      }

      toast.success("Service deleted successfully");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete service",
      );
    }
  };

  const handleEdit = () => {
    // TODO: Open edit modal
    toast.info("Edit functionality will be implemented");
  };

  const handleLoadMore = () => {
    setFilters({
      ...filters,
      offset: (filters.offset || 0) + (filters.limit || 20),
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Error loading services</p>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={refetch} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Service History</CardTitle>
              <CardDescription>
                Track all maintenance and repairs for this bike
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                disabled={services.length === 0}
              >
                Export CSV
              </Button>
              <Button
                onClick={() =>
                  toast.info("Add service functionality will be implemented")
                }
              >
                Add Service
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ServiceFilters filters={filters} onFiltersChange={setFilters} />
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading services...</span>
            </div>
          </CardContent>
        </Card>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No service records
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Get started by adding your first service record.
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  toast.info("Add service functionality will be implemented")
                }
              >
                Add First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            {isMobile ? (
              <ServiceCards
                services={services}
                onDelete={handleDelete}
              />
            ) : (
              <ServiceTable
                services={services}
                onDelete={handleDelete}
              />
            )}

            {services.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-gray-600">
                  Showing {services.length} of {total} services
                </p>
                {hasMore && (
                  <Button onClick={handleLoadMore} variant="outline">
                    Load More
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
