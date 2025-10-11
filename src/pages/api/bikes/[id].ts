import type { APIRoute } from "astro";
import { BikeService } from "../../../services/bike.service";
import {
  UpdateBikeSchema,
  BikeIdSchema,
  type UpdateBikeInput,
} from "../../../lib/validation/bike.schemas";
import {
  handleError,
  createValidationErrorResponse,
  createNotFoundResponse,
} from "../../../lib/error-handler";

const bikeService = new BikeService();

/**
 * PUT /api/bikes/{id}
 * Updates an existing bike for authenticated user
 *
 * Path params:
 * - id: UUID of the bike
 *
 * Body: UpdateBikeCommand (partial)
 * Returns: BikeDTO
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const userId = locals.userId!;
    const bikeId = params.id!;

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
    const validated = UpdateBikeSchema.safeParse(body);
    if (!validated.success) {
      return createValidationErrorResponse(validated.error);
    }

    // Update bike using service layer
    const bike = await bikeService.updateBike(
      userId,
      bikeId,
      validated.data as UpdateBikeInput,
    );

    if (!bike) {
      return createNotFoundResponse(
        "Bike not found or you don't have permission to access it",
      );
    }

    // Log successful update
    console.log("[BikeAPI] Bike updated", {
      bikeId: bike.id,
      userId,
      updatedFields: Object.keys(validated.data),
    });

    return new Response(JSON.stringify(bike), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * DELETE /api/bikes/{id}
 * Deletes a bike and all related records (cascade)
 *
 * Path params:
 * - id: UUID of the bike
 *
 * Returns: 204 No Content
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const userId = locals.userId!;
    const bikeId = params.id!;

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

    // Check if bike exists before deletion (for proper 404 response)
    const existingBike = await bikeService.getBikeById(userId, bikeId);
    if (!existingBike) {
      return createNotFoundResponse(
        "Bike not found or you don't have permission to access it",
      );
    }

    // Delete bike using service layer
    await bikeService.deleteBike(userId, bikeId);

    // Log successful deletion
    console.log("[BikeAPI] Bike deleted", {
      bikeId,
      userId,
      bikeName: existingBike.name,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return handleError(error);
  }
};
