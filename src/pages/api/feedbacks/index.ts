import type { APIRoute } from "astro";
import { FeedbackService } from "../../../services/feedback.service";
import { FeedbackValidator } from "../../../lib/validation/feedback.validator";
import { supabaseServiceClient } from "../../../db/supabase.admin.client";
import { ValidationError, NotFoundError } from "../../../lib/errors";
import type { FeedbacksListDTO, FeedbackDTO } from "../../../types";

/**
 * GET /api/feedbacks - Retrieve user's feedback history with filtering and pagination
 * POST /api/feedbacks - Create new outfit feedback after training
 */
export const GET: APIRoute = async ({ request, locals }) => {
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const rawParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      activity_type: url.searchParams.get("activity_type"),
      rating: url.searchParams.get("rating"),
      sort: url.searchParams.get("sort"),
    };

    let validatedParams;
    try {
      validatedParams = FeedbackValidator.validateGetFeedbacksParams(rawParams);
    } catch (error) {
      if (error instanceof ValidationError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: error.message,
              details: error.details,
            },
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }

    // Use FeedbackService to get user feedbacks
    const feedbackService = new FeedbackService(
      import.meta.env.DEV ? supabaseServiceClient : locals.supabase,
    );

    const result: FeedbacksListDTO = await feedbackService.getUserFeedbacks(
      userId,
      validatedParams,
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET /api/feedbacks error:", error);
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

export const POST: APIRoute = async ({ request, locals }) => {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body
    let validatedCommand;
    try {
      validatedCommand = FeedbackValidator.validateCreateFeedbackCommand(body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: error.message,
              details: error.details,
            },
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }

    // Use FeedbackService to create feedback
    const feedbackService = new FeedbackService(
      import.meta.env.DEV ? supabaseServiceClient : locals.supabase,
    );

    try {
      const result: FeedbackDTO = await feedbackService.createFeedback(
        userId,
        validatedCommand,
      );

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        return new Response(
          JSON.stringify({
            error: {
              code: "LOCATION_NOT_FOUND",
              message:
                "The specified location_id does not exist or does not belong to you",
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
    console.error("POST /api/feedbacks error:", error);
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
