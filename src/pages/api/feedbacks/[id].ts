import type { APIRoute } from "astro";
import { FeedbackService } from "../../../services/feedback.service";
import { FeedbackValidator } from "../../../lib/validation/feedback.validator";
import { supabaseServiceClient } from "../../../db/supabase.admin.client";
import {
  ValidationError,
  NotFoundError,
  DatabaseError,
} from "../../../lib/errors";

/**
 * DELETE /api/feedbacks/{id} - Delete user feedback
 * Removes feedback with ownership verification
 */
export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    // Get authenticated user ID from middleware
    const userId = locals.userId;
    if (!userId) {
      return new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Extract and validate feedback ID
    const feedbackId = params.id;
    if (!feedbackId) {
      return new Response(
        JSON.stringify({
          error: { code: "BAD_REQUEST", message: "Feedback ID is required" },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate UUID format
    if (!FeedbackValidator.isValidUUID(feedbackId)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid feedback ID format",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Use FeedbackService to delete feedback
    const feedbackService = new FeedbackService(
      import.meta.env.DEV ? supabaseServiceClient : locals.supabase,
    );

    try {
      await feedbackService.deleteFeedback(userId, feedbackId);

      // Return 204 No Content on successful deletion
      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "FEEDBACK_NOT_FOUND",
              message:
                "Feedback not found or you do not have permission to delete it",
            },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("DELETE /api/feedbacks/[id] error:", error);
    return new Response(
      JSON.stringify({
        error: { code: "INTERNAL_ERROR", message: "Internal server error" },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * Handle unsupported HTTP methods
 */
const unsupportedMethod = (method: string): Response => {
  return new Response(
    JSON.stringify({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: `Method ${method} not allowed. Only DELETE is supported.`,
      },
    }),
    {
      status: 405,
      headers: { "Content-Type": "application/json" },
    },
  );
};

export const GET: APIRoute = () => unsupportedMethod("GET");
export const POST: APIRoute = () => unsupportedMethod("POST");
export const PUT: APIRoute = () => unsupportedMethod("PUT");
export const PATCH: APIRoute = () => unsupportedMethod("PATCH");
