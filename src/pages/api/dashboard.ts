/**
 * GET /api/dashboard
 *
 * Endpoint providing aggregated dashboard data for authenticated users.
 * Returns weather summary, equipment status, community activity, and personalization status.
 *
 * Query Parameters:
 * - location_id (optional): UUID of user's location for weather data
 *
 * Response: DashboardDTO with aggregated data from multiple sources
 *
 * Security: Requires authentication via JWT token in Authorization header
 * Performance: Uses parallel queries for optimal response time
 */

import type { APIRoute } from "astro";
import type { DashboardDTO } from "../../types";
import { supabaseClient } from "../../db/supabase.client";
import { supabaseServiceClient } from "../../db/supabase.admin.client";
import { LocationNotFoundError } from "../../lib/errors/dashboard.errors";
import { validateDashboardQuery } from "../../lib/utils/dashboard.utils";
import { createErrorResponse } from "../../lib/utils/response.utils";
import { DashboardService } from "../../services/dashboard.service";
import { ProfileService } from "../../services/ProfileService";

/**
 * Resolves location ID for dashboard data
 * Either validates provided location_id or gets user's default location
 */
async function resolveLocationId(
  userId: string,
  providedLocationId?: string,
): Promise<string> {
  // Use service client in development to bypass RLS for testing
  const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;

  if (providedLocationId) {
    // Validate that location belongs to user
    const { data: location, error } = await client
      .from("user_locations")
      .select("id")
      .eq("id", providedLocationId)
      .eq("user_id", userId)
      .single();

    if (error || !location) {
      throw new LocationNotFoundError(providedLocationId);
    }

    return providedLocationId;
  } else {
    // Get user's default location from profile service
    // This will automatically create a profile if it doesn't exist
    const profileService = new ProfileService();
    const defaultLocationId = await profileService.getDefaultLocationId(userId);

    // If no default location is set, return null (dashboard will handle this)
    // Don't throw error for missing default location
    if (!defaultLocationId) {
      console.log(`No default location set for user: ${userId}`);
      return null;
    }

    return defaultLocationId;
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Get authenticated user ID from middleware
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse(
        "Unauthorized",
        "Authentication required",
        401,
      );
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);

    const validationErrors = validateDashboardQuery(query);
    if (validationErrors.length > 0) {
      return createErrorResponse(
        "Bad Request",
        validationErrors.join(", "),
        400,
      );
    }

    // Resolve location ID (provided or default)
    const locationId = await resolveLocationId(userId, query.location_id);

    // Use DashboardService to aggregate all data
    const dashboardService = new DashboardService();
    const dashboardData = await dashboardService.getDashboard(
      userId,
      locationId,
    );

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Dashboard endpoint error:", error);

    if (error instanceof LocationNotFoundError) {
      return createErrorResponse("Location Not Found", error.message, 404);
    }

    // Generic server error
    return createErrorResponse(
      "Internal Server Error",
      "An unexpected error occurred while processing the request",
      500,
    );
  }
};
