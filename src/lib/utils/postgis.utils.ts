import type { Coordinates } from "../../types";

/**
 * PostGIS utility functions for geographic data processing
 * Handles coordinate validation, rounding, and transformations
 */

/**
 * Zaokrągla współrzędne do 3 miejsc po przecinku (~100m accuracy)
 * Zapewnia privacy przez zmniejszenie precyzji lokalizacji
 */
export function roundCoordinates(lat: number, lng: number): Coordinates {
  return {
    latitude: Math.round(lat * 1000) / 1000,
    longitude: Math.round(lng * 1000) / 1000,
  };
}

/**
 * Waliduje zakres współrzędnych geograficznych
 * Sprawdza czy współrzędne mieszczą się w poprawnych zakresach
 */
export function validateCoordinateRanges(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Waliduje czy pojedyncza współrzędna latitude jest w poprawnym zakresie
 */
export function validateLatitudeRange(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Waliduje czy pojedyncza współrzędna longitude jest w poprawnym zakresie
 */
export function validateLongitudeRange(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Konwertuje współrzędne do formatu używanego przez PostGIS ST_MakePoint()
 * PostGIS używa kolejności (longitude, latitude) w przeciwieństwie do standardowej (lat, lng)
 */
export function coordinatesToPostGISPoint(
  coordinates: Coordinates,
): [number, number] {
  return [coordinates.longitude, coordinates.latitude];
}

/**
 * Sprawdza czy dwie lokalizacje są identyczne (po zaokrągleniu)
 * Używane do optymalizacji - unikanie niepotrzebnych aktualizacji
 */
export function areCoordinatesEqual(
  coord1: Coordinates,
  coord2: Coordinates,
): boolean {
  const rounded1 = roundCoordinates(coord1.latitude, coord1.longitude);
  const rounded2 = roundCoordinates(coord2.latitude, coord2.longitude);

  return (
    rounded1.latitude === rounded2.latitude &&
    rounded1.longitude === rounded2.longitude
  );
}
