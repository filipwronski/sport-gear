import React from "react";
import {
  Thermometer,
  Wind,
  Droplets,
  Star,
  MapPin,
  Clock,
  Activity,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import ReputationBadge from "./ReputationBadge";
import type { CommunityOutfitDTO } from "../../types";
import { getOutfitItemConfig } from "../../lib/utils/outfit-icons";
import { getReputationLevel } from "../../lib/utils/reputation-config";
import { ACTIVITY_TYPE_LABELS } from "../../constants/community.constants";

interface OutfitDetailModalProps {
  outfit: CommunityOutfitDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OutfitDetailSectionProps {
  outfit: CommunityOutfitDTO["outfit"];
}

function OutfitDetailSection({ outfit }: OutfitDetailSectionProps) {
  const zones = [
    { key: "head", label: "Głowa", value: outfit.head },
    {
      key: "torso",
      label: "Tułów",
      value: `${outfit.torso.base} / ${outfit.torso.mid} / ${outfit.torso.outer}`,
    },
    { key: "arms", label: "Ręce", value: outfit.arms },
    { key: "hands", label: "Dłonie", value: outfit.hands },
    { key: "legs", label: "Nogi", value: outfit.legs },
    {
      key: "feet",
      label: "Stopy",
      value: `${outfit.feet.socks} (${outfit.feet.covers})`,
    },
    { key: "neck", label: "Szyja", value: outfit.neck },
  ];

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900">Szczegóły ubioru</h4>

      <div className="grid gap-3">
        {zones.map((zone) => {
          const config = getOutfitItemConfig(zone.key, zone.value);

          return (
            <div
              key={zone.key}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {/* Placeholder icon */}
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{zone.label}</div>
                  <div className="text-sm text-gray-600">
                    {config?.label || zone.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "przed chwilą";
  if (diffHours < 24) return `${diffHours} godzin temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tygodni temu`;
  return `${Math.floor(diffDays / 30)} miesięcy temu`;
}

export default function OutfitDetailModal({
  outfit,
  isOpen,
  onClose,
}: OutfitDetailModalProps) {
  if (!outfit) return null;

  const reputationLevel = getReputationLevel(outfit.feedback_count);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5" />
              <span>{outfit.user_pseudonym}</span>
              <ReputationBadge
                badge={reputationLevel}
                feedbackCount={outfit.feedback_count}
                size="sm"
              />
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Weather Conditions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Warunki pogodowe
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">
                    {outfit.weather_conditions.temperature}°C
                  </div>
                  <div className="text-xs text-gray-600">Temperatura</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">
                    {outfit.weather_conditions.feels_like}°C
                  </div>
                  <div className="text-xs text-gray-600">Odczuwalna</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">
                    {outfit.weather_conditions.wind_speed} km/h
                  </div>
                  <div className="text-xs text-gray-600">Wiatr</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">
                    {outfit.weather_conditions.humidity}%
                  </div>
                  <div className="text-xs text-gray-600">Wilgotność</div>
                </div>
              </div>
            </div>

            {outfit.weather_conditions.rain_mm > 0 && (
              <div className="mt-3 flex items-center gap-2 text-orange-600">
                <Droplets className="h-4 w-4" />
                <span className="text-sm">
                  Opady: {outfit.weather_conditions.rain_mm} mm
                </span>
              </div>
            )}
          </div>

          {/* Outfit Details */}
          <OutfitDetailSection outfit={outfit.outfit} />

          {/* Metadata */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-400" />
                <span>{ACTIVITY_TYPE_LABELS[outfit.activity_type]}</span>
              </div>

              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span>{outfit.overall_rating}/5</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{outfit.distance_km.toFixed(1)} km</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{formatTimeAgo(outfit.created_at || "")}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
