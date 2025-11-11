import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ReminderList } from "./ReminderList";
import { useServiceReminders } from "./hooks/useServiceReminders";
import { toast } from "sonner";
import type { GetRemindersParams } from "../../types";

interface RemindersTabProps {
  bikeId: string;
}

export function RemindersTab({ bikeId }: RemindersTabProps) {
  const [filters, setFilters] = useState<GetRemindersParams>({
    status: "active",
    sort: "km_remaining_asc",
  });

  const { reminders, isLoading, error, refetch } = useServiceReminders(
    bikeId,
    filters,
  );

  const _handleComplete = async () => {
    try {
      // TODO: Implement complete reminder API call
      toast.success("Reminder marked as complete");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to complete reminder",
      );
    }
  };

  const overdueCount = reminders.filter((r) => r.status === "overdue").length;

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Błąd ładowania przypomnień</p>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={refetch} className="mt-4" variant="outline">
              Spróbuj ponownie
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
              <CardTitle>Przypomnienia serwisowe</CardTitle>
              <CardDescription>
                Śledź nadchodzące konserwacje na podstawie przedziałów przebiegu
              </CardDescription>
            </div>
            <Button
              onClick={() =>
                toast.info(
                  "Funkcjonalność dodawania przypomnień zostanie zaimplementowana",
                )
              }
            >
              Dodaj przypomnienie
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {overdueCount > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">
                ⚠️ Masz {overdueCount} zaległ{overdueCount > 1 ? "ych" : "ą"}{" "}
                usług{overdueCount > 1 ? "" : "ę"}
                {overdueCount > 1 ? " serwisowych" : " serwisową"}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="status-filter">Filtr statusu</Label>
              <select
                id="status-filter"
                value={filters.status || "all"}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value as GetRemindersParams["status"],
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Reminders</option>
                <option value="active">Active Only</option>
                <option value="overdue">Overdue Only</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex-1">
              <Label htmlFor="sort-filter">Sort By</Label>
              <select
                id="sort-filter"
                value={filters.sort || "km_remaining_asc"}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sort: e.target.value as GetRemindersParams["sort"],
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="km_remaining_asc">
                  Remaining KM (Low to High)
                </option>
                <option value="km_remaining_desc">
                  Remaining KM (High to Low)
                </option>
                <option value="created_at_desc">Recently Added</option>
                <option value="created_at_asc">Oldest First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-3 text-gray-600">Loading reminders...</span>
            </div>
          </CardContent>
        </Card>
      ) : reminders.length === 0 ? (
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
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No reminders set
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create reminders to stay on top of your bike maintenance
                schedule.
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  toast.info("Add reminder functionality will be implemented")
                }
              >
                Create First Reminder
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ReminderList reminders={reminders} />
      )}
    </div>
  );
}
