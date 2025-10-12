import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const POST: APIRoute = async () => {
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

    // Utwórz client z service role key
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Utwórz prawdziwego użytkownika przez Supabase Auth
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: "mockuser@test.com",
        password: "mockpassword123",
        email_confirm: true,
        user_metadata: {
          display_name: "Mock Test User",
        },
      });

    if (authError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authError,
          message: "Failed to create auth user",
        }),
        { status: 500 },
      );
    }

    const userId = authData.user.id;

    // Utwórz profil dla użytkownika
    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: userId,
        display_name: "Mock Test User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: !profileError,
        authUser: {
          id: userId,
          email: authData.user.email,
        },
        profile: profileData,
        error: profileError,
        message: profileError
          ? "Auth user created but profile failed"
          : "Mock user and profile created successfully",
        instructions: `Update middleware to use userId: "${userId}" instead of mock UUID`,
      }),
      {
        status: profileError ? 500 : 201,
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
