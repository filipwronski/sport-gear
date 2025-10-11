import { describe, it, expect } from "vitest";
import {
  validateGetCommunityOutfitsParams,
  CommunityValidationError,
  isValidUUID,
} from "../../lib/validation/community.schemas";
import type { GetCommunityOutfitsParams } from "../../types";

describe("Community Validation Schemas", () => {
  describe("validateGetCommunityOutfitsParams", () => {
    const validLocationId = "550e8400-e29b-41d4-a716-446655440000";

    describe("successful validation", () => {
      it("should validate minimal required parameters", () => {
        const rawParams = {
          location_id: validLocationId,
        };

        const result = validateGetCommunityOutfitsParams(rawParams);

        expect(result).toEqual({
          location_id: validLocationId,
          radius_km: 50, // default
          temperature: undefined,
          temperature_range: 3, // default
          activity_type: undefined,
          min_rating: undefined,
          reputation_filter: undefined,
          time_range: 24, // default
          sort: "reputation", // default
          limit: 10, // default
          offset: 0, // default
        });
      });

      it("should validate all parameters with valid values", () => {
        const rawParams = {
          location_id: validLocationId,
          radius_km: "75",
          temperature: "12.5",
          temperature_range: "5",
          activity_type: "tempo",
          min_rating: "4",
          reputation_filter: "ekspert",
          time_range: "48",
          sort: "distance",
          limit: "25",
          offset: "50",
        };

        const result = validateGetCommunityOutfitsParams(rawParams);

        expect(result).toEqual({
          location_id: validLocationId,
          radius_km: 75,
          temperature: 12.5,
          temperature_range: 5,
          activity_type: "tempo",
          min_rating: 4,
          reputation_filter: "ekspert",
          time_range: 48,
          sort: "distance",
          limit: 25,
          offset: 50,
        });
      });

      it("should handle boundary values correctly", () => {
        const rawParams = {
          location_id: validLocationId,
          radius_km: "1", // min
          temperature: "-50", // min
          temperature_range: "0", // min
          min_rating: "1", // min
          time_range: "1", // min
          limit: "1", // min
          offset: "0", // min
        };

        const result = validateGetCommunityOutfitsParams(rawParams);

        expect(result.radius_km).toBe(1);
        expect(result.temperature).toBe(-50);
        expect(result.temperature_range).toBe(0);
        expect(result.min_rating).toBe(1);
        expect(result.time_range).toBe(1);
        expect(result.limit).toBe(1);
        expect(result.offset).toBe(0);
      });

      it("should handle maximum boundary values correctly", () => {
        const rawParams = {
          location_id: validLocationId,
          radius_km: "100", // max
          temperature: "50", // max
          temperature_range: "10", // max
          min_rating: "5", // max
          time_range: "168", // max (7 days)
          limit: "50", // max
        };

        const result = validateGetCommunityOutfitsParams(rawParams);

        expect(result.radius_km).toBe(100);
        expect(result.temperature).toBe(50);
        expect(result.temperature_range).toBe(10);
        expect(result.min_rating).toBe(5);
        expect(result.time_range).toBe(168);
        expect(result.limit).toBe(50);
      });
    });

    describe("validation errors", () => {
      it("should throw error for missing location_id", () => {
        const rawParams = {};

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details).toHaveProperty(
            "location_id"
          );
        }
      });

      it("should throw error for invalid UUID format", () => {
        const rawParams = {
          location_id: "invalid-uuid",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details.location_id).toContain(
            "valid UUID"
          );
        }
      });

      it("should throw error for radius_km out of range", () => {
        const testCases = [
          { radius_km: "0", expectedMessage: "between 1 and 100" },
          { radius_km: "101", expectedMessage: "between 1 and 100" },
          { radius_km: "abc", expectedMessage: "Expected number, received nan" },
        ];

        testCases.forEach(({ radius_km, expectedMessage }) => {
          const rawParams = {
            location_id: validLocationId,
            radius_km,
          };

          expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
            CommunityValidationError
          );

          try {
            validateGetCommunityOutfitsParams(rawParams);
          } catch (error) {
            expect(error).toBeInstanceOf(CommunityValidationError);
            expect((error as CommunityValidationError).details.radius_km).toContain(
              expectedMessage
            );
          }
        });
      });

      it("should throw error for temperature out of range", () => {
        const testCases = [
          { temperature: "-51", expectedMessage: "between -50" },
          { temperature: "51", expectedMessage: "between -50" },
          { temperature: "not-a-number", expectedMessage: "number" },
        ];

        testCases.forEach(({ temperature, expectedMessage }) => {
          const rawParams = {
            location_id: validLocationId,
            temperature,
          };

          expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
            CommunityValidationError
          );

          try {
            validateGetCommunityOutfitsParams(rawParams);
          } catch (error) {
            expect(error).toBeInstanceOf(CommunityValidationError);
            expect((error as CommunityValidationError).details.temperature).toContain(
              expectedMessage
            );
          }
        });
      });

      it("should throw error for invalid activity_type", () => {
        const rawParams = {
          location_id: validLocationId,
          activity_type: "invalid-activity",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details.activity_type).toContain(
            "recovery, spokojna, tempo, interwaly"
          );
        }
      });

      it("should throw error for invalid reputation_filter", () => {
        const rawParams = {
          location_id: validLocationId,
          reputation_filter: "invalid-reputation",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details.reputation_filter).toContain(
            "nowicjusz, regularny, ekspert, mistrz"
          );
        }
      });

      it("should throw error for invalid sort parameter", () => {
        const rawParams = {
          location_id: validLocationId,
          sort: "invalid-sort",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details.sort).toContain(
            "reputation, distance, created_at, rating"
          );
        }
      });

      it("should throw error for limit out of range", () => {
        const testCases = [
          { limit: "0", expectedMessage: "between 1 and 50" },
          { limit: "51", expectedMessage: "between 1 and 50" },
        ];

        testCases.forEach(({ limit, expectedMessage }) => {
          const rawParams = {
            location_id: validLocationId,
            limit,
          };

          expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
            CommunityValidationError
          );

          try {
            validateGetCommunityOutfitsParams(rawParams);
          } catch (error) {
            expect(error).toBeInstanceOf(CommunityValidationError);
            expect((error as CommunityValidationError).details.limit).toContain(
              expectedMessage
            );
          }
        });
      });

      it("should throw error for negative offset", () => {
        const rawParams = {
          location_id: validLocationId,
          offset: "-1",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          expect((error as CommunityValidationError).details.offset).toContain(
            "non-negative"
          );
        }
      });

      it("should collect multiple validation errors", () => {
        const rawParams = {
          location_id: "invalid-uuid",
          radius_km: "200",
          temperature: "100",
          min_rating: "6",
          limit: "100",
        };

        expect(() => validateGetCommunityOutfitsParams(rawParams)).toThrow(
          CommunityValidationError
        );

        try {
          validateGetCommunityOutfitsParams(rawParams);
        } catch (error) {
          expect(error).toBeInstanceOf(CommunityValidationError);
          const details = (error as CommunityValidationError).details;
          
          expect(details).toHaveProperty("location_id");
          expect(details).toHaveProperty("radius_km");
          expect(details).toHaveProperty("temperature");
          expect(details).toHaveProperty("min_rating");
          expect(details).toHaveProperty("limit");
        }
      });
    });
  });

  describe("isValidUUID", () => {
    it("should return true for valid UUIDs", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "00000000-0000-0000-0000-000000000000",
      ];

      validUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it("should return false for invalid UUIDs", () => {
      const invalidUUIDs = [
        "invalid-uuid",
        "550e8400-e29b-41d4-a716", // too short
        "550e8400-e29b-41d4-a716-446655440000-extra", // too long
        "550e8400_e29b_41d4_a716_446655440000", // wrong separators
        "gggg8400-e29b-41d4-a716-446655440000", // invalid characters
        "", // empty string
        "550e8400-e29b-41d4-a716-44665544000", // missing character
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(isValidUUID(uuid)).toBe(false);
      });
    });
  });
});
