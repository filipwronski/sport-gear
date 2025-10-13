import type { APIRoute } from "astro";
import { WeatherService } from "../../../services/weather.service";
import { supabaseServiceClient } from "../../../db/supabase.admin.client";
import { validateForecastParams } from "../../../lib/validation/weather.schemas";
import {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  RateLimitError,
  ServiceUnavailableError,
  InternalServerError,
  ApiError,
} from "../../../lib/errors";
import {
  createErrorResponse,
  createSuccessResponse,
} from "../../../lib/utils/response.utils";

/**
 * GET /api/weather/forecast
 * Returns 7-day weather forecast for user's location with quick outfit recommendations
 *
 * Query params:
 * - location_id: string (UUID) - User's location identifier
 *
 * Headers:
 * - Authorization: Bearer <jwt_token> (handled by middleware)
 *
 * Returns: ForecastDTO
 * - forecast: Array of 7 ForecastDayDTO objects
 * - Each day includes: date, temp_min/max, wind, rain, description, quick_recommendation
 *
 * Caching: 6 hours TTL in weather_cache table (shared per city/country)
 * External API: OpenWeather API 7-day forecast
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    // Step 1: Authentication check (handled by middleware)
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Authentication required",
        401,
      );
    }

    // Step 2: Validate query parameters
    const lat = url.searchParams.get("lat");
    const lng = url.searchParams.get("lng");

    let validatedParams;
    try {
      validatedParams = validateForecastParams({ lat, lng });
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          error.message,
          400,
          error.validationDetails,
        );
      }
      throw error;
    }

    // Step 3: Check for OpenWeather API key
    const apiKey = import.meta.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      console.error("[GET /api/weather/forecast] Missing OPENWEATHER_API_KEY");
      return createErrorResponse(
        "INTERNAL_ERROR",
        "Weather service configuration error",
        500,
      );
    }

    // Step 4: Initialize WeatherService and get forecast
    const weatherService = new WeatherService(locals.supabase, supabaseServiceClient, apiKey);
    const forecast = await weatherService.getForecastByCoordinates(
      validatedParams.lat,
      validatedParams.lng,
    );

    // Step 5: Return successful response
    return createSuccessResponse(forecast);
  } catch (error) {
    // Step 6: Handle known errors with appropriate HTTP status codes
    if (error instanceof ApiError) {
      return createErrorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
          ? Object.entries(error.details).map(([field, messages]) => ({
              field,
              message: Array.isArray(messages) ? messages.join(", ") : messages,
            }))
          : undefined,
      );
    }

    // Handle legacy error types (for backward compatibility)
    if (error instanceof ValidationError) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        error.message,
        400,
        error.validationDetails,
      );
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse("NOT_FOUND", error.message, 404);
    }

    if (error instanceof UnauthorizedError) {
      return createErrorResponse("UNAUTHORIZED", error.message, 401);
    }

    // Step 7: Handle unexpected errors
    console.error("[GET /api/weather/forecast] Unexpected error:", {
      error: error.message,
      stack: error.stack,
      userId,
      locationId: url.searchParams.get("location_id"),
      timestamp: new Date().toISOString(),
    });

    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching weather forecast",
      500,
    );
  }
};

/**
 * Handle unsupported HTTP methods
 * Weather forecast is read-only, only GET is supported
 */
const unsupportedMethod = (method: string): Response => {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    `Method ${method} not allowed. Only GET is supported.`,
    405,
  );
};

export const POST: APIRoute = () => unsupportedMethod("POST");
export const PUT: APIRoute = () => unsupportedMethod("PUT");
export const DELETE: APIRoute = () => unsupportedMethod("DELETE");
export const PATCH: APIRoute = () => unsupportedMethod("PATCH");
