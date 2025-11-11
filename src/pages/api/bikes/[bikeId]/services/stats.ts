import type { APIRoute } from "astro";
import { ServiceRecordService } from "../../../../../services/service-record.service";

/**
 * GET /api/bikes/{bikeId}/services/stats
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

    const userId = locals.userId;
    const bikeId = params.bikeId!;

    // Parse query parameters
    const url = new URL(request.url);
    const period = url.searchParams.get("period") || "all";
    const from_date = url.searchParams.get("from_date");
    const to_date = url.searchParams.get("to_date");

    // Prepare parameters for service
    const params_obj = {
      period: period as "month" | "quarter" | "year" | "all",
      from_date: from_date || undefined,
      to_date: to_date || undefined,
    };

    // Get statistics from service
    const serviceRecordService = new ServiceRecordService();
    const stats = await serviceRecordService.getServiceStats(
      userId,
      bikeId,
      params_obj,
    );

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Service stats error:", error);
    console.error("Error details:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: process.env.NODE_ENV === "development" ? error?.message : undefined,
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
