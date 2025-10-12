import { ReputationBadgeEnum, ReputationBadgeConfig } from "../../types";

/**
 * Reputation badge configuration
 * Defines colors, icons, labels and thresholds for each reputation level
 */
export const REPUTATION_CONFIG: Record<
  ReputationBadgeEnum,
  ReputationBadgeConfig
> = {
  nowicjusz: {
    badge: "nowicjusz",
    label: "Nowicjusz",
    color: "bg-gray-400",
    icon: "Star",
    minFeedbacks: 0,
    maxFeedbacks: 9,
  },
  regularny: {
    badge: "regularny",
    label: "Regularny",
    color: "bg-amber-600",
    icon: "Star",
    minFeedbacks: 10,
    maxFeedbacks: 49,
  },
  ekspert: {
    badge: "ekspert",
    label: "Ekspert",
    color: "bg-zinc-500",
    icon: "Star",
    minFeedbacks: 50,
    maxFeedbacks: 99,
  },
  mistrz: {
    badge: "mistrz",
    label: "Mistrz",
    color: "bg-yellow-500",
    icon: "Award",
    minFeedbacks: 100,
    maxFeedbacks: null,
  },
};

/**
 * Get reputation config for a badge
 */
export function getReputationConfig(
  badge: ReputationBadgeEnum,
): ReputationBadgeConfig {
  return REPUTATION_CONFIG[badge];
}

/**
 * Get reputation level based on feedback count
 */
export function getReputationLevel(feedbackCount: number): ReputationBadgeEnum {
  if (feedbackCount >= 100) return "mistrz";
  if (feedbackCount >= 50) return "ekspert";
  if (feedbackCount >= 10) return "regularny";
  return "nowicjusz";
}
