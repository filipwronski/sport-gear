import { ApiError as CustomApiError } from "./errors/index.js";

/**
 * Centralized error handling for API endpoints
 * Provides consistent error responses and proper HTTP status codes
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Handles different types of errors and returns appropriate HTTP responses
 *
 * @param error - Error to handle (ApiError, PostgreSQL error, or unknown)
 * @returns Response with proper status code and JSON error body
 */
export function handleError(error: unknown): Response {
  console.error("[API Error]", error);

  // Custom API errors from errors/index.ts
  if (error instanceof CustomApiError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Legacy API errors (keeping for backward compatibility)
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        code: error.code,
        details: error.details,
      }),
      {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.errors,
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Business rule violations (thrown as regular Error)
  if (error instanceof Error) {
    // Check for mileage decrease error (business rule)
    if (error.message.includes("cannot be less than current mileage")) {
      return new Response(
        JSON.stringify({
          error: "Invalid mileage",
          message: error.message,
          code: "MILEAGE_DECREASE",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check for database constraint violations
    if (error.message.includes("duplicate key value")) {
      return new Response(
        JSON.stringify({
          error: "Duplicate entry",
          message: "A bike with this name already exists",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check for foreign key violations
    if (error.message.includes("violates foreign key constraint")) {
      return new Response(
        JSON.stringify({
          error: "Invalid reference",
          message: "Referenced resource does not exist",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // PostgreSQL errors (Supabase format)
  if (error && typeof error === "object" && "code" in error) {
    const pgError = error as { code: string; message: string };

    switch (pgError.code) {
      case "23505": // unique_violation
        return new Response(
          JSON.stringify({
            error: "Duplicate entry",
            message: "A bike with this name already exists",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );

      case "23503": // foreign_key_violation
        return new Response(
          JSON.stringify({
            error: "Invalid reference",
            message: "Referenced resource does not exist",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );

      case "23514": // check_violation
        return new Response(
          JSON.stringify({
            error: "Constraint violation",
            message: "Data violates database constraints",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );

      default:
        console.error("[PostgreSQL Error]", pgError);
        break;
    }
  }

  // Unknown errors
  return new Response(
    JSON.stringify({
      error: "Internal server error",
      message: "An unexpected error occurred. Please try again later.",
    }),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Creates a validation error response from Zod validation results
 *
 * @param zodError - Zod validation error with flattened field errors
 * @returns 422 Response with validation details
 */
export function createValidationErrorResponse(zodError: any): Response {
  return new Response(
    JSON.stringify({
      error: "Validation failed",
      details: zodError.flatten().fieldErrors,
    }),
    {
      status: 422,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Creates a not found error response
 *
 * @param message - Custom not found message
 * @returns 404 Response
 */
export function createNotFoundResponse(
  message = "Resource not found",
): Response {
  return new Response(
    JSON.stringify({
      error: "Not found",
      message,
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}

/**
 * Creates a standardized error response
 */
interface ErrorResponseOptions {
  code: string;
  message: string;
  statusCode: number;
  details?: { field?: string; service?: string; message: string }[];
  retryAfter?: number;
  debug?: string;
}

export function createErrorResponse(options: ErrorResponseOptions): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.retryAfter) {
    headers["Retry-After"] = options.retryAfter.toString();
  }

  const errorBody: any = {
    error: {
      code: options.code,
      message: options.message,
    },
  };

  if (options.details) {
    errorBody.error.details = options.details;
  }

  if (options.debug) {
    errorBody.error.debug = options.debug;
  }

  return new Response(JSON.stringify(errorBody), {
    status: options.statusCode,
    headers,
  });
}
