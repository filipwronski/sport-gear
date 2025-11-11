import type { APIRoute } from "astro";

/**
 * GET /api/bikes/{bikeId}/services/stats-test - Mock stats for testing
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bikeId = params.bikeId;

    // Parse query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "year";

    // Mock statistics data for testing
    const mockStats = {
      period: {
        from: "2024-01-01",
        to: "2024-12-31",
      },
      total_cost: 2450.50,
      total_services: 8,
      cost_per_km: 2.45,
      total_mileage: 1000,
      breakdown_by_type: [
        {
          service_type: "Przegląd techniczny",
          count: 3,
          total_cost: 900,
          avg_cost: 300,
          percentage: 36.7,
        },
        {
          service_type: "Wymiana łańcucha",
          count: 2,
          total_cost: 600,
          avg_cost: 300,
          percentage: 24.5,
        },
        {
          service_type: "Serwis hamulców",
          count: 1,
          total_cost: 450,
          avg_cost: 450,
          percentage: 18.4,
        },
        {
          service_type: "Wymiana opon",
          count: 2,
          total_cost: 500.50,
          avg_cost: 250.25,
          percentage: 20.4,
        },
      ],
      breakdown_by_location: {
        warsztat: { count: 5, total_cost: 1800 },
        samodzielnie: { count: 3, total_cost: 650.50 },
      },
      timeline: [
        {
          month: "2024-01",
          cost: 150,
          services: 1,
        },
        {
          month: "2024-03",
          cost: 300,
          services: 1,
        },
        {
          month: "2024-06",
          cost: 450,
          services: 2,
        },
        {
          month: "2024-09",
          cost: 750,
          services: 2,
        },
        {
          month: "2024-12",
          cost: 800.50,
          services: 2,
        },
      ],
    };

    return new Response(JSON.stringify(mockStats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Mock stats error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
