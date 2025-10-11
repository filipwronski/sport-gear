import type { APIRoute } from 'astro';
import { ServiceRecordService } from '../../../../../services/service-record-minimal.service';

/**
 * GET /api/bikes/{bikeId}/services - Test with minimal service
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required"
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const bikeId = params.bikeId;
    
    // Test minimal service
    const serviceRecordService = new ServiceRecordService();
    const result = await serviceRecordService.getServicesByBikeId(
      locals.userId,
      bikeId,
      { limit: 10, offset: 0 }
    );

    return new Response(JSON.stringify({
      ...result,
      message: "Service endpoint with minimal service works",
      userId: locals.userId,
      bikeId: bikeId
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error("Service endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: "Database error",
        message: String(error)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
