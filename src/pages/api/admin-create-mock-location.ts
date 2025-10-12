import type { APIRoute } from "astro";
import { supabaseServiceClient } from "../../db/supabase.admin.client";

export const POST: APIRoute = async () => {
  try {
    const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

    // Sprawdź czy lokalizacja już istnieje
    const { data: existingLocation } = await supabaseServiceClient
      .from("user_locations")
      .select("id")
      .eq("user_id", mockUserId)
      .single();

    if (existingLocation) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Mock location already exists",
          location_id: existingLocation.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Utwórz lokalizację testową używając service client (omija RLS)
    const { data, error } = await supabaseServiceClient
      .from("user_locations")
      .insert({
        user_id: mockUserId,
        location: "POINT(21.0122 52.2297)", // Warsaw coordinates as PostGIS text
        city: "Warsaw",
        country_code: "PL",
        is_default: false, // Avoid trigger issues
        label: "Test Location Warsaw",
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
          ? "Failed to create mock location"
          : "Mock location created successfully",
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
