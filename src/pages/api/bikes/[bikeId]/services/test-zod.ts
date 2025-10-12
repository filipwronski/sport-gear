import type { APIRoute } from "astro";
import { z } from "zod";

/**
 * GET /api/bikes/{bikeId}/services - Test with Zod
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

    // Test Zod import
    const testSchema = z.object({
      bikeId: z.string().uuid(),
    });

    const validation = testSchema.safeParse({ bikeId: params.bikeId });

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid UUID",
          message: "Invalid bike ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Service endpoint with Zod works",
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
