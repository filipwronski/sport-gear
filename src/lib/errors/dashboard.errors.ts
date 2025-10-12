/**
 * Custom error classes for dashboard endpoint
 * Provides specific error types for better error handling and user feedback
 */

/**
 * Thrown when user's location is not found or doesn't belong to them
 */
export class LocationNotFoundError extends Error {
  constructor(locationId?: string) {
    super(
      locationId
        ? `Location '${locationId}' not found or does not belong to user`
        : "User has no default location configured. Please set up a location first.",
    );
    this.name = "LocationNotFoundError";
  }
}

/**
 * Thrown when weather service encounters an error
 */
export class WeatherServiceError extends Error {
  constructor(message: string) {
    super(`Weather service error: ${message}`);
    this.name = "WeatherServiceError";
  }
}

/**
 * Thrown when equipment data cannot be retrieved
 */
export class EquipmentServiceError extends Error {
  constructor(message: string) {
    super(`Equipment service error: ${message}`);
    this.name = "EquipmentServiceError";
  }
}

/**
 * Thrown when community data cannot be retrieved
 */
export class CommunityServiceError extends Error {
  constructor(message: string) {
    super(`Community service error: ${message}`);
    this.name = "CommunityServiceError";
  }
}
