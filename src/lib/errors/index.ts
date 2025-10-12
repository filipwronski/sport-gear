/**
 * Custom Error Classes for API endpoints
 * Provides specific error types for better error handling and categorization
 * Extended with HTTP status codes and error codes for consistent API responses
 */

// Base ApiError class with HTTP status codes
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Legacy ValidationError (keeping for backward compatibility)
export class ValidationError extends Error {
  public details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

// New ValidationError with HTTP status code
export class ValidationErrorWithStatus extends ApiError {
  constructor(details: Record<string, string[]>) {
    super(422, "VALIDATION_ERROR", "Validation failed", details);
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Extended API Error classes
export class ForbiddenError extends ApiError {
  constructor(message = "Access forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, "BAD_REQUEST", message);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = "Internal server error") {
    super(500, "INTERNAL_SERVER_ERROR", message);
  }
}

// Enhanced error classes with status codes
export class NotFoundErrorWithStatus extends ApiError {
  constructor(message = "Resource not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class UnauthorizedErrorWithStatus extends ApiError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ConflictErrorWithStatus extends ApiError {
  constructor(message = "Resource already exists") {
    super(409, "CONFLICT", message);
  }
}

// Weather API specific error classes
export class RateLimitError extends ApiError {
  constructor(retryAfter: number, message = "Too many requests") {
    super(429, "RATE_LIMITED", message, {
      retry_after: [retryAfter.toString()],
    });
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(service: string, message = "Service temporarily unavailable") {
    super(503, "SERVICE_UNAVAILABLE", message, { service: [service] });
  }
}

// ============================================================================
// Service Management Specific Errors
// ============================================================================

export class BikeNotFoundError extends ApiError {
  constructor(message = "Bike not found or access denied") {
    super(404, "BIKE_NOT_FOUND", message);
  }
}

export class ServiceNotFoundError extends ApiError {
  constructor(message = "Service record not found or access denied") {
    super(404, "SERVICE_NOT_FOUND", message);
  }
}

export class InvalidUuidError extends ApiError {
  constructor(field: string, message = "Invalid UUID format") {
    super(400, "INVALID_UUID", `${message}: ${field}`);
  }
}

export class InvalidEnumValueError extends ApiError {
  constructor(
    field: string,
    validValues: string[],
    message = "Invalid enum value",
  ) {
    super(
      400,
      "INVALID_ENUM_VALUE",
      `${message}: ${field}. Valid values: ${validValues.join(", ")}`,
    );
  }
}

export class MileageLowerThanPreviousError extends ApiError {
  constructor(currentMileage: number, previousMileage: number) {
    super(
      422,
      "MILEAGE_LOWER_THAN_PREVIOUS",
      `Service mileage (${currentMileage}) must be >= previous service mileage (${previousMileage})`,
    );
  }
}

export class DateInFutureError extends ApiError {
  constructor(message = "Service date cannot be in the future") {
    super(422, "DATE_IN_FUTURE", message);
  }
}

export class InvalidDateRangeError extends ApiError {
  constructor(message = "from_date must be before or equal to to_date") {
    super(422, "INVALID_DATE_RANGE", message);
  }
}

export class CannotDeleteServiceError extends ApiError {
  constructor(
    message = "Service is referenced by active reminder and cannot be deleted",
  ) {
    super(422, "CANNOT_DELETE", message);
  }
}
