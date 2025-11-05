import type { APIRoute } from "astro";
import { bikeIdParamSchema } from "../../../../../lib/validation/service.schemas";

/**
 * GET /api/bikes/{bikeId}/services - Test with service schemas
 */
export const GET: APIRoute = async ({ request: _request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
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

    // Test our schema import
    const validation = bikeIdParamSchema.safeParse({ bikeId: params.bikeId });

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid UUID",
          message: "Invalid bike ID format",
          details: validation.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Service endpoint with schemas works",
        userId: locals.userId,
        bikeId: validation.data.bikeId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (_error) {
    console.error("Service endpoint error:", _error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: String(_error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
