import { supabaseServiceClient } from "../db/supabase.admin.client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BikeDTO,
  BikesListDTO,
  CreateBikeCommand,
  UpdateBikeCommand,
  UpdateBikeMileageCommand,
  UpdateBikeMileageResponse,
  GetBikesParams,
  NextServiceInfo,
  ServiceTypeEnum,
  ReminderStatusEnum,
  BikeStatusEnum,
} from "../types";

/**
 * BikeService - Business logic layer for bike management
 *
 * Responsibilities:
 * - CRUD operations on bikes table
 * - Computed fields calculation (next_service, active_reminders_count, total_cost)
 * - Business rules validation (e.g., mileage cannot decrease)
 * - Data transformation between DB rows and DTOs
 */
export class BikeService {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabaseServiceClient;
  }

  /**
   * Fetches all bikes for a user with optional filtering
   * Includes computed fields via JOINs to avoid N+1 queries
   *
   * @param userId - Authenticated user ID from JWT
   * @param params - Query parameters for filtering
   * @returns List of bikes with computed fields
   * @throws Error if database query fails
   */
  async getBikes(
    userId: string,
    params: GetBikesParams,
  ): Promise<BikesListDTO> {
    let query = this.client
      .from("bikes")
      .select(
        `
        *,
        service_records (
          cost
        ),
        service_reminders (
          id,
          service_type,
          target_mileage,
          completed_at,
          triggered_at_mileage,
          interval_km
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Apply filters if provided
    if (params.status) {
      query = query.eq("status", params.status);
    }
    if (params.type) {
      query = query.eq("type", params.type);
    }

    const { data: bikes, error } = await query;

    if (error) {
      console.error("[BikeService] Error fetching bikes:", error);
      throw new Error(`Failed to fetch bikes: ${error.message}`);
    }

    // Transform DB rows to DTOs with computed fields
    const bikesDTO = bikes.map((bike) => this.transformToDTO(bike));

    return {
      bikes: bikesDTO,
      total: bikesDTO.length,
    };
  }

  /**
   * Fetches a single bike by ID for the authenticated user
   *
   * @param userId - Authenticated user ID
   * @param bikeId - UUID of the bike
   * @returns BikeDTO or null if not found/not owned by user
   */
  async getBikeById(userId: string, bikeId: string): Promise<BikeDTO | null> {
    const { data: bike, error } = await this.client
      .from("bikes")
      .select(
        `
        *,
        service_records (
          cost
        ),
        service_reminders (
          id,
          service_type,
          target_mileage,
          completed_at,
          triggered_at_mileage,
          interval_km
        )
      `,
      )
      .eq("user_id", userId)
      .eq("id", bikeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - bike not found or not owned by user
        return null;
      }
      console.error("[BikeService] Error fetching bike by ID:", error);
      throw new Error(`Failed to fetch bike: ${error.message}`);
    }

    return this.transformToDTO(bike);
  }

  /**
   * Creates a new bike for the authenticated user
   *
   * @param userId - Authenticated user ID
   * @param command - Bike creation data
   * @returns Created bike DTO
   * @throws Error if creation fails
   */
  async createBike(
    userId: string,
    command: CreateBikeCommand,
  ): Promise<BikeDTO> {
    const bikeData = {
      user_id: userId,
      name: command.name,
      type: command.type,
      purchase_date: command.purchase_date || null,
      current_mileage: command.current_mileage || 0,
      status: "active" as BikeStatusEnum,
      notes: command.notes || null,
    };

    // Insert the bike first
    const { data: insertedBike, error: insertError } = await this.client
      .from("bikes")
      .insert(bikeData)
      .select("*")
      .single();

    if (insertError) {
      console.error("[BikeService] Error creating bike:", insertError);
      throw new Error(`Failed to create bike: ${insertError.message}`);
    }

    // Then fetch the complete bike data with relationships
    const bike = await this.getBikeById(insertedBike.user_id, insertedBike.id);
    if (!bike) {
      throw new Error("Failed to retrieve created bike");
    }
    return bike;
  }

  /**
   * Updates an existing bike for the authenticated user
   *
   * @param userId - Authenticated user ID
   * @param bikeId - UUID of the bike to update
   * @param command - Partial update data
   * @returns Updated bike DTO or null if not found
   * @throws Error if update fails
   */
  async updateBike(
    userId: string,
    bikeId: string,
    command: UpdateBikeCommand,
  ): Promise<BikeDTO | null> {
    const updateData: Record<string, any> = {};

    // Only include provided fields in update
    if (command.name !== undefined) updateData.name = command.name;
    if (command.type !== undefined) updateData.type = command.type;
    if (command.purchase_date !== undefined)
      updateData.purchase_date = command.purchase_date;
    if (command.current_mileage !== undefined)
      updateData.current_mileage = command.current_mileage;
    if (command.status !== undefined) updateData.status = command.status;
    if (command.notes !== undefined) updateData.notes = command.notes;

    const { data: bike, error } = await this.client
      .from("bikes")
      .update(updateData)
      .eq("user_id", userId)
      .eq("id", bikeId)
      .select(
        `
        *,
        service_records (
          cost
        ),
        service_reminders (
          id,
          service_type,
          target_mileage,
          completed_at,
          triggered_at_mileage,
          interval_km
        )
      `,
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows updated - bike not found or not owned by user
        return null;
      }
      console.error("[BikeService] Error updating bike:", error);
      throw new Error(`Failed to update bike: ${error.message}`);
    }

    return this.transformToDTO(bike);
  }

  /**
   * Updates bike mileage with business rule validation
   * Business rule: mileage cannot decrease
   *
   * @param userId - Authenticated user ID
   * @param bikeId - UUID of the bike
   * @param command - New mileage data
   * @returns Update response or null if not found
   * @throws Error if mileage decreases or update fails
   */
  async updateMileage(
    userId: string,
    bikeId: string,
    command: UpdateBikeMileageCommand,
  ): Promise<UpdateBikeMileageResponse | null> {
    // First, fetch current bike to validate mileage rule
    const currentBike = await this.getBikeById(userId, bikeId);
    if (!currentBike) {
      return null;
    }

    const currentMileage = currentBike.current_mileage || 0;
    const newMileage = command.current_mileage;

    // Business rule: mileage cannot decrease
    if (newMileage < currentMileage) {
      throw new Error(
        `New mileage (${newMileage}) cannot be less than current mileage (${currentMileage})`,
      );
    }

    // Update mileage
    const { data: bike, error } = await this.client
      .from("bikes")
      .update({ current_mileage: newMileage })
      .eq("user_id", userId)
      .eq("id", bikeId)
      .select("id, current_mileage, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("[BikeService] Error updating mileage:", error);
      throw new Error(`Failed to update mileage: ${error.message}`);
    }

    return {
      id: bike.id,
      current_mileage: bike.current_mileage!,
      updated_at: bike.updated_at!,
    };
  }

  /**
   * Deletes a bike and all related records (cascade)
   *
   * @param userId - Authenticated user ID
   * @param bikeId - UUID of the bike to delete
   * @returns true if deleted, false if not found
   * @throws Error if deletion fails
   */
  async deleteBike(userId: string, bikeId: string): Promise<boolean> {
    const { error } = await this.client
      .from("bikes")
      .delete()
      .eq("user_id", userId)
      .eq("id", bikeId);

    if (error) {
      console.error("[BikeService] Error deleting bike:", error);
      throw new Error(`Failed to delete bike: ${error.message}`);
    }

    return true;
  }

  /**
   * Transforms database row to BikeDTO with computed fields
   *
   * @param bikeRow - Raw database row with joined data
   * @returns BikeDTO with computed fields
   */
  private transformToDTO(bikeRow: any): BikeDTO {
    // Calculate next_service from service_reminders
    const activeReminders =
      bikeRow.service_reminders?.filter((r: any) => r.completed_at === null) ||
      [];
    const nextService = this.findNextService(
      activeReminders,
      bikeRow.current_mileage || 0,
    );

    // Count active reminders
    const activeRemindersCount = activeReminders.length;

    // Sum total cost from service_records
    const totalCost =
      bikeRow.service_records?.reduce(
        (sum: number, record: any) => sum + (record.cost || 0),
        0,
      ) || 0;

    return {
      id: bikeRow.id,
      name: bikeRow.name,
      type: bikeRow.type,
      purchase_date: bikeRow.purchase_date,
      current_mileage: bikeRow.current_mileage,
      status: bikeRow.status,
      notes: bikeRow.notes,
      created_at: bikeRow.created_at,
      updated_at: bikeRow.updated_at,
      next_service: nextService,
      active_reminders_count: activeRemindersCount,
      total_cost: totalCost,
    };
  }

  /**
   * Finds the next upcoming service from active reminders
   *
   * @param reminders - Array of active service reminders
   * @param currentMileage - Current bike mileage
   * @returns Next service info or null if no active reminders
   */
  private findNextService(
    reminders: any[],
    currentMileage: number,
  ): NextServiceInfo | null {
    if (reminders.length === 0) {
      return null;
    }

    // Calculate remaining km and status for each reminder
    const remindersWithStatus = reminders.map((r) => {
      const targetMileage =
        r.target_mileage || r.triggered_at_mileage + r.interval_km;
      const kmRemaining = targetMileage - currentMileage;

      let status: ReminderStatusEnum;
      if (kmRemaining < 0) {
        status = "overdue";
      } else if (kmRemaining <= 100) {
        // Upcoming threshold
        status = "upcoming";
      } else {
        status = "active";
      }

      return {
        service_type: r.service_type as ServiceTypeEnum,
        target_mileage: targetMileage,
        km_remaining: kmRemaining,
        status,
      };
    });

    // Sort by km_remaining (ascending) to get the most urgent first
    remindersWithStatus.sort((a, b) => a.km_remaining - b.km_remaining);

    return remindersWithStatus[0];
  }

  /**
   * Get equipment status for dashboard
   * Returns active bikes count, upcoming services, and overdue services count
   * Optimized with single query and computed fields
   *
   * @param userId - Authenticated user ID
   * @returns Equipment status summary for dashboard
   * @throws Error if database query fails
   */
  async getEquipmentStatus(userId: string): Promise<{
    active_bikes_count: number;
    upcoming_services: {
      bike_id: string;
      bike_name: string;
      service_type: ServiceTypeEnum;
      target_mileage: number;
      current_mileage: number;
      km_remaining: number;
      status: ReminderStatusEnum;
    }[];
    overdue_services_count: number;
  }> {
    try {
      // Get active bikes count and upcoming services in parallel
      const [activeBikesResult, remindersResult] = await Promise.all([
        // Count active bikes
        this.client
          .from("bikes")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active"),

        // Get upcoming services with bike details
        this.client
          .from("service_reminders")
          .select(
            `
            id,
            service_type,
            target_mileage,
            triggered_at_mileage,
            interval_km,
            bikes!inner(
              id,
              name,
              current_mileage,
              user_id,
              status
            )
          `,
          )
          .eq("bikes.user_id", userId)
          .eq("bikes.status", "active")
          .is("completed_at", null)
          .order("target_mileage", { ascending: true })
          .limit(10),
      ]);

      const activeBikesCount = activeBikesResult.count || 0;
      const reminders = remindersResult.data || [];

      // Calculate km_remaining and status for each reminder
      const upcomingServices = reminders
        .map((reminder) => {
          const bike = reminder.bikes as any;
          const currentMileage = bike.current_mileage || 0;
          const targetMileage =
            reminder.target_mileage ||
            reminder.triggered_at_mileage + reminder.interval_km;
          const kmRemaining = targetMileage - currentMileage;

          let status: ReminderStatusEnum;
          if (kmRemaining <= 0) {
            status = "overdue";
          } else if (kmRemaining <= 100) {
            status = "upcoming";
          } else {
            status = "active";
          }

          return {
            bike_id: bike.id,
            bike_name: bike.name,
            service_type: reminder.service_type as ServiceTypeEnum,
            target_mileage: targetMileage,
            current_mileage: currentMileage,
            km_remaining: kmRemaining,
            status,
          };
        })
        .sort((a, b) => a.km_remaining - b.km_remaining)
        .slice(0, 5); // Top 5 most urgent

      const overdueCount = upcomingServices.filter(
        (s) => s.status === "overdue",
      ).length;

      return {
        active_bikes_count: activeBikesCount,
        upcoming_services: upcomingServices,
        overdue_services_count: overdueCount,
      };
    } catch (error) {
      console.error("Equipment status error:", error);
      throw new Error("Failed to fetch equipment status");
    }
  }
}
