import type { APIRoute } from "astro";
import type { BikeDTO, BikesListDTO } from "../../../types";

/**
 * Mock implementation for testing bike endpoints without database
 */

// Mock data storage (in-memory for testing)
const mockBikes: BikeDTO[] = [
  {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Trek Domane Test",
    type: "szosowy",
    purchase_date: "2023-05-15T12:00:00Z",
    current_mileage: 1000,
    status: "active",
    notes: "Mock bike for testing",
    created_at: "2023-05-15T12:00:00Z",
    updated_at: "2023-05-15T12:00:00Z",
    next_service: {
      service_type: "lancuch",
      target_mileage: 2000,
      km_remaining: 1000,
      status: "upcoming",
    },
    active_reminders_count: 1,
    total_cost: 250.5,
  },
];

/**
 * GET /api/bikes-mock - Mock version for testing
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "User ID not found in request context",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse query parameters (mock filtering)
    const status = url.searchParams.get("status");
    const type = url.searchParams.get("type");

    let filteredBikes = [...mockBikes];

    if (status) {
      filteredBikes = filteredBikes.filter((bike) => bike.status === status);
    }

    if (type) {
      filteredBikes = filteredBikes.filter((bike) => bike.type === type);
    }

    const response: BikesListDTO = {
      bikes: filteredBikes,
      total: filteredBikes.length,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[MockBikes] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * POST /api/bikes-mock - Mock bike creation
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "User ID not found in request context",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad request",
          message: "Invalid JSON format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Basic validation (simplified)
    const data = body as any;
    if (!data.name || !data.type) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: {
            name: !data.name ? ["Name is required"] : undefined,
            type: !data.type ? ["Type is required"] : undefined,
          },
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create mock bike
    const newBike: BikeDTO = {
      id: `mock-bike-${Date.now()}`,
      name: data.name,
      type: data.type,
      purchase_date: data.purchase_date || null,
      current_mileage: data.current_mileage || 0,
      status: "active",
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      next_service: null,
      active_reminders_count: 0,
      total_cost: 0,
    };

    // Add to mock storage
    mockBikes.push(newBike);

    return new Response(JSON.stringify(newBike), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[MockBikes] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
