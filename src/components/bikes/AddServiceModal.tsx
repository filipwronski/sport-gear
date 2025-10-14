import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createServiceSchema, type CreateServiceCommand } from "@/lib/validation/service.schemas";
import { toast } from "sonner";

interface AddServiceModalProps {
  bikeId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentMileage?: number;
}

const SERVICE_TYPES = [
  { value: "lancuch", label: "Łańcuch" },
  { value: "kaseta", label: "Kaseta" },
  { value: "klocki_przod", label: "Klocki przednie" },
  { value: "klocki_tyl", label: "Klocki tylne" },
  { value: "opony", label: "Opony" },
  { value: "przerzutki", label: "Przerzutki" },
  { value: "hamulce", label: "Hamulce" },
  { value: "przeglad_ogolny", label: "Przegląd ogólny" },
  { value: "inne", label: "Inne" },
] as const;

const SERVICE_LOCATIONS = [
  { value: "warsztat", label: "Warsztat" },
  { value: "samodzielnie", label: "Samodzielnie" },
] as const;

export function AddServiceModal({
  bikeId,
  isOpen,
  onClose,
  onSuccess,
  currentMileage,
}: AddServiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CreateServiceCommand>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: {
      service_date: new Date().toISOString().slice(0, 16), // Current date/time (YYYY-MM-DDTHH:MM format for datetime-local input)
      mileage_at_service: currentMileage || 0,
      service_type: undefined,
      service_location: undefined,
      cost: undefined,
      notes: "",
      create_reminder: false,
      reminder_interval_km: undefined,
    },
  });

  const createReminder = watch("create_reminder");

  const onSubmit = async (data: CreateServiceCommand) => {
    setIsSubmitting(true);
    try {
      // Convert date to ISO string - add seconds if missing
      const serviceDate = data.service_date.includes(':') && data.service_date.split(':').length === 2
        ? `${data.service_date}:00`
        : data.service_date;
      const serviceData = {
        ...data,
        service_date: new Date(serviceDate).toISOString(),
      };

      const response = await fetch(`/api/bikes/${bikeId}/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to create service");
      }

      toast.success("Service added successfully");
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating service:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create service"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Service Record</DialogTitle>
          <DialogDescription>
            Record a new maintenance or repair service for this bike.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Service Date */}
          <div className="space-y-2">
            <Label htmlFor="service_date">Service Date *</Label>
            <Input
              id="service_date"
              type="datetime-local"
              {...register("service_date")}
              className={errors.service_date ? "border-red-500" : ""}
            />
            {errors.service_date && (
              <p className="text-sm text-red-500">{errors.service_date.message}</p>
            )}
          </div>

          {/* Mileage at Service */}
          <div className="space-y-2">
            <Label htmlFor="mileage_at_service">Mileage at Service (km) *</Label>
            <Input
              id="mileage_at_service"
              type="number"
              min="0"
              {...register("mileage_at_service", { valueAsNumber: true })}
              className={errors.mileage_at_service ? "border-red-500" : ""}
            />
            {errors.mileage_at_service && (
              <p className="text-sm text-red-500">
                {errors.mileage_at_service.message}
              </p>
            )}
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label>Service Type *</Label>
            <Select
              onValueChange={(value) => setValue("service_type", value as any)}
            >
              <SelectTrigger className={errors.service_type ? "border-red-500" : ""}>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_type && (
              <p className="text-sm text-red-500">{errors.service_type.message}</p>
            )}
          </div>

          {/* Service Location */}
          <div className="space-y-2">
            <Label>Service Location</Label>
            <Select
              onValueChange={(value) => setValue("service_location", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service location (optional)" />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_LOCATIONS.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_location && (
              <p className="text-sm text-red-500">
                {errors.service_location.message}
              </p>
            )}
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="cost">Cost (optional)</Label>
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              {...register("cost", { valueAsNumber: true })}
            />
            {errors.cost && (
              <p className="text-sm text-red-500">{errors.cost.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about the service..."
              {...register("notes")}
              className="min-h-[80px]"
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          {/* Create Reminder */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create_reminder"
                checked={createReminder}
                onCheckedChange={(checked) =>
                  setValue("create_reminder", checked as boolean)
                }
              />
              <Label htmlFor="create_reminder">Create maintenance reminder</Label>
            </div>
          </div>

          {/* Reminder Interval */}
          {createReminder && (
            <div className="space-y-2">
              <Label htmlFor="reminder_interval_km">
                Reminder Interval (km) *
              </Label>
              <Input
                id="reminder_interval_km"
                type="number"
                min="100"
                max="10000"
                placeholder="e.g., 1000"
                {...register("reminder_interval_km", { valueAsNumber: true })}
                className={errors.reminder_interval_km ? "border-red-500" : ""}
              />
              {errors.reminder_interval_km && (
                <p className="text-sm text-red-500">
                  {errors.reminder_interval_km.message}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
