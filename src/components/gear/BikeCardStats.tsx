import { Gauge, Wrench, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BikeCardDisplayData } from "./types";

interface BikeCardStatsProps {
  bike: BikeCardDisplayData;
}

export const BikeCardStats = ({ bike }: BikeCardStatsProps) => {
  return (
    <div className="space-y-3">
      {/* Current Mileage */}
      <div className="flex items-center space-x-2 text-sm">
        <Gauge className="w-4 h-4 text-gray-500" />
        <span className="text-gray-700">{bike.mileageFormatted}</span>
      </div>

      {/* Last Service */}
      {bike.lastService && (
        <div className="flex items-center space-x-2 text-sm">
          <Wrench className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">
            {bike.lastService.dateFormatted} - {bike.lastService.typeLabel}
          </span>
        </div>
      )}

      {/* Next Service */}
      {bike.nextService ? (
        <div className="flex items-center space-x-2 text-sm">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-gray-700">{bike.nextService.typeLabel}</span>
          <Badge
            variant={
              bike.nextService.statusBadgeVariant === "warning"
                ? "secondary"
                : bike.nextService.statusBadgeVariant === "destructive"
                ? "destructive"
                : "default"
            }
            className="text-xs"
          >
            {bike.nextService.kmRemainingFormatted}
          </Badge>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Brak zaplanowanych serwisów</span>
        </div>
      )}

      {/* Active Reminders */}
      {bike.activeRemindersCount > 0 && (
        <div className="flex items-center space-x-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-gray-700">
            {bike.activeRemindersCount} aktywnych przypomnień
          </span>
        </div>
      )}
    </div>
  );
};
