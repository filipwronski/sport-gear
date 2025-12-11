import type { ClothingItem, OutfitDTO } from "../../types";

/**
 * Converts new recommendation clothing items to structured outfit DTO
 * Maps clothing items to appropriate body zones with validation-compatible values
 */
export function convertClothingItemsToOutfit(items: ClothingItem[]): OutfitDTO {
  const outfit: OutfitDTO = {
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
  };

  // Map each clothing item to the appropriate zone
  for (const item of items) {
    switch (item) {
      // Head items
      case "czapka":
        outfit.head = "czapka";
        break;
      case "kask":
        // Helmet is always recommended but not part of outfit visualization
        // Keep current head value as hat is still relevant for outfit display
        break;

      // Torso base layer
      case "koszulka termoaktywna":
        outfit.torso.base = "termo";
        break;
      case "koszulka rowerowa":
        // Cycling jersey is the visible layer, so it takes priority
        outfit.torso.base = "koszulka_kr";
        break;

      // Torso mid layer
      case "bluza":
        outfit.torso.mid = "kurtka_lekka";
        break;

      // Torso outer layer
      case "kurtka":
      case "kurtka zimowa":
        outfit.torso.outer = "kurtka_zimowa";
        break;
      case "kurtka przeciwwiatrowa":
        outfit.torso.outer = "wiatrowka";
        break;
      case "kamizelka przeciwwiatrowa":
        outfit.torso.mid = "kurtka_lekka"; // Vest goes to mid layer
        break;

      // Arms
      case "rękawki":
        outfit.arms = "rekawki";
        break;

      // Hands
      case "rękawiczki letnie":
        outfit.hands = "letnie";
        break;
      case "rękawiczki jesienne":
        outfit.hands = "przejsciowe";
        break;
      case "rękawiczki zimowe":
        outfit.hands = "rekawiczki_zimowe";
        break;

      // Legs
      case "długie spodnie":
        outfit.legs = "dlugie";
        break;
      case "nogawki":
        // Only set if not already set to longer coverage
        if (outfit.legs !== "dlugie") {
          outfit.legs = "3/4";
        }
        break;
      case "krótkie spodenki":
        // Only set if not already set to longer coverage
        if (outfit.legs !== "dlugie" && outfit.legs !== "3/4") {
          outfit.legs = "krotkie";
        }
        break;

      // Feet
      case "noski na buty":
        outfit.feet.socks = "zimowe";
        break;
      case "ochraniacze na buty":
        outfit.feet.covers = "ochraniacze";
        break;

      // Neck
      case "komin na szyję":
        outfit.neck = "komin";
        break;
      case "buff":
        outfit.neck = "buff";
        break;
    }
  }

  return outfit;
}
