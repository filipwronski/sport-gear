import type { APIRoute } from "astro";
// import { ServiceRecordService } from '../../../../../services/service-record.service';

/**
 * GET /api/bikes/{bikeId}/services - Test without service import
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
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

    // Mock response without service layer
    return new Response(
      JSON.stringify({
        services: [],
        total: 0,
        has_more: false,
        message: "Mock service endpoint works",
        userId: locals.userId,
        bikeId: params.bikeId,
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
        message: String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
