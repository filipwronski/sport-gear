/**
 * Predefined cities for default location selection
 * Contains popular cities from various countries
 * Coordinates are rounded to 3 decimal places for privacy (~100m accuracy)
 */
export interface SuggestedCity {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
}

/**
 * Popular cities for location suggestions
 * Includes major cities from Poland and other countries
 */
export const SUGGESTED_CITIES: SuggestedCity[] = [
  {
    name: "Warszawa",
    latitude: 52.23,
    longitude: 21.011,
    country_code: "PL",
  },
  {
    name: "Kraków",
    latitude: 50.064,
    longitude: 19.945,
    country_code: "PL",
  },
  {
    name: "Łódź",
    latitude: 51.759,
    longitude: 19.457,
    country_code: "PL",
  },
  {
    name: "Wrocław",
    latitude: 51.107,
    longitude: 17.038,
    country_code: "PL",
  },
  {
    name: "Poznań",
    latitude: 52.406,
    longitude: 16.93,
    country_code: "PL",
  },
  {
    name: "Gdańsk",
    latitude: 54.352,
    longitude: 18.646,
    country_code: "PL",
  },
  {
    name: "Szczecin",
    latitude: 53.428,
    longitude: 14.553,
    country_code: "PL",
  },
  {
    name: "Bydgoszcz",
    latitude: 53.123,
    longitude: 18.008,
    country_code: "PL",
  },
  {
    name: "Lublin",
    latitude: 51.247,
    longitude: 22.569,
    country_code: "PL",
  },
  {
    name: "Katowice",
    latitude: 50.264,
    longitude: 19.023,
    country_code: "PL",
  },
  {
    name: "Calpe",
    latitude: 38.644,
    longitude: 0.044,
    country_code: "ES",
  },
];

/**
 * Helper function to get suggested city by name
 */
export function getSuggestedCityByName(name: string): SuggestedCity | undefined {
  return SUGGESTED_CITIES.find(
    (city) => city.name.toLowerCase() === name.toLowerCase(),
  );
}

/**
 * Helper function to check if a city name is a predefined suggested city
 */
export function isSuggestedCity(name: string): boolean {
  return SUGGESTED_CITIES.some(
    (city) => city.name.toLowerCase() === name.toLowerCase(),
  );
}
