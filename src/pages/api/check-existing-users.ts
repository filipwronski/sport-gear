import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Sprawdź czy są jacyś użytkownicy w auth.users (przez service role)
    const { data: authUsers, error: authError } = await locals.supabase
      .rpc('get_auth_users_count');

    // Sprawdź profile
    const { data: profiles, error: profileError } = await locals.supabase
      .from('profiles')
      .select('id, display_name')
      .limit(3);

    return new Response(JSON.stringify({
      authUsers: {
        data: authUsers,
        error: authError
      },
      profiles: {
        data: profiles,
        error: profileError,
        count: profiles?.length || 0
      },
      suggestion: profiles && profiles.length > 0 
        ? `Użyj istniejącego profilu: ${profiles[0].id}`
        : 'Musisz utworzyć użytkownika ręcznie w Supabase Dashboard'
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
