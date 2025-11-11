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

  const serviceLocationLabels: Record<string, string> = {
    warsztat: "Warsztat",
    samodzielnie: "Samodzielnie",
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-gray-100 border-b">
            <th className="text-left p-2 sm:p-3 font-medium text-sm">Data</th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Rodzaj usługi
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Przebieg
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">
              Lokalizacja
            </th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm">Koszt</th>
            <th className="text-left p-2 sm:p-3 font-medium text-sm hidden md:table-cell">
              Notatki
            </th>
            <th className="text-right p-2 sm:p-3 font-medium text-sm">Akcje</th>
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
                    Edytuj
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(service.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Usuń
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
