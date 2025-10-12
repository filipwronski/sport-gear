import type { APIRoute } from "astro";

/**
 * GET /api/bikes/{bikeId}/services - Simple test
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication (handled by middleware)
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

    const bikeId = params.bikeId;

    return new Response(
      JSON.stringify({
        message: "Service endpoint test works",
        userId: locals.userId,
        bikeId: bikeId,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Service endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
