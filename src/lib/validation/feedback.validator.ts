import type {
  GetFeedbacksParams,
  CreateFeedbackCommand,
  OutfitDTO,
  ZoneRatings,
  ActivityTypeEnum,
} from "../../types";
import {
  VALID_HEAD_OPTIONS,
  VALID_TORSO_BASE,
  VALID_TORSO_MID,
  VALID_TORSO_OUTER,
  VALID_ARMS,
  VALID_HANDS,
  VALID_LEGS,
  VALID_SOCKS,
  VALID_COVERS,
  VALID_NECK,
} from "../../constants/outfit.constants";
import { ValidationError } from "../errors";

/**
 * Feedback validation utilities
 * Provides validation for feedback query parameters and command objects
 */
export class FeedbackValidator {
  /**
   * Validates and sanitizes GET /api/feedbacks query parameters
   */
  static validateGetFeedbacksParams(params: any): GetFeedbacksParams {
    const validated: GetFeedbacksParams = {};

    // Validate limit (1-30, default 30)
    if (
      params.limit !== undefined &&
      params.limit !== null &&
      params.limit !== ""
    ) {
      const limit = parseInt(params.limit, 10);
      if (isNaN(limit) || limit < 1 || limit > 30) {
        throw new ValidationError("Limit must be between 1 and 30");
      }
      validated.limit = limit;
    }

    // Validate offset (>= 0, default 0)
    if (
      params.offset !== undefined &&
      params.offset !== null &&
      params.offset !== ""
    ) {
      const offset = parseInt(params.offset, 10);
      if (isNaN(offset) || offset < 0) {
        throw new ValidationError("Offset must be >= 0");
      }
      validated.offset = offset;
    }

    // Validate activity_type
    if (
      params.activity_type !== undefined &&
      params.activity_type !== null &&
      params.activity_type !== ""
    ) {
      const validActivityTypes: ActivityTypeEnum[] = [
        "recovery",
        "spokojna",
        "tempo",
        "interwaly",
      ];
      if (!validActivityTypes.includes(params.activity_type)) {
        throw new ValidationError(
          `Activity type must be one of: ${validActivityTypes.join(", ")}`,
        );
      }
      validated.activity_type = params.activity_type;
    }

    // Validate rating (1-5)
    if (
      params.rating !== undefined &&
      params.rating !== null &&
      params.rating !== ""
    ) {
      const rating = parseInt(params.rating, 10);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        throw new ValidationError("Rating must be between 1 and 5");
      }
      validated.rating = rating;
    }

    // Validate sort
    if (
      params.sort !== undefined &&
      params.sort !== null &&
      params.sort !== ""
    ) {
      const validSorts = [
        "created_at_asc",
        "created_at_desc",
        "rating_asc",
        "rating_desc",
      ];
      if (!validSorts.includes(params.sort)) {
        throw new ValidationError(
          `Sort must be one of: ${validSorts.join(", ")}`,
        );
      }
      validated.sort = params.sort;
    }

    return validated;
  }

  /**
   * Validates POST /api/feedbacks command object
   */
  static validateCreateFeedbackCommand(command: any): CreateFeedbackCommand {
    const errors: Record<string, string> = {};

    // Validate location_id (optional)
    if (
      command.location_id !== undefined &&
      command.location_id !== null &&
      command.location_id !== ""
    ) {
      if (typeof command.location_id !== "string") {
        errors.location_id = "Location ID must be a valid UUID string";
      }
    }

    // Validate temperature (-50 to 50)
    if (
      typeof command.temperature !== "number" ||
      command.temperature < -50 ||
      command.temperature > 50
    ) {
      errors.temperature = "Temperature must be a number between -50 and 50";
    }

    // Validate feels_like (-50 to 50)
    if (
      typeof command.feels_like !== "number" ||
      command.feels_like < -50 ||
      command.feels_like > 50
    ) {
      errors.feels_like =
        "Feels like temperature must be a number between -50 and 50";
    }

    // Validate wind_speed (>= 0)
    if (typeof command.wind_speed !== "number" || command.wind_speed < 0) {
      errors.wind_speed = "Wind speed must be a number >= 0";
    }

    // Validate humidity (0-100)
    if (
      typeof command.humidity !== "number" ||
      command.humidity < 0 ||
      command.humidity > 100
    ) {
      errors.humidity = "Humidity must be a number between 0 and 100";
    }

    // Validate rain_mm (optional, >= 0)
    if (
      command.rain_mm !== undefined &&
      (typeof command.rain_mm !== "number" || command.rain_mm < 0)
    ) {
      errors.rain_mm = "Rain amount must be a number >= 0";
    }

    // Validate activity_type
    const validActivityTypes: ActivityTypeEnum[] = [
      "recovery",
      "spokojna",
      "tempo",
      "interwaly",
    ];
    if (!validActivityTypes.includes(command.activity_type)) {
      errors.activity_type = `Activity type must be one of: ${validActivityTypes.join(", ")}`;
    }

    // Validate duration_minutes (> 0)
    if (
      typeof command.duration_minutes !== "number" ||
      command.duration_minutes <= 0
    ) {
      errors.duration_minutes = "Duration must be a number > 0";
    }

    // Validate actual_outfit structure
    if (!this.validateOutfitStructure(command.actual_outfit)) {
      errors.actual_outfit = "Invalid outfit structure";
    }

    // Validate overall_rating (1-5)
    if (
      typeof command.overall_rating !== "number" ||
      command.overall_rating < 1 ||
      command.overall_rating > 5
    ) {
      errors.overall_rating = "Overall rating must be a number between 1 and 5";
    }

    // Validate zone_ratings (optional, values 1-5)
    if (
      command.zone_ratings !== undefined &&
      !this.validateZoneRatings(command.zone_ratings)
    ) {
      errors.zone_ratings =
        "Invalid zone ratings - all values must be between 1 and 5";
    }

    // Validate notes (optional, max 500 chars)
    if (command.notes !== undefined) {
      if (typeof command.notes !== "string") {
        errors.notes = "Notes must be a string";
      } else if (command.notes.length > 500) {
        errors.notes = "Notes must be max 500 characters";
      }
    }

    // Validate shared_with_community (optional boolean)
    if (
      command.shared_with_community !== undefined &&
      typeof command.shared_with_community !== "boolean"
    ) {
      errors.shared_with_community = "Shared with community must be a boolean";
    }

    // Throw validation error if any errors found
    if (Object.keys(errors).length > 0) {
      const error = new ValidationError("Validation failed");
      error.details = errors;
      throw error;
    }

    return command as CreateFeedbackCommand;
  }

  /**
   * Validates complete outfit structure for all 7 body zones
   */
  static validateOutfitStructure(outfit: any): outfit is OutfitDTO {
    if (!outfit || typeof outfit !== "object") {
      return false;
    }

    // Validate head
    if (!VALID_HEAD_OPTIONS.includes(outfit.head)) {
      return false;
    }

    // Validate torso (nested object)
    if (!outfit.torso || typeof outfit.torso !== "object") {
      return false;
    }
    if (
      !VALID_TORSO_BASE.includes(outfit.torso.base) ||
      !VALID_TORSO_MID.includes(outfit.torso.mid) ||
      !VALID_TORSO_OUTER.includes(outfit.torso.outer)
    ) {
      return false;
    }

    // Validate arms
    if (!VALID_ARMS.includes(outfit.arms)) {
      return false;
    }

    // Validate hands
    if (!VALID_HANDS.includes(outfit.hands)) {
      return false;
    }

    // Validate legs
    if (!VALID_LEGS.includes(outfit.legs)) {
      return false;
    }

    // Validate feet (nested object)
    if (!outfit.feet || typeof outfit.feet !== "object") {
      return false;
    }
    if (
      !VALID_SOCKS.includes(outfit.feet.socks) ||
      !VALID_COVERS.includes(outfit.feet.covers)
    ) {
      return false;
    }

    // Validate neck
    if (!VALID_NECK.includes(outfit.neck)) {
      return false;
    }

    return true;
  }

  /**
   * Validates zone ratings object (optional values 1-5)
   */
  static validateZoneRatings(ratings: any): ratings is ZoneRatings {
    if (!ratings || typeof ratings !== "object") {
      return false;
    }

    const validZones = [
      "head",
      "torso",
      "arms",
      "hands",
      "legs",
      "feet",
      "neck",
    ];

    for (const [zone, rating] of Object.entries(ratings)) {
      // Check if zone is valid
      if (!validZones.includes(zone)) {
        return false;
      }

      // Check if rating is valid (1-5)
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validates UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
