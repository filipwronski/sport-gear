import type { APIRoute } from 'astro';
import { LocationService } from '../../../services/location.service';
import { LocationValidator } from '../../../lib/validation/location.validator';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../../../lib/errors';
import {
  createErrorResponse,
  createSuccessResponse,
  createNoContentResponse,
} from '../../../lib/utils/response.utils';

const locationService = new LocationService();

/**
 * PUT /api/locations/{id}
 * Updates an existing location with partial data
 *
 * Path params:
 * - id: UUID - location identifier
 *
 * Body: UpdateLocationCommand (all fields optional)
 * Returns: LocationDTO
 */
export const PUT: APIRoute = async ({ locals, params, request }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'User ID not found in request context', 401);
    }

    // Validate UUID path parameter
    const locationId = params.id;
    if (!locationId || !LocationValidator.validateUUID(locationId)) {
      return createErrorResponse('BAD_REQUEST', 'Invalid location ID format', 400);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return createErrorResponse('BAD_REQUEST', 'Invalid JSON in request body', 400);
    }

    // Validate request body
    let command;
    try {
      command = LocationValidator.validateUpdateCommand(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          error.message,
          422,
          error.validationDetails
        );
      }
      throw error;
    }

    // Update location using service layer
    const updatedLocation = await locationService.updateLocation(
      userId,
      locationId,
      command
    );

    return createSuccessResponse(updatedLocation);
  } catch (error) {
    if (error instanceof ValidationError) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        error.message,
        422,
        error.validationDetails
      );
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

    console.error('[PUT /api/locations/[id]] Error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while updating location',
      500
    );
  }
};

/**
 * DELETE /api/locations/{id}
 * Deletes a location with business rule validation
 *
 * Path params:
 * - id: UUID - location identifier
 *
 * Returns: 204 No Content on success
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'User ID not found in request context', 401);
    }

    // Validate UUID path parameter
    const locationId = params.id;
    if (!locationId || !LocationValidator.validateUUID(locationId)) {
      return createErrorResponse('BAD_REQUEST', 'Invalid location ID format', 400);
    }

    // Delete location using service layer
    await locationService.deleteLocation(userId, locationId);

    return createNoContentResponse();
  } catch (error) {
    if (error instanceof ConflictError) {
      return createErrorResponse('CONFLICT', error.message, 409);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }

    console.error('[DELETE /api/locations/[id]] Error:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while deleting location',
      500
    );
  }
};
