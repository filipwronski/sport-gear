import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "../../../../../db/supabase.client";
import { z } from "zod";
import { ServiceRecordService } from "../../../../../services/service-record-working.service";
import {
  getServicesParamsSchema,
  createServiceSchema,
  bikeIdParamSchema,
} from "../../../../../lib/validation/service.schemas";

/**
 * Helper function to extract JWT token from request
 */
function extractToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  // Check for session cookie
  const cookies = request.headers.get("cookie");
  if (cookies) {
    const cookieMatch = cookies.match(/sb-access-token=([^;]+)/);
    if (cookieMatch) {
      return cookieMatch[1];
    }
  }

  return null;
}

/**
 * GET /api/bikes/{bikeId}/services
 * Fetch service records for a specific bike with filtering, sorting and pagination
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication (handled by middleware)
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate bikeId parameter
    const bikeIdValidation = bikeIdParamSchema.safeParse({
      bikeId: params.bikeId,
    });
    if (!bikeIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_UUID",
            message: "Invalid bike ID format",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { bikeId } = bikeIdValidation.data;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      service_type: url.searchParams.get("service_type") || undefined,
      service_location: url.searchParams.get("service_location") || undefined,
      limit: url.searchParams.get("limit") || undefined,
      offset: url.searchParams.get("offset") || undefined,
      from_date: url.searchParams.get("from_date") || undefined,
      to_date: url.searchParams.get("to_date") || undefined,
      sort: url.searchParams.get("sort") || undefined,
    };

    // Validate query parameters with Zod
    const validatedParams = getServicesParamsSchema.parse(queryParams);

    // Create authenticated Supabase client
    const token = extractToken(request);
    let authenticatedClient = supabaseClient;

    if (token) {
      authenticatedClient = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
    }

    // Execute business logic
    const serviceRecordService = new ServiceRecordService(authenticatedClient);
    const result = await serviceRecordService.getServicesByBikeId(
      locals.userId,
      bikeId,
      validatedParams,
    );

    // Return successful response with cache headers
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300", // 5 minutes cache
      },
    });
  } catch (error) {
    console.error("Service endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * POST /api/bikes/{bikeId}/services
 * Create a new service record with optional reminder
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // Check authentication (handled by middleware)
    if (!locals.userId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate bikeId parameter
    const bikeIdValidation = bikeIdParamSchema.safeParse({
      bikeId: params.bikeId,
    });
    if (!bikeIdValidation.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_UUID",
            message: "Invalid bike ID format",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { bikeId } = bikeIdValidation.data;

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Request body must be valid JSON",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate request body with Zod
    const validationResult = createServiceSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: validationResult.error.errors,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const validatedBody = validationResult.data;

    // Create authenticated Supabase client
    const token = extractToken(request);
    let authenticatedClient = supabaseClient;

    if (token) {
      authenticatedClient = createClient(
        import.meta.env.PUBLIC_SUPABASE_URL,
        import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      );
    }

    // Execute business logic
    const serviceRecordService = new ServiceRecordService(authenticatedClient);
    const result = await serviceRecordService.createService(
      locals.userId,
      bikeId,
      validatedBody,
    );

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Service endpoint error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
