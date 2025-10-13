import React from "react";
import { Thermometer, Wind, Star, MapPin, Clock, Eye } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import ReputationBadge from "./ReputationBadge";
import type { CommunityOutfitDTO } from "../../types";
import { getOutfitItemConfig } from "../../lib/utils/outfit-icons";
import { getReputationLevel } from "../../lib/utils/reputation-config";
import { ACTIVITY_TYPE_LABELS } from "../../constants/community.constants";

interface OutfitCardProps {
  outfit: CommunityOutfitDTO;
  onClick: (id: string) => void;
}

interface OutfitIconsProps {
  outfit: CommunityOutfitDTO["outfit"];
}

function OutfitIcons({ outfit }: OutfitIconsProps) {
  const zones = [
    { key: "head", label: "Głowa" },
    { key: "torso", label: "Tułów" },
    { key: "arms", label: "Ręce" },
    { key: "hands", label: "Dłonie" },
    { key: "legs", label: "Nogi" },
    { key: "feet", label: "Stopy" },
    { key: "neck", label: "Szyja" },
  ];

  const getZoneValue = (zone: string) => {
    switch (zone) {
      case "head":
        return outfit.head;
      case "torso":
        return `${outfit.torso.base}/${outfit.torso.mid}/${outfit.torso.outer}`;
      case "arms":
        return outfit.arms;
      case "hands":
        return outfit.hands;
      case "legs":
        return outfit.legs;
      case "feet":
        return outfit.feet.socks;
      case "neck":
        return outfit.neck;
      default:
        return "";
    }
  };

  return (
    <div className="grid grid-cols-7 gap-1">
      {zones.map((zone) => {
        const value = getZoneValue(zone.key);
        const config = getOutfitItemConfig(zone.key, value);

        return (
          <div
            key={zone.key}
            className="flex flex-col items-center p-1 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
            title={`${zone.label}: ${config?.label || value}`}
          >
            <div className="text-xs text-gray-600 mb-1">{zone.label[0]}</div>
            {config ? (
              <div className="w-6 h-6 flex items-center justify-center text-gray-700">
                {/* Using a simple placeholder icon since we don't have lucide icons for all items */}
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
              </div>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                <div className="w-3 h-3 bg-gray-300 rounded"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface WeatherIconProps {
  temperature: number;
}

function WeatherIcon({ temperature }: WeatherIconProps) {
  // Simple weather icon based on temperature
  if (temperature < 0) return "❄️";
  if (temperature < 10) return "🥶";
  if (temperature < 20) return "🌤️";
  if (temperature < 30) return "☀️";
  return "🔥";
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "przed chwilą";
  if (diffHours < 24) return `${diffHours}h temu`;
  if (diffDays < 7) return `${diffDays}d temu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}t temu`;
  return `${Math.floor(diffDays / 30)}m temu`;
}

export default function OutfitCard({ outfit, onClick }: OutfitCardProps) {
  const reputationLevel = getReputationLevel(outfit.feedback_count);

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200 hover:border-blue-300"
      onClick={() => onClick(outfit.id)}
    >
      <CardContent className="p-4">
        {/* Header: User info and time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {outfit.user_pseudonym}
            </span>
            <ReputationBadge
              badge={reputationLevel}
              feedbackCount={outfit.feedback_count}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(outfit.created_at || "")}
          </div>
        </div>

        {/* Weather conditions */}
        <div className="flex items-center gap-4 mb-3 p-2 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-1">
            <Thermometer className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">
              {Math.round(outfit.weather_conditions.temperature)}°C
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-4 w-4 text-blue-600" />
            <span className="text-sm">
              {Math.round(outfit.weather_conditions.wind_speed)} km/h
            </span>
          </div>
          <div className="text-lg">
            {WeatherIcon(outfit.weather_conditions.temperature)}
          </div>
        </div>

        {/* Outfit visualization */}
        <div className="mb-3">
          <OutfitIcons outfit={outfit.outfit} />
        </div>

        {/* Footer: Activity, rating, distance */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {ACTIVITY_TYPE_LABELS[outfit.activity_type]}
            </Badge>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${
                    i < outfit.overall_rating
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-600 ml-1">
                {outfit.overall_rating}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            <span>{outfit.distance_km.toFixed(1)} km</span>
          </div>
        </div>

        {/* View details button */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button className="w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
            <Eye className="h-4 w-4" />
            Zobacz szczegóły
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
