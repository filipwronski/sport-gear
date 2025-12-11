import { describe, it, expect } from "vitest";
import { convertClothingItemsToOutfit } from "../../lib/utils/outfit-converter";
import { FeedbackValidator } from "../../lib/validation/feedback.validator";

describe("Outfit Converter", () => {
  describe("convertClothingItemsToOutfit", () => {
    it("should convert basic clothing items to valid outfit structure", () => {
      const clothingItems = [
        "czapka",
        "koszulka termoaktywna",
        "bluza",
        "rękawki",
        "rękawiczki zimowe",
        "długie spodnie",
        "noski na buty",
        "komin na szyję",
      ];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      expect(outfit).toEqual({
        head: "czapka",
        torso: {
          base: "termo",
          mid: "kurtka_lekka",
          outer: "nic",
        },
        arms: "rekawki",
        hands: "rekawiczki_zimowe",
        legs: "dlugie",
        feet: {
          socks: "zimowe",
          covers: "nic",
        },
        neck: "komin",
      });
    });

    it("should produce outfit structure that passes validation", () => {
      const clothingItems = [
        "czapka",
        "koszulka termoaktywna",
        "długie spodnie",
        "rękawiczki letnie",
      ];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      // Test that the outfit passes feedback validation
      const feedbackCommand = {
        temperature: 15,
        feels_like: 14,
        wind_speed: 10,
        humidity: 65,
        activity_type: "spokojna" as const,
        duration_minutes: 60,
        actual_outfit: outfit,
        overall_rating: 4,
        notes: "Test feedback",
      };

      expect(() => {
        FeedbackValidator.validateCreateFeedbackCommand(feedbackCommand);
      }).not.toThrow();
    });

    it("should handle empty clothing items array", () => {
      const outfit = convertClothingItemsToOutfit([]);

      expect(outfit).toEqual({
        head: "nic",
        torso: {
          base: "koszulka_kr",
          mid: "nic",
          outer: "nic",
        },
        arms: "nic",
        hands: "nic",
        legs: "krotkie",
        feet: {
          socks: "letnie",
          covers: "nic",
        },
        neck: "nic",
      });
    });

    it("should handle minimal clothing items", () => {
      const clothingItems = ["krótkie spodenki"];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      expect(outfit.legs).toBe("krotkie");
      expect(outfit.head).toBe("nic");
      expect(outfit.torso.base).toBe("koszulka_kr");
    });

    it("should handle multiple outer layers correctly", () => {
      const clothingItems = [
        "koszulka termoaktywna",
        "bluza",
        "kurtka przeciwwiatrowa",
        "kurtka zimowa",
      ];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      // Should prioritize the heavier outer layer
      expect(outfit.torso.outer).toBe("kurtka_zimowa");
    });

    it("should handle all clothing item types", () => {
      const clothingItems = [
        "czapka",
        "koszulka termoaktywna",
        "bluza",
        "kurtka przeciwwiatrowa",
        "kamizelka przeciwwiatrowa",
        "rękawki",
        "rękawiczki jesienne",
        "długie spodnie",
        "nogawki",
        "noski na buty",
        "ochraniacze na buty",
        "komin na szyję",
      ];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      expect(outfit).toEqual({
        head: "czapka",
        torso: {
          base: "termo",
          mid: "kurtka_lekka", // From "bluza"
          outer: "wiatrowka", // From "kurtka przeciwwiatrowa"
        },
        arms: "rekawki",
        hands: "przejsciowe", // From "rękawiczki jesienne"
        legs: "dlugie", // "długie spodnie" takes precedence over "nogawki"
        feet: {
          socks: "zimowe",
          covers: "ochraniacze",
        },
        neck: "komin",
      });
    });

    it("should handle helmet (kask) without affecting outfit visualization", () => {
      const clothingItems = ["kask", "koszulka rowerowa", "krótkie spodenki"];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      // Helmet should not affect the outfit structure
      // It's always recommended but not part of visual outfit display
      expect(outfit.head).toBe("nic");
      expect(outfit.torso.base).toBe("koszulka_kr");
      expect(outfit.legs).toBe("krotkie");
    });

    it("should handle helmet with hat", () => {
      const clothingItems = ["kask", "czapka", "koszulka termoaktywna", "długie spodnie"];

      const outfit = convertClothingItemsToOutfit(clothingItems);

      // Hat should still be displayed in outfit even with helmet
      expect(outfit.head).toBe("czapka");
      expect(outfit.torso.base).toBe("termo");
      expect(outfit.legs).toBe("dlugie");
    });
  });
});
