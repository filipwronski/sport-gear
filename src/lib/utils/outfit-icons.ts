import { OutfitItemConfig } from "../../types";

/**
 * Head outfit items configuration
 */
export const HEAD_ITEMS: Record<string, OutfitItemConfig> = {
  czapka: { value: "czapka", label: "Czapka", icon: "Cap", category: "head" },
  opaska: {
    value: "opaska",
    label: "Opaska",
    icon: "Headband",
    category: "head",
  },
  buff: { value: "buff", label: "Buff", icon: "Scarf", category: "head" },
  nic: {
    value: "nic",
    label: "Bez nakrycia głowy",
    icon: "X",
    category: "head",
  },
};

/**
 * Torso outfit items configuration
 */
export const TORSO_ITEMS: Record<string, OutfitItemConfig> = {
  // Base layer
  koszulka_termalna: {
    value: "koszulka_termalna",
    label: "Koszulka termalna",
    icon: "Shirt",
    category: "torso",
  },
  koszulka_dluga: {
    value: "koszulka_dluga",
    label: "Długa koszulka",
    icon: "Shirt",
    category: "torso",
  },
  podkoszulek: {
    value: "podkoszulek",
    label: "Podkoszulek",
    icon: "Shirt",
    category: "torso",
  },

  // Mid layer
  bluza_ciepla: {
    value: "bluza_ciepla",
    label: "Ciepła bluza",
    icon: "Jacket",
    category: "torso",
  },
  bluza_lekka: {
    value: "bluza_lekka",
    label: "Lekka bluza",
    icon: "Jacket",
    category: "torso",
  },
  kamizelka: {
    value: "kamizelka",
    label: "Kamizelka",
    icon: "Vest",
    category: "torso",
  },

  // Outer layer
  kurtka_wiatrowka: {
    value: "kurtka_wiatrowka",
    label: "Kurtka wiatrowka",
    icon: "Wind",
    category: "torso",
  },
  kurtka_softshell: {
    value: "kurtka_softshell",
    label: "Kurtka softshell",
    icon: "Jacket",
    category: "torso",
  },
  kurtka_zimowa: {
    value: "kurtka_zimowa",
    label: "Kurtka zimowa",
    icon: "Snowflake",
    category: "torso",
  },
  nic: {
    value: "nic",
    label: "Bez warstwy zewnętrznej",
    icon: "X",
    category: "torso",
  },
};

/**
 * Arms outfit items configuration
 */
export const ARMS_ITEMS: Record<string, OutfitItemConfig> = {
  rekawiczki_dlugie: {
    value: "rekawiczki_dlugie",
    label: "Długie rękawiczki",
    icon: "Gloves",
    category: "arms",
  },
  rekawiczki_krotkie: {
    value: "rekawiczki_krotkie",
    label: "Krótkie rękawiczki",
    icon: "Gloves",
    category: "arms",
  },
  nic: { value: "nic", label: "Bez rękawiczek", icon: "X", category: "arms" },
};

/**
 * Hands outfit items configuration
 */
export const HANDS_ITEMS: Record<string, OutfitItemConfig> = {
  rekawice_dlugie: {
    value: "rekawice_dlugie",
    label: "Długie rękawice",
    icon: "Gloves",
    category: "hands",
  },
  rekawice_krotkie: {
    value: "rekawice_krotkie",
    label: "Krótkie rękawice",
    icon: "Gloves",
    category: "hands",
  },
  rekawice_zimowe: {
    value: "rekawice_zimowe",
    label: "Rękawice zimowe",
    icon: "Snowflake",
    category: "hands",
  },
  nic: { value: "nic", label: "Bez rękawic", icon: "X", category: "hands" },
};

/**
 * Legs outfit items configuration
 */
export const LEGS_ITEMS: Record<string, OutfitItemConfig> = {
  spodnie_dlugie: {
    value: "spodnie_dlugie",
    label: "Długie spodnie",
    icon: "Pants",
    category: "legs",
  },
  spodnie_3_4: {
    value: "spodnie_3_4",
    label: "Spodnie 3/4",
    icon: "Pants",
    category: "legs",
  },
  spodenki: {
    value: "spodenki",
    label: "Spodenki",
    icon: "Pants",
    category: "legs",
  },
  legginsy: {
    value: "legginsy",
    label: "Legginsy",
    icon: "Pants",
    category: "legs",
  },
  nic: { value: "nic", label: "Bez spodni", icon: "X", category: "legs" },
};

/**
 * Feet outfit items configuration (socks)
 */
export const SOCKS_ITEMS: Record<string, OutfitItemConfig> = {
  skarpety_grube: {
    value: "skarpety_grube",
    label: "Grube skarpety",
    icon: "Socks",
    category: "feet",
  },
  skarpety_cienkie: {
    value: "skarpety_cienkie",
    label: "Cienkie skarpety",
    icon: "Socks",
    category: "feet",
  },
  skarpety_wysokie: {
    value: "skarpety_wysokie",
    label: "Wysokie skarpety",
    icon: "Socks",
    category: "feet",
  },
  nic: { value: "nic", label: "Bez skarpet", icon: "X", category: "feet" },
};

/**
 * Feet covers outfit items configuration (shoe covers)
 */
export const COVERS_ITEMS: Record<string, OutfitItemConfig> = {
  ochraniacze_na_buty: {
    value: "ochraniacze_na_buty",
    label: "Ochraniacze na buty",
    icon: "Shoe",
    category: "feet",
  },
  nic: { value: "nic", label: "Bez ochraniaczy", icon: "X", category: "feet" },
};

/**
 * Neck outfit items configuration
 */
export const NECK_ITEMS: Record<string, OutfitItemConfig> = {
  szalik: { value: "szalik", label: "Szalik", icon: "Scarf", category: "neck" },
  kominiarka: {
    value: "kominiarka",
    label: "Kominiarka",
    icon: "Scarf",
    category: "neck",
  },
  buff: {
    value: "buff",
    label: "Buff na szyję",
    icon: "Scarf",
    category: "neck",
  },
  nic: { value: "nic", label: "Bez ochrony szyi", icon: "X", category: "neck" },
};

/**
 * Get outfit item config by category and value
 */
export function getOutfitItemConfig(
  category: string,
  value: string,
): OutfitItemConfig | null {
  const categoryMap = {
    head: HEAD_ITEMS,
    torso: TORSO_ITEMS,
    arms: ARMS_ITEMS,
    hands: HANDS_ITEMS,
    legs: LEGS_ITEMS,
    feet: SOCKS_ITEMS, // Note: feet maps to socks, covers are separate
    neck: NECK_ITEMS,
  };

  const items = categoryMap[category as keyof typeof categoryMap];
  return items?.[value] || null;
}

/**
 * Get all outfit items for a category
 */
export function getCategoryItems(category: string): OutfitItemConfig[] {
  const categoryMap = {
    head: HEAD_ITEMS,
    torso: TORSO_ITEMS,
    arms: ARMS_ITEMS,
    hands: HANDS_ITEMS,
    legs: LEGS_ITEMS,
    feet: SOCKS_ITEMS,
    neck: NECK_ITEMS,
  };

  const items = categoryMap[category as keyof typeof categoryMap];
  return items ? Object.values(items) : [];
}
