import { Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "../shared/StatusBadge";
import type { UpcomingServiceDTO } from "../../types";

interface ServiceReminderItemProps {
  service: UpcomingServiceDTO;
}

export function ServiceReminderItem({ service }: ServiceReminderItemProps) {
  const getServiceTypeLabel = (type: string) => {
    const serviceTypes: Record<string, string> = {
      lancuch: "Łańcuch",
      kaseta: "Kaseta",
      klocki_przod: "Klocki przednie",
      klocki_tyl: "Klocki tylne",
      opony: "Opony",
      przerzutki: "Przerzutki",
      hamulce: "Hamulce",
      przeglad_ogolny: "Przegląd ogólny",
      inne: "Inne",
    };
    return serviceTypes[type] || type;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wrench className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">
                {service.bike_name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {getServiceTypeLabel(service.service_type)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge
                  status={service.status}
                  kmRemaining={service.km_remaining}
                />
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{service.km_remaining} km</p>
            <p className="text-xs text-muted-foreground">do serwisu</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
