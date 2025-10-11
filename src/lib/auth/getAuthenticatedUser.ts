import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';
import { UnauthorizedErrorWithStatus } from '../errors';

/**
 * Extracts authenticated user from Astro middleware
 * Middleware already validates the token and sets locals.userId
 * 
 * @param context - Astro API context containing validated userId from middleware
 * @returns Promise<User> - User object with id from middleware
 * @throws UnauthorizedErrorWithStatus - When middleware didn't set userId
 */
export async function getAuthenticatedUser(
  context: APIContext
): Promise<User> {
  const userId = context.locals.userId;

  if (!userId) {
    throw new UnauthorizedErrorWithStatus('Authentication required - middleware did not set userId');
  }

  // Return a minimal User object with the validated userId
  // In a real implementation, you might want to fetch full user data from Supabase
  return {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: '', // Not needed for profile operations
    email_confirmed_at: null,
    phone: null,
    phone_confirmed_at: null,
    last_sign_in_at: null,
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '',
    updated_at: ''
  } as User;
}
