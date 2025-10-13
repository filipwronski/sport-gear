/**
 * Predefined Polish cities for default location selection
 * Contains 10 largest cities in Poland by population
 * Coordinates are rounded to 3 decimal places for privacy (~100m accuracy)
 */
export interface PolishCity {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
}

/**
 * 10 largest cities in Poland by population (2024 data)
 * Coordinates sourced from reliable geographic data
 */
export const POLISH_CITIES: PolishCity[] = [
  {
    name: "Warszawa",
    latitude: 52.230,
    longitude: 21.011,
    country_code: "PL"
  },
  {
    name: "Kraków",
    latitude: 50.064,
    longitude: 19.945,
    country_code: "PL"
  },
  {
    name: "Łódź",
    latitude: 51.759,
    longitude: 19.457,
    country_code: "PL"
  },
  {
    name: "Wrocław",
    latitude: 51.107,
    longitude: 17.038,
    country_code: "PL"
  },
  {
    name: "Poznań",
    latitude: 52.406,
    longitude: 16.930,
    country_code: "PL"
  },
  {
    name: "Gdańsk",
    latitude: 54.352,
    longitude: 18.646,
    country_code: "PL"
  },
  {
    name: "Szczecin",
    latitude: 53.428,
    longitude: 14.553,
    country_code: "PL"
  },
  {
    name: "Bydgoszcz",
    latitude: 53.123,
    longitude: 18.008,
    country_code: "PL"
  },
  {
    name: "Lublin",
    latitude: 51.247,
    longitude: 22.569,
    country_code: "PL"
  },
  {
    name: "Katowice",
    latitude: 50.264,
    longitude: 19.023,
    country_code: "PL"
  }
];

/**
 * Helper function to get Polish city by name
 */
export function getPolishCityByName(name: string): PolishCity | undefined {
  return POLISH_CITIES.find(city =>
    city.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Helper function to check if a city name is a predefined Polish city
 */
export function isPolishCity(name: string): boolean {
  return POLISH_CITIES.some(city =>
    city.name.toLowerCase() === name.toLowerCase()
  );
}
