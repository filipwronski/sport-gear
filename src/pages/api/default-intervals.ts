import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/default-intervals
 * Get default service intervals (reference data)
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create service client directly (bypasses RLS in development)
    const supabaseServiceClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabaseServiceClient
      .from('default_service_intervals')
      .select('*')
      .order('default_interval_km', { ascending: true });

    if (error) {
      console.error('Error fetching default intervals:', error);
      throw new Error('Failed to fetch default intervals');
    }

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('GET /api/default-intervals error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
