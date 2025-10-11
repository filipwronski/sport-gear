import type { APIRoute } from 'astro';
import { ProfileService } from '../../services/ProfileService';
import { getAuthenticatedUser } from '../../lib/auth/getAuthenticatedUser';
import { handleApiError } from '../../lib/errors/errorHandler';
import { updateProfileSchema } from '../../lib/validation/profile.schema';
import { BadRequestError } from '../../lib/errors';

/**
 * GET /api/profile - Get current user profile
 * Returns authenticated user's profile data with thermal preferences
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);
    const profileService = new ProfileService();
    
    const profile = await profileService.getProfile(user.id);

    return new Response(JSON.stringify(profile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * PUT /api/profile - Update user profile
 * Supports partial updates with Zod validation
 * Handles pseudonym generation for community sharing
 */
export const PUT: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    // Parse and validate request body
    let body;
    try {
      body = await context.request.json();
    } catch {
      throw new BadRequestError('Invalid JSON in request body');
    }

    // Validate with Zod schema
    const validatedData = updateProfileSchema.parse(body);

    // Update profile
    const profileService = new ProfileService();
    const updatedProfile = await profileService.updateProfile(user.id, validatedData);

    return new Response(JSON.stringify(updatedProfile), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * DELETE /api/profile - Delete user account
 * GDPR compliance - removes all user data except anonymized community contributions
 * Operation is irreversible
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const profileService = new ProfileService();
    await profileService.deleteAccount(user.id);

    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    return handleApiError(error);
  }
};
