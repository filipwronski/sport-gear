import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { ServiceReminderDTO, ReminderStatusEnum } from "../../types";

interface ReminderListProps {
  reminders: ServiceReminderDTO[];
}

export function ReminderList({ reminders }: ReminderListProps) {
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

  const getStatusColor = (status: ReminderStatusEnum): string => {
    switch (status) {
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "upcoming":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "active":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusLabel = (status: ReminderStatusEnum): string => {
    switch (status) {
      case "overdue":
        return "Overdue";
      case "upcoming":
        return "Upcoming";
      case "active":
        return "Active";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  const getProgressPercentage = (reminder: ServiceReminderDTO): number => {
    const totalDistance = reminder.interval_km;
    const distanceCovered = totalDistance - reminder.km_remaining;
    return Math.min(100, Math.max(0, (distanceCovered / totalDistance) * 100));
  };

  const handleMarkComplete = () => {
    // For now, just show a toast
    toast.info("Complete reminder functionality will be implemented");
  };

  return (
    <div className="space-y-4">
      {reminders.map((reminder) => {
        const progress = getProgressPercentage(reminder);
        const isOverdue = reminder.status === "overdue";
        const isCompleted = reminder.status === "completed";

        return (
          <Card key={reminder.id} className={isOverdue ? "border-red-300" : ""}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {serviceTypeLabels[reminder.service_type] ||
                        reminder.service_type}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(
                        reminder.status,
                      )}`}
                    >
                      {getStatusLabel(reminder.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Current Mileage</p>
                      <p className="font-medium">
                        {reminder.current_mileage} km
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Target Mileage</p>
                      <p className="font-medium">
                        {reminder.target_mileage} km
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Interval</p>
                      <p className="font-medium">{reminder.interval_km} km</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Remaining</p>
                      <p
                        className={`font-medium ${isOverdue ? "text-red-600" : ""}`}
                      >
                        {reminder.km_remaining} km
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          isOverdue
                            ? "bg-red-600"
                            : progress > 80
                              ? "bg-yellow-500"
                              : "bg-blue-600"
                        }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {progress.toFixed(0)}% completed
                    </p>
                  </div>

                  {reminder.completed_at && (
                    <p className="text-sm text-gray-500 mt-2">
                      Completed on{" "}
                      {new Date(reminder.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {!isCompleted && (
                  <Button
                    variant={isOverdue ? "default" : "outline"}
                    onClick={() => handleMarkComplete()}
                    className={isOverdue ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    Mark as Done
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
