import { z } from "zod";
import type {
  ActivityTypeEnum,
  ReputationBadgeEnum,
  GetCommunityOutfitsParams,
} from "../../types";

/**
 * Zod schemas for community outfits endpoint validation
 * Based on GET /api/community/outfits implementation plan
 */

// Enum schemas
export const ActivityTypeSchema = z.enum(
  ["recovery", "spokojna", "tempo", "interwaly"],
  {
    errorMap: () => ({
      message:
        "Activity type must be one of: recovery, spokojna, tempo, interwaly",
    }),
  },
);

export const ReputationBadgeSchema = z.enum(
  ["nowicjusz", "regularny", "ekspert", "mistrz"],
  {
    errorMap: () => ({
      message:
        "Reputation filter must be one of: nowicjusz, regularny, ekspert, mistrz",
    }),
  },
);

export const CommunityOutfitsSortSchema = z.enum(
  ["reputation", "distance", "created_at", "rating"],
  {
    errorMap: () => ({
      message: "Sort must be one of: reputation, distance, created_at, rating",
    }),
  },
);

/**
 * Schema for GET /api/community/outfits query parameters
 * Required: location_id
 * Optional: radius_km, temperature, temperature_range, activity_type, min_rating,
 *           reputation_filter, time_range, sort, limit, offset
 */
export const GetCommunityOutfitsQuerySchema = z.object({
  // Required parameters
  location_id: z.string().uuid("Location ID must be a valid UUID"),

  // Optional spatial parameters
  radius_km: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Radius must be an integer")
        .min(1, "Radius must be between 1 and 100 km")
        .max(100, "Radius must be between 1 and 100 km")
        .optional(),
    ),

  // Optional weather parameters
  temperature: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .pipe(
      z
        .number()
        .min(-50, "Temperature must be between -50°C and 50°C")
        .max(50, "Temperature must be between -50°C and 50°C")
        .optional(),
    ),

  temperature_range: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Temperature range must be an integer")
        .min(0, "Temperature range must be between 0 and 10°C")
        .max(10, "Temperature range must be between 0 and 10°C")
        .optional(),
    ),

  // Optional activity filter
  activity_type: ActivityTypeSchema.optional(),

  // Optional rating filter
  min_rating: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Min rating must be an integer")
        .min(1, "Min rating must be between 1 and 5")
        .max(5, "Min rating must be between 1 and 5")
        .optional(),
    ),

  // Optional reputation filter
  reputation_filter: ReputationBadgeSchema.optional(),

  // Optional time range (hours)
  time_range: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Time range must be an integer")
        .min(1, "Time range must be between 1 and 168 hours (7 days)")
        .max(168, "Time range must be between 1 and 168 hours (7 days)")
        .optional(),
    ),

  // Optional sorting
  sort: CommunityOutfitsSortSchema.optional(),

  // Optional pagination
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Limit must be an integer")
        .min(1, "Limit must be between 1 and 50")
        .max(50, "Limit must be between 1 and 50")
        .optional(),
    ),

  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(
      z
        .number()
        .int("Offset must be an integer")
        .min(0, "Offset must be non-negative")
        .optional(),
    ),
});

/**
 * Custom validation error class for community endpoints
 * Provides structured error details for API responses
 */
export class CommunityValidationError extends Error {
  public readonly details: Record<string, string>;

  constructor(details: Record<string, string>) {
    super("Validation Error");
    this.name = "CommunityValidationError";
    this.details = details;
  }
}

/**
 * Validates and transforms query parameters for GET /api/community/outfits
 * Throws CommunityValidationError if validation fails
 *
 * @param rawParams - Raw query parameters from URL
 * @returns Validated and transformed parameters
 * @throws CommunityValidationError - If validation fails
 */
export function validateGetCommunityOutfitsParams(
  rawParams: Record<string, string | undefined>,
): GetCommunityOutfitsParams {
  try {
    const validatedParams = GetCommunityOutfitsQuerySchema.parse(rawParams);

    // Apply defaults for optional parameters
    return {
      location_id: validatedParams.location_id,
      radius_km: validatedParams.radius_km ?? 50,
      temperature: validatedParams.temperature,
      temperature_range: validatedParams.temperature_range ?? 3,
      activity_type: validatedParams.activity_type,
      min_rating: validatedParams.min_rating,
      reputation_filter: validatedParams.reputation_filter,
      time_range: validatedParams.time_range ?? 24,
      sort: validatedParams.sort ?? "reputation",
      limit: validatedParams.limit ?? 10,
      offset: validatedParams.offset ?? 0,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Transform Zod errors to our custom format
      const details: Record<string, string> = {};

      error.errors.forEach((err) => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      throw new CommunityValidationError(details);
    }

    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Validates UUID format for location_id parameter
 * Used for quick validation in service layer
 *
 * @param locationId - Location ID to validate
 * @returns true if valid UUID
 */
export function isValidUUID(locationId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(locationId);
}

/**
 * Type exports for use in route handlers and services
 */
export type GetCommunityOutfitsQuery = z.infer<
  typeof GetCommunityOutfitsQuerySchema
>;
export type CommunityOutfitsSort = z.infer<typeof CommunityOutfitsSortSchema>;
