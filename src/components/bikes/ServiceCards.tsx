import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ServiceRecordDTO } from "../../types";

interface ServiceCardsProps {
  services: ServiceRecordDTO[];
  onDelete?: (id: string) => void;
  onEdit?: (service: ServiceRecordDTO) => void;
}

export function ServiceCards({
  services,
  onDelete,
  onEdit,
}: ServiceCardsProps) {
  const serviceTypeLabels: Record<string, string> = {
    lancuch: "Chain",
    kaseta: "Cassette",
    klocki_przod: "Front Brake Pads",
    klocki_tyl: "Rear Brake Pads",
    opony: "Tires",
    przerzutki: "Derailleurs",
    hamulce: "Brakes",
    przeglad_ogolny: "General Service",
    inne: "Other",
  };

  const serviceLocationLabels: Record<string, string> = {
    warsztat: "Workshop",
    samodzielnie: "Self-Service",
  };

  return (
    <div className="space-y-4">
      {services.map((service) => (
        <Card key={service.id}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>
                {serviceTypeLabels[service.service_type] ||
                  service.service_type}
              </span>
              <span className="text-sm font-normal text-gray-500">
                {new Date(service.service_date).toLocaleDateString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Mileage:</span>
              <span className="text-sm font-medium">
                {service.mileage_at_service} km
              </span>
            </div>
            {service.service_location && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Location:</span>
                <span className="text-sm font-medium">
                  {serviceLocationLabels[service.service_location]}
                </span>
              </div>
            )}
            {service.cost && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Cost:</span>
                <span className="text-sm font-medium">
                  {service.cost} {service.currency || "PLN"}
                </span>
              </div>
            )}
            {service.notes && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-sm text-gray-600">{service.notes}</p>
              </div>
            )}
          </CardContent>
          {(onEdit || onDelete) && (
            <CardFooter className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(service)}
                  className="flex-1"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(service.id)}
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  Delete
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
}
