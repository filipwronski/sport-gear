/**
 * DashboardService - Main aggregation service for dashboard endpoint
 *
 * Responsibilities:
 * - Coordinate data fetching from multiple services
 * - Execute parallel queries for optimal performance
 * - Aggregate data into DashboardDTO response
 * - Handle service errors gracefully
 */

import type {
  DashboardDTO,
  WeatherSummaryDTO,
  EquipmentStatusDTO,
  CommunityActivityDTO,
  PersonalizationStatusDTO,
} from "../types";
import { ProfileService } from "./ProfileService";
import { WeatherService } from "./weather.service";
import { BikeService } from "./bike.service";
import { getCommunityActivity } from "./community.service";
import { EquipmentServiceError } from "../lib/errors/dashboard.errors";
import { supabaseClient } from "../db/supabase.client";
import { supabaseServiceClient } from "../db/supabase.admin.client";

/**
 * Main dashboard service that aggregates data from multiple sources
 */
export class DashboardService {
  private profileService: ProfileService;
  private weatherService: WeatherService;
  private bikeService: BikeService;

  constructor() {
    this.profileService = new ProfileService();
    const apiKey = import.meta.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENWEATHER_API_KEY environment variable is required");
    }
    this.weatherService = new WeatherService(
      supabaseClient,
      supabaseServiceClient,
      apiKey,
    );
    this.bikeService = new BikeService();
  }

  /**
   * Get complete dashboard data for a user
   * Executes all data fetching operations in parallel for optimal performance
   *
   * @param userId - Authenticated user ID
   * @param locationId - Location ID for weather data
   * @returns Complete dashboard data aggregated from all services
   * @throws Error if critical services fail (weather, equipment)
   */
  async getDashboard(
    userId: string,
    coordinates: { lat: number; lng: number } | null,
  ): Promise<DashboardDTO> {
    try {
      // Execute all service calls in parallel for optimal performance
      const [
        weatherSummary,
        equipmentStatus,
        communityActivity,
        personalizationStatus,
      ] = await Promise.all([
        this.getWeatherSummary(coordinates),
        this.getEquipmentStatus(userId),
        this.getCommunityActivity(null, userId), // TODO: Pass coordinates when community service supports it
        this.getPersonalizationStatus(userId),
      ]);

      return {
        weather_summary: weatherSummary,
        equipment_status: equipmentStatus,
        community_activity: communityActivity,
        personalization_status: personalizationStatus,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Dashboard aggregation error:", error);
      throw error; // Re-throw to be handled by route handler
    }
  }

  /**
   * Get weather summary with error handling
   * Falls back to default values if weather service fails
   */
  private async getWeatherSummary(
    coordinates: { lat: number; lng: number } | null,
  ): Promise<WeatherSummaryDTO> {
    try {
      if (!coordinates) {
        // No coordinates provided - return placeholder data
        console.log("No coordinates provided for weather data");
        return {
          location_id: "",
          current_temperature: 15,
          feels_like: 15,
          wind_speed: 0,
          humidity: 50,
          description: "Set your location to see weather data",
          quick_recommendation: "Configure your location in profile settings",
        };
      }

      const weatherSummary =
        await this.weatherService.getWeatherSummaryByCoordinates(
          coordinates.lat,
          coordinates.lng,
        );

      // Outfit recommendation will be fetched on client-side by the component
      return weatherSummary;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Weather service error in dashboard:", error);

      // Provide fallback weather data to prevent dashboard failure
      return {
        location_id: "",
        current_temperature: 15, // Default temperature
        feels_like: 13,
        wind_speed: 0,
        humidity: 50,
        description: "Weather data unavailable",
        quick_recommendation: "Check weather conditions before heading out",
      };
    }
  }

  /**
   * Get equipment status with error handling
   * Critical for dashboard - throws error if fails
   */
  private async getEquipmentStatus(
    userId: string,
  ): Promise<EquipmentStatusDTO> {
    try {
      return await this.bikeService.getEquipmentStatus(userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Equipment service error in dashboard:", error);
      throw new EquipmentServiceError("Failed to fetch equipment status");
    }
  }

  /**
   * Get community activity with graceful error handling
   * Returns zero counts if service fails
   */
  private async getCommunityActivity(
    locationId: string | null,
    userId: string,
  ): Promise<CommunityActivityDTO> {
    try {
      if (!locationId) {
        // No location set - return zero community activity
        console.log("No location set for community activity");
        return {
          recent_outfits_count: 0,
          similar_conditions_count: 0,
        };
      }

      return await getCommunityActivity(locationId, userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Community service error in dashboard:", error);

      // Graceful fallback - community data is not critical
      return {
        recent_outfits_count: 0,
        similar_conditions_count: 0,
      };
    }
  }

  /**
   * Get personalization status with error handling
   * Falls back to default values if service fails
   */
  private async getPersonalizationStatus(
    userId: string,
  ): Promise<PersonalizationStatusDTO> {
    try {
      return await this.profileService.getPersonalizationStatus(userId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Personalization service error in dashboard:", error);

      // Provide fallback personalization data
      return {
        feedback_count: 0,
        personalization_active: false,
        thermal_adjustment: 0,
        next_personalization_at: 5,
      };
    }
  }
}
