/**
 * Validation utilities for dashboard endpoint
 * Provides UUID validation and query parameter validation
 */

/**
 * UUID validation regex pattern
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates dashboard query parameters
 * @param query - Query parameters object
 * @returns Array of validation error messages
 */
export function validateDashboardQuery(query: any): string[] {
  const errors: string[] = [];

  // location_id (optional)
  if (query.location_id !== undefined) {
    if (typeof query.location_id !== "string") {
      errors.push("location_id must be a string");
    } else if (!isValidUUID(query.location_id)) {
      errors.push("location_id must be a valid UUID");
    }
  }

  return errors;
}

/**
 * Generates quick clothing recommendation based on temperature
 * Rule-based system for immediate user feedback
 * @param temperature - Temperature in Celsius
 * @returns Recommendation string
 */
export function getQuickRecommendation(temperature: number): string {
  if (temperature < 0) return "Winter gear required";
  if (temperature < 5) return "Thermal layers recommended";
  if (temperature < 10) return "Long sleeves recommended";
  if (temperature < 15) return "Light jacket recommended";
  if (temperature < 20) return "Short sleeves with arm warmers";
  return "Summer gear suitable";
}
