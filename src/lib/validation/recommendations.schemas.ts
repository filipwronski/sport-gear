/**
 * Validation schemas for recommendations endpoint
 */

import { z } from "zod";

/**
 * Schema for GET /api/new-recommendations query parameters
 */
export const GetNewRecommendationsSchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  workout_intensity: z
    .enum(["rekreacyjny", "tempo", "intensywny", "długodystansowy"])
    .default("rekreacyjny"),
  workout_duration: z.coerce
    .number()
    .int()
    .min(15, "Duration must be at least 15 minutes")
    .max(300, "Duration cannot exceed 300 minutes")
    .default(60),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional()
    .refine((date) => {
      if (!date) return true;

      const targetDate = new Date(date);
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const maxDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return targetDate >= yesterday && targetDate <= maxDate;
    }, "Date must be between today and 7 days in the future"),
});

export type GetNewRecommendationsInput = z.infer<
  typeof GetNewRecommendationsSchema
>;
