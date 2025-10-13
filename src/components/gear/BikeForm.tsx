import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CreateBikeSchema, type CreateBikeInput } from "../../lib/validation/bike.schemas";
import type { CreateBikeCommand } from "../../types";

interface BikeFormProps {
  onSubmit: (data: CreateBikeCommand) => Promise<void>;
  isSubmitting: boolean;
  defaultValues?: Partial<CreateBikeCommand>;
}

const BIKE_TYPE_OPTIONS = [
  { value: "szosowy", label: "Szosowy" },
  { value: "gravelowy", label: "Gravelowy" },
  { value: "mtb", label: "MTB" },
  { value: "czasowy", label: "Czasowy" },
] as const;

export const BikeForm = ({
  onSubmit,
  isSubmitting,
  defaultValues,
}: BikeFormProps) => {
  const [imageError, setImageError] = useState<string | null>(null);

  const form = useForm<CreateBikeInput>({
    resolver: zodResolver(CreateBikeSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || "szosowy",
      purchase_date: defaultValues?.purchase_date || undefined,
      current_mileage: defaultValues?.current_mileage || 0,
      notes: defaultValues?.notes || undefined,
    },
  });

  const handleSubmit = async (data: CreateBikeInput) => {
    try {
      setImageError(null);
      await onSubmit(data);
    } catch (error) {
      // Error handling is done in the parent component
      console.error("Form submission error:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageError(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setImageError("Plik musi być obrazem (JPG, PNG, WEBP)");
      e.target.value = "";
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Plik jest za duży. Maksymalny rozmiar to 5MB");
      e.target.value = "";
      return;
    }

    setImageError(null);
    // TODO: Handle image upload logic here
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Bike Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nazwa roweru *</FormLabel>
              <FormControl>
                <Input
                  placeholder="np. Trek Madone 5"
                  maxLength={50}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bike Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ roweru *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ roweru" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BIKE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Purchase Date */}
        <FormField
          control={form.control}
          name="purchase_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data zakupu</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ? field.value.split('T')[0] : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? `${value}T00:00:00.000Z` : undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Current Mileage */}
        <FormField
          control={form.control}
          name="current_mileage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Przebieg aktualny (km)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="image">Zdjęcie roweru</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />
          {imageError && (
            <p className="text-sm text-red-500">{imageError}</p>
          )}
          <p className="text-xs text-gray-500">
            Maksymalny rozmiar pliku: 5MB. Obsługiwane formaty: JPG, PNG, WEBP
          </p>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notatki</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Dodatkowe informacje o rowerze..."
                  maxLength={500}
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">
                {field.value?.length || 0}/500 znaków
              </p>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !!imageError}
            className="min-w-[120px]"
          >
            {isSubmitting ? "Dodawanie..." : "Dodaj rower"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
