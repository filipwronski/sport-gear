/**
 * Valid outfit options for each body zone
 * Used for validating outfit structure in feedback submissions
 */

// Head zone options
export const VALID_HEAD_OPTIONS = ["czapka", "opaska", "buff", "nic"] as const;

// Torso layer options
export const VALID_TORSO_BASE = [
  "koszulka_kr",
  "koszulka_dl",
  "termo",
] as const;
export const VALID_TORSO_MID = ["kurtka_lekka", "softshell", "nic"] as const;
export const VALID_TORSO_OUTER = ["kurtka_zimowa", "wiatrowka", "nic"] as const;

// Arms zone options
export const VALID_ARMS = ["rekawki", "naramienniki", "nic"] as const;

// Hands zone options
export const VALID_HANDS = [
  "rekawiczki_zimowe",
  "przejsciowe",
  "letnie",
  "nic",
] as const;

// Legs zone options
export const VALID_LEGS = ["dlugie", "3/4", "krotkie", "getry"] as const;

// Feet options
export const VALID_SOCKS = ["zimowe", "letnie"] as const;
export const VALID_COVERS = ["ochraniacze", "nic"] as const;

// Neck zone options
export const VALID_NECK = ["komin", "buff", "nic"] as const;

// Type definitions for outfit options
export type HeadOption = (typeof VALID_HEAD_OPTIONS)[number];
export type TorsoBaseOption = (typeof VALID_TORSO_BASE)[number];
export type TorsoMidOption = (typeof VALID_TORSO_MID)[number];
export type TorsoOuterOption = (typeof VALID_TORSO_OUTER)[number];
export type ArmsOption = (typeof VALID_ARMS)[number];
export type HandsOption = (typeof VALID_HANDS)[number];
export type LegsOption = (typeof VALID_LEGS)[number];
export type SocksOption = (typeof VALID_SOCKS)[number];
export type CoversOption = (typeof VALID_COVERS)[number];
export type NeckOption = (typeof VALID_NECK)[number];
