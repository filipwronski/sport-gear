/**
 * Validation schemas for recommendations endpoint
 */

import { z } from "zod";

/**
 * Schema for GET /api/recommendations query parameters
 */
export const GetRecommendationsSchema = z.object({
  location_id: z.string().uuid("Invalid UUID format"),
  activity_type: z
    .enum(["recovery", "spokojna", "tempo", "interwaly"])
    .default("spokojna"),
  duration_minutes: z.coerce
    .number()
    .int()
    .min(10, "Duration must be at least 10 minutes")
    .max(600, "Duration cannot exceed 600 minutes")
    .default(90),
  date: z
    .string()
    .datetime("Invalid date format")
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

export type GetRecommendationsInput = z.infer<typeof GetRecommendationsSchema>;
