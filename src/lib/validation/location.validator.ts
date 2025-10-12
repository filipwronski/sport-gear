import type { CreateLocationCommand, UpdateLocationCommand } from "../../types";
import { ValidationError } from "../errors";
import {
  roundCoordinates,
  validateLatitudeRange,
  validateLongitudeRange,
} from "../utils/postgis.utils";

interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * LocationValidator - Validates input data for Location Management API
 *
 * Responsibilities:
 * - Validates required and optional fields
 * - Sanitizes input data (trim, uppercase)
 * - Enforces business rules and constraints
 * - Rounds coordinates for privacy
 */
export class LocationValidator {
  private static COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
  private static UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /**
   * Validates CreateLocationCommand for POST /api/locations
   * All required fields must be present and valid
   */
  static validateCreateCommand(command: unknown): CreateLocationCommand {
    const errors: ValidationDetail[] = [];
    const cmd = command as any;

    // Required field: latitude
    if (typeof cmd.latitude !== "number") {
      errors.push({
        field: "latitude",
        message: "Latitude is required and must be a number",
      });
    } else if (!validateLatitudeRange(cmd.latitude)) {
      errors.push({
        field: "latitude",
        message: "Latitude must be between -90 and 90",
      });
    }

    // Required field: longitude
    if (typeof cmd.longitude !== "number") {
      errors.push({
        field: "longitude",
        message: "Longitude is required and must be a number",
      });
    } else if (!validateLongitudeRange(cmd.longitude)) {
      errors.push({
        field: "longitude",
        message: "Longitude must be between -180 and 180",
      });
    }

    // Required field: city
    if (!cmd.city || typeof cmd.city !== "string") {
      errors.push({
        field: "city",
        message: "City is required and must be a string",
      });
    } else {
      const trimmedCity = cmd.city.trim();
      if (trimmedCity.length < 1 || trimmedCity.length > 100) {
        errors.push({
          field: "city",
          message: "City must be 1-100 characters after trimming",
        });
      }
    }

    // Required field: country_code
    if (!cmd.country_code || typeof cmd.country_code !== "string") {
      errors.push({
        field: "country_code",
        message: "Country code is required",
      });
    } else {
      const upperCode = cmd.country_code.toUpperCase();
      if (!this.COUNTRY_CODE_REGEX.test(upperCode)) {
        errors.push({
          field: "country_code",
          message:
            "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)",
        });
      }
    }

    // Optional field: is_default
    if (cmd.is_default !== undefined && typeof cmd.is_default !== "boolean") {
      errors.push({
        field: "is_default",
        message: "is_default must be a boolean",
      });
    }

    // Optional field: label
    if (cmd.label !== undefined) {
      if (typeof cmd.label !== "string") {
        errors.push({ field: "label", message: "Label must be a string" });
      } else {
        const trimmedLabel = cmd.label.trim();
        if (trimmedLabel.length < 1 || trimmedLabel.length > 50) {
          errors.push({
            field: "label",
            message: "Label must be 1-50 characters after trimming",
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Invalid input data", errors);
    }

    // Return sanitized and rounded command
    const rounded = roundCoordinates(cmd.latitude, cmd.longitude);
    return {
      latitude: rounded.latitude,
      longitude: rounded.longitude,
      city: cmd.city.trim(),
      country_code: cmd.country_code.toUpperCase(),
      ...(cmd.is_default !== undefined && { is_default: cmd.is_default }),
      ...(cmd.label && { label: cmd.label.trim() }),
    };
  }

  /**
   * Validates UpdateLocationCommand for PUT /api/locations/{id}
   * All fields are optional for partial updates
   */
  static validateUpdateCommand(command: unknown): UpdateLocationCommand {
    const errors: ValidationDetail[] = [];
    const cmd = command as any;

    // Optional field: latitude
    if (cmd.latitude !== undefined) {
      if (typeof cmd.latitude !== "number") {
        errors.push({
          field: "latitude",
          message: "Latitude must be a number",
        });
      } else if (!validateLatitudeRange(cmd.latitude)) {
        errors.push({
          field: "latitude",
          message: "Latitude must be between -90 and 90",
        });
      }
    }

    // Optional field: longitude
    if (cmd.longitude !== undefined) {
      if (typeof cmd.longitude !== "number") {
        errors.push({
          field: "longitude",
          message: "Longitude must be a number",
        });
      } else if (!validateLongitudeRange(cmd.longitude)) {
        errors.push({
          field: "longitude",
          message: "Longitude must be between -180 and 180",
        });
      }
    }

    // Business rule: Both latitude and longitude must be provided together
    const hasLatitude = cmd.latitude !== undefined;
    const hasLongitude = cmd.longitude !== undefined;
    if (hasLatitude !== hasLongitude) {
      errors.push({
        field: "coordinates",
        message:
          "Both latitude and longitude must be provided together for coordinate updates",
      });
    }

    // Optional field: city
    if (cmd.city !== undefined) {
      if (typeof cmd.city !== "string") {
        errors.push({ field: "city", message: "City must be a string" });
      } else {
        const trimmedCity = cmd.city.trim();
        if (trimmedCity.length < 1 || trimmedCity.length > 100) {
          errors.push({
            field: "city",
            message: "City must be 1-100 characters after trimming",
          });
        }
      }
    }

    // Optional field: country_code
    if (cmd.country_code !== undefined) {
      if (typeof cmd.country_code !== "string") {
        errors.push({
          field: "country_code",
          message: "Country code must be a string",
        });
      } else {
        const upperCode = cmd.country_code.toUpperCase();
        if (!this.COUNTRY_CODE_REGEX.test(upperCode)) {
          errors.push({
            field: "country_code",
            message:
              "Country code must be 2 uppercase letters (ISO 3166-1 alpha-2)",
          });
        }
      }
    }

    // Optional field: is_default
    if (cmd.is_default !== undefined && typeof cmd.is_default !== "boolean") {
      errors.push({
        field: "is_default",
        message: "is_default must be a boolean",
      });
    }

    // Optional field: label
    if (cmd.label !== undefined) {
      if (typeof cmd.label !== "string") {
        errors.push({ field: "label", message: "Label must be a string" });
      } else {
        const trimmedLabel = cmd.label.trim();
        if (trimmedLabel.length < 1 || trimmedLabel.length > 50) {
          errors.push({
            field: "label",
            message: "Label must be 1-50 characters after trimming",
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError("Invalid input data", errors);
    }

    // Return sanitized command with rounded coordinates if provided
    const result: UpdateLocationCommand = {};

    if (hasLatitude && hasLongitude) {
      const rounded = roundCoordinates(cmd.latitude, cmd.longitude);
      result.latitude = rounded.latitude;
      result.longitude = rounded.longitude;
    }

    if (cmd.city !== undefined) result.city = cmd.city.trim();
    if (cmd.country_code !== undefined)
      result.country_code = cmd.country_code.toUpperCase();
    if (cmd.is_default !== undefined) result.is_default = cmd.is_default;
    if (cmd.label !== undefined) result.label = cmd.label.trim();

    return result;
  }

  /**
   * Validates UUID format for path parameters
   * Used in PUT and DELETE endpoints
   */
  static validateUUID(id: string): boolean {
    return this.UUID_REGEX.test(id);
  }

  /**
   * Validates query parameters for GET /api/locations
   */
  static validateQueryParams(searchParams: URLSearchParams): {
    defaultOnly?: boolean;
  } {
    const result: { defaultOnly?: boolean } = {};

    const defaultOnlyParam = searchParams.get("default_only");
    if (defaultOnlyParam !== null) {
      if (defaultOnlyParam === "true") {
        result.defaultOnly = true;
      } else if (defaultOnlyParam === "false") {
        result.defaultOnly = false;
      } else {
        throw new ValidationError("Invalid query parameter", [
          {
            field: "default_only",
            message: 'default_only must be "true" or "false"',
          },
        ]);
      }
    }

    return result;
  }
}
