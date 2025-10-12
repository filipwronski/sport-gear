import { supabaseClient } from "../db/supabase.client";
import type {
  ServiceRecordDTO,
  ServicesListDTO,
  ServiceStatsDTO,
  CreateServiceCommand,
  UpdateServiceCommand,
  ServiceTypeBreakdown,
  ServiceLocationBreakdown,
  ServiceTimelineEntry,
  ServiceTypeEnum,
  ServiceLocationEnum,
} from "../types";

/**
 * ServiceRecordService - Business logic layer for service record management
 * Simplified version without complex imports that cause SSR issues
 */
export class ServiceRecordService {
  /**
   * Fetches service records for a bike with filtering and pagination
   */
  async getServicesByBikeId(
    userId: string,
    bikeId: string,
    params: any,
  ): Promise<ServicesListDTO> {
    try {
      // Simple query without complex joins for now
      const {
        data: services,
        error,
        count,
      } = await supabaseClient
        .from("service_records")
        .select("*", { count: "exact" })
        .eq("bike_id", bikeId)
        .limit(params.limit || 50)
        .range(
          params.offset || 0,
          (params.offset || 0) + (params.limit || 50) - 1,
        );

      if (error) {
        console.error("[ServiceRecordService] Error fetching services:", error);
        throw new Error("Failed to fetch service records");
      }

      const total = count || 0;
      const has_more = total > (params.offset || 0) + (params.limit || 50);

      return {
        services: services?.map(this.mapToDTO) || [],
        total,
        has_more,
      };
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
  }

  /**
   * Creates a new service record
   */
  async createService(
    userId: string,
    bikeId: string,
    command: CreateServiceCommand,
  ): Promise<ServiceRecordDTO> {
    try {
      const { data: serviceData, error: serviceError } = await supabaseClient
        .from("service_records")
        .insert({
          bike_id: bikeId,
          service_date: command.service_date,
          mileage_at_service: command.mileage_at_service,
          service_type: command.service_type,
          service_location: command.service_location || null,
          cost: command.cost || null,
          currency: command.cost ? "PLN" : null,
          notes: command.notes || null,
        })
        .select()
        .single();

      if (serviceError) {
        console.error(
          "[ServiceRecordService] Error creating service:",
          serviceError,
        );
        throw new Error("Failed to create service record");
      }

      return this.mapToDTO(serviceData);
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
  }

  /**
   * Updates an existing service record
   */
  async updateService(
    userId: string,
    bikeId: string,
    serviceId: string,
    command: UpdateServiceCommand,
  ): Promise<ServiceRecordDTO> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (command.service_date !== undefined) {
        updateData.service_date = command.service_date;
      }
      if (command.mileage_at_service !== undefined) {
        updateData.mileage_at_service = command.mileage_at_service;
      }
      if (command.service_type !== undefined) {
        updateData.service_type = command.service_type;
      }
      if (command.service_location !== undefined) {
        updateData.service_location = command.service_location;
      }
      if (command.cost !== undefined) {
        updateData.cost = command.cost;
        updateData.currency = command.cost > 0 ? "PLN" : null;
      }
      if (command.notes !== undefined) {
        updateData.notes = command.notes;
      }

      const { data, error } = await supabaseClient
        .from("service_records")
        .update(updateData)
        .eq("id", serviceId)
        .eq("bike_id", bikeId)
        .select()
        .single();

      if (error) {
        console.error("[ServiceRecordService] Error updating service:", error);
        throw new Error("Failed to update service record");
      }

      return this.mapToDTO(data);
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
  }

  /**
   * Deletes a service record
   */
  async deleteService(
    userId: string,
    bikeId: string,
    serviceId: string,
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from("service_records")
        .delete()
        .eq("id", serviceId)
        .eq("bike_id", bikeId);

      if (error) {
        console.error("[ServiceRecordService] Error deleting service:", error);
        throw new Error("Failed to delete service record");
      }
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
  }

  /**
   * Generates service statistics and cost analysis
   */
  async getServiceStats(
    userId: string,
    bikeId: string,
    params: any,
  ): Promise<ServiceStatsDTO> {
    try {
      // Calculate date range
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      let fromDate = "2020-01-01";
      let toDate = today;

      if (params.from_date && params.to_date) {
        fromDate = params.from_date.split("T")[0];
        toDate = params.to_date.split("T")[0];
      } else {
        switch (params.period) {
          case "month":
            fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
            break;
          case "quarter":
            fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
            break;
          case "year":
            fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0];
            break;
        }
      }

      // Get basic stats
      const { data, error } = await supabaseClient
        .from("service_records")
        .select(
          "cost, mileage_at_service, service_type, service_location, service_date",
        )
        .eq("bike_id", bikeId)
        .gte("service_date", fromDate)
        .lte("service_date", toDate);

      if (error) {
        console.error("[ServiceRecordService] Error fetching stats:", error);
        throw new Error("Failed to fetch service statistics");
      }

      // Calculate stats
      const services = data || [];
      const total_cost = services.reduce(
        (sum, record) => sum + (record.cost || 0),
        0,
      );
      const total_services = services.length;
      const mileages = services
        .map((r) => r.mileage_at_service)
        .sort((a, b) => a - b);
      const total_mileage =
        mileages.length > 1 ? mileages[mileages.length - 1] - mileages[0] : 0;
      const cost_per_km = total_mileage > 0 ? total_cost / total_mileage : 0;

      // Group by type
      const typeMap = new Map();
      services.forEach((record) => {
        const type = record.service_type;
        const cost = record.cost || 0;
        if (!typeMap.has(type)) {
          typeMap.set(type, { count: 0, total_cost: 0 });
        }
        const current = typeMap.get(type);
        current.count += 1;
        current.total_cost += cost;
      });

      const breakdown_by_type = Array.from(typeMap.entries()).map(
        ([service_type, stats]) => ({
          service_type,
          count: stats.count,
          total_cost: stats.total_cost,
          avg_cost: stats.count > 0 ? stats.total_cost / stats.count : 0,
          percentage:
            total_cost > 0 ? (stats.total_cost / total_cost) * 100 : 0,
        }),
      );

      // Group by location
      const breakdown_by_location = {
        warsztat: { count: 0, total_cost: 0 },
        samodzielnie: { count: 0, total_cost: 0 },
      };

      services.forEach((record) => {
        const location = record.service_location || "samodzielnie";
        const cost = record.cost || 0;
        breakdown_by_location[location].count += 1;
        breakdown_by_location[location].total_cost += cost;
      });

      return {
        period: { from: fromDate, to: toDate },
        total_cost,
        total_services,
        cost_per_km,
        total_mileage,
        breakdown_by_type,
        breakdown_by_location,
        timeline: [],
      };
    } catch (error) {
      console.error("[ServiceRecordService] Error:", error);
      throw error;
    }
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
