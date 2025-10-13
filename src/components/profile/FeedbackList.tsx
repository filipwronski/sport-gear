import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Star,
  Clock,
  Thermometer,
  Wind,
  Droplets,
  Trash2,
} from "lucide-react";
import type { FeedbackDTO, ActivityTypeEnum } from "../../types";

interface FeedbackListProps {
  feedbacks: FeedbackDTO[];
  onDeleteFeedback?: (feedbackId: string) => Promise<void>;
  isDeleting?: boolean;
}

const ACTIVITY_LABELS: Record<ActivityTypeEnum, string> = {
  recovery: "Regeneracja",
  spokojna: "Spokojna",
  tempo: "Tempo",
  interwaly: "Interwały",
};

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating}/5</span>
    </div>
  );
}

function FeedbackCard({
  feedback,
  onDelete,
  isDeleting,
}: {
  feedback: FeedbackDTO;
  onDelete?: (feedbackId: string) => Promise<void>;
  isDeleting?: boolean;
}) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Brak daty";
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(feedback.created_at)}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(feedback.duration_minutes)}
              </div>
              <Badge variant="secondary" className="text-xs">
                {ACTIVITY_LABELS[feedback.activity_type]}
              </Badge>
            </div>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(feedback.id)}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weather Conditions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1 sm:gap-2">
            <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
            <span className="truncate">{feedback.temperature}°C</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Thermometer className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
            <span className="truncate">Odcz.: {feedback.feels_like}°C</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Wind className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            <span className="truncate">{feedback.wind_speed} km/h</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Droplets className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
            <span className="truncate">{feedback.humidity}%</span>
          </div>
        </div>

        <Separator />

        {/* Rating */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ocena ogólna</span>
            {renderStars(feedback.overall_rating)}
          </div>
        </div>

        {/* Notes */}
        {feedback.notes && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Notatki</span>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
              {feedback.notes}
            </p>
          </div>
        )}

        {/* Location */}
        {feedback.location_id && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Lokalizacja zapisana</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FeedbackList({ feedbacks, onDeleteFeedback, isDeleting }: FeedbackListProps) {
  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Star className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Brak feedbacków</h3>
          <p className="text-sm text-muted-foreground text-center">
            Nie dodałeś jeszcze żadnego feedbacku po treningu.
            Rozpocznij dodawanie opinii, aby budować swoją reputację!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedbacks.map((feedback) => (
        <FeedbackCard
          key={feedback.id}
          feedback={feedback}
          onDelete={onDeleteFeedback}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}
