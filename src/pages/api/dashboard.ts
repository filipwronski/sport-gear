/**
 * GET /api/dashboard
 *
 * Endpoint providing aggregated dashboard data for authenticated users.
 * Returns weather summary, equipment status, community activity, and personalization status.
 *
 * Query Parameters:
 * - lat (optional): Latitude for weather data
 * - lng (optional): Longitude for weather data
 *
 * Response: DashboardDTO with aggregated data from multiple sources
 *
 * Security: Requires authentication via JWT token in Authorization header
 * Performance: Uses parallel queries for optimal response time
 */

import type { APIRoute } from "astro";
import { validateDashboardQuery } from "../../lib/utils/dashboard.utils";
import { createErrorResponse } from "../../lib/utils/response.utils";
import { DashboardService } from "../../services/dashboard.service";

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

    // Extract coordinates (optional)
    const coordinates =
      query.lat && query.lng
        ? {
            lat: parseFloat(query.lat),
            lng: parseFloat(query.lng),
          }
        : null;

    // Use DashboardService to aggregate all data
    const dashboardService = new DashboardService();
    const dashboardData = await dashboardService.getDashboard(
      userId,
      coordinates,
    );

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Dashboard endpoint error:", error);

    // Generic server error
    return createErrorResponse(
      "Internal Server Error",
      "An unexpected error occurred while processing the request",
      500,
    );
  }
};
