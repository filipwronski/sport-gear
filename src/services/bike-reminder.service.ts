import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  ServiceReminderDTO,
  CreateReminderCommand,
  CompleteReminderCommand,
  DefaultIntervalDTO,
  GetRemindersParams,
  ServiceTypeEnum,
  ReminderStatusEnum,
} from "../types";

// Custom error classes for better error handling
export class BikeNotFoundError extends Error {
  constructor(bikeId: string) {
    super(`Bike with ID ${bikeId} does not exist or you don't have access`);
    this.name = "BikeNotFoundError";
  }
}

export class ReminderNotFoundError extends Error {
  constructor(reminderId?: string) {
    super(
      reminderId
        ? `Reminder with ID ${reminderId} not found`
        : "Reminder not found",
    );
    this.name = "ReminderNotFoundError";
  }
}

export class ReminderConflictError extends Error {
  constructor(serviceType: ServiceTypeEnum) {
    super(
      `Active reminder for service type '${serviceType}' already exists for this bike`,
    );
    this.name = "ReminderConflictError";
  }
}

export class ServiceRecordNotFoundError extends Error {
  constructor(serviceId: string) {
    super(
      `Service record with ID ${serviceId} not found or doesn't belong to this bike`,
    );
    this.name = "ServiceRecordNotFoundError";
  }
}

export class BikeReminderService {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor(supabaseClient: ReturnType<typeof createClient<Database>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Get reminders for a specific bike with filtering and sorting
   */
  async getReminders(
    userId: string,
    bikeId: string,
    params: GetRemindersParams = {},
  ): Promise<ServiceReminderDTO[]> {
    // Verify bike ownership first
    await this.verifyBikeOwnership(userId, bikeId);

    // Build query with filters
    let query = this.supabase
      .from("service_reminders")
      .select(
        `
        *,
        bikes!inner(current_mileage)
      `,
      )
      .eq("bike_id", bikeId);

    // Apply status filter
    if (params.status && params.status !== "all") {
      if (params.status === "active") {
        query = query.is("completed_at", null);
      } else if (params.status === "completed") {
        query = query.not("completed_at", "is", null);
      }
      // For 'overdue' we'll filter after computing the status
    }

    // Apply service type filter
    if (params.service_type) {
      query = query.eq("service_type", params.service_type);
    }

    // Apply sorting
    const sortField = params.sort?.includes("km_remaining")
      ? "triggered_at_mileage"
      : "created_at";
    const sortDirection = params.sort?.includes("desc") ? false : true;
    query = query.order(sortField, { ascending: sortDirection });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching reminders:", error);
      throw new Error("Failed to fetch reminders");
    }

    if (!data) {
      return [];
    }

    // Transform data and compute fields
    const reminders = data.map((row) => this.transformToReminderDTO(row));

    // Apply overdue filter if needed (after computing status)
    if (params.status === "overdue") {
      return reminders.filter((r) => r.status === "overdue");
    }

    return reminders;
  }

  /**
   * Create a new service reminder
   */
  async createReminder(
    userId: string,
    bikeId: string,
    command: CreateReminderCommand,
  ): Promise<ServiceReminderDTO> {
    // Verify bike ownership and get current mileage
    const bike = await this.verifyBikeOwnership(userId, bikeId);
    const currentMileage = bike.current_mileage || 0;

    // Check for existing active reminder of the same type
    const { data: existingReminder } = await this.supabase
      .from("service_reminders")
      .select("id")
      .eq("bike_id", bikeId)
      .eq("service_type", command.service_type)
      .is("completed_at", null)
      .single();

    if (existingReminder) {
      throw new ReminderConflictError(command.service_type);
    }

    // Insert new reminder
    const { data, error } = await this.supabase
      .from("service_reminders")
      .insert({
        bike_id: bikeId,
        service_type: command.service_type,
        interval_km: command.interval_km,
        triggered_at_mileage: currentMileage,
      })
      .select(
        `
        *,
        bikes!inner(current_mileage)
      `,
      )
      .single();

    if (error) {
      console.error("Error creating reminder:", error);
      throw new Error("Failed to create reminder");
    }

    return this.transformToReminderDTO(data);
  }

  /**
   * Mark a reminder as completed
   */
  async completeReminder(
    userId: string,
    bikeId: string,
    reminderId: string,
    command: CompleteReminderCommand,
  ): Promise<ServiceReminderDTO> {
    // Verify bike ownership
    await this.verifyBikeOwnership(userId, bikeId);

    // Verify reminder exists and belongs to this bike
    const { data: reminder } = await this.supabase
      .from("service_reminders")
      .select("*")
      .eq("id", reminderId)
      .eq("bike_id", bikeId)
      .single();

    if (!reminder) {
      throw new ReminderNotFoundError(reminderId);
    }

    // Verify service record exists and belongs to the same bike
    const { data: serviceRecord } = await this.supabase
      .from("service_records")
      .select("id, bike_id, service_type")
      .eq("id", command.completed_service_id)
      .eq("bike_id", bikeId)
      .single();

    if (!serviceRecord) {
      throw new ServiceRecordNotFoundError(command.completed_service_id);
    }

    // Update reminder as completed
    const { data, error } = await this.supabase
      .from("service_reminders")
      .update({
        completed_at: new Date().toISOString(),
        completed_service_id: command.completed_service_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminderId)
      .select(
        `
        *,
        bikes!inner(current_mileage)
      `,
      )
      .single();

    if (error) {
      console.error("Error completing reminder:", error);
      throw new Error("Failed to complete reminder");
    }

    return this.transformToReminderDTO(data);
  }

  /**
   * Delete a service reminder
   */
  async deleteReminder(
    userId: string,
    bikeId: string,
    reminderId: string,
  ): Promise<void> {
    // Verify bike ownership
    await this.verifyBikeOwnership(userId, bikeId);

    const { error } = await this.supabase
      .from("service_reminders")
      .delete()
      .eq("id", reminderId)
      .eq("bike_id", bikeId);

    if (error) {
      console.error("Error deleting reminder:", error);
      throw new Error("Failed to delete reminder");
    }
  }

  /**
   * Get default service intervals
   */
  async getDefaultIntervals(): Promise<DefaultIntervalDTO[]> {
    const { data, error } = await this.supabase
      .from("default_service_intervals")
      .select("*")
      .order("default_interval_km", { ascending: true });

    if (error) {
      console.error("Error fetching default intervals:", error);
      throw new Error("Failed to fetch default intervals");
    }

    return data || [];
  }

  /**
   * Verify that the user owns the specified bike
   */
  private async verifyBikeOwnership(userId: string, bikeId: string) {
    const { data: bike, error } = await this.supabase
      .from("bikes")
      .select("id, current_mileage")
      .eq("id", bikeId)
      .eq("user_id", userId)
      .single();

    if (error || !bike) {
      throw new BikeNotFoundError(bikeId);
    }

    return bike;
  }

  /**
   * Transform database row to ServiceReminderDTO with computed fields
   */
  private transformToReminderDTO(row: any): ServiceReminderDTO {
    const currentMileage = row.bikes?.current_mileage || 0;
    const targetMileage = row.triggered_at_mileage + row.interval_km;
    const kmRemaining = targetMileage - currentMileage;

    // Compute status
    let status: ReminderStatusEnum;
    if (row.completed_at) {
      status = "completed";
    } else if (kmRemaining < 0) {
      status = "overdue";
    } else if (kmRemaining <= 200) {
      status = "active";
    } else {
      status = "upcoming";
    }

    return {
      id: row.id,
      bike_id: row.bike_id,
      service_type: row.service_type,
      triggered_at_mileage: row.triggered_at_mileage,
      interval_km: row.interval_km,
      target_mileage: targetMileage,
      current_mileage: currentMileage,
      km_remaining: kmRemaining,
      status,
      completed_at: row.completed_at,
      completed_service_id: row.completed_service_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
