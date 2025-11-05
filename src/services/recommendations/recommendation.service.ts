/**
 * Recommendation Service
 * Implements rule-based outfit recommendation algorithm for cycling
 */

import type {
  OutfitDTO,
  ActivityTypeEnum,
  ThermalPreferences,
} from "../../types";
import type { RecommendationInput, RuleContext } from "./recommendation.types";
import * as rules from "./outfit-rules";

export class RecommendationService {
  /**
   * Generate complete outfit recommendation based on weather and user preferences
   */
  generateOutfit(input: RecommendationInput): OutfitDTO {
    // Apply thermal adjustment and activity intensity
    const adjustedTemp = this.calculateAdjustedTemperature(
      input.temperature,
      input.thermalAdjustment,
      input.activityType,
    );

    return {
      head: this.calculateHead(
        adjustedTemp,
        input.windSpeed,
        input.userPreferences,
      ),
      torso: this.calculateTorso(
        adjustedTemp,
        input.windSpeed,
        input.rainMm,
        input.activityType,
      ),
      arms: this.calculateArms(adjustedTemp, input.activityType),
      hands: this.calculateHands(
        adjustedTemp,
        input.windSpeed,
        input.userPreferences,
      ),
      legs: this.calculateLegs(adjustedTemp, input.activityType),
      feet: this.calculateFeet(
        adjustedTemp,
        input.rainMm,
        input.userPreferences,
      ),
      neck: this.calculateNeck(adjustedTemp, input.windSpeed),
    };
  }

  /**
   * Calculate adjusted temperature considering user thermal adjustment and activity intensity
   */
  private calculateAdjustedTemperature(
    temperature: number,
    thermalAdjustment: number,
    activityType: ActivityTypeEnum,
  ): number {
    const activityAdjustment =
      rules.ACTIVITY_TEMP_ADJUSTMENTS[activityType] || 0;
    return temperature + thermalAdjustment + activityAdjustment;
  }

  /**
   * Calculate head gear recommendation
   */
  private calculateHead(
    temp: number,
    wind: number,
    _prefs: ThermalPreferences | null,
  ): string {
    for (const rule of rules.HEAD_RULES) {
      if (temp <= rule.maxTemp) {
        // Check wind threshold if specified
        if (rule.windThreshold && wind < rule.windThreshold) {
          continue;
        }
        return rule.value;
      }
    }
    return "nic";
  }

  /**
   * Calculate torso layers (base, mid, outer)
   */
  private calculateTorso(
    temp: number,
    wind: number,
    rain: number,
    activity: ActivityTypeEnum,
  ) {
    const base = this.findMatchingRule(rules.TORSO_BASE_RULES, temp);
    const mid = this.findMatchingRule(rules.TORSO_MID_RULES, temp, {
      activity,
    });

    // Special handling for outer layer - rain takes precedence
    let outer = "nic";
    if (rain > 5) {
      outer = "kurtka_przeciwdeszczowa";
    } else {
      outer = this.findMatchingRule(rules.TORSO_OUTER_RULES, temp);
    }

    return { base, mid, outer };
  }

  /**
   * Calculate arms recommendation
   */
  private calculateArms(temp: number, activity: ActivityTypeEnum): string {
    return this.findMatchingRule(rules.ARMS_RULES, temp, { activity });
  }

  /**
   * Calculate hands recommendation
   */
  private calculateHands(
    temp: number,
    wind: number,
    prefs: ThermalPreferences | null,
  ): string {
    const coldHands = prefs?.cold_hands || false;
    return this.findMatchingRule(rules.HANDS_RULES, temp, { coldHands, wind });
  }

  /**
   * Calculate legs recommendation
   */
  private calculateLegs(temp: number, activity: ActivityTypeEnum): string {
    return this.findMatchingRule(rules.LEGS_RULES, temp, { activity });
  }

  /**
   * Calculate feet recommendation (socks and covers)
   */
  private calculateFeet(
    temp: number,
    rain: number,
    prefs: ThermalPreferences | null,
  ) {
    const coldFeet = prefs?.cold_feet || false;
    const socks = this.findMatchingRule(rules.FEET_SOCKS_RULES, temp);

    // Special handling for covers - rain takes precedence
    let covers = "nic";
    if (rain > 3) {
      covers = "ochraniacze_wodoodporne";
    } else {
      covers = this.findMatchingRule(rules.FEET_COVERS_RULES, temp, {
        coldFeet,
      });
    }

    return { socks, covers };
  }

  /**
   * Calculate neck recommendation
   */
  private calculateNeck(temp: number, wind: number): string {
    for (const rule of rules.NECK_RULES) {
      if (temp <= rule.maxTemp) {
        // Check wind threshold if specified
        if (rule.windThreshold && wind < rule.windThreshold) {
          continue;
        }
        return rule.value;
      }
    }
    return "nic";
  }

  /**
   * Generic rule matching function
   * Finds the first matching rule based on temperature and additional conditions
   */
  private findMatchingRule(
    rules: any[],
    temp: number,
    context: RuleContext = {},
  ): string {
    for (const rule of rules) {
      // Check temperature threshold
      if (temp > rule.maxTemp) {
        continue;
      }

      // Check activity type constraint
      if (
        rule.activity &&
        context.activity &&
        !rule.activity.includes(context.activity)
      ) {
        continue;
      }

      // Check cold hands preference
      if (
        rule.coldHands !== undefined &&
        rule.coldHands !== context.coldHands
      ) {
        continue;
      }

      // Check cold feet preference
      if (rule.coldFeet !== undefined && rule.coldFeet !== context.coldFeet) {
        continue;
      }

      // Check wind threshold
      if (
        rule.windThreshold &&
        context.wind &&
        context.wind < rule.windThreshold
      ) {
        continue;
      }

      // Check rain threshold (special handling)
      if (
        rule.rainThreshold &&
        context.rain &&
        context.rain <= rule.rainThreshold
      ) {
        continue;
      }

      return rule.value;
    }

    // Fallback
    return "nic";
  }
}
