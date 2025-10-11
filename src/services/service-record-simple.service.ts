import { supabaseClient } from "../db/supabase.client";
import type {
  ServiceRecordDTO,
  ServicesListDTO
} from "../types";

/**
 * Simplified ServiceRecordService for testing
 */
export class ServiceRecordService {
  /**
   * Fetches service records for a bike (simplified version)
   */
  async getServicesByBikeId(
    userId: string,
    bikeId: string,
    params: any
  ): Promise<ServicesListDTO> {
    // Simple query without complex joins
    const { data: services, error, count } = await supabaseClient
      .from("service_records")
      .select("*", { count: "exact" })
      .eq("bike_id", bikeId)
      .limit(params.limit || 50)
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 50) - 1);

    if (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw new Error("Failed to fetch service records");
    }

    const total = count || 0;
    const has_more = total > (params.offset || 0) + (params.limit || 50);

    return {
      services: services?.map(this.mapToDTO) || [],
      total,
      has_more,
    };
  }

  /**
   * Maps database row to DTO
   */
  private mapToDTO(row: any): ServiceRecordDTO {
    return {
      id: row.id,
      bike_id: row.bike_id,
      service_date: row.service_date,
      mileage_at_service: row.mileage_at_service,
      service_type: row.service_type,
      service_location: row.service_location,
      cost: row.cost,
      currency: row.currency,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
