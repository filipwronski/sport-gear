import { supabaseClient } from "../db/supabase.client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ForecastDTO, ForecastDayDTO, LocationDTO } from "../types";
import { 
  NotFoundError, 
  ServiceUnavailableError, 
  RateLimitError,
  InternalServerError 
} from "../lib/errors";

/**
 * OpenWeather API response structure for 7-day forecast
 */
interface OpenWeatherForecastResponse {
  daily: Array<{
    dt: number;                    // Unix timestamp
    temp: {
      min: number;
      max: number;
    };
    wind_speed: number;
    rain?: number;                 // Optional, may not exist
    weather: Array<{
      description: string;
    }>;
  }>;
}

/**
 * Weather cache row structure from weather_cache table
 */
interface WeatherCacheRow {
  id: string;
  location_key: string;
  forecast_data: ForecastDTO | null;
  expires_at: string;              // ISO timestamp
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
  private static readonly OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast/daily';

  constructor(
    private supabase: SupabaseClient,
    private apiKey: string
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
  async getForecastByLocation(locationId: string, userId: string): Promise<ForecastDTO> {
    // Step 1: Verify location ownership and get coordinates
    const locationData = await this.verifyLocationOwnership(locationId, userId);
    
    // Step 2: Generate cache key based on city/country (shared cache)
    const locationKey = this.generateLocationKey(locationData.city, locationData.country_code);
    
    // Step 3: Check cache first
    const cachedForecast = await this.getCachedForecast(locationKey);
    if (cachedForecast) {
      return cachedForecast;
    }
    
    // Step 4: Cache miss - fetch from API
    const forecast = await this.fetchForecastFromAPI(locationData.latitude, locationData.longitude);
    
    // Step 5: Cache the result
    await this.cacheForecast(locationKey, forecast);
    
    return forecast;
  }

  /**
   * Verify that location belongs to authenticated user and get location data
   * Uses RLS policy + explicit check for security + PostGIS RPC function for coordinates
   */
  private async verifyLocationOwnership(locationId: string, userId: string): Promise<LocationData> {
    // First, verify ownership and get basic location data
    const { data: locationData, error: locationError } = await this.supabase
      .from('user_locations')
      .select('id, city, country_code')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (locationError || !locationData) {
      throw new NotFoundError('Location not found');
    }

    // Get coordinates using PostGIS RPC function
    const { data: coordinates, error: coordError } = await this.supabase
      .rpc('get_location_coordinates', {
        p_location_id: locationId,
        p_user_id: userId
      });

    if (coordError || !coordinates || coordinates.length === 0) {
      console.error('[WeatherService] Failed to get coordinates:', coordError);
      throw new InternalServerError('Failed to retrieve location coordinates');
    }

    const coord = coordinates[0];
    
    return {
      id: locationData.id,
      city: locationData.city,
      country_code: locationData.country_code,
      latitude: parseFloat(coord.latitude.toString()),
      longitude: parseFloat(coord.longitude.toString())
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
  private async getCachedForecast(locationKey: string): Promise<ForecastDTO | null> {
    try {
      const { data, error } = await this.supabase
        .from('weather_cache')
        .select('forecast_data, expires_at')
        .eq('location_key', locationKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data || !data.forecast_data) {
        return null; // Cache MISS or expired
      }

      return data.forecast_data as ForecastDTO;
    } catch (error) {
      console.error('[WeatherService] Cache lookup failed:', error);
      return null; // Fallback to API call if cache fails
    }
  }

  /**
   * Fetch 7-day forecast from OpenWeather API
   * Includes timeout and error handling
   */
  private async fetchForecastFromAPI(lat: number, lon: number): Promise<ForecastDTO> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WeatherService.API_TIMEOUT_MS);

    try {
      const url = `${WeatherService.OPENWEATHER_BASE_URL}?lat=${lat}&lon=${lon}&cnt=7&units=metric&appid=${this.apiKey}`;
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'CycleGear-Weather/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError(3600); // 1 hour retry
        }
        throw new ServiceUnavailableError('weather_api');
      }

      const data: OpenWeatherForecastResponse = await response.json();
      return this.transformOpenWeatherResponse(data);

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ServiceUnavailableError('weather_api', 'Weather service timeout');
      }
      if (error instanceof RateLimitError || error instanceof ServiceUnavailableError) {
        throw error; // Re-throw our custom errors
      }
      throw new ServiceUnavailableError('weather_api', 'Weather service error');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Transform OpenWeather API response to our ForecastDTO format
   * Includes quick recommendation generation for each day
   */
  private transformOpenWeatherResponse(apiData: OpenWeatherForecastResponse): ForecastDTO {
    const forecast: ForecastDayDTO[] = apiData.daily.map(day => {
      const date = new Date(day.dt * 1000).toISOString().split('T')[0]; // YYYY-MM-DD
      const tempMin = Math.round(day.temp.min);
      const tempMax = Math.round(day.temp.max);
      const windSpeed = Math.round(day.wind_speed * 3.6); // m/s to km/h
      const rainMm = day.rain || 0;
      const description = day.weather[0]?.description || 'clear';
      
      return {
        date,
        temperature_min: tempMin,
        temperature_max: tempMax,
        wind_speed: windSpeed,
        rain_mm: rainMm,
        description,
        quick_recommendation: this.generateQuickRecommendation(tempMin, tempMax, rainMm, windSpeed)
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
    wind: number
  ): string {
    const avgTemp = (tempMin + tempMax) / 2;
    
    let recommendation = '';

    // Temperature guidance
    if (avgTemp < 5) {
      recommendation += 'Full winter gear recommended';
    } else if (avgTemp < 10) {
      recommendation += 'Long sleeves and jacket';
    } else if (avgTemp < 15) {
      recommendation += 'Long sleeves recommended';
    } else if (avgTemp < 20) {
      recommendation += 'Short or long sleeves';
    } else {
      recommendation += 'Perfect for short sleeves';
    }

    // Rain guidance
    if (rain > 10) {
      recommendation += ', heavy rain gear required';
    } else if (rain > 2) {
      recommendation += ', rain jacket recommended';
    }

    // Wind guidance
    if (wind > 30) {
      recommendation += ', strong wind protection needed';
    } else if (wind > 20) {
      recommendation += ', windproof layer advised';
    }

    return recommendation;
  }

  /**
   * Cache forecast data in weather_cache table
   * Uses UPSERT to handle existing entries
   * Graceful failure - doesn't break API response if caching fails
   */
  private async cacheForecast(locationKey: string, forecast: ForecastDTO): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + WeatherService.CACHE_TTL_HOURS * 60 * 60 * 1000);

      const { error } = await this.supabase
        .from('weather_cache')
        .upsert({
          location_key: locationKey,
          forecast_data: forecast,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'location_key' 
        });

      if (error) {
        console.error('[WeatherService] Failed to cache forecast:', {
          error: error.message,
          locationKey,
          forecastDays: forecast.forecast.length
        });
        // Don't throw - caching failure shouldn't break the API response
      }
    } catch (error) {
      console.error('[WeatherService] Cache operation failed:', error);
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
  async getWeatherSummary(locationId: string): Promise<{
    location_id: string;
    current_temperature: number;
    feels_like: number;
    description: string;
    quick_recommendation: string;
  }> {
    try {
      // Get location data
      const location = await this.getLocationData(locationId);
      
      // Try to get current weather from cache first
      const cacheKey = `weather_current_${location.latitude}_${location.longitude}`;
      const cached = await this.getCachedWeather(cacheKey);
      
      let weatherData;
      
      if (cached && this.isCacheValid(cached.updated_at, 3600)) { // 1 hour cache
        // Use cached data - extract current weather from forecast
        const forecast = cached.forecast_data;
        if (forecast && forecast.forecast.length > 0) {
          const today = forecast.forecast[0];
          weatherData = {
            temperature: (today.temperature_min + today.temperature_max) / 2,
            feels_like: today.temperature_min, // Approximation
            description: today.description
          };
        } else {
          throw new ServiceUnavailableError('Invalid cached weather data');
        }
      } else {
        // Fetch fresh data from API
        weatherData = await this.fetchCurrentWeatherFromAPI(location.latitude, location.longitude);
      }

      return {
        location_id: locationId,
        current_temperature: weatherData.temperature,
        feels_like: weatherData.feels_like,
        description: weatherData.description,
        quick_recommendation: this.generateQuickRecommendationSingle(weatherData.temperature)
      };

    } catch (error) {
      console.error('Weather summary error:', error);
      
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      throw new ServiceUnavailableError('Failed to fetch weather summary');
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
  private async fetchCurrentWeatherFromAPI(lat: number, lon: number): Promise<{
    temperature: number;
    feels_like: number;
    description: string;
  }> {
    const apiKey = import.meta.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableError('Weather API key not configured');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError('Weather API rate limit exceeded');
        }
        throw new ServiceUnavailableError(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        temperature: data.main.temp,
        feels_like: data.main.feels_like,
        description: data.weather[0].description
      };
    } catch (error) {
      if (error instanceof RateLimitError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('Failed to fetch weather data');
    }
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(updatedAt: string, maxAgeSeconds: number): boolean {
    const cacheTime = new Date(updatedAt).getTime();
    const now = Date.now();
    return (now - cacheTime) < (maxAgeSeconds * 1000);
  }
}
