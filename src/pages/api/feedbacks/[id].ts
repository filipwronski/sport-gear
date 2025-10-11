import type { APIRoute } from 'astro';
import { FeedbackService } from '../../../services/feedback.service';
import { FeedbackValidator } from '../../../lib/validation/feedback.validator';
import { supabaseClient } from '../../../db/supabase.client';
import { supabaseServiceClient } from '../../../db/supabase.admin.client';
import { createErrorResponse, createNoContentResponse } from '../../../lib/utils/response.utils';
import { ValidationError, DatabaseError, NotFoundError } from '../../../lib/errors';

/**
 * DELETE /api/feedbacks/{id} - Delete user's feedback by ID
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    // Get authenticated user ID from middleware
    const userId = locals.userId;
    if (!userId) {
      return createErrorResponse('UNAUTHORIZED', 'Unauthorized', 401);
    }

    // Extract and validate feedback ID from URL params
    const feedbackId = params.id;
    if (!feedbackId || typeof feedbackId !== 'string') {
      return createErrorResponse('INVALID_PARAM', 'Feedback ID is required', 400);
    }

    // Validate UUID format
    if (!FeedbackValidator.isValidUUID(feedbackId)) {
      return createErrorResponse('INVALID_UUID', 'Invalid feedback ID format', 400);
    }

    // Use service client in development to bypass RLS (as per general.md guidelines)
    // This is critical because RLS policies use auth.uid() which requires real Supabase authentication
    // Mock tokens in middleware set locals.userId but don't authenticate through Supabase auth system
    const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;
    const feedbackService = new FeedbackService(client);

    // Delete feedback with ownership verification
    await feedbackService.deleteFeedback(userId, feedbackId);

    return createNoContentResponse();

  } catch (error) {
    console.error('DELETE /api/feedbacks/{id} error:', error);

    if (error instanceof ValidationError) {
      return createErrorResponse('VALIDATION_ERROR', error.message, 400);
    }
    if (error instanceof NotFoundError) {
      return createErrorResponse('NOT_FOUND', error.message, 404);
    }
    if (error instanceof DatabaseError) {
      return createErrorResponse('DATABASE_ERROR', 'Failed to delete feedback', 500);
    }

    return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
};
