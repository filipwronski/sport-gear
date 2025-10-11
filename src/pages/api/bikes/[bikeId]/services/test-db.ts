import type { APIRoute } from 'astro';
import { supabaseClient } from '../../../../../db/supabase.client';

/**
 * GET /api/bikes/{bikeId}/services - Direct database test
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
    
    // Direct database query test
    const { data, error } = await supabaseClient
      .from("service_records")
      .select("*")
      .eq("bike_id", bikeId)
      .limit(5);

    if (error) {
      return new Response(JSON.stringify({
        error: "Database error",
        message: error.message,
        details: error
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      services: data || [],
      total: data?.length || 0,
      has_more: false,
      message: "Direct database query works",
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
