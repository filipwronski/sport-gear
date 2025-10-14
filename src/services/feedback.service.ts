import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";
import type {
  FeedbackDTO,
  FeedbacksListDTO,
  CreateFeedbackCommand,
  GetFeedbacksParams,
} from "../types";
import { DatabaseError, NotFoundError, ValidationError } from "../lib/errors";
import { ProfileService } from "./ProfileService";

/**
 * Service for managing outfit feedback operations
 * Handles CRUD operations, pagination, filtering, and thermal adjustment calculations
 */
export class FeedbackService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Retrieves paginated list of user feedbacks with optional filtering and sorting
   */
  async getUserFeedbacks(
    userId: string,
    params: GetFeedbacksParams,
  ): Promise<FeedbacksListDTO> {
    try {
      // Build base query with count
      let query = this.supabase
        .from("outfit_feedbacks")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      // Apply filters
      if (params.activity_type) {
        query = query.eq("activity_type", params.activity_type);
      }
      if (params.rating) {
        query = query.eq("overall_rating", params.rating);
      }

      // Apply sorting
      const [sortField, sortDirection] = this.parseSortParam(
        params.sort || "created_at_desc",
      );
      query = query.order(sortField, { ascending: sortDirection === "asc" });

      // Apply pagination
      const limit = Math.min(params.limit || 30, 30); // Enforce max 30
      const offset = Math.max(params.offset || 0, 0); // Ensure non-negative
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new DatabaseError(`Failed to fetch feedbacks: ${error.message}`);
      }

      return {
        feedbacks: (data || []).map(this.mapToFeedbackDTO),
        total: count || 0,
        has_more: offset + limit < (count || 0),
      };
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Unexpected error fetching feedbacks: ${error}`);
    }
  }

  /**
   * Creates new outfit feedback and triggers thermal adjustment recalculation if needed
   */
  async createFeedback(
    userId: string,
    command: CreateFeedbackCommand,
  ): Promise<FeedbackDTO> {
    try {
      // Ensure profile exists before creating feedback
      const profileService = new ProfileService();
      await profileService.getProfile(userId); // This will create profile if it doesn't exist

      // Verify location belongs to user (only if location_id is provided)
      if (command.location_id) {
        const locationExists = await this.verifyLocationOwnership(
          userId,
          command.location_id,
        );
        if (!locationExists) {
          throw new NotFoundError(
            "Location not found or does not belong to you",
          );
        }
      }

      // Insert feedback
      const { data, error } = await this.supabase
        .from("outfit_feedbacks")
        .insert({
          user_id: userId,
          location_id: command.location_id || null,
          temperature: command.temperature,
          feels_like: command.feels_like,
          wind_speed: command.wind_speed,
          humidity: command.humidity,
          rain_mm: command.rain_mm || 0,
          activity_type: command.activity_type,
          duration_minutes: command.duration_minutes,
          actual_outfit: command.actual_outfit as any,
          overall_rating: command.overall_rating,
          zone_ratings: (command.zone_ratings || {}) as any,
          notes: command.notes,
          shared_with_community: command.shared_with_community || false,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(`Failed to create feedback: ${error.message}`);
      }

      // Check if we need to recalculate thermal_adjustment
      await this.maybeRecalculateThermalAdjustment(userId);

      return this.mapToFeedbackDTO(data);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError)
        throw error;
      throw new DatabaseError(`Unexpected error creating feedback: ${error}`);
    }
  }

  /**
   * Deletes user feedback by ID with ownership verification
   */
  async deleteFeedback(userId: string, feedbackId: string): Promise<void> {
    try {
      // Delete with RLS enforcement and count verification
      const { error, count } = await this.supabase
        .from("outfit_feedbacks")
        .delete({ count: "exact" })
        .eq("id", feedbackId)
        .eq("user_id", userId); // Explicit ownership check

      if (error) {
        throw new DatabaseError(`Failed to delete feedback: ${error.message}`);
      }

      if (count === 0) {
        throw new NotFoundError("Feedback not found or does not belong to you");
      }

      // Recalculate thermal adjustment after deletion
      await this.maybeRecalculateThermalAdjustment(userId);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof DatabaseError)
        throw error;
      throw new DatabaseError(`Unexpected error deleting feedback: ${error}`);
    }
  }

  /**
   * Verifies that location belongs to the user
   */
  private async verifyLocationOwnership(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("user_locations")
      .select("id")
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    if (error) return false;
    return !!data;
  }

  /**
   * Recalculates thermal adjustment if user has 5+ feedbacks
   * Note: The system uses database triggers to automatically update thermal_adjustment
   * via update_thermal_adjustment() trigger on profiles.feedback_count changes.
   * This method serves as a fallback and manual trigger.
   */
  private async maybeRecalculateThermalAdjustment(
    userId: string,
  ): Promise<void> {
    try {
      // Get current feedback count
      const { count, error } = await this.supabase
        .from("outfit_feedbacks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (error) {
        console.warn(
          `Failed to get feedback count for thermal adjustment: ${error.message}`,
        );
        return;
      }

      // Update feedback_count in profiles table
      // This will trigger the update_thermal_adjustment() function automatically
      if ((count || 0) >= 5) {
        const { error: updateError } = await this.supabase
          .from("profiles")
          .update({ feedback_count: count })
          .eq("id", userId);

        if (updateError) {
          console.warn(
            `Failed to update feedback count: ${updateError.message}`,
          );
        }
      }
    } catch (error) {
      console.warn(
        `Unexpected error in thermal adjustment calculation: ${error}`,
      );
    }
  }

  /**
   * Parses sort parameter into field and direction
   */
  private parseSortParam(sort: string): [string, "asc" | "desc"] {
    switch (sort) {
      case "created_at_asc":
        return ["created_at", "asc"];
      case "created_at_desc":
        return ["created_at", "desc"];
      case "rating_asc":
        return ["overall_rating", "asc"];
      case "rating_desc":
        return ["overall_rating", "desc"];
      default:
        return ["created_at", "desc"];
    }
  }

  /**
   * Maps database row to FeedbackDTO
   */
  private mapToFeedbackDTO(row: any): FeedbackDTO {
    return {
      id: row.id,
      temperature: row.temperature,
      feels_like: row.feels_like,
      wind_speed: row.wind_speed,
      humidity: row.humidity,
      rain_mm: row.rain_mm,
      activity_type: row.activity_type,
      duration_minutes: row.duration_minutes,
      actual_outfit: row.actual_outfit,
      overall_rating: row.overall_rating,
      zone_ratings: row.zone_ratings,
      notes: row.notes,
      shared_with_community: row.shared_with_community,
      location_id: row.location_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
