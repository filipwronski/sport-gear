import { describe, it, expect } from "vitest";
import {
  ApiError,
  handleError,
  createValidationErrorResponse,
  createNotFoundResponse,
} from "../../lib/error-handler";

describe("Error Handler", () => {
  describe("ApiError", () => {
    it("should create ApiError with all properties", () => {
      const error = new ApiError(400, "Test error", "TEST_CODE", {
        field: "error",
      });

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_CODE");
      expect(error.details).toEqual({ field: "error" });
      expect(error.name).toBe("ApiError");
    });

    it("should create ApiError with minimal properties", () => {
      const error = new ApiError(500, "Server error");

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe("Server error");
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });
  });

  describe("handleError", () => {
    it("should handle ApiError correctly", async () => {
      const apiError = new ApiError(400, "Test error", "TEST_CODE", {
        field: "error",
      });
      const response = handleError(apiError);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body).toEqual({
        error: "Test error",
        code: "TEST_CODE",
        details: { field: "error" },
      });
    });

    it("should handle mileage decrease error", async () => {
      const error = new Error(
        "New mileage (5000) cannot be less than current mileage (5420)",
      );
      const response = handleError(error);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Invalid mileage");
      expect(body.code).toBe("MILEAGE_DECREASE");
      expect(body.message).toContain("cannot be less than current mileage");
    });

    it("should handle duplicate key error", async () => {
      const error = new Error("duplicate key value violates unique constraint");
      const response = handleError(error);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Duplicate entry");
      expect(body.message).toContain("already exists");
    });

    it("should handle foreign key violation error", async () => {
      const error = new Error("violates foreign key constraint");
      const response = handleError(error);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Invalid reference");
      expect(body.message).toContain("does not exist");
    });

    it("should handle PostgreSQL unique violation (23505)", async () => {
      const pgError = { code: "23505", message: "duplicate key value" };
      const response = handleError(pgError);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Duplicate entry");
    });

    it("should handle PostgreSQL foreign key violation (23503)", async () => {
      const pgError = { code: "23503", message: "foreign key constraint" };
      const response = handleError(pgError);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Invalid reference");
    });

    it("should handle PostgreSQL check violation (23514)", async () => {
      const pgError = { code: "23514", message: "check constraint" };
      const response = handleError(pgError);

      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toBe("Constraint violation");
    });

    it("should handle unknown errors", async () => {
      const unknownError = { some: "unknown error" };
      const response = handleError(unknownError);

      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.error).toBe("Internal server error");
      expect(body.message).toContain("unexpected error occurred");
    });
  });

  describe("createValidationErrorResponse", () => {
    it("should create validation error response", async () => {
      const zodError = {
        flatten: () => ({
          fieldErrors: {
            name: ["Name is required"],
            type: ["Invalid type"],
          },
        }),
      };

      const response = createValidationErrorResponse(zodError);

      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toEqual({
        name: ["Name is required"],
        type: ["Invalid type"],
      });
    });
  });

  describe("createNotFoundResponse", () => {
    it("should create not found response with default message", async () => {
      const response = createNotFoundResponse();

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe("Not found");
      expect(body.message).toBe("Resource not found");
    });

    it("should create not found response with custom message", async () => {
      const customMessage = "Bike not found";
      const response = createNotFoundResponse(customMessage);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error).toBe("Not found");
      expect(body.message).toBe(customMessage);
    });
  });
});
