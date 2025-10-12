import type { APIRoute } from "astro";
import {
  validateGetCommunityOutfitsParams,
  CommunityValidationError,
} from "../../../lib/validation/community.schemas";
import {
  getCommunityOutfits,
  LocationNotFoundError,
  CommunityServiceError,
} from "../../../services/community.service";

/**
 * GET /api/community/outfits
 *
 * Returns community-shared outfits within specified radius from user location
 * with advanced filtering by weather conditions, activity type, and ratings.
 * Uses PostGIS spatial queries for efficient geographic search.
 *
 * Query Parameters:
 * - location_id (required): UUID of user location for spatial center
 * - radius_km (optional): Search radius in kilometers (1-100, default: 50)
 * - temperature (optional): Filter by temperature ±temperature_range
 * - temperature_range (optional): Temperature tolerance in °C (0-10, default: 3)
 * - activity_type (optional): Filter by activity type
 * - min_rating (optional): Minimum outfit rating (1-5)
 * - reputation_filter (optional): Filter by user reputation badge
 * - time_range (optional): Time range in hours (1-168, default: 24)
 * - sort (optional): Sort order (reputation|distance|created_at|rating, default: reputation)
 * - limit (optional): Results per page (1-50, default: 10)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Authentication: Required (JWT token in Authorization header)
 *
 * Responses:
 * - 200: Success with paginated community outfits
 * - 400: Validation error (invalid parameters)
 * - 401: Unauthorized (missing/invalid token)
 * - 404: Location not found or doesn't belong to user
 * - 500: Internal server error
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Step 1: Authentication check
    if (!locals.user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Step 2: Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams: Record<string, string | undefined> = {};

    // Extract all query parameters
    url.searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    let validatedParams;
    try {
      validatedParams = validateGetCommunityOutfitsParams(rawParams);
    } catch (error) {
      if (error instanceof CommunityValidationError) {
        return new Response(
          JSON.stringify({
            error: "Validation Error",
            details: error.details,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error; // Re-throw unexpected validation errors
    }

    // Step 3: Call service layer to get community outfits
    const result = await getCommunityOutfits(locals.user.id, validatedParams);

    // Step 4: Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Enable CORS for frontend requests
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
      },
    });
  } catch (error) {
    // Step 5: Handle service layer errors
    if (error instanceof LocationNotFoundError) {
      return new Response(
        JSON.stringify({
          error: "Location Not Found",
          message: error.message,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (error instanceof CommunityServiceError) {
      // Log service errors for debugging
      console.error("Community service error:", {
        error: error.message,
        cause: error.cause,
        userId: locals.user?.id,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Database error occurred",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Step 6: Handle unexpected errors
    console.error("Unexpected error in community outfits endpoint:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: locals.user?.id,
      url: request.url,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * OPTIONS /api/community/outfits
 *
 * Handles CORS preflight requests for cross-origin API access
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
};
