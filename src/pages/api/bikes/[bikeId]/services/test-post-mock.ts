import type { APIRoute } from 'astro';

/**
 * POST /api/bikes/{bikeId}/services - Mock POST without database
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
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
    
    // Parse request body
    const requestBody = await request.json();
    
    // Mock successful creation response
    const mockServiceRecord = {
      id: "550e8400-e29b-41d4-a716-446655440999",
      bike_id: bikeId,
      service_date: requestBody.service_date || "2025-01-01",
      mileage_at_service: requestBody.mileage_at_service || 1000,
      service_type: requestBody.service_type || "inne",
      service_location: requestBody.service_location || null,
      cost: requestBody.cost || null,
      currency: requestBody.cost ? "PLN" : null,
      notes: requestBody.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: "Mock POST works without database"
    };

    return new Response(JSON.stringify(mockServiceRecord), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error("Service POST error:", error);
    return new Response(
      JSON.stringify({
        error: "Catch error",
        message: String(error)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
