/**
 * New Clothing Recommendation Service
 * Implements rule-based outfit recommendation algorithm based on user examples
 */

import type {
  ClothingItem,
  ClothingRecommendationDTO,
  WorkoutIntensity,
  ThermalPreferences,
} from "../../types";

export interface NewRecommendationInput {
  temperature: number;
  humidity: number;
  windSpeed: number;
  workoutIntensity: WorkoutIntensity;
  workoutDuration: number;
  thermalAdjustment?: number;
  userPreferences?: ThermalPreferences | null;
}

export class NewRecommendationService {
  /**
   * Generate clothing recommendation based on weather and workout parameters
   */
  generateRecommendation(
    input: NewRecommendationInput,
  ): ClothingRecommendationDTO {
    const items: ClothingItem[] = [];

    // Base layer - always recommend thermal shirt
    items.push("koszulka termoaktywna");

    // Legs based on temperature and duration
    if (this.shouldWearLongPants(input)) {
      items.push("długie spodnie");
    } else {
      items.push("krótkie spodenki");

      // Add leg accessories for longer rides
      if (input.workoutDuration >= 90) {
        // 1.5 hours
        if (input.temperature <= 18) {
          items.push("nogawki");
        }
      }
    }

    // Upper body layers based on temperature
    this.addUpperBodyLayers(input, items);

    // Arms based on temperature and duration
    if (input.workoutDuration >= 90 && input.temperature <= 20) {
      items.push("rękawki");
    }

    // Head protection
    if (this.shouldWearHat(input)) {
      items.push("czapka");
    }

    // Hands protection
    const gloves = this.getGlovesType(input);
    if (gloves) {
      items.push(gloves);
    }

    // Neck protection
    if (this.shouldWearNeckProtection(input)) {
      items.push("komin na szyję");
    }

    // Feet protection - socks OR shoe covers, not both
    if (this.shouldWearShoeCovers(input)) {
      items.push("ochraniacze na buty");
    } else {
      items.push("noski na buty");
    }

    return { items };
  }

  private shouldWearLongPants(input: NewRecommendationInput): boolean {
    const { temperature, workoutDuration, workoutIntensity, windSpeed } = input;

    // Always long pants in cold weather
    if (temperature <= 12) return true;

    // Long pants for intensive workouts in moderate temperatures
    if (workoutIntensity === "intensywny" && temperature <= 18) return true;

    // Long pants for long rides with wind
    if (workoutDuration >= 120 && windSpeed >= 15) return true;

    // Long pants for very long rides
    if (workoutDuration >= 180) return true;

    return false;
  }

  private addUpperBodyLayers(
    input: NewRecommendationInput,
    items: ClothingItem[],
  ): void {
    const {
      temperature,
      windSpeed,
      humidity,
      workoutIntensity,
      workoutDuration,
    } = input;

    // Very cold - heavy layers
    if (temperature <= -5) {
      items.push("bluza");
      items.push("kurtka zimowa");
      return;
    }

    // Cold weather
    if (temperature <= 8) {
      items.push("bluza");

      if (windSpeed >= 15 || (windSpeed >= 12 && humidity >= 80)) {
        items.push("kurtka przeciwwiatrowa");
      } else if (temperature <= 3) {
        items.push("kurtka zimowa");
      }
      return;
    }

    // Moderate cold
    if (temperature <= 15) {
      if (workoutIntensity === "intensywny" || workoutDuration >= 90) {
        items.push("bluza");

        if (windSpeed >= 20) {
          items.push("kurtka przeciwwiatrowa");
        } else if (windSpeed >= 18 && workoutDuration >= 150) {
          items.push("kamizelka przeciwwiatrowa");
        }
      }
      return;
    }

    // Warm weather
    if (temperature >= 20) {
      if (windSpeed >= 15 && workoutDuration >= 90) {
        items.push("kamizelka przeciwwiatrowa");
      }
      return;
    }

    // Mild weather - no additional layers needed
  }

  private shouldWearHat(input: NewRecommendationInput): boolean {
    const {
      temperature,
      windSpeed: _windSpeed,
      workoutIntensity,
      workoutDuration,
    } = input;

    // Always recommend hat when temperature is below 13°C
    if (temperature < 13) return true;

    // Sun protection - recommend hat for longer rides in mild weather
    // When it's not too cold but people are exposed to sun for extended periods
    if (temperature >= 13 && workoutDuration >= 60) return true;

    // Intensive workouts in warm temperatures - sun protection
    if (temperature >= 15 && workoutIntensity === "intensywny") return true;

    return false;
  }

  private getGlovesType(input: NewRecommendationInput): ClothingItem | null {
    const { temperature, windSpeed, workoutIntensity, workoutDuration } = input;

    // Very cold
    if (temperature <= 0) return "rękawiczki zimowe";

    // Cold weather
    if (temperature <= 10) {
      // Winter gloves for intensive workouts or windy conditions
      if (workoutIntensity === "intensywny" || windSpeed >= 20) {
        return "rękawiczki zimowe";
      }
      return "rękawiczki jesienne";
    }

    // Mild cold for longer rides
    if (temperature <= 15 && workoutIntensity === "intensywny") {
      return "rękawiczki letnie";
    }

    // Very long rides in moderate temperatures
    if (temperature <= 20 && workoutDuration >= 150 && windSpeed >= 15) {
      return "rękawiczki letnie";
    }

    return null;
  }

  private shouldWearNeckProtection(input: NewRecommendationInput): boolean {
    const {
      temperature,
      windSpeed,
      humidity,
      workoutIntensity,
      workoutDuration,
    } = input;

    // Cold weather
    if (temperature <= 10) return true;

    // Windy conditions
    if (windSpeed >= 20) return true;

    // Humid cold conditions
    if (temperature <= 12 && humidity >= 80) return true;

    // Intensive workouts in moderate cold
    if (temperature <= 15 && workoutIntensity === "intensywny") return true;

    // Long rides with wind
    if (workoutDuration >= 120 && windSpeed >= 18) return true;

    return false;
  }

  private shouldWearShoeCovers(input: NewRecommendationInput): boolean {
    const { temperature, humidity, windSpeed, workoutIntensity } = input;

    // Very cold or windy conditions
    if (temperature <= 0 || windSpeed >= 25) return true;

    // Cold and humid
    if (temperature <= 8 && humidity >= 80) return true;

    // Intensive workouts in cold
    if (temperature <= 12 && workoutIntensity === "intensywny") return true;

    return false;
  }
}
