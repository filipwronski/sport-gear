import type { APIRoute } from "astro";
import { z } from "zod";
import { ServiceRecordService } from "../../../../../services/service-record.service";
import {
  updateServiceSchema,
  bikeServiceParamsSchema,
} from "../../../../../lib/validation/service.schemas";
import { handleError } from "../../../../../lib/error-handler";
import {
  InvalidUuidError,
  UnauthorizedErrorWithStatus,
} from "../../../../../lib/errors/index";

/**
 * PUT /api/bikes/{bikeId}/services/{id}
 * Update an existing service record (partial update)
 *
 * Path Parameters:
 * - bikeId: UUID - Target bike ID
 * - id: UUID - Service record ID to update
 *
 * Request Body (all fields optional):
 * - service_date?: string (ISO 8601, not in future) - Date when service was performed
 * - mileage_at_service?: number (positive) - Bike mileage at time of service
 * - service_type?: ServiceTypeEnum - Type of service performed
 * - service_location?: ServiceLocationEnum - Where service was performed
 * - cost?: number (>= 0) - Cost of service in PLN
 * - notes?: string (max 1000 chars) - Additional notes
 *
 * Note: Reminder fields cannot be updated (reminders created only on POST)
 *
 * Returns: ServiceRecordDTO of updated service
 */
export const PUT: APIRoute = async ({ request: _request, locals, params }) => {
  try {
    // Check authentication (handled by middleware)
    if (!locals.userId) {
      throw new UnauthorizedErrorWithStatus("Authentication required");
    }

    // Validate path parameters
    const pathValidation = bikeServiceParamsSchema.safeParse({
      bikeId: params.bikeId,
      id: params.id,
    });

    if (!pathValidation.success) {
      const errors = pathValidation.error.errors;
      if (errors.some((e) => e.path.includes("bikeId"))) {
        throw new InvalidUuidError("bikeId");
      }
      if (errors.some((e) => e.path.includes("id"))) {
        throw new InvalidUuidError("serviceId");
      }
      throw new InvalidUuidError("path parameters");
    }

    const { bikeId, id: serviceId } = pathValidation.data;

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (_error) {
      throw new z.ZodError([
        {
          code: "invalid_type",
          expected: "object",
          received: "undefined",
          path: [],
          message: "Request body must be valid JSON",
        },
      ]);
    }

    // Validate request body with Zod (partial update)
    const validatedBody = updateServiceSchema.parse(requestBody);

    // Check if at least one field is provided for update
    const hasUpdates = Object.keys(validatedBody).length > 0;
    if (!hasUpdates) {
      throw new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "At least one field must be provided for update",
        },
      ]);
    }

    // Execute business logic
    const serviceRecordService = new ServiceRecordService();
    const result = await serviceRecordService.updateService(
      locals.userId,
      bikeId,
      serviceId,
      validatedBody,
    );

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * DELETE /api/bikes/{bikeId}/services/{id}
 * Delete a service record (hard delete)
 *
 * Path Parameters:
 * - bikeId: UUID - Target bike ID
 * - id: UUID - Service record ID to delete
 *
 * Business Logic:
 * - Verifies bike ownership and service belongs to bike
 * - Updates any service_reminders that reference this service
 * - Performs hard delete from service_records table
 * - RLS ensures user can only delete own services
 *
 * Returns: 204 No Content on successful deletion
 */
export const DELETE: APIRoute = async ({
  request: _request,
  locals,
  params,
}) => {
  try {
    // Check authentication (handled by middleware)
    if (!locals.userId) {
      throw new UnauthorizedErrorWithStatus("Authentication required");
    }

    // Validate path parameters
    const pathValidation = bikeServiceParamsSchema.safeParse({
      bikeId: params.bikeId,
      id: params.id,
    });

    if (!pathValidation.success) {
      const errors = pathValidation.error.errors;
      if (errors.some((e) => e.path.includes("bikeId"))) {
        throw new InvalidUuidError("bikeId");
      }
      if (errors.some((e) => e.path.includes("id"))) {
        throw new InvalidUuidError("serviceId");
      }
      throw new InvalidUuidError("path parameters");
    }

    const { bikeId, id: serviceId } = pathValidation.data;

    // Execute business logic
    const serviceRecordService = new ServiceRecordService();
    await serviceRecordService.deleteService(locals.userId, bikeId, serviceId);

    // Return successful response (no body)
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    return handleError(error);
  }
};
