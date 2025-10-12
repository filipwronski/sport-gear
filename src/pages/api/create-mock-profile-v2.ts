import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  try {
    const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

    // Użyj locals.supabase (który może mieć różne uprawnienia w zależności od konfiguracji)
    const { data, error } = await locals.supabase
      .from("profiles")
      .upsert(
        {
          id: mockUserId,
          display_name: "Mock Test User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select()
      .single();

    if (error) {
      // Spróbuj alternatywnie przez raw SQL
      const { data: sqlData, error: sqlError } = await locals.supabase.rpc(
        "exec_sql",
        {
          sql: `
            INSERT INTO profiles (id, display_name, created_at, updated_at) 
            VALUES ('${mockUserId}', 'Mock Test User', NOW(), NOW()) 
            ON CONFLICT (id) DO NOTHING
            RETURNING *;
          `,
        },
      );

      return new Response(
        JSON.stringify({
          success: !sqlError,
          method: "sql",
          data: sqlData,
          error: sqlError,
          originalError: error,
        }),
        {
          status: sqlError ? 500 : 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        method: "upsert",
        data: data,
        message: "Mock profile created/updated successfully",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Exception occurred",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
};
