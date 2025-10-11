import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Sprawdź czy istnieją profile w bazie
    const { data: profiles, error: profilesError } = await locals.supabase
      .from('profiles')
      .select('id, display_name')
      .limit(5);

    // Sprawdź czy mock user istnieje
    const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
    const { data: mockProfile, error: mockError } = await locals.supabase
      .from('profiles')
      .select('*')
      .eq('id', mockUserId)
      .single();

    return new Response(JSON.stringify({
      profiles: {
        data: profiles,
        error: profilesError,
        count: profiles?.length || 0
      },
      mockProfile: {
        data: mockProfile,
        error: mockError,
        exists: !!mockProfile
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Exception occurred',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};
