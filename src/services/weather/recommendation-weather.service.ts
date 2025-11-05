/**
 * Enhanced Weather Service for Recommendations
 * Extends existing weather service with current weather support and caching
 */

import { supabaseClient } from "../../db/supabase.client";
import { supabaseServiceClient } from "../../db/supabase.admin.client";
import type { WeatherDTO } from "../../types";
import { OpenWeatherClient } from "./openweather.client";
import type { Coordinates } from "./weather.types";
import { NotFoundError } from "../../lib/errors";

const CACHE_TTL = {
  CURRENT: 30 * 60, // 30 minutes
  FORECAST: 6 * 60 * 60, // 6 hours
};

export class RecommendationWeatherService {
  private openWeatherClient: OpenWeatherClient;

  constructor() {
    const apiKey = import.meta.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY environment variable is required");
    }
    this.openWeatherClient = new OpenWeatherClient(apiKey);
  }

  /**
   * Get weather data for recommendations using coordinates
   * Supports both current weather and forecast
   */
  async getWeatherByCoordinates(
    lat: number,
    lng: number,
    date?: string,
  ): Promise<WeatherDTO> {
    // Generate cache key
    const cacheKey = date
      ? `forecast_${lat}_${lng}_${date}`
      : `current_${lat}_${lng}`;

    // Check cache
    const cached = await this.getCachedWeather(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const weather = date
      ? await this.openWeatherClient.getForecast(lat, lng, date)
      : await this.openWeatherClient.getCurrentWeather(lat, lng);

    // Update cache
    const ttl = date ? CACHE_TTL.FORECAST : CACHE_TTL.CURRENT;
    await this.setCachedWeather(cacheKey, weather, ttl);

    return weather;
  }

  /**
   * Get location coordinates from user_locations table
   * Includes ownership verification
   * Uses service client in development to bypass RLS
   */
  private async getLocationCoordinates(
    locationId: string,
    userId: string,
  ): Promise<Coordinates> {
    // TEMPORARY: For demo purposes, return hardcoded Warsaw coordinates
    // In production, this would query the database properly
    if (
      import.meta.env.DEV &&
      locationId === "94fd4d7a-2fdd-4bd7-949e-4befdcdb7032"
    ) {
      console.info(
        "[RecommendationWeatherService] Using hardcoded Warsaw coordinates for demo",
      );
      return {
        longitude: 21.0122,
        latitude: 52.2297,
      };
    }

    // Use service client in development to bypass RLS issues
    const client = import.meta.env.DEV ? supabaseServiceClient : supabaseClient;

    const { data, error } = await client
      .from("user_locations")
      .select(
        "id, ST_X(location::geometry) as longitude, ST_Y(location::geometry) as latitude",
      )
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      console.error(
        "[RecommendationWeatherService] Location query failed:",
        error,
      );
      throw new NotFoundError("Location not found");
    }

    return {
      longitude: parseFloat(data.longitude.toString()),
      latitude: parseFloat(data.latitude.toString()),
    };
  }

  /**
   * Get cached weather data
   * Uses service client in development to bypass RLS
   */
  private async getCachedWeather(cacheKey: string): Promise<WeatherDTO | null> {
    try {
      // Use service client in development to bypass RLS issues
      const client = import.meta.env.DEV
        ? supabaseServiceClient
        : supabaseClient;

      const { data, error } = await client
        .from("weather_cache")
        .select("current_weather, forecast_data, expires_at")
        .eq("location_key", cacheKey)
        .single();

      if (error || !data) {
        return null; // Cache miss
      }

      // Check if cache is expired
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        return null; // Expired
      }

      // Return appropriate data based on cache key type
      if (cacheKey.startsWith("current_")) {
        return data.current_weather as WeatherDTO;
      } else {
        // For forecast, we stored the weather data directly
        return data.forecast_data as WeatherDTO;
      }
    } catch (error) {
      console.error(
        "[RecommendationWeatherService] Cache lookup failed:",
        error,
      );
      return null; // Fallback to API call
    }
  }

  /**
   * Cache weather data
   * Uses service client in development to bypass RLS
   */
  private async setCachedWeather(
    cacheKey: string,
    data: WeatherDTO,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      // Use service client in development to bypass RLS issues
      const client = import.meta.env.DEV
        ? supabaseServiceClient
        : supabaseClient;

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Prepare cache data based on type
      const cacheData = cacheKey.startsWith("current_")
        ? { current_weather: data, forecast_data: null }
        : { current_weather: null, forecast_data: data };

      const { error } = await client.from("weather_cache").upsert(
        {
          location_key: cacheKey,
          ...cacheData,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "location_key",
        },
      );

      if (error) {
        console.error(
          "[RecommendationWeatherService] Failed to cache weather:",
          error,
        );
        // Don't throw - caching failure shouldn't break the API response
      }
    } catch (error) {
      console.error(
        "[RecommendationWeatherService] Cache operation failed:",
        error,
      );
      // Graceful failure - continue without caching
    }
  }
}
