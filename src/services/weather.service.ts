import { supabaseClient } from "../db/supabase.client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ForecastDTO, ForecastDayDTO, LocationDTO } from "../types";
import {
  NotFoundError,
  ServiceUnavailableError,
  RateLimitError,
  InternalServerError,
} from "../lib/errors";

/**
 * OpenWeather API response structure for 7-day forecast
 */
interface OpenWeatherForecastResponse {
  list: {
    dt: number; // Unix timestamp
    main: {
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    wind: {
      speed: number;
    };
    rain?: {
      "3h": number;
    };
    weather: {
      description: string;
    }[];
  }[];
}

/**
 * Weather cache row structure from weather_cache table
 */
interface WeatherCacheRow {
  id: string;
  location_key: string;
  forecast_data: ForecastDTO | null;
  expires_at: string; // ISO timestamp
  updated_at: string;
}

/**
 * Location data for weather API calls
 */
interface LocationData {
  id: string;
  city: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

/**
 * WeatherService - Business logic for weather forecast functionality
 *
 * Responsibilities:
 * - Manage 6-hour cache for weather forecasts
 * - Integrate with OpenWeather API for external data
 * - Generate quick outfit recommendations based on weather
 * - Handle location ownership verification
 * - Provide 7-day weather forecasts
 */
export class WeatherService {
  private static readonly CACHE_TTL_HOURS = 6;
  private static readonly API_TIMEOUT_MS = 5000;
  private static readonly OPENWEATHER_BASE_URL =
    "https://api.openweathermap.org/data/2.5/forecast";

  constructor(
    private supabase: SupabaseClient,
    private serviceClient: SupabaseClient,
    private apiKey: string,
  ) {}

  /**
   * Main public method - Get 7-day forecast for user's location
   * Implements cache-first strategy with fallback to API
   *
   * @param locationId - UUID of user's location
   * @param userId - Authenticated user ID for ownership verification
   * @returns 7-day weather forecast with quick recommendations
   * @throws NotFoundError if location doesn't exist or doesn't belong to user
   * @throws ServiceUnavailableError if OpenWeather API fails
   */
  async getForecastByLocation(
    locationId: string,
    userId: string,
  ): Promise<ForecastDTO> {
    // Step 1: Verify location ownership and get coordinates
    const locationData = await this.verifyLocationOwnership(locationId, userId);

    // Step 2: Generate cache key based on city/country (shared cache)
    const locationKey = this.generateLocationKey(
      locationData.city,
      locationData.country_code,
    );

    // Step 3: Check cache first
    const cachedForecast = await this.getCachedForecast(locationKey);
    if (cachedForecast) {
      return cachedForecast;
    }

    // Step 4: Cache miss - fetch from API
    const forecast = await this.fetchForecastFromAPI(
      locationData.latitude,
      locationData.longitude,
    );

    // Step 5: Cache the result
    await this.cacheForecast(locationKey, forecast);

    return forecast;
  }

  /**
   * Verify that location belongs to authenticated user and get location data
   * Uses RLS policy + explicit check for security + PostGIS RPC function for coordinates
   */
  private async verifyLocationOwnership(
    locationId: string,
    userId: string,
  ): Promise<LocationData> {
    // First, verify ownership and get basic location data
    const { data: locationData, error: locationError } = await this.supabase
      .from("user_locations")
      .select("id, city, country_code")
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    if (locationError || !locationData) {
      throw new NotFoundError("Location not found");
    }

    // Get coordinates using PostGIS RPC function
    const { data: coordinates, error: coordError } = await this.supabase.rpc(
      "get_location_coordinates",
      {
        p_location_id: locationId,
        p_user_id: userId,
      },
    );

    if (coordError || !coordinates || coordinates.length === 0) {
      console.error("[WeatherService] Failed to get coordinates:", coordError);
      throw new InternalServerError("Failed to retrieve location coordinates");
    }

    const coord = coordinates[0];

    return {
      id: locationData.id,
      city: locationData.city,
      country_code: locationData.country_code,
      latitude: parseFloat(coord.latitude.toString()),
      longitude: parseFloat(coord.longitude.toString()),
    };
  }

  /**
   * Generate shared cache key based on city and country
   * Format: "city_countrycode" (e.g., "warsaw_pl")
   */
  private generateLocationKey(city: string, countryCode: string): string {
    return `${city.toLowerCase()}_${countryCode.toLowerCase()}`;
  }

  /**
   * Check weather_cache table for valid cached forecast
   * Returns null if cache miss or expired
   */
  private async getCachedForecast(
    locationKey: string,
  ): Promise<ForecastDTO | null> {
    try {
      const { data, error } = await this.serviceClient
        .from("weather_cache")
        .select("forecast_data, expires_at")
        .eq("location_key", locationKey)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !data || !data.forecast_data) {
        return null; // Cache MISS or expired
      }

      return data.forecast_data as ForecastDTO;
    } catch (error) {
      console.error("[WeatherService] Cache lookup failed:", error);
      return null; // Fallback to API call if cache fails
    }
  }

  /**
   * Fetch 7-day forecast from OpenWeather API
   * Includes timeout and error handling
   */
  private async fetchForecastFromAPI(
    lat: number,
    lon: number,
  ): Promise<ForecastDTO> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      WeatherService.API_TIMEOUT_MS,
    );

    try {
      const url = `${WeatherService.OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "CycleGear-Weather/1.0",
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError(3600); // 1 hour retry
        }
        throw new ServiceUnavailableError("weather_api");
      }

      const data: OpenWeatherForecastResponse = await response.json();
      return this.transformOpenWeatherResponse(data);
    } catch (error) {
      if (error.name === "AbortError") {
        throw new ServiceUnavailableError(
          "weather_api",
          "Weather service timeout",
        );
      }
      if (
        error instanceof RateLimitError ||
        error instanceof ServiceUnavailableError
      ) {
        throw error; // Re-throw our custom errors
      }
      throw new ServiceUnavailableError("weather_api", "Weather service error");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Transform OpenWeather API response to our ForecastDTO format
   * Includes quick recommendation generation for each day
   */
  private transformOpenWeatherResponse(
    apiData: OpenWeatherForecastResponse,
  ): ForecastDTO {
    // Group forecast data by day
    const dailyData: Record<string, any[]> = {};

    apiData.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(item);
    });

    // Convert to forecast format - take first 5 days
    const forecast: ForecastDayDTO[] = Object.keys(dailyData)
      .slice(0, 5)
      .map((date) => {
        const dayData = dailyData[date];
        const tempMin = Math.min(...dayData.map((d) => d.main.temp_min));
        const tempMax = Math.max(...dayData.map((d) => d.main.temp_max));
        const windSpeed = Math.round(dayData[0].wind.speed * 3.6); // m/s to km/h
        const rainMm = dayData.reduce(
          (sum, d) => sum + (d.rain?.["3h"] || 0),
          0,
        );
        const description = dayData[0].weather[0]?.description || "clear";

        return {
          date,
          temperature_min: Math.round(tempMin),
          temperature_max: Math.round(tempMax),
          wind_speed: windSpeed,
          rain_mm: Math.round(rainMm * 100) / 100, // Round to 2 decimal places
          description,
          quick_recommendation: this.generateQuickRecommendation(
            Math.round(tempMin),
            Math.round(tempMax),
            rainMm,
            windSpeed,
          ),
        };
      });

    return { forecast };
  }

  /**
   * Generate rule-based quick outfit recommendation
   * Based on temperature, rain, and wind conditions
   */
  private generateQuickRecommendation(
    tempMin: number,
    tempMax: number,
    rain: number,
    wind: number,
  ): string {
    const avgTemp = (tempMin + tempMax) / 2;

    let recommendation = "";

    // Temperature guidance
    if (avgTemp < 5) {
      recommendation += "Full winter gear recommended";
    } else if (avgTemp < 10) {
      recommendation += "Long sleeves and jacket";
    } else if (avgTemp < 15) {
      recommendation += "Long sleeves recommended";
    } else if (avgTemp < 20) {
      recommendation += "Short or long sleeves";
    } else {
      recommendation += "Perfect for short sleeves";
    }

    // Rain guidance
    if (rain > 10) {
      recommendation += ", heavy rain gear required";
    } else if (rain > 2) {
      recommendation += ", rain jacket recommended";
    }

    // Wind guidance
    if (wind > 30) {
      recommendation += ", strong wind protection needed";
    } else if (wind > 20) {
      recommendation += ", windproof layer advised";
    }

    return recommendation;
  }

  /**
   * Cache forecast data in weather_cache table
   * Uses UPSERT to handle existing entries
   * Graceful failure - doesn't break API response if caching fails
   */
  private async cacheForecast(
    locationKey: string,
    forecast: ForecastDTO,
  ): Promise<void> {
    try {
      const expiresAt = new Date(
        Date.now() + WeatherService.CACHE_TTL_HOURS * 60 * 60 * 1000,
      );

      const { error } = await this.serviceClient.from("weather_cache").upsert(
        {
          location_key: locationKey,
          forecast_data: forecast,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "location_key",
        },
      );

      if (error) {
        console.error("[WeatherService] Failed to cache forecast:", {
          error: error.message,
          locationKey,
          forecastDays: forecast.forecast.length,
        });
        // Don't throw - caching failure shouldn't break the API response
      }
    } catch (error) {
      console.error("[WeatherService] Cache operation failed:", error);
      // Graceful failure - continue without caching
    }
  }

  /**
   * Get weather summary for dashboard
   * Returns current weather with quick recommendation for a specific location
   * Uses caching to avoid excessive API calls
   *
   * @param locationId - User location ID
   * @returns Weather summary with quick recommendation
   * @throws NotFoundError if location doesn't exist
   * @throws ServiceUnavailableError if weather API fails
   */
  async getForecastByCoordinates(
    lat: number,
    lng: number,
  ): Promise<ForecastDTO> {
    // Generate cache key based on coordinates
    const locationKey = `forecast_${lat}_${lng}`;

    // Step 3: Check cache first
    const cachedForecast = await this.getCachedForecast(locationKey);
    if (cachedForecast) {
      return cachedForecast;
    }

    // Step 4: Cache miss - fetch from API
    const forecast = await this.fetchForecastFromAPI(lat, lng);

    // Step 5: Cache the result
    await this.cacheForecast(locationKey, forecast);

    return forecast;
  }

  async getWeatherSummaryByCoordinates(
    lat: number,
    lng: number,
  ): Promise<{
    location_id: string;
    current_temperature: number;
    feels_like: number;
    wind_speed: number;
    humidity: number;
    description: string;
    quick_recommendation: string;
  }> {
    try {
      // Fetch fresh data from API using provided coordinates
      const weatherData = await this.fetchCurrentWeatherFromAPI(lat, lng);

      return {
        location_id: "", // No location ID when using coordinates directly
        current_temperature: weatherData.temperature,
        feels_like: weatherData.feels_like,
        wind_speed: weatherData.wind_speed,
        humidity: weatherData.humidity,
        description: weatherData.description,
        quick_recommendation: this.generateQuickRecommendationSingle(
          weatherData.temperature,
        ),
      };
    } catch (error) {
      console.error("Weather summary by coordinates error:", error);
      throw new ServiceUnavailableError("Failed to fetch weather summary");
    }
  }

  /**
   * Generate quick recommendation for single temperature value
   * Used by dashboard weather summary
   */
  private generateQuickRecommendationSingle(temp: number): string {
    if (temp < 0) return "Winter gear required";
    if (temp < 5) return "Thermal layers recommended";
    if (temp < 10) return "Long sleeves recommended";
    if (temp < 15) return "Light jacket recommended";
    if (temp < 20) return "Short sleeves with arm warmers";
    return "Summer gear suitable";
  }

  /**
   * Fetch current weather from OpenWeather API
   * Simplified implementation for dashboard needs
   */
  private async fetchCurrentWeatherFromAPI(
    lat: number,
    lon: number,
  ): Promise<{
    temperature: number;
    feels_like: number;
    wind_speed: number;
    humidity: number;
    description: string;
  }> {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError(3600); // 1 hour retry
        }
        throw new ServiceUnavailableError(
          `Weather API error: ${response.status}`,
        );
      }

      const data = await response.json();

      return {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        wind_speed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        humidity: data.main.humidity,
        description: data.weather[0].description,
      };
    } catch (error) {
      if (
        error instanceof RateLimitError ||
        error instanceof ServiceUnavailableError
      ) {
        throw error;
      }
      throw new ServiceUnavailableError("Failed to fetch weather data");
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(updatedAt: string, maxAgeSeconds: number): boolean {
    const cacheTime = new Date(updatedAt).getTime();
    const now = Date.now();
    return now - cacheTime < maxAgeSeconds * 1000;
  }
}
