import type { APIRoute } from "astro";

/**
 * Simple test endpoint to verify mock authentication works
 * Returns mock data without database queries
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "User ID not found in request context",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Return mock data for testing
    const mockResponse = {
      message: "Mock authentication successful!",
      userId: userId,
      timestamp: new Date().toISOString(),
      endpoint: "GET /api/test-auth",
    };

    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TestAuth] Error:", error);
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
