import type { APIRoute } from 'astro';
import { supabaseClient, supabaseServiceClient } from '../../../db/supabase.admin.client';

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

    // Use service client in development to bypass RLS
    const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;
    
    const { data, error } = await client
      .from('default_service_intervals')
      .select('*')
      .order('default_interval_km', { ascending: true });

    if (error) {
      console.error('Error fetching default intervals:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to fetch default intervals'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('GET /api/default-intervals-simple error:', error);

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
