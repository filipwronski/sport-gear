/**
 * OpenWeather API Client
 * Handles communication with OpenWeather API for current weather and forecasts
 */

import type { WeatherDTO } from "../../types";
import type {
  OpenWeatherCurrentResponse,
  OpenWeatherForecastResponse,
} from "./weather.types";
import { WeatherAPIError } from "./weather.types";

const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";

export class OpenWeatherClient {
  private readonly apiKey: string;
  private readonly timeout: number = 5000; // 5 seconds

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch current weather data for given coordinates
   */
  async getCurrentWeather(lat: number, lon: number): Promise<WeatherDTO> {
    const url = `${OPENWEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;

    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new WeatherAPIError(
        `OpenWeather API error: ${response.status}`,
        response.status,
      );
    }

    const data: OpenWeatherCurrentResponse = await response.json();
    return this.parseCurrentWeather(data);
  }

  /**
   * Fetch forecast data for specific date
   */
  async getForecast(
    lat: number,
    lon: number,
    targetDate: string,
  ): Promise<WeatherDTO> {
    const url = `${OPENWEATHER_BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;

    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new WeatherAPIError(
        `OpenWeather API error: ${response.status}`,
        response.status,
      );
    }

    const data: OpenWeatherForecastResponse = await response.json();
    return this.parseForecastForDate(data, targetDate);
  }

  /**
   * Transform current weather API response to our WeatherDTO format
   */
  private parseCurrentWeather(data: OpenWeatherCurrentResponse): WeatherDTO {
    return {
      temperature: Math.round(data.main.temp * 10) / 10, // Round to 1 decimal
      feels_like: Math.round(data.main.feels_like * 10) / 10,
      wind_speed: Math.round(data.wind.speed * 3.6 * 10) / 10, // m/s to km/h
      humidity: data.main.humidity,
      rain_mm: data.rain?.["1h"] || 0,
      description: data.weather[0]?.description || "clear",
      icon: data.weather[0]?.icon || "01d",
    };
  }

  /**
   * Parse forecast data for specific target date
   * Finds the closest forecast entry to the target date
   */
  private parseForecastForDate(
    data: OpenWeatherForecastResponse,
    targetDate: string,
  ): WeatherDTO {
    const targetTime = new Date(targetDate).getTime();

    // Find forecast entry closest to target date
    let closestEntry = data.list[0];
    let minTimeDiff = Math.abs(closestEntry.dt * 1000 - targetTime);

    for (const entry of data.list) {
      const timeDiff = Math.abs(entry.dt * 1000 - targetTime);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestEntry = entry;
      }
    }

    return {
      temperature: Math.round(closestEntry.main.temp * 10) / 10,
      feels_like: Math.round(closestEntry.main.feels_like * 10) / 10,
      wind_speed: Math.round(closestEntry.wind.speed * 3.6 * 10) / 10, // m/s to km/h
      humidity: closestEntry.main.humidity,
      rain_mm: closestEntry.rain?.["3h"] ? closestEntry.rain["3h"] / 3 : 0, // 3h to 1h average
      description: closestEntry.weather[0]?.description || "clear",
      icon: closestEntry.weather[0]?.icon || "01d",
    };
  }

  /**
   * Fetch with timeout and error handling
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "SportGear-Weather/1.0",
        },
      });

      return response;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new WeatherAPIError("Weather service timeout");
      }
      throw new WeatherAPIError(`Network error: ${(error as Error).message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
