import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Badge } from "../ui/badge";
import type { ReputationBadgeEnum } from "../../types";
import { getReputationConfig } from "../../lib/utils/reputation-config";
import { Star, Award } from "lucide-react";

interface ReputationBadgeProps {
  badge: ReputationBadgeEnum;
  feedbackCount: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function ReputationBadge({
  badge,
  feedbackCount,
  size = "md",
  showLabel = true,
}: ReputationBadgeProps) {
  const config = getReputationConfig(badge);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const IconComponent = config.icon === "Award" ? Award : Star;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`${config.color} ${sizeClasses[size]} border-0 text-white hover:${config.color}`}
          >
            <IconComponent className={`${iconSizes[size]} mr-1`} />
            {showLabel && config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {config.label} - {feedbackCount} feedbacków
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
