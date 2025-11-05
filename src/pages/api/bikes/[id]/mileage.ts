import type { APIRoute } from "astro";
import { BikeService } from "../../../../services/bike.service";
import {
  UpdateMileageSchema,
  BikeIdSchema,
  type UpdateMileageInput,
} from "../../../../lib/validation/bike.schemas";
import {
  handleError,
  createValidationErrorResponse,
  createNotFoundResponse,
} from "../../../../lib/error-handler";

const bikeService = new BikeService();

/**
 * PATCH /api/bikes/{id}/mileage
 * Updates bike mileage with business rule validation
 *
 * Path params:
 * - id: UUID of the bike
 *
 * Body: UpdateBikeMileageCommand
 * Returns: UpdateBikeMileageResponse
 *
 * Business rule: Mileage cannot decrease
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "User not authenticated",
        }),
        { status: 401 },
      );
    }

    if (!params.id) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Bike ID is required",
        }),
        { status: 400 },
      );
    }

    const userId = locals.userId;
    const bikeId = params.id;

    // Validate bike ID format
    const bikeIdValidation = BikeIdSchema.safeParse(bikeId);
    if (!bikeIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid bike ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid JSON format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body
    const validated = UpdateMileageSchema.safeParse(body);
    if (!validated.success) {
      return createValidationErrorResponse(validated.error);
    }

    // Update mileage using service layer
    // Business rule validation (mileage decrease) is handled in service layer
    const result = await bikeService.updateMileage(
      userId,
      bikeId,
      validated.data as UpdateMileageInput,
    );

    if (!result) {
      return createNotFoundResponse(
        "Bike not found or you don't have permission to access it",
      );
    }

    // Log successful mileage update
    console.info("[BikeAPI] Mileage updated", {
      bikeId: result.id,
      userId,
      newMileage: result.current_mileage,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};
