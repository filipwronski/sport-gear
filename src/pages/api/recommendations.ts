/**
 * GET /api/recommendations
 *
 * Returns personalized cycling outfit recommendations based on weather conditions,
 * user preferences, and activity type. Uses hybrid approach: fast rule-based algorithm
 * with optional AI enhancement for additional tips.
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import type { RecommendationDTO, GetRecommendationParams } from "../../types";
import { GetRecommendationsSchema } from "../../lib/validation/recommendations.schemas";
import { RecommendationWeatherService } from "../../services/weather/recommendation-weather.service";
import { RecommendationService } from "../../services/recommendations/recommendation.service";
import { supabaseClient } from "../../db/supabase.client";
import { supabaseServiceClient } from "../../db/supabase.admin.client";
import { createErrorResponse } from "../../lib/error-handler";
import {
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
  InternalServerError,
} from "../../lib/errors";

export const GET: APIRoute = async ({ request, locals }) => {
  const startTime = performance.now();

  try {
    // 1. Authentication check
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse({
        code: "UNAUTHORIZED",
        message: "Authentication required",
        statusCode: 401,
      });
    }

    // 2. Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      location_id: url.searchParams.get("location_id"),
      activity_type: url.searchParams.get("activity_type") || "spokojna",
      duration_minutes: url.searchParams.get("duration_minutes") || "90",
      date: url.searchParams.get("date") || undefined,
    };

    const validated = GetRecommendationsSchema.safeParse(queryParams);
    if (!validated.success) {
      const details = validated.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return createErrorResponse({
        code: "VALIDATION_ERROR",
        message: "Invalid request parameters",
        details,
        statusCode: 400,
      });
    }

    const params = validated.data;

    // 3. Verify location ownership
    const locationExists = await verifyLocationOwnership(
      params.location_id,
      userId,
    );
    if (!locationExists) {
      return createErrorResponse({
        code: "LOCATION_NOT_FOUND",
        message: "Location not found or does not belong to user",
        details: [
          {
            field: "location_id",
            message: `Location ${params.location_id} not found`,
          },
        ],
        statusCode: 404,
      });
    }

    // 4. Fetch data in parallel
    const weatherService = new RecommendationWeatherService();
    const [weather, profile] = await Promise.all([
      weatherService.getWeather(params.location_id, userId, params.date),
      getUserProfile(userId),
    ]);

    // 5. Generate outfit recommendation (rule-based, <10ms)
    const recommendationService = new RecommendationService();
    const outfit = recommendationService.generateOutfit({
      temperature: weather.temperature,
      feelsLike: weather.feels_like,
      windSpeed: weather.wind_speed,
      rainMm: weather.rain_mm,
      humidity: weather.humidity,
      activityType: params.activity_type,
      durationMinutes: params.duration_minutes,
      thermalAdjustment: profile.thermal_adjustment || 0,
      userPreferences: profile.thermal_preferences,
    });

    // 6. Generate AI tips (async, non-blocking, optional)
    // For now, return empty array - AI service will be implemented in Phase 4
    const additionalTips: string[] = [];

    // 7. Assemble response
    const computationTime = performance.now() - startTime;

    const response: RecommendationDTO = {
      weather,
      recommendation: outfit,
      additional_tips: additionalTips,
      personalized: (profile.thermal_adjustment || 0) !== 0,
      thermal_adjustment: profile.thermal_adjustment || 0,
      computation_time_ms: Math.round(computationTime),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in /api/recommendations:", error);

    // Handle specific error types
    if (error instanceof ServiceUnavailableError) {
      return createErrorResponse({
        code: "WEATHER_SERVICE_UNAVAILABLE",
        message: "Weather service temporarily unavailable",
        details: [{ service: "openweather_api", message: error.message }],
        statusCode: 503,
        retryAfter: 60,
      });
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse({
        code: "LOCATION_NOT_FOUND",
        message: error.message,
        statusCode: 404,
      });
    }

    if (error instanceof ValidationError) {
      return createErrorResponse({
        code: "VALIDATION_ERROR",
        message: error.message,
        statusCode: 400,
      });
    }

    // Generic error
    return createErrorResponse({
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      statusCode: 500,
      ...(import.meta.env.DEV && { debug: (error as Error).message }),
    });
  }
};

/**
 * Verify that location belongs to authenticated user
 * Uses service client for development/testing
 */
async function verifyLocationOwnership(
  locationId: string,
  userId: string,
): Promise<boolean> {
  // Use service client in development to bypass RLS issues
  const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;

  const { data, error } = await client
    .from("user_locations")
    .select("id")
    .eq("id", locationId)
    .eq("user_id", userId)
    .single();

  return !error && !!data;
}

/**
 * Get user profile with thermal preferences
 * Uses service client for development/testing
 */
async function getUserProfile(userId: string) {
  // Use service client in development to bypass RLS issues
  const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;

  const { data, error } = await client
    .from("profiles")
    .select("thermal_adjustment, thermal_preferences")
    .eq("id", userId)
    .single();

  if (error) {
    return { thermal_adjustment: 0, thermal_preferences: null };
  }

  return data;
}
