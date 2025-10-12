import type {
  CreateReminderCommand,
  CompleteReminderCommand,
  GetRemindersParams,
  ServiceTypeEnum,
} from "../../types";

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors?: { field: string; message: string }[];
}

/**
 * Reminder validation utilities
 * Provides validation functions for all reminder-related operations
 */
export class ReminderValidator {
  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate service type enum
   */
  static validateServiceType(serviceType: string): boolean {
    const validTypes: ServiceTypeEnum[] = [
      "lancuch",
      "kaseta",
      "klocki_przod",
      "klocki_tyl",
      "opony",
      "przerzutki",
      "hamulce",
      "przeglad_ogolny",
      "inne",
    ];
    return validTypes.includes(serviceType as ServiceTypeEnum);
  }

  /**
   * Validate reminder status enum
   */
  static validateReminderStatus(status: string): boolean {
    const validStatuses = ["all", "active", "completed", "overdue"];
    return validStatuses.includes(status);
  }

  /**
   * Validate reminder sort options
   */
  static validateReminderSort(sort: string): boolean {
    const validSorts = [
      "km_remaining_asc",
      "km_remaining_desc",
      "created_at_asc",
      "created_at_desc",
    ];
    return validSorts.includes(sort);
  }

  /**
   * Validate interval_km value
   */
  static validateIntervalKm(value: number): ValidationResult {
    if (typeof value !== "number" || isNaN(value)) {
      return {
        valid: false,
        errors: [{ field: "interval_km", message: "Must be a valid number" }],
      };
    }

    if (!Number.isInteger(value)) {
      return {
        valid: false,
        errors: [{ field: "interval_km", message: "Must be an integer" }],
      };
    }

    if (value < 50) {
      return {
        valid: false,
        errors: [{ field: "interval_km", message: "Must be at least 50 km" }],
      };
    }

    if (value > 50000) {
      return {
        valid: false,
        errors: [{ field: "interval_km", message: "Must not exceed 50000 km" }],
      };
    }

    return { valid: true };
  }

  /**
   * Validate query parameters for GET reminders
   */
  static validateQueryParams(params: GetRemindersParams): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    // Validate status
    if (params.status && !this.validateReminderStatus(params.status)) {
      errors.push({
        field: "status",
        message: "Status must be one of: all, active, completed, overdue",
      });
    }

    // Validate service_type
    if (params.service_type && !this.validateServiceType(params.service_type)) {
      errors.push({
        field: "service_type",
        message: "Invalid service type",
      });
    }

    // Validate sort
    if (params.sort && !this.validateReminderSort(params.sort)) {
      errors.push({
        field: "sort",
        message: "Invalid sort option",
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate CreateReminderCommand
   */
  static validateCreateReminderCommand(command: any): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    // Check if command is an object
    if (!command || typeof command !== "object") {
      return {
        valid: false,
        errors: [
          { field: "body", message: "Request body must be a valid object" },
        ],
      };
    }

    // Validate service_type
    if (!command.service_type) {
      errors.push({
        field: "service_type",
        message: "Service type is required",
      });
    } else if (!this.validateServiceType(command.service_type)) {
      errors.push({
        field: "service_type",
        message:
          "Must be one of: lancuch, kaseta, klocki_przod, klocki_tyl, opony, przerzutki, hamulce, przeglad_ogolny, inne",
      });
    }

    // Validate interval_km
    if (command.interval_km === undefined || command.interval_km === null) {
      errors.push({
        field: "interval_km",
        message: "Interval km is required",
      });
    } else {
      const intervalValidation = this.validateIntervalKm(command.interval_km);
      if (!intervalValidation.valid && intervalValidation.errors) {
        errors.push(...intervalValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Validate CompleteReminderCommand
   */
  static validateCompleteReminderCommand(command: any): ValidationResult {
    const errors: { field: string; message: string }[] = [];

    // Check if command is an object
    if (!command || typeof command !== "object") {
      return {
        valid: false,
        errors: [
          { field: "body", message: "Request body must be a valid object" },
        ],
      };
    }

    // Validate completed_service_id
    if (!command.completed_service_id) {
      errors.push({
        field: "completed_service_id",
        message: "Completed service ID is required",
      });
    } else if (typeof command.completed_service_id !== "string") {
      errors.push({
        field: "completed_service_id",
        message: "Completed service ID must be a string",
      });
    } else if (!this.validateUUID(command.completed_service_id)) {
      errors.push({
        field: "completed_service_id",
        message: "Must be a valid UUID",
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Sanitize and normalize query parameters
   */
  static sanitizeQueryParams(
    params: Record<string, string | null>,
  ): GetRemindersParams {
    return {
      status: this.sanitizeStatus(params.status),
      service_type: this.sanitizeServiceType(params.service_type),
      sort: this.sanitizeSort(params.sort),
    };
  }

  /**
   * Sanitize status parameter with default fallback
   */
  private static sanitizeStatus(
    status: string | null,
  ): GetRemindersParams["status"] {
    if (!status) return "active"; // default
    return this.validateReminderStatus(status) ? (status as any) : "active";
  }

  /**
   * Sanitize service type parameter
   */
  private static sanitizeServiceType(
    serviceType: string | null,
  ): GetRemindersParams["service_type"] {
    if (!serviceType) return undefined;
    return this.validateServiceType(serviceType)
      ? (serviceType as ServiceTypeEnum)
      : undefined;
  }

  /**
   * Sanitize sort parameter with default fallback
   */
  private static sanitizeSort(sort: string | null): GetRemindersParams["sort"] {
    if (!sort) return "km_remaining_asc"; // default
    return this.validateReminderSort(sort) ? (sort as any) : "km_remaining_asc";
  }
}
