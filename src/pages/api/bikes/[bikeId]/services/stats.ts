import type { APIRoute } from 'astro';

/**
 * GET /api/bikes/{bikeId}/services/stats - Working version without imports
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required"
          }
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const bikeId = params.bikeId;
    
    // Parse query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all';
    const from_date = url.searchParams.get('from_date');
    const to_date = url.searchParams.get('to_date');

    // Calculate date range
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    let fromDate = "2020-01-01";
    let toDate = today;

    if (from_date && to_date) {
      fromDate = from_date.split("T")[0];
      toDate = to_date.split("T")[0];
    } else {
      switch (period) {
        case "month":
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          break;
        case "quarter":
          fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          break;
        case "year":
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
          break;
      }
    }

    // Mock statistics response
    const mockStats = {
      period: {
        from: fromDate,
        to: toDate
      },
      total_cost: 0,
      total_services: 0,
      cost_per_km: 0,
      total_mileage: 0,
      breakdown_by_type: [],
      breakdown_by_location: {
        warsztat: { count: 0, total_cost: 0 },
        samodzielnie: { count: 0, total_cost: 0 }
      },
      timeline: []
    };

    return new Response(JSON.stringify(mockStats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600'
      }
    });

  } catch (error) {
    console.error("Service stats error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred"
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};