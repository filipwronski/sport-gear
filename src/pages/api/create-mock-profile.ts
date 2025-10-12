import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ locals }) => {
  try {
    const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

    // Utwórz mock profil
    const { data, error } = await locals.supabase
      .from("profiles")
      .insert({
        id: mockUserId,
        display_name: "Mock Test User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: !error,
        data: data,
        error: error,
        message: error
          ? "Failed to create mock profile"
          : "Mock profile created successfully",
      }),
      {
        status: error ? 500 : 201,
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
