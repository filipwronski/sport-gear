import { z } from "zod";
import { ValidationError } from "../errors";

/**
 * Weather Forecast Validation Schemas
 * Provides validation for weather forecast API endpoints
 */

/**
 * Schema for GET /api/weather/forecast query parameters
 * Validates latitude and longitude coordinates
 */
export const GetForecastParamsSchema = z.object({
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

/**
 * Type for validated forecast parameters
 */
export type GetForecastParams = z.infer<typeof GetForecastParamsSchema>;

/**
 * Validates query parameters for weather forecast endpoint
 * @param params - Raw query parameters object
 * @returns Validated parameters
 * @throws ValidationError if validation fails
 */
export function validateForecastParams(params: unknown): GetForecastParams {
  const result = GetForecastParamsSchema.safeParse(params);

  if (!result.success) {
    const validationDetails = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    throw new ValidationError("Invalid forecast parameters", validationDetails);
  }

  return result.data;
}
