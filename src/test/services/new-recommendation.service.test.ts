import { describe, it, expect, beforeEach } from "vitest";
import { NewRecommendationService } from "../../services/recommendations/new-recommendation.service";
import type { NewRecommendationInput } from "../../services/recommendations/new-recommendation.service";

describe("New Recommendation Service", () => {
  let service: NewRecommendationService;

  beforeEach(() => {
    service = new NewRecommendationService();
  });

  describe("Wind Chill Calculations", () => {
    it("should not apply wind chill when temperature > 10°C", () => {
      const input: NewRecommendationInput = {
        temperature: 15,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(15);
    });

    it("should apply wind chill for cold temperatures", () => {
      const input: NewRecommendationInput = {
        temperature: 5,
        humidity: 60,
        windSpeed: 15,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBeLessThan(5); // Should be colder due to wind
    });

    it("should not apply wind chill when wind < 5 km/h", () => {
      const input: NewRecommendationInput = {
        temperature: 5,
        humidity: 60,
        windSpeed: 3,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(5);
    });

    it("should apply heat index for moderate temperatures with high humidity", () => {
      const input: NewRecommendationInput = {
        temperature: 18,
        humidity: 80,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBeGreaterThan(18); // Should be warmer due to humidity
    });
  });

  describe("Heat Index Calculations", () => {
    it("should apply heat index for hot and humid conditions", () => {
      const input: NewRecommendationInput = {
        temperature: 25,
        humidity: 80,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBeGreaterThan(25); // Should be warmer due to humidity
    });

    it("should not apply heat index for low humidity", () => {
      const input: NewRecommendationInput = {
        temperature: 25,
        humidity: 30,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(25);
    });

    it("should apply heat index for moderate temperatures with high humidity", () => {
      const input: NewRecommendationInput = {
        temperature: 18,
        humidity: 80,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBeGreaterThan(18); // Should be warmer due to humidity
    });
  });

  describe("Workout Intensity Adjustments", () => {
    it("should adjust effective temperature for intensive workouts", () => {
      const input: NewRecommendationInput = {
        temperature: 15,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "intensywny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(20); // 15 + 5 for intensive workout (feels hotter, needs cooler clothing)
    });

    it("should slightly adjust effective temperature for tempo workouts", () => {
      const input: NewRecommendationInput = {
        temperature: 15,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "tempo",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(18); // 15 + 3 for tempo workout (feels hotter, needs cooler clothing)
    });

    it("should apply wind chill for recreational workouts in cold", () => {
      const input: NewRecommendationInput = {
        temperature: 8,
        humidity: 60,
        windSpeed: 15,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBeLessThan(8); // Wind chill should make it colder
    });
  });

  describe("Long Ride Adjustments", () => {
    it("should increase effective temperature for long rides", () => {
      const input: NewRecommendationInput = {
        temperature: 10,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 150,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(9); // 10 - 1.5 (wind chill) + 0.5 (long ride) = 9
    });
  });

  describe("Long Pants Logic", () => {
    it("should recommend long pants in very cold weather", () => {
      const input = {
        temperature: -5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: -8,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(true);
    });

    it("should recommend long pants for temperatures at or below 15°C", () => {
      const input = {
        temperature: 15,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 15,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(true);
    });

    it("should recommend long pants for effective temperature at or below 15°C", () => {
      const input = {
        temperature: 12,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 14,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(true);
    });

    it("should recommend short shorts for temperatures above 15°C", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 18,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(false);
    });

    it("should recommend long pants for intensive workouts in cold weather (ignoring intensity adjustment)", () => {
      const input = {
        temperature: 10,
        humidity: 60,
        windSpeed: 17,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
      };

      const result = service["shouldWearLongPants"](input);
      // Despite intensive workout adding +5°C to body temp,
      // legs still work hard and feel cold, so long pants are needed
      expect(result).toBe(true);
    });

    it("should not recommend long pants for mild weather", () => {
      const input = {
        temperature: 20,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 20,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(false);
    });

    it("should not recommend long pants for warm weather", () => {
      const input = {
        temperature: 25,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 25,
      };

      const result = service["shouldWearLongPants"](input);
      expect(result).toBe(false);
    });
  });

  describe("Upper Body Layers Logic", () => {
    it("should recommend heavy layers in very cold weather", () => {
      const input = {
        temperature: -10,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: -13,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
      expect(items).toContain("kurtka zimowa");
    });

    it("should recommend wind protection in cold windy conditions", () => {
      const input = {
        temperature: 3,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: -1,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
      expect(items).toContain("kurtka przeciwwiatrowa");
    });

    it("should recommend layers for intensive workouts in moderate cold", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
        effectiveTemp: 10,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
    });

    it("should recommend layers for tempo workouts in cool conditions", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "tempo" as const,
        workoutDuration: 60,
        effectiveTemp: 9,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
    });

    it("should always recommend sweatshirt below 12°C regardless of intensity", () => {
      const shortRecreationalInput = {
        temperature: 11,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 11,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](shortRecreationalInput, items);

      expect(items).toContain("bluza");
    });

    it("should recommend layers for long recreational rides", () => {
      const input = {
        temperature: 12,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 140,
        effectiveTemp: 12,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
    });

    it("should not recommend sweatshirt above 12°C for short recreational rides", () => {
      const input = {
        temperature: 14,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 14,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).not.toContain("bluza");
    });

    it("should recommend wind protection for long rides in mild weather", () => {
      const input = {
        temperature: 16,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 100,
        effectiveTemp: 16,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("kamizelka przeciwwiatrowa");
    });

    it("should recommend light layers for very long hot rides", () => {
      const input = {
        temperature: 28,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 200,
        effectiveTemp: 28,
      };
      const items: any[] = [];

      service["addUpperBodyLayers"](input, items);

      expect(items).toContain("bluza");
    });
  });

  describe("Hat Logic", () => {
    it("should recommend hat in cold weather", () => {
      const input = {
        temperature: 10,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 7,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(true);
    });

    it("should recommend hat for sun protection on longer rides", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 80,
        effectiveTemp: 18,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(true);
    });

    it("should recommend hat for intensive workouts in warm weather", () => {
      const input = {
        temperature: 20,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
        effectiveTemp: 22,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(true);
    });

    it("should recommend hat for wind protection in windy conditions", () => {
      const input = {
        temperature: 12,
        humidity: 60,
        windSpeed: 25,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 8,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(true);
    });

    it("should recommend hat for very long rides", () => {
      const input = {
        temperature: 22,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 200,
        effectiveTemp: 22,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(true);
    });

    it("should not recommend hat for short rides in mild weather", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 30,
        effectiveTemp: 18,
      };

      const result = service["shouldWearHat"](input);
      expect(result).toBe(false);
    });
  });

  describe("Gloves Logic", () => {
    it("should recommend winter gloves in very cold weather", () => {
      const input = {
        temperature: -5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: -8,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki zimowe");
    });

    it("should recommend winter gloves for intensive workouts in cold weather", () => {
      const input = {
        temperature: 5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
        effectiveTemp: 7,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki zimowe");
    });

    it("should recommend winter gloves for windy conditions", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 5,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki zimowe");
    });

    it("should recommend winter gloves for long rides", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 140,
        effectiveTemp: 8,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki zimowe");
    });

    it("should recommend autumn gloves for tempo workouts in cool weather", () => {
      const input = {
        temperature: 10,
        humidity: 60,
        windSpeed: 15,
        workoutIntensity: "tempo" as const,
        workoutDuration: 60,
        effectiveTemp: 11,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki jesienne");
    });

    it("should recommend summer gloves for very long rides in moderate weather", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 160,
        effectiveTemp: 18,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki letnie");
    });

    it("should recommend summer gloves for warm weather short rides (safety first)", () => {
      const input = {
        temperature: 22,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 22,
      };

      const result = service["getGlovesType"](input);
      expect(result).toBe("rękawiczki letnie");
    });
  });

  describe("Neck Protection Logic", () => {
    it("should recommend neck protection in cold weather", () => {
      const input = {
        temperature: 5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 2,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(true);
    });

    it("should recommend neck protection in very windy conditions", () => {
      const input = {
        temperature: 15,
        humidity: 60,
        windSpeed: 25,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 15,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(true);
    });

    it("should recommend neck protection for intensive workouts in cool weather", () => {
      const input = {
        temperature: 10,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
        effectiveTemp: 12,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(true);
    });

    it("should not recommend neck protection for warm weather even with wind", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 18,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 100,
        effectiveTemp: 18,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(false);
    });

    it("should not recommend neck protection for very long rides in warm weather without wind", () => {
      const input = {
        temperature: 18,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 200,
        effectiveTemp: 18,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(false);
    });

    it("should recommend neck protection from around 13°C with wind", () => {
      const input = {
        temperature: 12,
        humidity: 60,
        windSpeed: 15,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 10,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(true);
    });

    it("should not recommend neck protection for calm warm weather", () => {
      const input = {
        temperature: 22,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 22,
      };

      const result = service["shouldWearNeckProtection"](input);
      expect(result).toBe(false);
    });
  });

  describe("Shoe Covers Logic", () => {
    it("should recommend shoe covers in very cold weather", () => {
      const input = {
        temperature: -5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: -8,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(true);
    });

    it("should not recommend shoe covers in moderate cold even with extreme wind", () => {
      const input = {
        temperature: 10,
        humidity: 60,
        windSpeed: 28,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 10,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(false);
    });

    it("should not recommend shoe covers for intensive workouts in moderate cold", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "intensywny" as const,
        workoutDuration: 60,
        effectiveTemp: 10,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(false);
    });

    it("should not recommend shoe covers for tempo workouts in moderate cold", () => {
      const input = {
        temperature: 5,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "tempo" as const,
        workoutDuration: 60,
        effectiveTemp: 6,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(false);
    });

    it("should not recommend shoe covers when effective temperature is exactly 5°C", () => {
      const input = {
        temperature: 8,
        humidity: 60,
        windSpeed: 22,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 5,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(false);
    });

    it("should recommend shoe covers only in very cold weather below 5°C", () => {
      const input = {
        temperature: 3,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 3,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(true);
    });

    it("should not recommend shoe covers for mild weather", () => {
      const input = {
        temperature: 15,
        humidity: 60,
        windSpeed: 10,
        workoutIntensity: "rekreacyjny" as const,
        workoutDuration: 60,
        effectiveTemp: 15,
      };

      const result = service["shouldWearShoeCovers"](input);
      expect(result).toBe(false);
    });
  });

  describe("Complete Recommendations", () => {
    it("should generate complete winter outfit for very cold conditions", () => {
      const input: NewRecommendationInput = {
        temperature: -5,
        humidity: 70,
        windSpeed: 15,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 90,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).not.toContain("koszulka rowerowa"); // No cycling jersey when sweatshirt is recommended
      expect(result.items).toContain("długie spodnie");
      expect(result.items).toContain("bluza");
      expect(result.items).toContain("kurtka zimowa");
      expect(result.items).toContain("czapka");
      expect(result.items).toContain("rękawiczki zimowe");
      expect(result.items).toContain("komin na szyję");
      expect(result.items).toContain("ochraniacze na buty");
    });

    it("should generate summer outfit for hot conditions", () => {
      const input: NewRecommendationInput = {
        temperature: 28,
        humidity: 50,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka rowerowa");
      expect(result.items).toContain("krótkie spodenki");
      // Hot weather (28°C) - summer socks only, no additional foot protection
      expect(result.items).toContain("skarpetki letnie");
      expect(result.items).not.toContain("noski na buty");
      expect(result.items).not.toContain("skarpetki zimowe");
      expect(result.items).not.toContain("ochraniacze na buty");
      // May include hat for sun protection
      expect(result.items.length).toBeGreaterThanOrEqual(2);
    });

    it("should generate intensive workout outfit", () => {
      const input: NewRecommendationInput = {
        temperature: 8,
        humidity: 60,
        windSpeed: 15,
        workoutIntensity: "intensywny",
        workoutDuration: 90,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).not.toContain("koszulka rowerowa"); // No cycling jersey when sweatshirt is recommended
      expect(result.items).toContain("długie spodnie");
      expect(result.items).toContain("bluza");
      expect(result.items).toContain("kamizelka przeciwwiatrowa");
      expect(result.items).toContain("czapka");
      expect(result.items).toContain("rękawiczki zimowe");
      expect(result.items).toContain("komin na szyję");
      expect(result.items).toContain("ochraniacze na buty");
    });

    it("should generate long ride outfit", () => {
      const input: NewRecommendationInput = {
        temperature: 14,
        humidity: 65,
        windSpeed: 18,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 180,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).toContain("koszulka rowerowa"); // At 14°C with long ride, cycling jersey is recommended
      expect(result.items).toContain("długie spodnie");
      // At 14°C, bluza might be added for very long rides
      expect(result.items).toContain("kamizelka przeciwwiatrowa");
      expect(result.items).toContain("czapka");
      expect(result.items).toContain("rękawiczki jesienne");
      expect(result.items).toContain("komin na szyję");
      // Cool weather (14°C) - summer socks with shoe covers for long rides
      expect(result.items).toContain("skarpetki letnie");
      expect(result.items).toContain("noski na buty");
    });

    it("should include leg warmers for longer rides in cool weather", () => {
      const input: NewRecommendationInput = {
        temperature: 16,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 90,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("krótkie spodenki");
      expect(result.items).toContain("nogawki");
    });

    it("should recommend cycling jersey instead of sweatshirt for moderate temperatures (13-20°C)", () => {
      const input: NewRecommendationInput = {
        temperature: 16,
        humidity: 60,
        windSpeed: 8,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).toContain("koszulka rowerowa");
      expect(result.items).not.toContain("bluza"); // No sweatshirt for moderate temperatures
      expect(result.items).toContain("krótkie spodenki");
    });

    it("should recommend sweatshirt instead of cycling jersey for cold temperatures (≤12°C)", () => {
      const input: NewRecommendationInput = {
        temperature: 10,
        humidity: 60,
        windSpeed: 8,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).not.toContain("koszulka rowerowa"); // No cycling jersey when sweatshirt is recommended
      expect(result.items).toContain("bluza");
      expect(result.items).toContain("długie spodnie");
    });
  });

  describe("Safety", () => {
    it("should always recommend helmet regardless of conditions", () => {
      const coldInput: NewRecommendationInput = {
        temperature: -10,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const warmInput: NewRecommendationInput = {
        temperature: 30,
        humidity: 50,
        windSpeed: 5,
        workoutIntensity: "intensywny",
        workoutDuration: 120,
      };

      const coldResult = service.generateRecommendation(coldInput);
      const warmResult = service.generateRecommendation(warmInput);

      expect(coldResult.items).toContain("kask");
      expect(warmResult.items).toContain("kask");
    });
  });

  describe("Edge Cases", () => {
    it("should handle extreme cold", () => {
      const input: NewRecommendationInput = {
        temperature: -15,
        humidity: 80,
        windSpeed: 30,
        workoutIntensity: "długodystansowy",
        workoutDuration: 300,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("kask");
      expect(result.items).toContain("kurtka zimowa");
      expect(result.items).toContain("rękawiczki zimowe");
      expect(result.items).toContain("ochraniacze na buty");
    });

    it("should handle extreme heat", () => {
      const input: NewRecommendationInput = {
        temperature: 35,
        humidity: 90,
        windSpeed: 3,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).not.toContain("bluza");
      expect(result.items).not.toContain("długie spodnie");
    });

    it("should handle minimal wind", () => {
      const input: NewRecommendationInput = {
        temperature: 5,
        humidity: 60,
        windSpeed: 2,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const effectiveTemp = service["getEffectiveTemperature"](input);
      expect(effectiveTemp).toBe(5); // No wind chill
    });

    it("should handle ultra-long rides", () => {
      const input: NewRecommendationInput = {
        temperature: 20,
        humidity: 60,
        windSpeed: 8,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 360, // 6 hours
      };

      const result = service.generateRecommendation(input);

      // At 20°C, short shorts are recommended regardless of ride duration
      expect(result.items).toContain("krótkie spodenki");
      // Hat for sun protection on long rides
      expect(result.items).toContain("czapka");
      // Arm warmers not needed at 20°C
      expect(result.items).not.toContain("rękawki");
    });

    it("should recommend bluza at 8°C for recreational rides", () => {
      const input: NewRecommendationInput = {
        temperature: 8,
        humidity: 60,
        windSpeed: 5,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).toContain("bluza");
      expect(result.items).toContain("długie spodnie"); // At 8°C, long pants are recommended
    });

    it("should recommend additional layers at 6°C with strong wind", () => {
      const input: NewRecommendationInput = {
        temperature: 6,
        humidity: 60,
        windSpeed: 20,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 60,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).toContain("bluza");
      expect(result.items).toContain("kurtka przeciwwiatrowa"); // At 6°C, full wind jacket
    });

    it("should recommend bluza for longer recreational rides at moderate temperatures", () => {
      const input: NewRecommendationInput = {
        temperature: 11,
        humidity: 60,
        windSpeed: 8,
        workoutIntensity: "rekreacyjny",
        workoutDuration: 120,
      };

      const result = service.generateRecommendation(input);

      expect(result.items).toContain("koszulka termoaktywna");
      expect(result.items).toContain("bluza");
    });
  });
});
