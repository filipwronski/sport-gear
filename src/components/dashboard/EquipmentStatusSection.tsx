import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BikesOverview } from "./BikesOverview";
import { ServiceReminderItem } from "./ServiceReminderItem";
import { EmptyState } from "../shared/EmptyState";
import type { EquipmentStatusSectionProps } from "./types";

export function EquipmentStatusSection({ data }: EquipmentStatusSectionProps) {
  const handleViewAllBikes = () => {
    window.location.href = "/bikes";
  };

  const handleViewOverdue = () => {
    window.location.href = "/bikes?filter=overdue";
  };

  return (
    <section aria-labelledby="equipment-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="equipment-heading" className="text-xl font-semibold">
          Stan sprzętu
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewAllBikes}
          className="text-sm"
        >
          Zobacz wszystkie
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        <BikesOverview count={data.active_bikes_count} />

        {data.overdue_services_count > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Masz {data.overdue_services_count}{" "}
                {data.overdue_services_count === 1
                  ? "przeterminowany serwis"
                  : "przeterminowanych serwisów"}
                !
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewOverdue}
                className="ml-4"
              >
                Zobacz
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            Najbliższe serwisy
          </h3>
          {data.upcoming_services.length > 0 ? (
            <div className="space-y-3">
              {data.upcoming_services.slice(0, 3).map((service) => (
                <ServiceReminderItem
                  key={`${service.bike_id}-${service.service_type}`}
                  service={service}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Wszystko w porządku!"
              description="Brak zaplanowanych serwisów. Wszystkie rowery są na bieżąco serwisowane."
              className="py-6"
            />
          )}
        </div>
      </div>
    </section>
  );
}
