import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Service role key not found in environment",
        }),
        { status: 500 },
      );
    }

    // Utwórz client z service role key (omija RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

    // Sprawdź czy profil już istnieje
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", mockUserId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Mock profile already exists",
          userId: mockUserId,
        }),
        { status: 200 },
      );
    }

    // Utwórz mock profil
    const { data, error } = await adminClient
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
