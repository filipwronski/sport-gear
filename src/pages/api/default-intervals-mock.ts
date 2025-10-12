import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }) => {
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

    // Test data instead of DB call
    const testData = [
      {
        service_type: "lancuch",
        default_interval_km: 3000,
        description: "wymiana łańcucha co 3000 km",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
      {
        service_type: "kaseta",
        default_interval_km: 9000,
        description: "wymiana kasety co 9000 km (3 łańcuchy)",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    return new Response(JSON.stringify(testData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GET /api/default-intervals-mock error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
