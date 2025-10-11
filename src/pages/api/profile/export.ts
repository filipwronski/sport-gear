import type { APIRoute } from 'astro';
import { ProfileService } from '../../../services/ProfileService';
import { getAuthenticatedUser } from '../../../lib/auth/getAuthenticatedUser';
import { handleApiError } from '../../../lib/errors/errorHandler';

/**
 * GET /api/profile/export - Export all user data
 * GDPR compliance - Right to Data Portability
 * Returns comprehensive user data export as downloadable JSON
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await getAuthenticatedUser(context);

    const profileService = new ProfileService();
    const exportData = await profileService.exportUserData(user.id);

    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `cyclegear-export-${timestamp}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
};
