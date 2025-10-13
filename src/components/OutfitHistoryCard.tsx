import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import type { FeedbackDTO } from "../types";

/**
 * OutfitHistoryCard - Displays a past outfit from feedback history
 * Shows date, weather conditions, outfit preview, and rating
 */
interface OutfitHistoryCardProps {
  outfit: FeedbackDTO;
  onClick?: () => void;
}

export default function OutfitHistoryCard({ outfit, onClick }: OutfitHistoryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatActivityType = (activityType: string) => {
    const types: Record<string, string> = {
      recovery: "Recovery",
      spokojna: "Spokojna",
      tempo: "Tempo",
      interwaly: "Interwały"
    };
    return types[activityType] || activityType;
  };

  // Simple outfit preview - show key items
  const getOutfitPreview = () => {
    const items = [];
    if (outfit.actual_outfit.head) items.push("🧢");
    if (outfit.actual_outfit.torso?.outer) items.push("🦺");
    if (outfit.actual_outfit.arms) items.push("👕");
    if (outfit.actual_outfit.hands) items.push("🧤");
    if (outfit.actual_outfit.legs) items.push("👖");
    if (outfit.actual_outfit.feet?.socks) items.push("🧦");

    return items.slice(0, 4).join(" "); // Show max 4 items
  };

  const truncateNotes = (notes: string | null, maxLength: number = 50) => {
    if (!notes) return null;
    return notes.length > maxLength ? `${notes.substring(0, maxLength)}...` : notes;
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? "hover:bg-accent/50" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with date and rating */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {formatDate(outfit.created_at || "")}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-current text-yellow-500" />
              <span className="text-sm font-medium">{outfit.overall_rating}/5</span>
            </div>
          </div>

          {/* Weather conditions */}
          <div className="text-xs text-muted-foreground">
            {outfit.temperature}°C, 💨 {outfit.wind_speed} km/h
            {outfit.rain_mm && outfit.rain_mm > 0 && `, 🌧️ ${outfit.rain_mm} mm`}
          </div>

          {/* Outfit preview */}
          <div className="flex items-center gap-2">
            <div className="text-lg">
              {getOutfitPreview() || "👕"}
            </div>
            <span className="text-sm text-muted-foreground">
              {formatActivityType(outfit.activity_type)}
            </span>
          </div>

          {/* Notes preview */}
          {outfit.notes && (
            <p className="text-xs text-muted-foreground italic">
              "{truncateNotes(outfit.notes)}"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
