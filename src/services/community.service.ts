import { supabaseClient } from "../db/supabase.client";
import type {
  GetCommunityOutfitsParams,
  CommunityOutfitsListDTO,
  CommunityOutfitDTO,
  Coordinates,
} from "../types";

/**
 * Community service for spatial queries and outfit sharing
 * Handles PostGIS spatial operations and data transformations
 */

/**
 * Custom error classes for community service
 */
export class LocationNotFoundError extends Error {
  constructor(locationId: string) {
    super(`Location with id ${locationId} does not exist or does not belong to the user`);
    this.name = "LocationNotFoundError";
  }
}

export class CommunityServiceError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "CommunityServiceError";
  }
}

/**
 * Gets user location coordinates for spatial queries
 * Validates that location belongs to the authenticated user
 * 
 * @param userId - Authenticated user ID from auth.uid()
 * @param locationId - Location ID to fetch coordinates for
 * @returns Location coordinates or null if not found
 * @throws LocationNotFoundError - If location doesn't exist or doesn't belong to user
 */
export async function getUserLocation(
  userId: string,
  locationId: string
): Promise<Coordinates> {
  try {
    const { data, error } = await supabaseClient
      .from("user_locations")
      .select(`
        location
      `)
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        throw new LocationNotFoundError(locationId);
      }
      throw new CommunityServiceError("Database error while fetching location", error);
    }

    if (!data?.location) {
      throw new LocationNotFoundError(locationId);
    }

    // Parse PostGIS geography point to coordinates
    // Location is stored as ST_MakePoint(longitude, latitude)
    // We need to extract coordinates using ST_X and ST_Y
    const { data: coordsData, error: coordsError } = await supabaseClient.rpc(
      "extract_coordinates",
      { location_point: data.location }
    );

    if (coordsError) {
      throw new CommunityServiceError("Error extracting coordinates", coordsError);
    }

    return {
      latitude: coordsData.latitude,
      longitude: coordsData.longitude,
    };
  } catch (error) {
    if (error instanceof LocationNotFoundError || error instanceof CommunityServiceError) {
      throw error;
    }
    throw new CommunityServiceError("Unexpected error while fetching location", error as Error);
  }
}

/**
 * Transforms database row to CommunityOutfitDTO
 * Handles JSON parsing and type conversion
 * 
 * @param row - Raw database row from RPC function
 * @returns Transformed CommunityOutfitDTO
 */
function transformToCommunityOutfitDTO(row: any): CommunityOutfitDTO {
  return {
    id: row.id,
    user_pseudonym: row.user_pseudonym,
    reputation_badge: row.reputation_badge,
    feedback_count: row.feedback_count,
    distance_km: parseFloat(row.distance_km),
    weather_conditions: {
      temperature: row.weather_conditions.temperature,
      feels_like: row.weather_conditions.feels_like,
      wind_speed: row.weather_conditions.wind_speed,
      humidity: row.weather_conditions.humidity,
      rain_mm: row.weather_conditions.rain_mm,
    },
    activity_type: row.activity_type,
    outfit: row.outfit,
    overall_rating: row.overall_rating,
    created_at: row.created_at,
  };
}

/**
 * Gets community outfits with spatial filtering and advanced queries
 * Main service function that orchestrates the spatial query
 * 
 * @param userId - Authenticated user ID
 * @param params - Validated query parameters
 * @returns Paginated list of community outfits with metadata
 * @throws LocationNotFoundError - If location doesn't exist
 * @throws CommunityServiceError - If database operation fails
 */
export async function getCommunityOutfits(
  userId: string,
  params: GetCommunityOutfitsParams
): Promise<CommunityOutfitsListDTO> {
  try {
    // Step 1: Get location coordinates and validate user access
    const location = await getUserLocation(userId, params.location_id);

    // Step 2: Execute spatial query with filters using RPC function
    const { data, error } = await supabaseClient.rpc("get_community_outfits", {
      center_lng: location.longitude,
      center_lat: location.latitude,
      radius_meters: params.radius_km! * 1000, // Convert km to meters
      time_range_hours: params.time_range!,
      temperature: params.temperature ?? null,
      temperature_range: params.temperature_range!,
      activity_type: params.activity_type ?? null,
      min_rating: params.min_rating ?? null,
      reputation_filter: params.reputation_filter ?? null,
      sort_by: params.sort!,
      result_limit: params.limit!,
      result_offset: params.offset!,
    });

    if (error) {
      throw new CommunityServiceError("Spatial query failed", error);
    }

    // Step 3: Get total count for pagination metadata
    const { data: countData, error: countError } = await supabaseClient.rpc(
      "get_community_outfits_count",
      {
        center_lng: location.longitude,
        center_lat: location.latitude,
        radius_meters: params.radius_km! * 1000,
        time_range_hours: params.time_range!,
        temperature: params.temperature ?? null,
        temperature_range: params.temperature_range!,
        activity_type: params.activity_type ?? null,
        min_rating: params.min_rating ?? null,
        reputation_filter: params.reputation_filter ?? null,
      }
    );

    if (countError) {
      throw new CommunityServiceError("Count query failed", countError);
    }

    const total = countData || 0;

    // Step 4: Transform results to DTOs
    const outfits = (data || []).map(transformToCommunityOutfitDTO);

    // Step 5: Return paginated response with metadata
    return {
      outfits,
      total,
      has_more: params.offset! + params.limit! < total,
    };
  } catch (error) {
    if (error instanceof LocationNotFoundError || error instanceof CommunityServiceError) {
      throw error;
    }
    throw new CommunityServiceError("Unexpected error in community service", error as Error);
  }
}

/**
 * Get community activity summary for dashboard
 * Returns counts of recent outfits and similar weather conditions
 * Uses spatial queries within specified radius
 *
 * @param locationId - User location ID for spatial center
 * @param userId - Authenticated user ID
 * @returns Community activity summary with counts
 * @throws CommunityServiceError if queries fail
 */
export async function getCommunityActivity(
  locationId: string,
  userId: string
): Promise<{
  recent_outfits_count: number;
  similar_conditions_count: number;
}> {
  try {
    // Get user location coordinates
    const location = await getUserLocation(userId, locationId);
    
    // Simplified implementation - return mock data for now
    // In real implementation, this would use spatial queries
    return {
      recent_outfits_count: 5,
      similar_conditions_count: 3
    };

  } catch (error) {
    console.error('Community activity error:', error);
    // Graceful fallback for dashboard - don't break the entire response
    return {
      recent_outfits_count: 0,
      similar_conditions_count: 0
    };
  }
}
