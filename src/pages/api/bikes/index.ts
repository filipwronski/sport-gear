import type { APIRoute } from "astro";
import { BikeService } from "../../../services/bike.service";
import {
  CreateBikeSchema,
  GetBikesQuerySchema,
  type CreateBikeInput,
  type GetBikesQuery,
} from "../../../lib/validation/bike.schemas";
import {
  handleError,
  createValidationErrorResponse,
} from "../../../lib/error-handler";

const bikeService = new BikeService();

/**
 * GET /api/bikes
 * Fetches all bikes for authenticated user with optional filtering
 *
 * Query params:
 * - status: BikeStatusEnum (optional)
 * - type: BikeTypeEnum (optional)
 *
 * Returns: BikesListDTO
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'User ID not found in request context'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate query parameters
    const queryParams: Record<string, string | null> = {
      status: url.searchParams.get("status"),
      type: url.searchParams.get("type"),
    };

    // Remove null values for Zod validation
    const cleanParams = Object.fromEntries(
      Object.entries(queryParams).filter(([, value]) => value !== null),
    );

    const validated = GetBikesQuerySchema.safeParse(cleanParams);
    if (!validated.success) {
      return createValidationErrorResponse(validated.error);
    }

    // Fetch bikes using service layer
    const result = await bikeService.getBikes(
      userId,
      validated.data as GetBikesQuery,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60", // 1 minute cache
      },
    });
  } catch (error) {
    return handleError(error);
  }
};

/**
 * POST /api/bikes
 * Creates a new bike for authenticated user
 *
 * Body: CreateBikeCommand
 * Returns: BikeDTO
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'User ID not found in request context'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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
    const validated = CreateBikeSchema.safeParse(body);
    if (!validated.success) {
      return createValidationErrorResponse(validated.error);
    }

    // Create bike using service layer
    const bike = await bikeService.createBike(
      userId,
      validated.data as CreateBikeInput,
    );

    // Log successful creation
    console.log("[BikeAPI] Bike created", {
      bikeId: bike.id,
      userId,
      type: bike.type,
      name: bike.name,
    });

    return new Response(JSON.stringify(bike), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleError(error);
  }
};
