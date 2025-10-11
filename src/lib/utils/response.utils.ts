/**
 * Response utility functions for consistent API responses
 * Provides standardized response formats and error handling
 */

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

/**
 * Creates a standardized error response
 * Used across all Location API endpoints for consistent error format
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
): Response {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a successful response with data
 * Used for GET, POST, PUT endpoints that return data
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      // Cache private data for 5 minutes (as per plan)
      'Cache-Control': 'private, max-age=300'
    },
  });
}

/**
 * Creates a 204 No Content response
 * Used for DELETE endpoints that don't return data
 */
export function createNoContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Creates a 201 Created response with Location header
 * Used for POST endpoints that create new resources
 */
export function createCreatedResponse<T>(data: T, resourceId: string): Response {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 
      'Content-Type': 'application/json',
      'Location': `/api/locations/${resourceId}`
    },
  });
}
