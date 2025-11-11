import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/admin-create-mock-bike
 * Create a mock bike for testing reminders (DEV ONLY)
 */
export const POST: APIRoute = async () => {
  try {
    // Create service client directly (bypasses RLS)
    const supabaseServiceClient = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const mockUserId = "7918f593-a567-4ab4-b5f6-174479002329";
    const mockBikeId = "123e4567-e89b-12d3-a456-426614174000";

    // Check if bike already exists
    const { data: existingBike } = await supabaseServiceClient
      .from("bikes")
      .select("id")
      .eq("id", mockBikeId)
      .single();

    if (existingBike) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Mock bike already exists",
          bikeId: mockBikeId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create mock bike
    const { data, error } = await supabaseServiceClient
      .from("bikes")
      .insert({
        id: mockBikeId,
        user_id: mockUserId,
        name: "Trek Domane Test",
        type: "szosowy",
        purchase_date: "2023-05-15",
        current_mileage: 1000,
        status: "active",
        notes: "Mock bike for testing reminders",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating mock bike:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to create mock bike",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mock bike created successfully",
        bike: data,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("POST /api/admin-create-mock-bike error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
