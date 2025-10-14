import type { APIRoute } from "astro";
import { LocationService } from "../../../services/location.service";
import { LocationValidator } from "../../../lib/validation/location.validator";
import { ValidationError } from "../../../lib/errors";
import {
  createErrorResponse,
  createSuccessResponse,
  createCreatedResponse,
} from "../../../lib/utils/response.utils";

const locationService = new LocationService();

/**
 * GET /api/locations
 * Fetches all locations for authenticated user with optional filtering
 *
 * Query params:
 * - default_only: boolean (optional) - returns only default location if true
 *
 * Returns: LocationDTO[]
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "User ID not found in request context",
        401,
      );
    }

    // Parse and validate query parameters
    let queryParams;
    try {
      queryParams = LocationValidator.validateQueryParams(url.searchParams);
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          error.message,
          422,
          error.validationDetails,
        );
      }
      throw error;
    }

    // Fetch locations using service layer
    const locations = await locationService.getUserLocations(
      userId,
      queryParams.defaultOnly,
    );

    return createSuccessResponse(locations);
  } catch (error) {
    console.error("[GET /api/locations] Error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while fetching locations",
      500,
    );
  }
};

/**
 * POST /api/locations
 * Creates a new location for authenticated user
 *
 * Body: CreateLocationCommand
 * Returns: LocationDTO
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "User ID not found in request context",
        401,
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse(
        "BAD_REQUEST",
        "Invalid JSON in request body",
        400,
      );
    }

    // Validate request body
    let command;
    try {
      command = LocationValidator.validateCreateCommand(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse(
          "VALIDATION_ERROR",
          error.message,
          422,
          error.validationDetails,
        );
      }
      throw error;
    }

    // Create location using service layer
    const newLocation = await locationService.createLocation(
      userId,
      command,
    );

    return createCreatedResponse(newLocation, newLocation.id);
  } catch (error) {
    if (error instanceof ValidationError) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        error.message,
        422,
        error.validationDetails,
      );
    }

    console.error("[POST /api/locations] Error:", error);
    return createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while creating location",
      500,
    );
  }
};
