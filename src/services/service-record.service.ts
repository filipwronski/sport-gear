import { supabaseClient } from "../db/supabase.client";
// Removed complex imports that might cause SSR issues

/**
 * ServiceRecordService - Business logic layer for service record management
 *
 * Responsibilities:
 * - CRUD operations on service_records table
 * - Service statistics and cost analysis
 * - Business rules validation (mileage ordering, bike ownership)
 * - Integration with service_reminders table
 * - Data transformation between DB rows and DTOs
 */
export class ServiceRecordService {
  private getClient() {
    // Use regular client only
    return supabaseClient;
  }

  /**
   * Fetches service records for a bike with filtering and pagination
   *
   * @param userId - Authenticated user ID from JWT
   * @param bikeId - Target bike ID
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of service records
   * @throws BikeNotFoundError if bike doesn't exist or user doesn't own it
   */
  async getServicesByBikeId(
    userId: string,
    bikeId: string,
    params: any,
  ): Promise<any> {
    // Verify bike ownership first
    await this.verifyBikeOwnership(userId, bikeId);

    // Build query with filters
    let query = this.getClient()
      .from("service_records")
      .select("*", { count: "exact" })
      .eq("bike_id", bikeId);

    // Apply filters
    if (params.service_type) {
      query = query.eq("service_type", params.service_type);
    }

    if (params.service_location) {
      query = query.eq("service_location", params.service_location);
    }

    if (params.from_date) {
      query = query.gte("service_date", params.from_date);
    }

    if (params.to_date) {
      query = query.lte("service_date", params.to_date);
    }

    // Apply sorting
    const [sortField, sortDirection] = params.sort.split("_");
    const direction = sortDirection === "desc" ? false : true;

    if (sortField === "service") {
      query = query.order("service_date", { ascending: direction });
    } else if (sortField === "mileage") {
      query = query.order("mileage_at_service", { ascending: direction });
    } else if (sortField === "cost") {
      query = query.order("cost", { ascending: direction, nullsFirst: false });
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data: services, error, count } = await query;

    if (error) {
      console.error("[ServiceRecordService] Error fetching services:", error);
      throw new Error("Failed to fetch service records");
    }

    const total = count || 0;
    const has_more = total > params.offset + params.limit;

    return {
      services: services?.map(this.mapToDTO) || [],
      total,
      has_more,
    };
  }

  /**
   * Creates a new service record with optional reminder
   *
   * @param userId - Authenticated user ID from JWT
   * @param bikeId - Target bike ID
   * @param command - Service creation data
   * @returns Created service record
   * @throws BikeNotFoundError if bike doesn't exist or user doesn't own it
   * @throws MileageLowerThanPreviousError if mileage is less than previous service
   */
  async createService(
    userId: string,
    bikeId: string,
    command: CreateServiceCommand,
  ): Promise<ServiceRecordDTO> {
    // Verify bike ownership
    await this.verifyBikeOwnership(userId, bikeId);

    // Validate mileage against previous services
    const lastServiceMileage = await this.getLastServiceMileage(
      bikeId,
      command.service_type,
    );

    if (lastServiceMileage && command.mileage_at_service < lastServiceMileage) {
      throw new MileageLowerThanPreviousError(
        command.mileage_at_service,
        lastServiceMileage,
      );
    }

    // Begin transaction for service + optional reminder
    const client = this.getClient();

    try {
      // Insert service record
      const { data: serviceData, error: serviceError } = await client
        .from("service_records")
        .insert({
          bike_id: bikeId,
          service_date: command.service_date,
          mileage_at_service: command.mileage_at_service,
          service_type: command.service_type,
          service_location: command.service_location || null,
          cost: command.cost || null,
          currency: command.cost ? "PLN" : null, // Default currency
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

      // Create reminder if requested
      if (command.create_reminder && command.reminder_interval_km) {
        const { error: reminderError } = await client
          .from("service_reminders")
          .insert({
            bike_id: bikeId,
            service_type: command.service_type,
            triggered_at_mileage: command.mileage_at_service,
            interval_km: command.reminder_interval_km,
            target_mileage:
              command.mileage_at_service + command.reminder_interval_km,
          });

        if (reminderError) {
          console.error(
            "[ServiceRecordService] Error creating reminder:",
            reminderError,
          );
          // Don't fail the service creation if reminder fails
        }
      }

      return this.mapToDTO(serviceData);
    } catch (error) {
      console.error("[ServiceRecordService] Transaction failed:", error);
      throw error;
    }
  }

  /**
   * Updates an existing service record
   *
   * @param userId - Authenticated user ID from JWT
   * @param bikeId - Target bike ID
   * @param serviceId - Service record ID to update
   * @param command - Update data
   * @returns Updated service record
   * @throws ServiceNotFoundError if service doesn't exist or user doesn't own it
   * @throws MileageLowerThanPreviousError if new mileage breaks chronological order
   */
  async updateService(
    userId: string,
    bikeId: string,
    serviceId: string,
    command: UpdateServiceCommand,
  ): Promise<ServiceRecordDTO> {
    // Verify bike ownership and service exists
    await this.verifyBikeOwnership(userId, bikeId);
    await this.verifyServiceOwnership(userId, bikeId, serviceId);

    // If updating mileage, validate against other services
    if (command.mileage_at_service) {
      const lastServiceMileage = await this.getLastServiceMileage(
        bikeId,
        command.service_type,
        serviceId, // Exclude current service from check
      );

      if (
        lastServiceMileage &&
        command.mileage_at_service < lastServiceMileage
      ) {
        throw new MileageLowerThanPreviousError(
          command.mileage_at_service,
          lastServiceMileage,
        );
      }
    }

    // Build update object with only provided fields
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

    const { data, error } = await this.getClient()
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
  }

  /**
   * Deletes a service record
   *
   * @param userId - Authenticated user ID from JWT
   * @param bikeId - Target bike ID
   * @param serviceId - Service record ID to delete
   * @throws ServiceNotFoundError if service doesn't exist or user doesn't own it
   */
  async deleteService(
    userId: string,
    bikeId: string,
    serviceId: string,
  ): Promise<void> {
    // Verify bike ownership and service exists
    await this.verifyBikeOwnership(userId, bikeId);
    await this.verifyServiceOwnership(userId, bikeId, serviceId);

    // Check if service is referenced by any active reminder
    const { data: reminders } = await this.getClient()
      .from("service_reminders")
      .select("id")
      .eq("completed_service_id", serviceId)
      .is("completed_at", null);

    if (reminders && reminders.length > 0) {
      // Update reminders to remove reference instead of preventing deletion
      await this.getClient()
        .from("service_reminders")
        .update({ completed_service_id: null })
        .eq("completed_service_id", serviceId);
    }

    // Delete the service record
    const { error } = await this.getClient()
      .from("service_records")
      .delete()
      .eq("id", serviceId)
      .eq("bike_id", bikeId);

    if (error) {
      console.error("[ServiceRecordService] Error deleting service:", error);
      throw new Error("Failed to delete service record");
    }
  }

  /**
   * Generates service statistics and cost analysis
   *
   * @param userId - Authenticated user ID from JWT
   * @param bikeId - Target bike ID
   * @param params - Date range parameters
   * @returns Service statistics with breakdowns and timeline
   * @throws BikeNotFoundError if bike doesn't exist or user doesn't own it
   */
  async getServiceStats(
    userId: string,
    bikeId: string,
    params: GetServiceStatsParams,
  ): Promise<ServiceStatsDTO> {
    // Verify bike ownership
    await this.verifyBikeOwnership(userId, bikeId);

    // Calculate date range
    const dateRange = this.calculateDateRange(params);

    // Execute all queries in parallel for better performance
    const [totals, breakdownByType, breakdownByLocation, timeline] =
      await Promise.all([
        this.getTotalStats(bikeId, dateRange),
        this.getBreakdownByType(bikeId, dateRange),
        this.getBreakdownByLocation(bikeId, dateRange),
        this.getTimeline(bikeId, dateRange),
      ]);

    return {
      period: {
        from: dateRange.from,
        to: dateRange.to,
      },
      total_cost: totals.total_cost,
      total_services: totals.total_services,
      cost_per_km: totals.cost_per_km,
      total_mileage: totals.total_mileage,
      breakdown_by_type: breakdownByType,
      breakdown_by_location: breakdownByLocation,
      timeline,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Verifies that a bike belongs to the specified user
   */
  private async verifyBikeOwnership(
    userId: string,
    bikeId: string,
  ): Promise<void> {
    const { data, error } = await this.getClient()
      .from("bikes")
      .select("id")
      .eq("id", bikeId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new BikeNotFoundError();
    }
  }

  /**
   * Verifies that a service record belongs to the specified user's bike
   */
  private async verifyServiceOwnership(
    userId: string,
    bikeId: string,
    serviceId: string,
  ): Promise<void> {
    const { data, error } = await this.getClient()
      .from("service_records")
      .select("id")
      .eq("id", serviceId)
      .eq("bike_id", bikeId)
      .single();

    if (error || !data) {
      throw new ServiceNotFoundError();
    }

    // Also verify bike ownership
    await this.verifyBikeOwnership(userId, bikeId);
  }

  /**
   * Gets the mileage of the last service for validation
   */
  private async getLastServiceMileage(
    bikeId: string,
    serviceType?: ServiceTypeEnum,
    excludeServiceId?: string,
  ): Promise<number | null> {
    let query = this.getClient()
      .from("service_records")
      .select("mileage_at_service")
      .eq("bike_id", bikeId)
      .order("mileage_at_service", { ascending: false })
      .limit(1);

    if (serviceType) {
      query = query.eq("service_type", serviceType);
    }

    if (excludeServiceId) {
      query = query.neq("id", excludeServiceId);
    }

    const { data } = await query;

    return data && data.length > 0 ? data[0].mileage_at_service : null;
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

  /**
   * Calculates date range based on period or custom dates
   */
  private calculateDateRange(params: GetServiceStatsParams): {
    from: string;
    to: string;
  } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Custom date range takes precedence
    if (params.from_date && params.to_date) {
      return {
        from: params.from_date.split("T")[0],
        to: params.to_date.split("T")[0],
      };
    }

    // Calculate based on period
    let fromDate: Date;
    switch (params.period) {
      case "month":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        fromDate = new Date("2020-01-01"); // Far enough back
        break;
    }

    return {
      from: fromDate.toISOString().split("T")[0],
      to: today,
    };
  }

  /**
   * Gets total statistics for the date range
   */
  private async getTotalStats(
    bikeId: string,
    dateRange: { from: string; to: string },
  ): Promise<{
    total_cost: number;
    total_services: number;
    cost_per_km: number;
    total_mileage: number;
  }> {
    const { data, error } = await this.getClient().rpc("get_service_totals", {
      p_bike_id: bikeId,
      p_from_date: dateRange.from,
      p_to_date: dateRange.to,
    });

    if (error) {
      console.error("[ServiceRecordService] Error fetching totals:", error);
      // Fallback to basic query if RPC function doesn't exist
      return this.getTotalStatsFallback(bikeId, dateRange);
    }

    return (
      data || {
        total_cost: 0,
        total_services: 0,
        cost_per_km: 0,
        total_mileage: 0,
      }
    );
  }

  /**
   * Fallback method for total stats if RPC function doesn't exist
   */
  private async getTotalStatsFallback(
    bikeId: string,
    dateRange: { from: string; to: string },
  ): Promise<{
    total_cost: number;
    total_services: number;
    cost_per_km: number;
    total_mileage: number;
  }> {
    const { data, error } = await this.getClient()
      .from("service_records")
      .select("cost, mileage_at_service")
      .eq("bike_id", bikeId)
      .gte("service_date", dateRange.from)
      .lte("service_date", dateRange.to);

    if (error || !data) {
      return {
        total_cost: 0,
        total_services: 0,
        cost_per_km: 0,
        total_mileage: 0,
      };
    }

    const total_cost = data.reduce(
      (sum, record) => sum + (record.cost || 0),
      0,
    );
    const total_services = data.length;
    const mileages = data
      .map((r) => r.mileage_at_service)
      .sort((a, b) => a - b);
    const total_mileage =
      mileages.length > 1 ? mileages[mileages.length - 1] - mileages[0] : 0;
    const cost_per_km = total_mileage > 0 ? total_cost / total_mileage : 0;

    return { total_cost, total_services, cost_per_km, total_mileage };
  }

  /**
   * Gets breakdown by service type
   */
  private async getBreakdownByType(
    bikeId: string,
    dateRange: { from: string; to: string },
  ): Promise<ServiceTypeBreakdown[]> {
    const { data, error } = await this.getClient()
      .from("service_records")
      .select("service_type, cost")
      .eq("bike_id", bikeId)
      .gte("service_date", dateRange.from)
      .lte("service_date", dateRange.to);

    if (error || !data) {
      return [];
    }

    // Group by service type
    const typeMap = new Map<
      ServiceTypeEnum,
      { count: number; total_cost: number }
    >();

    data.forEach((record) => {
      const type = record.service_type as ServiceTypeEnum;
      const cost = record.cost || 0;

      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, total_cost: 0 });
      }

      const current = typeMap.get(type)!;
      current.count += 1;
      current.total_cost += cost;
    });

    const totalCost = Array.from(typeMap.values()).reduce(
      (sum, item) => sum + item.total_cost,
      0,
    );

    return Array.from(typeMap.entries())
      .map(([service_type, stats]) => ({
        service_type,
        count: stats.count,
        total_cost: stats.total_cost,
        avg_cost: stats.count > 0 ? stats.total_cost / stats.count : 0,
        percentage: totalCost > 0 ? (stats.total_cost / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.total_cost - a.total_cost);
  }

  /**
   * Gets breakdown by service location
   */
  private async getBreakdownByLocation(
    bikeId: string,
    dateRange: { from: string; to: string },
  ): Promise<ServiceLocationBreakdown> {
    const { data, error } = await this.getClient()
      .from("service_records")
      .select("service_location, cost")
      .eq("bike_id", bikeId)
      .gte("service_date", dateRange.from)
      .lte("service_date", dateRange.to);

    if (error || !data) {
      return {
        warsztat: { count: 0, total_cost: 0 },
        samodzielnie: { count: 0, total_cost: 0 },
      };
    }

    const breakdown = {
      warsztat: { count: 0, total_cost: 0 },
      samodzielnie: { count: 0, total_cost: 0 },
    };

    data.forEach((record) => {
      const location =
        (record.service_location as ServiceLocationEnum) || "samodzielnie";
      const cost = record.cost || 0;

      breakdown[location].count += 1;
      breakdown[location].total_cost += cost;
    });

    return breakdown;
  }

  /**
   * Gets timeline data (monthly aggregation)
   */
  private async getTimeline(
    bikeId: string,
    dateRange: { from: string; to: string },
  ): Promise<ServiceTimelineEntry[]> {
    const { data, error } = await this.getClient()
      .from("service_records")
      .select("service_date, cost")
      .eq("bike_id", bikeId)
      .gte("service_date", dateRange.from)
      .lte("service_date", dateRange.to)
      .order("service_date", { ascending: false });

    if (error || !data) {
      return [];
    }

    // Group by month
    const monthMap = new Map<string, { cost: number; services: number }>();

    data.forEach((record) => {
      const month = record.service_date.substring(0, 7); // YYYY-MM
      const cost = record.cost || 0;

      if (!monthMap.has(month)) {
        monthMap.set(month, { cost: 0, services: 0 });
      }

      const current = monthMap.get(month)!;
      current.cost += cost;
      current.services += 1;
    });

    return Array.from(monthMap.entries())
      .map(([month, stats]) => ({
        month,
        cost: stats.cost,
        services: stats.services,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Last 12 months
  }
}
