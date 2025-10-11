import { supabaseClient } from "../db/supabase.client";
import type {
  LocationDTO,
  CreateLocationCommand,
  UpdateLocationCommand,
  Database,
} from "../types";
import { ConflictError, NotFoundError } from "../lib/errors";

type LocationRow = Database['public']['Tables']['user_locations']['Row'];

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
   * @returns Array of LocationDTO with transformed coordinates
   * @throws Error if database query fails
   */
  async getUserLocations(userId: string, defaultOnly?: boolean): Promise<LocationDTO[]> {
    let query = supabaseClient
      .from('user_locations')
      .select('*')
      .eq('user_id', userId);

    if (defaultOnly) {
      query = query.eq('is_default', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[LocationService] Error fetching locations:', error);
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    // For now, return empty coordinates - will be fixed when PostGIS extraction works
    return (data || []).map((row) => this.transformToDTO(row));
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
    command: CreateLocationCommand
  ): Promise<LocationDTO> {
    // If setting as default, first unset other default locations
    if (command.is_default) {
      const { error: updateError } = await supabaseClient
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        console.error('[LocationService] Error updating default locations:', updateError);
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Create location using RPC function with PostGIS point
    const { data: locationId, error } = await supabaseClient
      .rpc('insert_location', {
        p_user_id: userId,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
        p_city: command.city,
        p_country_code: command.country_code,
        p_is_default: command.is_default ?? false,
        p_label: command.label ?? null,
      });

    if (error) {
      console.error('[LocationService] Error creating location:', error);
      throw new Error(`Failed to create location: ${error.message}`);
    }

    if (!locationId) {
      throw new Error('No location ID returned from RPC function');
    }

    // Fetch the created location to return as DTO
    const { data, error: fetchError } = await supabaseClient
      .from('user_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (fetchError) {
      console.error('[LocationService] Error fetching created location:', fetchError);
      throw new Error(`Failed to fetch created location: ${fetchError.message}`);
    }

    return this.transformToDTO(data);
  }

  /**
   * Creates a new location using provided Supabase client
   * This version uses the client from middleware (locals.supabase)
   * which may have different authentication context
   */
  async createLocationWithClient(
    client: any,
    userId: string,
    command: CreateLocationCommand
  ): Promise<LocationDTO> {
    // If setting as default, first unset other default locations
    if (command.is_default) {
      const { error: updateError } = await client
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);

      if (updateError) {
        console.error('[LocationService] Error updating default locations:', updateError);
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Create location using RPC function with PostGIS point
    const { data: locationId, error } = await client
      .rpc('insert_location', {
        p_user_id: userId,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
        p_city: command.city,
        p_country_code: command.country_code,
        p_is_default: command.is_default ?? false,
        p_label: command.label ?? null,
      });

    if (error) {
      console.error('[LocationService] Error creating location:', error);
      throw new Error(`Failed to create location: ${error.message}`);
    }

    if (!locationId) {
      throw new Error('No location ID returned from RPC function');
    }

    // Fetch the created location to return as DTO
    const { data, error: fetchError } = await client
      .from('user_locations')
      .select('*')
      .eq('id', locationId)
      .single();

    if (fetchError) {
      console.error('[LocationService] Error fetching created location:', fetchError);
      throw new Error(`Failed to fetch created location: ${fetchError.message}`);
    }

    return this.transformToDTO(data);
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
    command: UpdateLocationCommand
  ): Promise<LocationDTO> {
    // Check if location exists and belongs to user
    const { data: existing, error: fetchError } = await supabaseClient
      .from('user_locations')
      .select('id, is_default')
      .eq('id', locationId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundError('Location not found or access denied');
    }

    // If setting as default, update other locations first
    if (command.is_default === true) {
      const { error: updateError } = await supabaseClient
        .from('user_locations')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('id', locationId);

      if (updateError) {
        console.error('[LocationService] Error updating default locations:', updateError);
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Update coordinates via RPC function if provided
    if (command.latitude !== undefined && command.longitude !== undefined) {
      const { error: rpcError } = await supabaseClient.rpc('update_location_coordinates', {
        p_location_id: locationId,
        p_user_id: userId,
        p_latitude: command.latitude,
        p_longitude: command.longitude,
      });

      if (rpcError) {
        console.error('[LocationService] Error updating coordinates:', rpcError);
        throw new Error(`Failed to update coordinates: ${rpcError.message}`);
      }
    }

    // Update other fields if provided
    const updateData: Partial<LocationRow> = {};
    if (command.city !== undefined) updateData.city = command.city;
    if (command.country_code !== undefined) updateData.country_code = command.country_code;
    if (command.is_default !== undefined) updateData.is_default = command.is_default;
    if (command.label !== undefined) updateData.label = command.label;

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseClient
        .from('user_locations')
        .update(updateData)
        .eq('id', locationId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[LocationService] Error updating location fields:', updateError);
        throw new Error(`Failed to update location: ${updateError.message}`);
      }
    }

    // Fetch and return updated location
    const locations = await this.getUserLocations(userId, false);
    const updated = locations.find((loc) => loc.id === locationId);

    if (!updated) {
      throw new Error('Failed to retrieve updated location');
    }

    return updated;
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
    // Fetch all user locations to check business rules
    const { data: userLocations, error: fetchError } = await supabaseClient
      .from('user_locations')
      .select('id, is_default')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[LocationService] Error fetching user locations:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (!userLocations || userLocations.length === 0) {
      throw new NotFoundError('No locations found');
    }

    // Find target location
    const targetLocation = userLocations.find((loc) => loc.id === locationId);

    if (!targetLocation) {
      throw new NotFoundError('Location not found or access denied');
    }

    // Business rule: Cannot delete last location
    if (userLocations.length === 1) {
      throw new ConflictError(
        'Cannot delete the last location. User must have at least one location.'
      );
    }

    // Business rule: Cannot delete default location
    if (targetLocation.is_default) {
      throw new ConflictError(
        'Cannot delete default location. Set another location as default first.'
      );
    }

    // Delete location
    const { error: deleteError } = await supabaseClient
      .from('user_locations')
      .delete()
      .eq('id', locationId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[LocationService] Error deleting location:', deleteError);
      throw new Error(`Failed to delete location: ${deleteError.message}`);
    }
  }

  /**
   * Transforms database row to LocationDTO
   * For now returns placeholder coordinates - PostGIS extraction needs to be implemented
   *
   * @param row - Database row from user_locations table
   * @returns LocationDTO with placeholder coordinates
   */
  private transformToDTO(row: any): LocationDTO {
    return {
      id: row.id,
      location: {
        // TODO: Extract coordinates from PostGIS location field
        // For now return placeholder coordinates
        latitude: 52.237, // Warsaw placeholder
        longitude: 21.017, // Warsaw placeholder
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
