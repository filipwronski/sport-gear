import { Button } from "@/components/ui/button";
import type { ServiceRecordDTO } from "../../types";

interface ServiceTableProps {
  services: ServiceRecordDTO[];
  onDelete?: (id: string) => void;
  onEdit?: (service: ServiceRecordDTO) => void;
}

export function ServiceTable({
  services,
  onDelete,
  onEdit,
}: ServiceTableProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="text-left p-2 sm:p-3 font-medium text-sm">Date</th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Service Type
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Mileage
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Location
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">Cost</th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm hidden md:table-cell">
              Notes
            </th>
            <th className="text-right p-2 sm:p-3 font-medium text-sm">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service.id} className="border-b hover:bg-gray-50">
              <td className="p-2 sm:p-3 text-sm">
                {new Date(service.service_date).toLocaleDateString()}
              </td>
              <td className="p-2 sm:p-3">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {serviceTypeLabels[service.service_type] ||
                    service.service_type}
                </span>
              </td>
              <td className="p-2 sm:p-3 text-sm">
                {service.mileage_at_service} km
              </td>
              <td className="p-2 sm:p-3 text-sm">
                {service.service_location
                  ? serviceLocationLabels[service.service_location]
                  : "-"}
              </td>
              <td className="p-2 sm:p-3 text-sm">
                {service.cost
                  ? `${service.cost} ${service.currency || "PLN"}`
                  : "-"}
              </td>
              <td
                className="p-2 sm:p-3 max-w-xs truncate hidden md:table-cell"
                title={service.notes || undefined}
              >
                {service.notes || "-"}
              </td>
              <td className="p-2 sm:p-3 text-right space-x-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(service)}
                  >
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
