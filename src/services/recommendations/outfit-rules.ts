/**
 * Outfit rules for different body zones
 * Temperature-based rule system for cycling outfit recommendations
 */

import type { ActivityTypeEnum } from "../../types";

/**
 * Rule structure for outfit recommendations
 */
interface OutfitRule {
  maxTemp: number;
  value: string;
  windThreshold?: number;
  rainThreshold?: number;
  activity?: ActivityTypeEnum[];
  coldHands?: boolean;
  coldFeet?: boolean;
}

// Head gear rules
export const HEAD_RULES: OutfitRule[] = [
  { maxTemp: 0, value: "czapka_zimowa" },
  { maxTemp: 5, value: "czapka" },
  { maxTemp: 10, value: "czapka", windThreshold: 15 },
  { maxTemp: 15, value: "opaska" },
  { maxTemp: Infinity, value: "nic" },
];

// Torso base layer rules
export const TORSO_BASE_RULES: OutfitRule[] = [
  { maxTemp: 5, value: "termo_zimowe" },
  { maxTemp: 10, value: "termo" },
  { maxTemp: 15, value: "koszulka_dl" },
  { maxTemp: 20, value: "koszulka_kr" },
  { maxTemp: Infinity, value: "koszulka_kr" },
];

// Torso mid layer rules
export const TORSO_MID_RULES: OutfitRule[] = [
  { maxTemp: 0, value: "softshell", activity: ["recovery", "spokojna"] },
  { maxTemp: 5, value: "softshell", activity: ["recovery"] },
  { maxTemp: 10, value: "kamizelka", activity: ["recovery"] },
  { maxTemp: Infinity, value: "nic" },
];

// Torso outer layer rules
export const TORSO_OUTER_RULES: OutfitRule[] = [
  { maxTemp: -5, value: "kurtka_zimowa" },
  { maxTemp: Infinity, value: "nic", rainThreshold: 5 }, // Special handling for rain
];

// Arms rules
export const ARMS_RULES: OutfitRule[] = [
  { maxTemp: 10, value: "dlugie_rekawy" },
  { maxTemp: 15, value: "naramienniki" },
  { maxTemp: Infinity, value: "nic" },
];

// Hands rules
export const HANDS_RULES: OutfitRule[] = [
  { maxTemp: 0, value: "rekawiczki_zimowe" },
  { maxTemp: 5, value: "rekawiczki_przejsciowe" },
  { maxTemp: 10, value: "rekawiczki_cienkie", coldHands: true },
  { maxTemp: Infinity, value: "nic" },
];

// Legs rules
export const LEGS_RULES: OutfitRule[] = [
  { maxTemp: 10, value: "dlugie_ocieplone" },
  { maxTemp: 15, value: "dlugie" },
  { maxTemp: 20, value: "3/4", activity: ["recovery", "spokojna"] },
  { maxTemp: Infinity, value: "krotkie" },
];

// Feet socks rules
export const FEET_SOCKS_RULES: OutfitRule[] = [
  { maxTemp: 5, value: "zimowe" },
  { maxTemp: 15, value: "przejsciowe" },
  { maxTemp: Infinity, value: "letnie" },
];

// Feet covers rules
export const FEET_COVERS_RULES: OutfitRule[] = [
  { maxTemp: 5, value: "ochraniacze" },
  { maxTemp: 10, value: "ochraniacze", coldFeet: true },
  { maxTemp: Infinity, value: "nic", rainThreshold: 3 }, // Special handling for rain
];

// Neck rules
export const NECK_RULES: OutfitRule[] = [
  { maxTemp: 10, value: "buff" },
  { maxTemp: Infinity, value: "nic" },
];

/**
 * Activity intensity adjustments to temperature
 * Higher intensity = feels warmer, so adjust temperature up
 */
export const ACTIVITY_TEMP_ADJUSTMENTS: Record<ActivityTypeEnum, number> = {
  recovery: -2, // Recovery feels colder
  spokojna: 0, // Baseline
  tempo: 3, // Tempo feels warmer
  interwaly: 5, // Intervals feel much warmer
};
