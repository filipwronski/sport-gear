import type { APIContext } from "astro";
import { ZodError } from "zod";
import { ApiError } from "./index";

/**
 * Centralized error handler for all Profile API endpoints
 * Transforms various error types into consistent HTTP responses
 */
export function handleApiError(error: unknown): Response {
  console.error("API Error:", error);

  // Handle known ApiError instances
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details && { details: error.details }),
        },
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.reduce(
      (acc, err) => {
        const path = err.path.join(".");
        if (!acc[path]) acc[path] = [];
        acc[path].push(err.message);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details,
        },
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle PostgrestError (Supabase database errors)
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as {
      code: string;
      message: string;
      details?: string;
    };

    // Map common PostgreSQL errors
    if (pgError.code === "23505") {
      // Unique constraint violation
      return new Response(
        JSON.stringify({
          error: {
            code: "CONFLICT",
            message: "Resource already exists",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }

    if (pgError.code === "PGRST116") {
      // No rows returned (PostgREST specific)
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
          },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // Handle unknown errors
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
