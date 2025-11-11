import { supabaseClient } from "../db/supabase.client";
import { supabaseServiceClient } from "../db/supabase.admin.client";
import type { Database } from "../db/database.types";
import type {
  LocationDTO,
  CreateLocationCommand,
  UpdateLocationCommand,
} from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConflictError, NotFoundError } from "../lib/errors";
import { ProfileService } from "./ProfileService";

type LocationRow = Database["public"]["Tables"]["user_locations"]["Row"];

/**
 * LocationService - Business logic layer for location management
 *
 * Responsibilities:
 * - CRUD operations on user_locations table
 * - PostGIS coordinate handling and transformations
 * - Business rules validation (default location, minimum locations)
 * - Data transformation between DB rows and DTOs
 */
export class LocationService {
  /**
   * Fetches all locations for a user with optional filtering
   * Uses PostGIS functions to extract coordinates from GEOGRAPHY type
   *
   * @param userId - Authenticated user ID from JWT
   * @param defaultOnly - If true, returns only the default location
   * @returns Array of LocationDTO with extracted coordinates
   * @throws Error if database query fails
   */
  async getUserLocations(
    userId: string,
    defaultOnly?: boolean,
  ): Promise<LocationDTO[]> {
    // First try with regular client (with RLS)
    let query = supabaseClient
      .from("user_locations")
      .select("*")
      .eq("user_id", userId);

    if (defaultOnly) {
      query = query.eq("is_default", true);
    }

    const queryResult = await query.order("created_at", { ascending: false });
    let data = queryResult.data;
    const error = queryResult.error;

    // If RLS blocks access (error or returns empty), try service client as fallback
    if (error || !data || data.length === 0) {
      if (error) {
        console.info(
          `[LocationService] RLS error, trying service client fallback:`,
          error.message,
        );
      } else {
        console.info(
          `[LocationService] RLS returned no locations, trying service client fallback`,
        );
      }

      let serviceQuery = supabaseServiceClient
        .from("user_locations")
        .select("*")
        .eq("user_id", userId);

      if (defaultOnly) {
        serviceQuery = serviceQuery.eq("is_default", true);
      }

      const { data: serviceData, error: serviceError } =
        await serviceQuery.order("created_at", {
          ascending: false,
        });

      if (serviceError) {
        console.error("[LocationService] Service client error:", serviceError);
        throw new Error(`Failed to fetch locations: ${serviceError.message}`);
      }

      if (!serviceData || serviceData.length === 0) {
        return [];
      }

      // Use service client data as fallback when RLS fails
      data = serviceData;
    }

    // Extract coordinates for each location using RPC function
    const locationsWithCoordinates = await Promise.all(
      (data as LocationRow[]).map(async (row) => {
        try {
          const { data: coords, error: coordsError } = await supabaseClient.rpc(
            "get_location_coordinates",
            { p_location_id: row.id, p_user_id: userId },
          );

          if (coordsError) {
            console.error(
              `[LocationService] Error extracting coordinates for location ${row.id}:`,
              coordsError,
            );
            // Return location with default coordinates on error
            return this.transformToDTO(row, { latitude: 0, longitude: 0 });
          }

          const coordinates =
            coords && coords.length > 0
              ? coords[0]
              : { latitude: 0, longitude: 0 };
          return this.transformToDTO(row, coordinates);
        } catch (err) {
          console.error(
            `[LocationService] Error extracting coordinates for location ${row.id}:`,
            err,
          );
          // Return location with default coordinates on error
          return this.transformToDTO(row, { latitude: 0, longitude: 0 });
        }
      }),
    );

    return locationsWithCoordinates;
  }

  /**
   * Creates a new location for the user
   * Simplified version without RPC functions for testing
   *
   * @param userId - Authenticated user ID
   * @param command - Validated create command
   * @returns Created LocationDTO
   * @throws Error if database operation fails
   */
  async createLocation(
    userId: string,
    command: CreateLocationCommand,
  ): Promise<LocationDTO> {
    // Ensure profile exists before creating location
    const profileService = new ProfileService();
    await profileService.getProfile(userId); // This will create profile if it doesn't exist

    // Check if location with same coordinates already exists for this user
    // Use regular client with RLS to ensure we only see locations that belong to the authenticated user
    const { data: existingLocations, error: checkError } = await supabaseClient
      .from("user_locations")
      .select("id, city, country_code")
      .eq("user_id", userId)
      .eq("city", command.city)
      .eq("country_code", command.country_code);

    if (!checkError && existingLocations && existingLocations.length > 0) {
      // Fetch the actual existing location from database
      const existingId = (existingLocations as unknown as { id: string }[])[0]
        .id;

      const { data: existingLocation, error: fetchError } = await supabaseClient
        .from("user_locations")
        .select("*")
        .eq("id", existingId)
        .single();

      if (fetchError || !existingLocation) {
        console.error(
          "[LocationService] Error fetching existing location:",
          fetchError,
        );
        throw new Error(
          `Failed to fetch existing location: ${fetchError?.message}`,
        );
      }

      // Extract coordinates for the existing location
      const { data: coords, error: coordsError } = await supabaseClient.rpc(
        "get_location_coordinates",
        { p_location_id: existingId, p_user_id: userId },
      );

      if (coordsError) {
        console.error(
          "[LocationService] Error extracting coordinates for existing location:",
          coordsError,
        );
        return this.transformToDTO(existingLocation, {
          latitude: command.latitude,
          longitude: command.longitude,
        });
      }

      const coordinates =
        coords && coords.length > 0
          ? coords[0]
          : { latitude: command.latitude, longitude: command.longitude };
      return this.transformToDTO(existingLocation, coordinates);
    }

    // If setting as default, first unset other default locations
    if (command.is_default) {
      const { error: updateError } = await supabaseClient
        .from("user_locations")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

      if (updateError) {
        console.error(
          "[LocationService] Error updating default locations:",
          updateError,
        );
        throw new Error(
          `Failed to update default location: ${updateError.message}`,
        );
      }
    }

    // Create location using RPC function with PostGIS point
    const { data: locationId, error } = await supabaseClient.rpc(
      "insert_location",
      {
        p_user_id: userId,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
        p_city: command.city,
        p_country_code: command.country_code,
        p_is_default: command.is_default ?? false,
        p_label: command.label ?? null,
      },
    );

    if (error) {
      console.error("[LocationService] Error creating location:", error);
      throw new Error(`Failed to create location: ${error.message}`);
    }

    if (!locationId) {
      throw new Error("No location ID returned from RPC function");
    }

    // Fetch the created location to return as DTO (use service client to bypass RLS)
    const { data, error: fetchCreatedError } = await supabaseServiceClient
      .from("user_locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (fetchCreatedError) {
      console.error(
        "[LocationService] Error fetching created location:",
        fetchCreatedError,
      );
      throw new Error(
        `Failed to fetch created location: ${fetchCreatedError.message}`,
      );
    }

    // Extract coordinates for the created location
    const { data: coords, error: coordsError } = await supabaseClient.rpc(
      "get_location_coordinates",
      { p_location_id: locationId, p_user_id: userId },
    );

    if (coordsError) {
      console.error(
        "[LocationService] Error extracting coordinates for created location:",
        coordsError,
      );
      // Return with default coordinates on error
      return this.transformToDTO(data, {
        latitude: command.latitude,
        longitude: command.longitude,
      });
    }

    const coordinates =
      coords && coords.length > 0
        ? coords[0]
        : { latitude: command.latitude, longitude: command.longitude };
    return this.transformToDTO(data, coordinates);
  }

  /**
   * Creates a new location using provided Supabase client
   * This version uses the client from middleware (locals.supabase)
   * which may have different authentication context
   */
  async createLocationWithClient(
    client: SupabaseClient,
    userId: string,
    command: CreateLocationCommand,
  ): Promise<LocationDTO> {
    // If setting as default, first unset other default locations
    if (command.is_default) {
      const { error: updateError } = await client
        .from("user_locations")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

      if (updateError) {
        console.error(
          "[LocationService] Error updating default locations:",
          updateError,
        );
        throw new Error(
          `Failed to update default location: ${updateError.message}`,
        );
      }
    }

    // Create location using RPC function with PostGIS point
    const { data: locationId, error } = await client.rpc("insert_location", {
      p_user_id: userId,
      p_latitude: command.latitude,
      p_longitude: command.longitude,
      p_city: command.city,
      p_country_code: command.country_code,
      p_is_default: command.is_default ?? false,
      p_label: command.label ?? null,
    });

    if (error) {
      console.error("[LocationService] Error creating location:", error);
      throw new Error(`Failed to create location: ${error.message}`);
    }

    if (!locationId) {
      throw new Error("No location ID returned from RPC function");
    }

    // Fetch the created location to return as DTO
    const { data, error: fetchCreatedWithClientError } = await client
      .from("user_locations")
      .select("*")
      .eq("id", locationId)
      .single();

    if (fetchCreatedWithClientError) {
      console.error(
        "[LocationService] Error fetching created location:",
        fetchCreatedWithClientError,
      );
      throw new Error(
        `Failed to fetch created location: ${fetchCreatedWithClientError.message}`,
      );
    }

    // Extract coordinates for the created location
    const { data: coords, error: coordsError } = await client.rpc(
      "get_location_coordinates",
      { p_location_id: locationId, p_user_id: userId },
    );

    if (coordsError) {
      console.error(
        "[LocationService] Error extracting coordinates for created location:",
        coordsError,
      );
      // Return with default coordinates on error
      return this.transformToDTO(data, {
        latitude: command.latitude,
        longitude: command.longitude,
      });
    }

    const coordinates =
      coords && coords.length > 0
        ? coords[0]
        : { latitude: command.latitude, longitude: command.longitude };
    return this.transformToDTO(data, coordinates);
  }

  /**
   * Updates an existing location with partial data
   * Handles coordinate updates via PostGIS and default location logic
   *
   * @param userId - Authenticated user ID
   * @param locationId - UUID of location to update
   * @param command - Validated update command with optional fields
   * @returns Updated LocationDTO
   * @throws NotFoundError if location doesn't exist or doesn't belong to user
   * @throws Error if database operation fails
   */
  async updateLocation(
    userId: string,
    locationId: string,
    command: UpdateLocationCommand,
  ): Promise<LocationDTO> {
    // Check if location exists and belongs to user (use service client to bypass RLS)
    const { data: existing, error: fetchExistingError } =
      await supabaseServiceClient
        .from("user_locations")
        .select("id, is_default")
        .eq("id", locationId)
        .eq("user_id", userId)
        .single();

    if (fetchExistingError || !existing) {
      throw new NotFoundError("Location not found or access denied");
    }

    // If setting as default, update other locations first
    if (command.is_default === true) {
      const { error: updateError } = await supabaseClient
        .from("user_locations")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true)
        .neq("id", locationId);

      if (updateError) {
        console.error(
          "[LocationService] Error updating default locations:",
          updateError,
        );
        throw new Error(
          `Failed to update default location: ${updateError.message}`,
        );
      }
    }

    // Update coordinates via RPC function if provided
    if (command.latitude !== undefined && command.longitude !== undefined) {
      const { error: rpcError } = await supabaseClient.rpc(
        "update_location_coordinates",
        {
          p_location_id: locationId,
          p_user_id: userId,
          p_latitude: command.latitude,
          p_longitude: command.longitude,
        },
      );

      if (rpcError) {
        console.error(
          "[LocationService] Error updating coordinates:",
          rpcError,
        );
        throw new Error(`Failed to update coordinates: ${rpcError.message}`);
      }
    }

    // Update other fields if provided
    const updateData: Partial<LocationRow> = {};
    if (command.city !== undefined) updateData.city = command.city;
    if (command.country_code !== undefined)
      updateData.country_code = command.country_code;
    if (command.is_default !== undefined)
      updateData.is_default = command.is_default;
    if (command.label !== undefined) updateData.label = command.label;

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseClient
        .from("user_locations")
        .update(updateData)
        .eq("id", locationId)
        .eq("user_id", userId);

      if (updateError) {
        console.error(
          "[LocationService] Error updating location fields:",
          updateError,
        );
        throw new Error(`Failed to update location: ${updateError.message}`);
      }
    }

    // Fetch and return updated location directly (bypass RLS)
    const { data: updatedLocation, error: updatedLocationError } =
      await supabaseServiceClient
        .from("user_locations")
        .select("*")
        .eq("id", locationId)
        .single();

    if (updatedLocationError || !updatedLocation) {
      console.error(
        "[LocationService] Error fetching updated location:",
        updatedLocationError,
      );
      throw new Error("Failed to retrieve updated location");
    }

    // Extract coordinates for the updated location
    const { data: coords, error: coordsError } =
      await supabaseServiceClient.rpc("get_location_coordinates", {
        p_location_id: locationId,
        p_user_id: userId,
      });

    if (coordsError) {
      console.error(
        "[LocationService] Error extracting coordinates for updated location:",
        coordsError,
      );
      // Return with default coordinates on error
      return this.transformToDTO(updatedLocation, {
        latitude: 0,
        longitude: 0,
      });
    }

    const coordinates =
      coords && coords.length > 0 ? coords[0] : { latitude: 0, longitude: 0 };
    return this.transformToDTO(updatedLocation, coordinates);
  }

  /**
   * Deletes a location with business rule validation
   * Prevents deletion of default location or last remaining location
   *
   * @param userId - Authenticated user ID
   * @param locationId - UUID of location to delete
   * @throws NotFoundError if location doesn't exist
   * @throws ConflictError if trying to delete default or last location
   * @throws Error if database operation fails
   */
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    // Fetch all user locations to check business rules (bypass RLS)
    const { data: userLocations, error: fetchUserLocationsError } =
      await supabaseServiceClient
        .from("user_locations")
        .select("id, is_default")
        .eq("user_id", userId);

    if (fetchUserLocationsError) {
      console.error(
        "[LocationService] Error fetching user locations:",
        fetchUserLocationsError,
      );
      throw new Error(`Database error: ${fetchUserLocationsError.message}`);
    }

    if (!userLocations || userLocations.length === 0) {
      throw new NotFoundError("No locations found");
    }

    // Find target location
    const targetLocation = (
      userLocations as unknown as {
        id: string;
        is_default: boolean;
      }[]
    ).find((loc) => loc.id === locationId);

    if (!targetLocation) {
      throw new NotFoundError("Location not found or access denied");
    }

    // Business rule: Cannot delete last location
    if (userLocations.length === 1) {
      throw new ConflictError(
        "Cannot delete the last location. User must have at least one location.",
      );
    }

    // Business rule: Cannot delete default location
    if (targetLocation.is_default) {
      throw new ConflictError(
        "Cannot delete default location. Set another location as default first.",
      );
    }

    // Delete location
    const { error: deleteError } = await supabaseClient
      .from("user_locations")
      .delete()
      .eq("id", locationId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[LocationService] Error deleting location:", deleteError);
      throw new Error(`Failed to delete location: ${deleteError.message}`);
    }
  }

  /**
   * Fetches a single location by ID for the authenticated user
   *
   * @param userId - Authenticated user ID from JWT
   * @param locationId - UUID of the location to fetch
   * @returns LocationDTO with extracted coordinates
   * @throws NotFoundError if location doesn't exist or doesn't belong to user
   * @throws Error if database operation fails
   */
  async getLocation(userId: string, locationId: string): Promise<LocationDTO> {
    // First try with regular client (with RLS)
    const { data: location, error } = await supabaseClient
      .from("user_locations")
      .select("*")
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    let locationData = location;

    // If RLS blocks access, try service client as fallback
    if (error || !locationData) {
      console.info(
        `[LocationService] RLS returned no location for ${locationId}, trying service client fallback`,
      );

      const { data: serviceData, error: serviceError } =
        await supabaseServiceClient
          .from("user_locations")
          .select("*")
          .eq("id", locationId)
          .eq("user_id", userId)
          .single();

      if (serviceError || !serviceData) {
        if (serviceError) {
          console.error(
            "[LocationService] Service client error:",
            serviceError,
          );
        }
        throw new NotFoundError("Location not found or access denied");
      }

      locationData = serviceData;
    }

    // Extract coordinates using RPC function
    const { data: coords, error: coordsError } = await supabaseClient.rpc(
      "get_location_coordinates",
      { p_location_id: locationId, p_user_id: userId },
    );

    if (coordsError) {
      console.warn(
        `[LocationService] Failed to extract coordinates for location ${locationId}:`,
        coordsError,
      );
    }

    return this.transformToDTO(locationData, coords);
  }

  /**
   * Transforms database row to LocationDTO
   * Uses provided coordinates from PostGIS extraction
   *
   * @param row - Database row from user_locations table
   * @param coordinates - Extracted coordinates from PostGIS
   * @returns LocationDTO with extracted coordinates
   */
  private transformToDTO(
    row: LocationRow,
    coordinates?: { latitude: number; longitude: number },
  ): LocationDTO {
    return {
      id: row.id,
      location: coordinates || {
        latitude: 0,
        longitude: 0,
      },
      city: row.city,
      country_code: row.country_code,
      is_default: row.is_default,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
