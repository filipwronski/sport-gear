import { supabaseClient } from "../db/supabase.client";

/**
 * Minimal ServiceRecordService for testing
 */
export class ServiceRecordService {
  /**
   * Fetches service records for a bike (minimal version)
   */
  async getServicesByBikeId(userId: string, bikeId: string, _params: any) {
    try {
      const { data, error } = await supabaseClient
        .from("service_records")
        .select("*")
        .eq("bike_id", bikeId)
        .limit(10);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        services: data || [],
        total: data?.length || 0,
        has_more: false,
      };
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
  }
}
