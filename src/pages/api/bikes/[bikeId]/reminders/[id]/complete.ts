import type { APIRoute } from "astro";
import { BikeReminderService } from "@/services/bike-reminder.service";
import {
  supabaseClient,
  supabaseServiceClient,
} from "@/db/supabase.admin.client";
import { ReminderValidator } from "@/lib/validation/reminder.validator";
import type { CompleteReminderCommand } from "@/types";

// Use service client in development to bypass RLS
const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;
const bikeReminderService = new BikeReminderService(client);

/**
 * PUT /api/bikes/{bikeId}/reminders/{id}/complete
 * Mark a service reminder as completed
 */
export const PUT: APIRoute = async ({ request, locals, params }) => {
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
    const reminderId = params.id;

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

    if (!reminderId || !ReminderValidator.validateUUID(reminderId)) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "Invalid reminder ID format",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    let body: CompleteReminderCommand;
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
      ReminderValidator.validateCompleteReminderCommand(body);
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

    // Complete reminder
    const reminder = await bikeReminderService.completeReminder(
      locals.userId,
      bikeId,
      reminderId,
      body,
    );

    return new Response(JSON.stringify(reminder), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(
      "PUT /api/bikes/[bikeId]/reminders/[id]/complete error:",
      error,
    );

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

    if (error.name === "ReminderNotFoundError") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message: "Reminder not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (error.name === "ServiceRecordNotFoundError") {
      return new Response(
        JSON.stringify({
          error: "Not Found",
          message:
            "Service record not found or service record doesn't belong to this bike",
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
