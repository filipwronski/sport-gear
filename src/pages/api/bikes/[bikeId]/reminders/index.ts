import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { BikeReminderService } from "@/services/bike-reminder.service";
import { ReminderValidator } from "@/lib/validation/reminder.validator";
import type { CreateReminderCommand, GetRemindersParams } from "@/types";

// Initialize service client (bypasses RLS in development)
const supabaseServiceClient = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
);

const bikeReminderService = new BikeReminderService(supabaseServiceClient);

/**
 * GET /api/bikes/{bikeId}/reminders
 * Fetch reminders for a specific bike with filtering and sorting
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bikeId = params.bikeId;
    if (!bikeId || !ReminderValidator.validateUUID(bikeId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid bike ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse and sanitize query parameters
    const url = new URL(request.url);
    const queryParams = ReminderValidator.sanitizeQueryParams({
      status: url.searchParams.get("status"),
      service_type: url.searchParams.get("service_type"),
      sort: url.searchParams.get("sort"),
    });

    // Create service client directly (bypasses RLS in development)
    const supabaseServiceClient = createClient(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Verify bike ownership first
    const { data: bike, error: bikeError } = await supabaseServiceClient
      .from("bikes")
      .select("id, current_mileage")
      .eq("id", bikeId)
      .eq("user_id", locals.userId)
      .single();

    if (bikeError || !bike) {
      return new Response(
        JSON.stringify({
          error: "Bike Not Found",
          message: `Bike with ID ${bikeId} does not exist or you don't have access`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Build query with filters
    let query = supabaseServiceClient
      .from("service_reminders")
      .select(
        `
        *,
        bikes!inner(current_mileage)
      `,
      )
      .eq("bike_id", bikeId);

    // Apply service type filter
    if (queryParams.service_type) {
      query = query.eq("service_type", queryParams.service_type);
    }

    // Apply sorting
    const sortField = queryParams.sort?.includes("km_remaining")
      ? "triggered_at_mileage"
      : "created_at";
    const sortDirection = queryParams.sort?.includes("desc") ? false : true;
    query = query.order(sortField, { ascending: sortDirection });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reminders:", error);
      throw new Error("Failed to fetch reminders");
    }

    if (!data) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Transform data and compute fields
    const reminders = data.map((row) => {
      const currentMileage = row.bikes?.current_mileage || 0;
      const targetMileage = row.triggered_at_mileage + row.interval_km;
      const kmRemaining = targetMileage - currentMileage;

      // Compute status
      let status;
      if (row.completed_at) {
        status = "completed";
      } else if (kmRemaining < 0) {
        status = "overdue";
      } else if (kmRemaining <= 200) {
        status = "active";
      } else {
        status = "upcoming";
      }

      return {
        id: row.id,
        bike_id: row.bike_id,
        service_type: row.service_type,
        triggered_at_mileage: row.triggered_at_mileage,
        interval_km: row.interval_km,
        target_mileage: targetMileage,
        current_mileage: currentMileage,
        km_remaining: kmRemaining,
        status,
        completed_at: row.completed_at,
        completed_service_id: row.completed_service_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    // Apply status filter after computing status
    let filteredReminders = reminders;
    if (queryParams.status && queryParams.status !== "all") {
      if (queryParams.status === "active") {
        filteredReminders = reminders.filter((r) => r.completed_at === null);
      } else if (queryParams.status === "completed") {
        filteredReminders = reminders.filter((r) => r.completed_at !== null);
      } else if (queryParams.status === "overdue") {
        filteredReminders = reminders.filter((r) => r.status === "overdue");
      }
    }

    // Get reminders
    return new Response(JSON.stringify(filteredReminders), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GET /api/bikes/[bikeId]/reminders error:", error);

    if (error.name === "BikeNotFoundError") {
      return new Response(
        JSON.stringify({
          error: "Bike Not Found",
          message: error.message,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
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
 * POST /api/bikes/{bikeId}/reminders
 * Create a new service reminder
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const bikeId = params.bikeId;
    if (!bikeId || !ReminderValidator.validateUUID(bikeId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid bike ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let body: CreateReminderCommand;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid JSON in request body",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body
    const validationResult =
      ReminderValidator.validateCreateReminderCommand(body);
    if (!validationResult.valid) {
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid field values",
          details: validationResult.errors,
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create reminder
    const reminder = await bikeReminderService.createReminder(
      locals.userId,
      bikeId,
      body,
    );

    return new Response(JSON.stringify(reminder), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("POST /api/bikes/[bikeId]/reminders error:", error);

    if (error.name === "BikeNotFoundError") {
      return new Response(
        JSON.stringify({
          error: "Bike Not Found",
          message: "Bike not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (error.name === "ReminderConflictError") {
      return new Response(
        JSON.stringify({
          error: "Conflict",
          message: error.message,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
