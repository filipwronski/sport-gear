/**
 * Internal types for weather service
 * Used for weather data processing and caching
 */

import type { WeatherDTO } from "../../types";

/**
 * Weather cache entry structure stored in database
 */
export interface WeatherCacheEntry {
  cache_key: string;
  data: WeatherDTO;
  cached_at: string;
  ttl_seconds: number;
}

/**
 * Geographic coordinates
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * OpenWeather API current weather response
 */
export interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number; // m/s
  };
  weather: {
    description: string;
    icon: string;
  }[];
  rain?: {
    "1h": number; // mm/h
  };
}

/**
 * OpenWeather API forecast response
 */
export interface OpenWeatherForecastResponse {
  list: {
    dt: number; // Unix timestamp
    main: {
      temp: number;
      feels_like: number;
      humidity: number;
    };
    wind: {
      speed: number; // m/s
    };
    weather: {
      description: string;
      icon: string;
    }[];
    rain?: {
      "3h": number; // mm/3h
    };
    dt_txt: string; // "2023-10-15 12:00:00"
  }[];
}

/**
 * Weather API error types
 */
export class WeatherAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "WeatherAPIError";
  }
}
