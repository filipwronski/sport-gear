import type { APIRoute } from 'astro';
import { BikeReminderService } from '../../../../services/bike-reminder.service';
import { supabaseClient, supabaseServiceClient } from '../../../../db/supabase.admin.client';
import { ReminderValidator } from '../../../../lib/validation/reminder.validator';

// Use service client in development to bypass RLS
const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;
const bikeReminderService = new BikeReminderService(client);

/**
 * DELETE /api/bikes/{bikeId}/reminders/{id}
 * Delete a service reminder
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // Check authentication
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const bikeId = params.bikeId;
    const reminderId = params.id;

    if (!bikeId || !ReminderValidator.validateUUID(bikeId)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid bike ID format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!reminderId || !ReminderValidator.validateUUID(reminderId)) {
      return new Response(
        JSON.stringify({
          error: 'Bad Request',
          message: 'Invalid reminder ID format'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete reminder
    await bikeReminderService.deleteReminder(
      locals.userId,
      bikeId,
      reminderId
    );

    return new Response(null, {
      status: 204
    });

  } catch (error: any) {
    console.error('DELETE /api/bikes/[bikeId]/reminders/[id] error:', error);

    if (error.name === 'BikeNotFoundError') {
      return new Response(
        JSON.stringify({
          error: 'Bike Not Found',
          message: 'Bike not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (error.name === 'ReminderNotFoundError') {
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: 'Reminder not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
