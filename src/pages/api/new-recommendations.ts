/**
 * GET /api/new-recommendations
 *
 * Returns new simplified cycling outfit recommendations based on weather conditions,
 * workout intensity and duration.
 */

import type { APIRoute } from "astro";
import type { NewRecommendationDTO } from "../../types";
import { GetNewRecommendationsSchema } from "../../lib/validation/recommendations.schemas";
import { RecommendationWeatherService } from "../../services/weather/recommendation-weather.service";
import { NewRecommendationService } from "../../services/recommendations/new-recommendation.service";
import { supabaseServiceClient } from "../../db/supabase.admin.client";
import { createErrorResponse } from "../../lib/error-handler";
import {
  ValidationError,
  NotFoundError,
  ServiceUnavailableError,
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
      lat: url.searchParams.get("lat"),
      lng: url.searchParams.get("lng"),
      workout_intensity:
        url.searchParams.get("workout_intensity") || "rekreacyjny",
      workout_duration: url.searchParams.get("workout_duration") || "60",
      date: url.searchParams.get("date") || undefined,
    };

    const validated = GetNewRecommendationsSchema.safeParse(queryParams);
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

    // 3. Fetch weather data
    const weatherService = new RecommendationWeatherService();
    const weather = await weatherService.getWeatherByCoordinates(
      params.lat,
      params.lng,
      params.date,
    );

    // 4. Get user profile for thermal preferences
    const profile = await getUserProfile(userId);

    // 5. Generate new clothing recommendation
    const recommendationService = new NewRecommendationService();
    const recommendation = recommendationService.generateRecommendation({
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.wind_speed,
      workoutIntensity: params.workout_intensity,
      workoutDuration: params.workout_duration,
      thermalAdjustment: profile.thermal_adjustment || 0,
      userPreferences: profile.thermal_preferences,
    });

    // 6. Generate AI tips (placeholder for now)
    const additionalTips: string[] = [];

    // 7. Assemble response
    const computationTime = performance.now() - startTime;

    const response: NewRecommendationDTO = {
      weather,
      recommendation,
      workout_intensity: params.workout_intensity,
      workout_duration: params.workout_duration,
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
    console.error("Error in /api/new-recommendations:", error);

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
 * Get user profile with thermal preferences
 */
async function getUserProfile(userId: string) {
  const client = import.meta.env.DEV
    ? supabaseServiceClient
    : supabaseServiceClient;

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
