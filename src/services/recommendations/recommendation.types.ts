/**
 * Internal types for recommendation service
 */

import type { ActivityTypeEnum, ThermalPreferences } from "../../types";

/**
 * Input data for outfit recommendation algorithm
 */
export interface RecommendationInput {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  rainMm: number;
  humidity: number;
  activityType: ActivityTypeEnum;
  durationMinutes: number;
  thermalAdjustment: number;
  userPreferences: ThermalPreferences | null;
}

/**
 * Context for rule matching
 */
export interface RuleContext {
  activity?: ActivityTypeEnum;
  coldHands?: boolean;
  coldFeet?: boolean;
  wind?: number;
  rain?: number;
}
