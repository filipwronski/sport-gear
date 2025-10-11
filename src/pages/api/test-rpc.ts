import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Test czy funkcja RPC insert_location istnieje
    const { data, error } = await locals.supabase.rpc('insert_location', {
      p_user_id: '550e8400-e29b-41d4-a716-446655440000',
      p_latitude: 52.237,
      p_longitude: 21.017,
      p_city: 'Test City',
      p_country_code: 'PL',
      p_is_default: false,
      p_label: 'Test RPC'
    });

    return new Response(JSON.stringify({
      success: !error,
      data: data,
      error: error,
      message: error ? 'RPC function failed' : 'RPC function works'
    }), { 
      status: error ? 500 : 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};
