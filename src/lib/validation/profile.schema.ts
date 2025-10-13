import { z } from "zod";

/**
 * Zod schema for thermal preferences validation
 * Used in profile updates to ensure data integrity
 */
export const thermalPreferencesSchema = z.object({
  general_feeling: z.enum(["marzlak", "neutralnie", "szybko_mi_goraco"], {
    errorMap: () => ({
      message: "Must be one of: marzlak, neutralnie, szybko_mi_goraco",
    }),
  }),
  cold_hands: z.boolean({
    errorMap: () => ({ message: "Must be a boolean value" }),
  }),
  cold_feet: z.boolean({
    errorMap: () => ({ message: "Must be a boolean value" }),
  }),
  cap_threshold_temp: z
    .number()
    .min(0, "Must be at least 0")
    .max(30, "Must be at most 30"),
});

/**
 * Zod schema for profile update validation
 * All fields are optional to support partial updates
 * Uses strict mode to reject unknown fields
 */
export const updateProfileSchema = z
  .object({
    display_name: z
      .string()
      .trim()
      .min(1, "Display name cannot be empty")
      .max(100, "Display name must be at most 100 characters")
      .optional(),
    thermal_preferences: thermalPreferencesSchema.optional(),
    share_with_community: z
      .boolean({
        errorMap: () => ({ message: "Must be a boolean value" }),
      })
      .optional(),
    units: z
      .enum(["metric", "imperial"], {
        errorMap: () => ({ message: "Must be either metric or imperial" }),
      })
      .optional(),
    default_location_id: z
      .string()
      .uuid("Invalid location ID format")
      .nullable()
      .optional(),
  })
  .strict(); // Reject unknown fields

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
