import { supabaseClient } from "../db/supabase.client";
import type {
  LocationDTO,
  CreateLocationCommand,
  UpdateLocationCommand,
} from "../types";
import { ConflictError, NotFoundError } from "../lib/errors";

/**
 * SimpleLocationService - Simplified location management without PostGIS
 * Uses separate latitude/longitude columns instead of GEOGRAPHY type
 */
export class SimpleLocationService {
  /**
   * Fetches all locations for a user
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
      console.error('[SimpleLocationService] Error fetching locations:', error);
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    return (data || []).map((row) => this.transformToDTO(row));
  }

  /**
   * Creates a new location
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
        console.error('[SimpleLocationService] Error updating default locations:', updateError);
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Create new location with separate lat/lng columns
    const { data, error } = await supabaseClient
      .from('user_locations')
      .insert({
        user_id: userId,
        latitude: command.latitude,
        longitude: command.longitude,
        city: command.city,
        country_code: command.country_code,
        is_default: command.is_default ?? false,
        label: command.label ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[SimpleLocationService] Error creating location:', error);
      throw new Error(`Failed to create location: ${error.message}`);
    }

    return this.transformToDTO(data);
  }

  /**
   * Updates an existing location
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
        console.error('[SimpleLocationService] Error updating default locations:', updateError);
        throw new Error(`Failed to update default location: ${updateError.message}`);
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (command.latitude !== undefined) updateData.latitude = command.latitude;
    if (command.longitude !== undefined) updateData.longitude = command.longitude;
    if (command.city !== undefined) updateData.city = command.city;
    if (command.country_code !== undefined) updateData.country_code = command.country_code;
    if (command.is_default !== undefined) updateData.is_default = command.is_default;
    if (command.label !== undefined) updateData.label = command.label;

    // Update location
    const { data, error } = await supabaseClient
      .from('user_locations')
      .update(updateData)
      .eq('id', locationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[SimpleLocationService] Error updating location:', error);
      throw new Error(`Failed to update location: ${error.message}`);
    }

    return this.transformToDTO(data);
  }

  /**
   * Deletes a location with business rule validation
   */
  async deleteLocation(userId: string, locationId: string): Promise<void> {
    // Fetch all user locations to check business rules
    const { data: userLocations, error: fetchError } = await supabaseClient
      .from('user_locations')
      .select('id, is_default')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('[SimpleLocationService] Error fetching user locations:', fetchError);
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
      console.error('[SimpleLocationService] Error deleting location:', deleteError);
      throw new Error(`Failed to delete location: ${deleteError.message}`);
    }
  }

  /**
   * Transforms database row to LocationDTO
   */
  private transformToDTO(row: any): LocationDTO {
    return {
      id: row.id,
      location: {
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
      },
      city: row.city,
      country_code: row.country_code,
      is_default: row.is_default,
      label: row.label,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Helper method to find nearby locations (simplified version without spatial queries)
   * Uses basic distance calculation instead of PostGIS
   */
  async getNearbyLocations(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 50
  ): Promise<LocationDTO[]> {
    // Get all locations and filter by approximate distance
    const { data, error } = await supabaseClient
      .from('user_locations')
      .select('*');

    if (error) {
      console.error('[SimpleLocationService] Error fetching nearby locations:', error);
      return [];
    }

    // Simple distance calculation (Haversine formula approximation)
    const nearbyLocations = (data || []).filter(row => {
      const distance = this.calculateDistance(
        latitude, longitude,
        parseFloat(row.latitude), parseFloat(row.longitude)
      );
      return distance <= radiusKm;
    });

    return nearbyLocations.map(row => this.transformToDTO(row));
  }

  /**
   * Simple distance calculation between two points (in kilometers)
   * Haversine formula approximation
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }
}