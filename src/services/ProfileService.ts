import { supabaseClient } from "../db/supabase.client";
import { supabaseServiceClient } from "../db/supabase.admin.client";
import type {
  Database,
  ProfileDTO,
  UpdateProfileCommand,
  ProfileExportDTO,
  LocationDTO,
  BikeDTO,
  ServiceRecordDTO,
  ServiceReminderDTO,
  FeedbackDTO,
  CommunityOutfitDTO,
  ThermalPreferences,
  ReputationBadgeEnum,
} from "../types";
import { InternalServerError } from "../lib/errors";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * ProfileService - Business logic layer for user profile management
 *
 * Responsibilities:
 * - CRUD operations on profiles table
 * - GDPR compliance (data export and account deletion)
 * - Pseudonym generation for community sharing
 * - Data transformation between DB rows and DTOs
 * - Multi-table data aggregation for exports
 */
export class ProfileService {
  /**
   * Get user profile by userId
   * For testing: returns mock profile if real profile doesn't exist
   *
   * @param userId - Authenticated user ID from JWT
   * @returns ProfileDTO with parsed thermal preferences
   * @throws InternalServerError on database errors
   */
  async getProfile(userId: string): Promise<ProfileDTO> {
    // First try to get profile with service client (bypasses RLS)
    const { data: serviceData, error: serviceError } =
      await supabaseServiceClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (!serviceError && serviceData) {
      // Profile exists, return it
      return this.transformRowToDTO(serviceData);
    }

    if (serviceError && serviceError.code === "PGRST116") {
      // Profile doesn't exist, create it automatically
      console.info(
        `Profile not found for user: ${userId}, creating new profile`,
      );
      return await this.createProfile(userId);
    }

    // If there's another error with service client, try regular client
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile doesn't exist, create it automatically
        console.info(
          `Profile not found for user: ${userId}, creating new profile`,
        );
        return await this.createProfile(userId);
      }
      console.error("Error fetching profile:", error);
      throw new InternalServerError("Failed to fetch profile");
    }

    return this.transformRowToDTO(data);
  }

  /**
   * Create a minimal profile for a user
   * Used when profile doesn't exist but user is authenticated
   */
  private async createProfile(userId: string): Promise<ProfileDTO> {
    // First check if profile already exists
    const { data: existing, error: checkError } = await supabaseServiceClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!checkError && existing) {
      // Profile already exists, return it
      return this.transformRowToDTO(existing);
    }

    // Use service client to bypass RLS for profile creation
    const { data, error } = await supabaseServiceClient
      .from("profiles")
      .insert({
        id: userId,
        display_name: null,
        thermal_preferences: null,
        share_with_community: false,
        units: "metric",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // If duplicate key error, the profile was created by another request
      if (error.code === "23505") {
        console.info(
          `Profile already exists for user: ${userId}, fetching existing profile`,
        );
        // Try to fetch the existing profile
        const { data: existingData, error: fetchError } =
          await supabaseServiceClient
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (!fetchError && existingData) {
          return this.transformRowToDTO(existingData);
        }
      }

      console.error("Error creating profile:", error);
      throw new InternalServerError("Failed to create profile");
    }

    // Create default location (Warsaw) for new user using service client
    try {
      // Use RPC function directly with service client to ensure it works for new users
      const { data: locationId, error: locationError } =
        await supabaseServiceClient.rpc("insert_location", {
          p_user_id: userId,
          p_latitude: 52.2297,
          p_longitude: 21.0122,
          p_city: "Warsaw",
          p_country_code: "PL",
          p_is_default: true,
          p_label: "Default Location",
        });

      if (locationError) {
        console.error(
          `Failed to create default location for user ${userId}:`,
          locationError,
        );
      } else {
        console.info(
          `Created default location (Warsaw) for user: ${userId}, location ID: ${locationId}`,
        );

        // Fetch the updated profile to get the default_location_id set by trigger
        const { data: updatedProfile, error: fetchUpdatedError } =
          await supabaseServiceClient
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (!fetchUpdatedError && updatedProfile) {
          return this.transformRowToDTO(updatedProfile);
        }
      }
    } catch (locationError) {
      console.warn(
        `Failed to create default location for user ${userId}:`,
        locationError,
      );
      // Don't throw - profile creation succeeded, location creation is optional
    }

    return this.transformRowToDTO(data);
  }

  /**
   * Update user profile with partial data
   * For testing: creates profile if it doesn't exist, then updates it
   *
   * @param userId - Authenticated user ID
   * @param command - Partial update data
   * @returns Updated ProfileDTO
   * @throws InternalServerError on database errors
   */
  async updateProfile(
    userId: string,
    command: UpdateProfileCommand,
  ): Promise<ProfileDTO> {
    // Real profile update logic
    const updateData: Partial<ProfileRow> = {};

    if (command.display_name !== undefined) {
      updateData.display_name = command.display_name;
    }

    if (command.thermal_preferences !== undefined) {
      updateData.thermal_preferences = command.thermal_preferences as any;
    }

    if (command.units !== undefined) {
      updateData.units = command.units;
    }

    if (command.default_location_id !== undefined) {
      updateData.default_location_id = command.default_location_id;
    }

    // Handle share_with_community change (may need pseudonym generation)
    if (command.share_with_community !== undefined) {
      updateData.share_with_community = command.share_with_community;

      // If enabling sharing and no pseudonym exists, generate one
      if (command.share_with_community) {
        const { data: currentProfileData } = await supabaseServiceClient
          .from("profiles")
          .select("pseudonym")
          .eq("id", userId)
          .single();

        if (!currentProfileData?.pseudonym) {
          updateData.pseudonym = await this.generatePseudonym();
        }
      }
    }

    // Execute update (use service client to bypass RLS)
    const { data, error } = await supabaseServiceClient
      .from("profiles")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      throw new InternalServerError("Failed to update profile");
    }

    return this.transformRowToDTO(data);
  }

  /**
   * Export all user data (GDPR compliance)
   * Performs parallel queries to gather all user-related data
   *
   * @param userId - Authenticated user ID
   * @returns Complete user data export
   * @throws InternalServerError on database errors
   */
  async exportUserData(userId: string): Promise<ProfileExportDTO> {
    try {
      // Parallel queries for all user data
      const [
        profile,
        locations,
        bikes,
        serviceRecords,
        serviceReminders,
        feedbacks,
        sharedOutfits,
      ] = await Promise.all([
        this.getProfile(userId),
        this.getLocations(userId),
        this.getBikes(userId),
        this.getServiceRecords(userId),
        this.getServiceReminders(userId),
        this.getFeedbacks(userId),
        this.getSharedOutfits(userId),
      ]);

      return {
        profile,
        locations,
        bikes,
        service_records: serviceRecords,
        service_reminders: serviceReminders,
        outfit_feedbacks: feedbacks,
        shared_outfits: sharedOutfits,
        export_timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error exporting user data:", error);
      throw new InternalServerError("Failed to export user data");
    }
  }

  /**
   * Delete user account (GDPR compliance)
   * Deletes profile which cascades to related records
   * Note: shared_outfits with pseudonym remain (anonymized)
   *
   * @param userId - Authenticated user ID
   * @throws InternalServerError on database errors
   */
  async deleteAccount(userId: string): Promise<void> {
    // Log deletion attempt (audit trail)
    console.info(`Account deletion requested for user: ${userId}`);

    // Delete profile (CASCADE will handle related records)
    const { error } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting account:", error);
      throw new InternalServerError("Failed to delete account");
    }

    // Note: shared_outfits with pseudonym will remain (anonymized)
    console.info(`Account deleted successfully for user: ${userId}`);
  }

  // ========================================
  // Helper methods
  // ========================================

  /**
   * Transform database row to ProfileDTO
   * Handles JSON parsing and type casting
   */
  private transformRowToDTO(row: ProfileRow): ProfileDTO {
    return {
      id: row.id,
      display_name: row.display_name,
      thermal_preferences: row.thermal_preferences as ThermalPreferences | null,
      thermal_adjustment: row.thermal_adjustment,
      feedback_count: row.feedback_count,
      pseudonym: row.pseudonym,
      reputation_badge: row.reputation_badge as ReputationBadgeEnum | null,
      share_with_community: row.share_with_community,
      units: row.units as "metric" | "imperial" | null,
      default_location_id: row.default_location_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Generate unique pseudonym for community sharing
   * Uses Polish cycling-themed words with retry logic
   */
  private async generatePseudonym(): Promise<string> {
    const adjectives = ["szybki", "wolny", "dzielny", "silny", "zwinny"];
    const nouns = ["kolarz", "rowerzysta", "pedał", "jeździec", "rajdowiec"];

    let pseudonym: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(1000 + Math.random() * 9000); // 4-digit number
      pseudonym = `${adj}_${noun}_${randomNum}`;

      // Check uniqueness
      const { data } = await supabaseClient
        .from("profiles")
        .select("pseudonym")
        .eq("pseudonym", pseudonym)
        .maybeSingle();

      if (!data) {
        return pseudonym;
      }

      attempts++;
    } while (attempts < maxAttempts);

    // Fallback: UUID-based pseudonym
    return `kolarz_${crypto.randomUUID().slice(0, 8)}`;
  }

  /**
   * Get all user locations with PostGIS coordinate extraction
   */
  private async getLocations(userId: string): Promise<LocationDTO[]> {
    const { data, error } = await supabaseClient
      .from("user_locations")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    // Extract coordinates for each location using RPC function
    const locationsWithCoordinates = await Promise.all(
      data.map(async (row) => {
        try {
          const { data: coords, error: coordsError } = await supabaseClient.rpc(
            "get_location_coordinates",
            { p_location_id: row.id, p_user_id: userId },
          );

          if (coordsError) {
            console.error(
              `[ProfileService] Error extracting coordinates for location ${row.id}:`,
              coordsError,
            );
            // Return location with default coordinates on error
            return {
              id: row.id,
              location: { latitude: 0, longitude: 0 },
              city: row.city,
              country_code: row.country_code,
              is_default: row.is_default,
              label: row.label,
              created_at: row.created_at,
              updated_at: row.updated_at,
            };
          }

          const coordinates =
            coords && coords.length > 0
              ? coords[0]
              : { latitude: 0, longitude: 0 };
          return {
            id: row.id,
            location: coordinates,
            city: row.city,
            country_code: row.country_code,
            is_default: row.is_default,
            label: row.label,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        } catch (err) {
          console.error(
            `[ProfileService] Error extracting coordinates for location ${row.id}:`,
            err,
          );
          // Return location with default coordinates on error
          return {
            id: row.id,
            location: { latitude: 0, longitude: 0 },
            city: row.city,
            country_code: row.country_code,
            is_default: row.is_default,
            label: row.label,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        }
      }),
    );

    return locationsWithCoordinates;
  }

  /**
   * Get all user bikes
   */
  private async getBikes(userId: string): Promise<BikeDTO[]> {
    const { data, error } = await supabaseClient
      .from("bikes")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    // Transform to BikeDTO (simplified for export)
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as any,
      purchase_date: row.purchase_date,
      current_mileage: row.current_mileage,
      status: row.status as any,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      next_service: null, // Not needed for export
      active_reminders_count: 0, // Not needed for export
      total_cost: 0, // Not needed for export
    }));
  }

  /**
   * Get all service records for user's bikes
   */
  private async getServiceRecords(userId: string): Promise<ServiceRecordDTO[]> {
    const { data, error } = await supabaseClient
      .from("service_records")
      .select("*, bikes!inner(user_id)")
      .eq("bikes.user_id", userId);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      bike_id: row.bike_id,
      service_date: row.service_date,
      mileage_at_service: row.mileage_at_service,
      service_type: row.service_type as any,
      service_location: row.service_location as any,
      cost: row.cost,
      currency: row.currency,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get all service reminders for user's bikes
   */
  private async getServiceReminders(
    userId: string,
  ): Promise<ServiceReminderDTO[]> {
    const { data, error } = await supabaseClient
      .from("service_reminders")
      .select("*, bikes!inner(user_id)")
      .eq("bikes.user_id", userId);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      bike_id: row.bike_id,
      service_type: row.service_type as any,
      triggered_at_mileage: row.triggered_at_mileage,
      interval_km: row.interval_km,
      target_mileage: row.target_mileage,
      current_mileage: 0, // Would need bike current_mileage
      km_remaining: 0, // Would need calculation
      status: "active" as any, // Would need calculation
      completed_at: row.completed_at,
      completed_service_id: row.completed_service_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get all outfit feedbacks for user
   */
  private async getFeedbacks(userId: string): Promise<FeedbackDTO[]> {
    const { data, error } = await supabaseClient
      .from("outfit_feedbacks")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      temperature: row.temperature,
      feels_like: row.feels_like,
      wind_speed: row.wind_speed,
      humidity: row.humidity,
      rain_mm: row.rain_mm,
      activity_type: row.activity_type as any,
      duration_minutes: row.duration_minutes,
      actual_outfit: row.actual_outfit as any,
      overall_rating: row.overall_rating,
      zone_ratings: row.zone_ratings as any,
      notes: row.notes,
      shared_with_community: row.shared_with_community,
      location_id: row.location_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Get all shared outfits for user
   */
  private async getSharedOutfits(
    _userId: string,
  ): Promise<CommunityOutfitDTO[]> {
    // This would need to query a view or join multiple tables
    // For now, return empty array as it's complex to implement without the view
    return [];
  }

  /**
   * Get user's default location ID for dashboard weather data
   * Used by dashboard endpoint to resolve location when not provided
   *
   * @param userId - Authenticated user ID
   * @returns Default location ID or null if not set
   * @throws InternalServerError on database errors
   */
  async getDefaultLocationId(userId: string): Promise<string | null> {
    try {
      // First ensure profile exists
      await this.ensureProfileExists(userId);

      // Use service client to bypass RLS for reading profile data
      const { data, error } = await supabaseServiceClient
        .from("profiles")
        .select("default_location_id")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Get default location error:", error);
        throw new InternalServerError("Failed to fetch default location");
      }

      return data?.default_location_id || null;
    } catch (error) {
      console.error("Get default location error:", error);
      throw new InternalServerError("Failed to fetch default location");
    }
  }

  /**
   * Ensures a profile exists for the user, creating one if necessary
   */
  private async ensureProfileExists(userId: string): Promise<void> {
    try {
      // Use service client to bypass RLS for profile operations
      const serviceClient = supabaseServiceClient;

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 = not found
        console.error("Error checking profile existence:", checkError);
        return; // Don't throw, just continue
      }

      if (existingProfile) {
        console.info(`Profile already exists for user: ${userId}`);
        return; // Profile exists
      }

      // Profile doesn't exist, create it
      console.info(`Creating profile for user: ${userId}`);

      // Create profile with default values (service role can create without RLS restrictions)
      const { error: createError } = await serviceClient
        .from("profiles")
        .insert({
          id: userId,
          display_name: `Użytkownik ${userId.slice(0, 8)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error(
          "Error creating profile with service client:",
          createError,
        );
        // Try with regular client as fallback (might fail due to RLS)
        const { error: fallbackError } = await supabaseClient
          .from("profiles")
          .insert({
            id: userId,
            display_name: `Użytkownik ${userId.slice(0, 8)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (fallbackError) {
          console.error(
            "Error creating profile with fallback client:",
            fallbackError,
          );
        } else {
          console.info(
            `Profile created successfully for user: ${userId} (fallback)`,
          );
        }
      } else {
        console.info(`Profile created successfully for user: ${userId}`);
      }
    } catch (error) {
      console.error("Error in ensureProfileExists:", error);
      // Don't throw - we don't want to break the dashboard if profile creation fails
    }
  }

  /**
   * Get personalization status for dashboard
   * Includes feedback count, thermal adjustment, and personalization state
   *
   * @param userId - Authenticated user ID
   * @returns PersonalizationStatusDTO with computed fields
   * @throws InternalServerError on database errors
   */
  async getPersonalizationStatus(userId: string): Promise<{
    feedback_count: number;
    personalization_active: boolean;
    thermal_adjustment: number;
    next_personalization_at: number;
  }> {
    try {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("feedback_count, thermal_adjustment")
        .eq("id", userId);

      if (error) {
        console.error("Get personalization status error:", error);
        throw new InternalServerError("Failed to fetch personalization status");
      }

      // Handle case where profile doesn't exist yet
      const profileData = data && data.length > 0 ? data[0] : null;
      const feedbackCount = profileData?.feedback_count || 0;
      const thermalAdjustment = profileData?.thermal_adjustment || 0;

      return {
        feedback_count: feedbackCount,
        personalization_active: feedbackCount >= 5,
        thermal_adjustment: thermalAdjustment,
        next_personalization_at:
          feedbackCount < 5 ? 5 : feedbackCount + (5 - (feedbackCount % 5)),
      };
    } catch (error) {
      console.error("Get personalization status error:", error);
      throw new InternalServerError("Failed to fetch personalization status");
    }
  }
}
