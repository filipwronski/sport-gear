import { z } from "zod";
import { ValidationError } from "../errors";

/**
 * Weather Forecast Validation Schemas
 * Provides validation for weather forecast API endpoints
 */

/**
 * Schema for GET /api/weather/forecast query parameters
 * Validates location_id as valid UUID v4
 */
export const GetForecastParamsSchema = z.object({
  location_id: z.string().uuid({ message: "location_id must be valid UUID" }),
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
