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

interface AdjustedRecommendationInput extends NewRecommendationInput {
  effectiveTemp: number;
}

export class NewRecommendationService {
  /**
   * Calculate wind chill factor for cycling
   * Formula based on Environment Canada wind chill index
   */
  private calculateWindChill(temperature: number, windSpeed: number): number {
    // Wind chill is relevant when temperature is below 10°C and wind > 5 km/h
    if (temperature > 10 || windSpeed < 5) {
      return temperature;
    }

    // Convert wind speed to km/h if needed, then to m/s for formula
    const windMs = windSpeed / 3.6; // km/h to m/s

    // Wind chill formula for temperatures ≤ 0°C
    if (temperature <= 0) {
      const windChill =
        13.12 +
        0.6215 * temperature -
        11.37 * Math.pow(windMs, 0.16) +
        0.3965 * temperature * Math.pow(windMs, 0.16);
      return Math.round(windChill * 10) / 10;
    }

    // Simplified formula for temperatures 0-10°C
    const windChill = temperature - windSpeed * 0.3;
    return Math.round(windChill * 10) / 10;
  }

  /**
   * Calculate heat index for hot conditions
   */
  private calculateHeatIndex(temperature: number, humidity: number): number {
    if (temperature < 18 || humidity < 50) {
      return temperature;
    }

    // Simplified heat index calculation
    const heatIndex = temperature + (humidity - 40) * 0.2;
    return Math.round(heatIndex * 10) / 10;
  }

  /**
   * Get effective temperature considering wind chill, heat index, workout intensity and duration
   */
  private getEffectiveTemperature(input: NewRecommendationInput): number {
    const {
      temperature,
      windSpeed,
      humidity,
      workoutIntensity,
      workoutDuration,
    } = input;

    let effectiveTemp = temperature;

    // Apply wind chill for cold conditions
    if (temperature <= 15) {
      effectiveTemp = this.calculateWindChill(temperature, windSpeed);
    }

    // Apply heat index for hot and humid conditions
    if (temperature >= 18 && humidity >= 50) {
      effectiveTemp = this.calculateHeatIndex(temperature, humidity);
    }

    // Adjust for workout intensity - higher intensity makes you feel warmer
    if (workoutIntensity === "intensywny") {
      effectiveTemp += 2;
    } else if (workoutIntensity === "tempo") {
      effectiveTemp += 1;
    }

    // Adjust for long rides - body adapts to cold
    if (workoutDuration >= 120) {
      effectiveTemp += 0.5;
    }

    return Math.round(effectiveTemp * 10) / 10;
  }
  /**
   * Generate clothing recommendation based on weather and workout parameters
   */
  generateRecommendation(
    input: NewRecommendationInput,
  ): ClothingRecommendationDTO {
    const items: ClothingItem[] = [];

    // Calculate effective temperature considering wind chill and heat index
    const effectiveTemp = this.getEffectiveTemperature(input);
    const adjustedInput: AdjustedRecommendationInput = {
      ...input,
      effectiveTemp,
    } as AdjustedRecommendationInput;

    // Base layer - always recommend thermal shirt
    items.push("koszulka termoaktywna");

    // Legs based on temperature and duration
    if (this.shouldWearLongPants(adjustedInput)) {
      items.push("długie spodnie");
    } else {
      items.push("krótkie spodenki");

      // Add leg accessories for longer rides
      if (input.workoutDuration >= 90) {
        // 1.5 hours
        if (effectiveTemp <= 16) {
          items.push("nogawki");
        }
      }
    }

    // Upper body layers based on temperature
    this.addUpperBodyLayers(adjustedInput, items);

    // Arms based on temperature and duration
    if (input.workoutDuration >= 90 && effectiveTemp <= 18) {
      items.push("rękawki");
    }

    // Head protection
    if (this.shouldWearHat(adjustedInput)) {
      items.push("czapka");
    }

    // Hands protection
    const gloves = this.getGlovesType(adjustedInput);
    if (gloves) {
      items.push(gloves);
    }

    // Neck protection
    if (this.shouldWearNeckProtection(adjustedInput)) {
      items.push("komin na szyję");
    }

    // Feet protection - socks OR shoe covers, not both
    if (this.shouldWearShoeCovers(adjustedInput)) {
      items.push("ochraniacze na buty");
    } else {
      items.push("noski na buty");
    }

    return { items };
  }

  private shouldWearLongPants(
    input: NewRecommendationInput | AdjustedRecommendationInput,
  ): boolean {
    const effectiveTemp =
      "effectiveTemp" in input
        ? input.effectiveTemp
        : this.getEffectiveTemperature(input);
    const { workoutDuration, workoutIntensity, windSpeed } = input;

    // Always long pants in cold weather (using effective temperature)
    if (effectiveTemp <= 10) return true;

    // Long pants for intensive workouts in moderate temperatures
    if (workoutIntensity === "intensywny" && effectiveTemp <= 15) return true;

    // Long pants for tempo workouts in cool conditions
    if (workoutIntensity === "tempo" && effectiveTemp <= 14) return true;

    // Long pants for long rides with wind
    if (workoutDuration >= 120 && windSpeed >= 15) return true;

    // Long pants for very long rides in moderate temperatures (not in extreme heat)
    if (workoutDuration >= 180 && effectiveTemp <= 25) return true;

    return false;
  }

  private addUpperBodyLayers(
    input: NewRecommendationInput | AdjustedRecommendationInput,
    items: ClothingItem[],
  ): void {
    const effectiveTemp =
      "effectiveTemp" in input
        ? input.effectiveTemp
        : this.getEffectiveTemperature(input);
    const {
      temperature,
      windSpeed,
      humidity,
      workoutIntensity,
      workoutDuration,
    } = input;

    // Very cold - heavy layers (using effective temperature)
    if (effectiveTemp <= -2) {
      items.push("bluza");
      items.push("kurtka zimowa");
      return;
    }

    // Cold weather
    if (effectiveTemp <= 6) {
      items.push("bluza");

      if (windSpeed >= 15 || (windSpeed >= 10 && humidity >= 80)) {
        items.push("kurtka przeciwwiatrowa");
      } else if (effectiveTemp <= 2) {
        items.push("kurtka zimowa");
      }
      return;
    }

    // Moderate cold
    if (effectiveTemp <= 13) {
      // Always add layers for intensive workouts
      if (workoutIntensity === "intensywny") {
        items.push("bluza");
        if (windSpeed >= 15) {
          items.push("kamizelka przeciwwiatrowa");
        }
      }
      // Add layers for tempo workouts in cooler conditions
      else if (workoutIntensity === "tempo") {
        if (effectiveTemp <= 11) {
          items.push("bluza");
          if (effectiveTemp <= 8 || windSpeed >= 15) {
            items.push("kamizelka przeciwwiatrowa");
          }
        }
      }
      // Add layers for recreational workouts in cool conditions
      else if (workoutIntensity === "rekreacyjny") {
        if (effectiveTemp <= 10 || workoutDuration >= 120) {
          items.push("bluza");
          if (windSpeed >= 15) {
            items.push("kamizelka przeciwwiatrowa");
          }
        }
      }
      return;
    }

    // Mild weather - consider wind and duration
    if (effectiveTemp <= 18) {
      if (windSpeed >= 18 && workoutDuration >= 90) {
        items.push("kamizelka przeciwwiatrowa");
      }
      // Add light layers for long recreational rides
      if (workoutIntensity === "rekreacyjny" && workoutDuration >= 150) {
        items.push("bluza");
      }
      return;
    }

    // Warm weather
    if (temperature >= 20) {
      // Wind protection for warm conditions
      if (windSpeed >= 15 && workoutDuration >= 90) {
        items.push("kamizelka przeciwwiatrowa");
      }
      // Light layers for very long hot rides
      if (workoutDuration >= 180 && temperature >= 25) {
        items.push("bluza"); // For UV protection
      }
      return;
    }

    // Very warm weather - no additional layers needed
  }

  private shouldWearHat(
    input: NewRecommendationInput | AdjustedRecommendationInput,
  ): boolean {
    const effectiveTemp =
      "effectiveTemp" in input
        ? input.effectiveTemp
        : this.getEffectiveTemperature(input);
    const { temperature, workoutIntensity, workoutDuration } = input;

    // Always recommend hat in cold conditions (using effective temperature)
    if (effectiveTemp <= 12) return true;

    // Sun protection - recommend hat for longer rides in mild weather
    // When it's not too cold but people are exposed to sun for extended periods
    if (temperature >= 13 && workoutDuration >= 60) return true;

    // Intensive workouts in warm temperatures - sun protection
    if (temperature >= 15 && workoutIntensity === "intensywny") return true;

    return false;
  }

  private getGlovesType(
    input: NewRecommendationInput | AdjustedRecommendationInput,
  ): ClothingItem | null {
    const effectiveTemp =
      (input as any).effectiveTemp ?? this.getEffectiveTemperature(input);

    const { windSpeed, workoutIntensity, workoutDuration } = input;

    // Base selection based on effective temperature
    let glovesType: ClothingItem;

    if (effectiveTemp <= 5) {
      glovesType = "rękawiczki zimowe";
    } else if (effectiveTemp <= 12) {
      glovesType = "rękawiczki jesienne";
    } else {
      glovesType = "rękawiczki letnie";
    }

    // Adjustments for special conditions
    // Upgrade to winter gloves for intensive workouts in cool conditions
    if (workoutIntensity === "intensywny" && effectiveTemp <= 10) {
      glovesType = "rękawiczki zimowe";
    }

    // Upgrade for long rides in cool conditions
    if (workoutDuration >= 120 && effectiveTemp <= 10) {
      glovesType = "rękawiczki zimowe";
    }

    // Upgrade for extreme conditions
    if (workoutDuration >= 180 || windSpeed >= 25) {
      if (glovesType === "rękawiczki letnie") {
        glovesType = "rękawiczki jesienne";
      }
    }

    return glovesType;
  }

  private shouldWearNeckProtection(
    input: NewRecommendationInput | AdjustedRecommendationInput,
  ): boolean {
    const effectiveTemp =
      "effectiveTemp" in input
        ? input.effectiveTemp
        : this.getEffectiveTemperature(input);
    const { windSpeed, humidity, workoutIntensity, workoutDuration } = input;

    // Cold weather (using effective temperature)
    if (effectiveTemp <= 8) return true;

    // Very windy conditions
    if (windSpeed >= 18) return true;

    // Humid cold conditions
    if (effectiveTemp <= 10 && humidity >= 80) return true;

    // Intensive workouts in cool conditions
    if (effectiveTemp <= 13 && workoutIntensity === "intensywny") return true;

    // Long rides with wind
    if (workoutDuration >= 120 && windSpeed >= 18) return true;

    // Very long rides regardless of temperature
    if (workoutDuration >= 200) return true;

    return false;
  }

  private shouldWearShoeCovers(
    input: NewRecommendationInput | AdjustedRecommendationInput,
  ): boolean {
    const effectiveTemp =
      "effectiveTemp" in input
        ? input.effectiveTemp
        : this.getEffectiveTemperature(input);
    const { humidity, windSpeed, workoutIntensity } = input;

    // Very cold or extremely windy conditions (using effective temperature)
    if (effectiveTemp <= -2 || windSpeed >= 25) return true;

    // Cold and humid
    if (effectiveTemp <= 6 && humidity >= 80) return true;

    // Intensive workouts in cold conditions
    if (effectiveTemp <= 10 && workoutIntensity === "intensywny") return true;

    // Tempo workouts in very cold conditions
    if (effectiveTemp <= 8 && workoutIntensity === "tempo") return true;

    // Windy conditions for long rides
    if (windSpeed >= 20 && effectiveTemp <= 12) return true;

    return false;
  }
}
