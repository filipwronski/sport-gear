import { describe, it, expect } from "vitest";
import {
  CreateBikeSchema,
  UpdateBikeSchema,
  UpdateMileageSchema,
  GetBikesQuerySchema,
  BikeIdSchema,
} from "../../lib/validation/bike.schemas";

describe("Bike Validation Schemas", () => {
  describe("CreateBikeSchema", () => {
    it("should validate valid bike data", () => {
      const validData = {
        name: "Trek Domane",
        type: "szosowy" as const,
        purchase_date: "2023-05-15T12:00:00Z",
        current_mileage: 1000,
        notes: "Great bike",
      };

      const result = CreateBikeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate minimal required data", () => {
      const minimalData = {
        name: "Trek",
        type: "mtb" as const,
      };

      const result = CreateBikeSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalidData = {
        type: "szosowy" as const,
        // missing name
      };

      const result = CreateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain("name");
    });

    it("should reject invalid bike type", () => {
      const invalidData = {
        name: "Test Bike",
        type: "invalid-type",
      };

      const result = CreateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        "szosowy, gravelowy, mtb, czasowy",
      );
    });

    it("should reject name longer than 50 characters", () => {
      const invalidData = {
        name: "A".repeat(51),
        type: "szosowy" as const,
      };

      const result = CreateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("max 50 characters");
    });

    it("should reject negative mileage", () => {
      const invalidData = {
        name: "Test Bike",
        type: "szosowy" as const,
        current_mileage: -100,
      };

      const result = CreateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("non-negative");
    });

    it("should reject invalid datetime format", () => {
      const invalidData = {
        name: "Test Bike",
        type: "szosowy" as const,
        purchase_date: "2023-05-15", // Not ISO datetime
      };

      const result = CreateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("valid ISO datetime");
    });
  });

  describe("UpdateBikeSchema", () => {
    it("should validate partial update data", () => {
      const validData = {
        name: "Updated Name",
        current_mileage: 2000,
      };

      const result = UpdateBikeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate status update", () => {
      const validData = {
        status: "archived" as const,
      };

      const result = UpdateBikeSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty update object", () => {
      const invalidData = {};

      const result = UpdateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        "At least one field must be provided",
      );
    });

    it("should reject invalid status", () => {
      const invalidData = {
        status: "invalid-status",
      };

      const result = UpdateBikeSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain(
        "active, archived, sold",
      );
    });
  });

  describe("UpdateMileageSchema", () => {
    it("should validate valid mileage", () => {
      const validData = {
        current_mileage: 5000,
      };

      const result = UpdateMileageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject negative mileage", () => {
      const invalidData = {
        current_mileage: -100,
      };

      const result = UpdateMileageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("non-negative");
    });

    it("should reject non-integer mileage", () => {
      const invalidData = {
        current_mileage: 100.5,
      };

      const result = UpdateMileageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("integer");
    });

    it("should reject missing mileage", () => {
      const invalidData = {};

      const result = UpdateMileageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("GetBikesQuerySchema", () => {
    it("should validate empty query params", () => {
      const validData = {};

      const result = GetBikesQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate status filter", () => {
      const validData = {
        status: "active" as const,
      };

      const result = GetBikesQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate type filter", () => {
      const validData = {
        type: "gravelowy" as const,
      };

      const result = GetBikesQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate combined filters", () => {
      const validData = {
        status: "active" as const,
        type: "mtb" as const,
      };

      const result = GetBikesQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const invalidData = {
        status: "invalid-status",
      };

      const result = GetBikesQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
      const invalidData = {
        type: "invalid-type",
      };

      const result = GetBikesQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("BikeIdSchema", () => {
    it("should validate valid UUID", () => {
      const validUuid = "123e4567-e89b-12d3-a456-426614174000";

      const result = BikeIdSchema.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID format", () => {
      const invalidUuid = "not-a-uuid";

      const result = BikeIdSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain("valid UUID");
    });

    it("should reject empty string", () => {
      const invalidUuid = "";

      const result = BikeIdSchema.safeParse(invalidUuid);
      expect(result.success).toBe(false);
    });
  });
});
