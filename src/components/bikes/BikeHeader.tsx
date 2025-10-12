import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import type { BikeDTO } from "../../types";

interface BikeHeaderProps {
  bike: BikeDTO;
  onMileageUpdate: (newMileage: number) => void;
}

export function BikeHeader({ bike, onMileageUpdate }: BikeHeaderProps) {
  const [mileage, setMileage] = useState(
    bike.current_mileage?.toString() || "",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMileageUpdate = async () => {
    const newMileage = parseInt(mileage);

    // Validation
    if (isNaN(newMileage) || newMileage < 0) {
      toast.error("Please enter a valid mileage");
      return;
    }

    if (bike.current_mileage && newMileage < bike.current_mileage) {
      toast.error("New mileage cannot be less than current mileage");
      return;
    }

    try {
      setIsUpdating(true);

      // Optimistic update
      onMileageUpdate(newMileage);

      const response = await fetch(`/api/bikes/${bike.id}/mileage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ current_mileage: newMileage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to update mileage");
      }

      toast.success("Mileage updated successfully");
    } catch (err) {
      // Rollback on error
      if (bike.current_mileage) {
        onMileageUpdate(bike.current_mileage);
        setMileage(bike.current_mileage.toString());
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to update mileage",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const bikeTypeLabels: Record<string, string> = {
    szosowy: "Road",
    gravelowy: "Gravel",
    mtb: "MTB",
    czasowy: "TT",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-2xl sm:text-3xl">{bike.name}</CardTitle>
            <CardDescription className="text-base mt-2">
              {bikeTypeLabels[bike.type] || bike.type}
              {bike.purchase_date &&
                ` • Purchased: ${new Date(bike.purchase_date).toLocaleDateString()}`}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <div className="text-right">
              <p className="text-sm text-gray-500">Current Mileage</p>
              <p className="text-2xl font-bold">
                {bike.current_mileage || 0} km
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              type="number"
              placeholder="New mileage"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              disabled={isUpdating}
              className="w-full"
            />
          </div>
          <Button
            onClick={handleMileageUpdate}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {isUpdating ? "Updating..." : "Update Mileage"}
          </Button>
        </div>

        {bike.next_service && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              Next Service: {bike.next_service.service_type}
            </p>
            <p className="text-sm text-blue-700">
              Target: {bike.next_service.target_mileage} km (
              {bike.next_service.km_remaining} km remaining)
            </p>
          </div>
        )}

        {bike.notes && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">{bike.notes}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Status</p>
            <p className="text-sm font-medium capitalize">
              {bike.status || "active"}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Active Reminders</p>
            <p className="text-sm font-medium">
              {bike.active_reminders_count || 0}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Total Cost</p>
            <p className="text-sm font-medium">{bike.total_cost || 0} PLN</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
