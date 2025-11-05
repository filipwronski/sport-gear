import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Award } from "lucide-react";
import type { ProfileDTO, ReputationBadgeEnum } from "../../types";

interface PersonalizationStatusProps {
  profile: ProfileDTO;
}

// Inline reputation configuration to avoid hydration issues
const REPUTATION_CONFIG = {
  nowicjusz: {
    label: "Nowicjusz",
    color: "bg-gray-400",
    icon: "Star",
    minFeedbacks: 0,
    maxFeedbacks: 9,
  },
  regularny: {
    label: "Regularny",
    color: "bg-amber-600",
    icon: "Star",
    minFeedbacks: 10,
    maxFeedbacks: 49,
  },
  ekspert: {
    label: "Ekspert",
    color: "bg-zinc-500",
    icon: "Star",
    minFeedbacks: 50,
    maxFeedbacks: 99,
  },
  mistrz: {
    label: "Mistrz",
    color: "bg-yellow-500",
    icon: "Award",
    minFeedbacks: 100,
    maxFeedbacks: null,
  },
};

const getReputationLevel = (count: number): ReputationBadgeEnum => {
  if (count >= 100) return "mistrz";
  if (count >= 50) return "ekspert";
  if (count >= 10) return "regularny";
  return "nowicjusz";
};

export function PersonalizationStatus({ profile }: PersonalizationStatusProps) {
  const feedbackCount = profile.feedback_count || 0;
  const currentBadge =
    profile.reputation_badge || getReputationLevel(feedbackCount);
  const config = REPUTATION_CONFIG[currentBadge];

  // Calculate progress to next level
  const nextLevelMin =
    config.maxFeedbacks !== null ? config.maxFeedbacks + 1 : null;
  const nextLevelBadge =
    nextLevelMin !== null ? getReputationLevel(nextLevelMin) : null;

  let progress = 0;
  let progressText = "";

  if (nextLevelMin !== null) {
    const currentLevelMin = config.minFeedbacks;
    const currentLevelRange = nextLevelMin - currentLevelMin;
    const progressInLevel = feedbackCount - currentLevelMin;

    progress = Math.min((progressInLevel / currentLevelRange) * 100, 100);
    progressText = `Do ${REPUTATION_CONFIG[nextLevelBadge!].label}: ${nextLevelMin - feedbackCount} feedbacków`;
  } else {
    // Master level - no next level
    progress = 100;
    progressText = "Osiągnięto maksymalny poziom!";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Status personalizacji
        </CardTitle>
        <CardDescription>
          Twój poziom reputacji oparty na ilości feedbacków
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className={`${config.color} text-white border-0 text-lg px-3 py-1.5`}
            >
              {config.icon === "Award" ? (
                <Award className="h-5 w-5 mr-2" />
              ) : (
                <Star className="h-5 w-5 mr-2" />
              )}
              {config.label}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              <span className="whitespace-nowrap">
                {feedbackCount} feedbacków
              </span>
            </div>
          </div>
        </div>

        {nextLevelMin !== null && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm">
              <span>{config.label}</span>
              <span className="text-muted-foreground">
                {feedbackCount}/{nextLevelMin}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center sm:text-left">
              {progressText}
            </p>
          </div>
        )}

        {nextLevelMin === null && (
          <div className="text-center py-4">
            <Badge variant="outline" className="text-sm">
              🎉 {progressText}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
