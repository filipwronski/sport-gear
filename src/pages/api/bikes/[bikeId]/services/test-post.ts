import type { APIRoute } from 'astro';
import { supabaseClient } from '../../../../../db/supabase.client';

/**
 * POST /api/bikes/{bikeId}/services - Direct database test
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
    
    // Direct database insert test
    const { data, error } = await supabaseClient
      .from("service_records")
      .insert({
        bike_id: bikeId,
        service_date: requestBody.service_date || "2025-01-01",
        mileage_at_service: requestBody.mileage_at_service || 1000,
        service_type: requestBody.service_type || "inne",
        service_location: requestBody.service_location || null,
        cost: requestBody.cost || null,
        currency: requestBody.cost ? "PLN" : null,
        notes: requestBody.notes || null,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({
        error: "Database error",
        message: error.message,
        details: error,
        code: error.code
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      ...data,
      message: "Direct database insert works",
      userId: locals.userId
    }), {
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
        message: String(error),
        stack: error instanceof Error ? error.stack : 'No stack'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
