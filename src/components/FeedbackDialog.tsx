import { useState } from "react";
import { Star, Sparkles, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import WeatherSummary from "./WeatherSummary";
import { useDefaultLocation } from "../hooks/useLocationSelection";
import type {
  NewRecommendationDTO,
  FeedbackDTO,
  CreateFeedbackCommand,
  OutfitDTO,
  ZoneRatings,
} from "../types";
import { convertClothingItemsToOutfit } from "../lib/utils/outfit-converter";

/**
 * FeedbackDialog - Comprehensive feedback modal
 * Allows users to rate recommendations and provide detailed feedback
 */
interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: NewRecommendationDTO;
  onSubmitted: (feedback: FeedbackDTO) => void;
}

// Simple emoji rating component
function RatingEmojis({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const emojis = ["🥶", "😰", "😐", "😊", "🥵"];

  return (
    <div className="flex gap-2 justify-center">
      {emojis.map((emoji, index) => (
        <button
          key={index}
          onClick={() => onChange(index + 1)}
          className={`text-2xl p-2 rounded-lg transition-all ${
            value === index + 1
              ? "bg-primary/20 ring-2 ring-primary scale-110"
              : "hover:bg-accent hover:scale-105"
          }`}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Zone ratings input component
function ZoneRatingsInput({
  value,
  onChange,
}: {
  value: ZoneRatings;
  onChange: (ratings: ZoneRatings) => void;
}) {
  const zones = [
    { key: "head", label: "Głowa" },
    { key: "torso", label: "Tułów" },
    { key: "arms", label: "Ramiona" },
    { key: "hands", label: "Dłonie" },
    { key: "legs", label: "Nogi" },
    { key: "feet", label: "Stopy" },
    { key: "neck", label: "Szyja" },
  ] as const;

  const handleZoneChange = (zone: keyof ZoneRatings, rating: number) => {
    onChange({
      ...value,
      [zone]: rating,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {zones.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <Label className="text-sm font-medium">{label}</Label>
          <RatingEmojis
            value={value[key] || 0}
            onChange={(rating) => handleZoneChange(key, rating)}
          />
        </div>
      ))}
    </div>
  );
}

// Simple outfit editor for when user didn't follow recommendation
function OutfitEditor() {
  // This is a simplified version - in a real app you'd have proper selectors
  // For now, just return the outfit as-is
  return (
    <div className="p-4 bg-muted rounded-lg">
      <p className="text-sm text-muted-foreground mb-2">
        Edycja ubioru - funkcjonalność w trakcie implementacji
      </p>
      <p className="text-xs text-muted-foreground">
        Obecnie używa oryginalnej rekomendacji
      </p>
    </div>
  );
}

export default function FeedbackDialog({
  isOpen,
  onClose,
  recommendation,
  onSubmitted,
}: FeedbackDialogProps) {
  const { defaultLocation } = useDefaultLocation();
  const [followedRecommendation, setFollowedRecommendation] = useState<
    "yes" | "no"
  >("yes");
  const [actualOutfit, setActualOutfit] = useState<OutfitDTO>(
    convertClothingItemsToOutfit(recommendation.recommendation.items),
  );
  const [overallRating, setOverallRating] = useState(3);
  const [zoneRatings, setZoneRatings] = useState<ZoneRatings>({});
  const [notes, setNotes] = useState("");
  const [shareWithCommunity, setShareWithCommunity] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setFollowedRecommendation("yes");
    setActualOutfit(
      convertClothingItemsToOutfit(recommendation.recommendation.items),
    );
    setOverallRating(3);
    setZoneRatings({});
    setNotes("");
    setShareWithCommunity(true);
    setIsSubmitting(false);
    setSubmitted(false);
    setError(null);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const command: CreateFeedbackCommand = {
        location_id: defaultLocation?.locationId || undefined,
        temperature: recommendation.weather.temperature,
        feels_like: recommendation.weather.feels_like,
        wind_speed: recommendation.weather.wind_speed,
        humidity: recommendation.weather.humidity,
        rain_mm: recommendation.weather.rain_mm,
        activity_type: "spokojna", // TODO: Get from current filters
        duration_minutes: 90, // TODO: Get from current filters
        actual_outfit: actualOutfit,
        overall_rating: overallRating,
        zone_ratings:
          Object.keys(zoneRatings).length > 0 ? zoneRatings : undefined,
        notes: notes.trim() || undefined,
        shared_with_community: shareWithCommunity && !!defaultLocation,
      };

      const response = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || "Failed to submit feedback",
        );
      }

      const feedback: FeedbackDTO = await response.json();
      setSubmitted(true);
      setIsSubmitting(false);

      // Auto-close after success
      setTimeout(() => {
        handleClose();
        onSubmitted(feedback);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas zapisywania",
      );
      setIsSubmitting(false);
    }
  };

  const canSubmit = overallRating >= 1 && overallRating <= 5;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Oceń komfort rekomendacji
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Weather reminder */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Warunki pogodowe podczas treningu
            </Label>
            <WeatherSummary weather={recommendation.weather} compact />
          </div>

          {/* Followed recommendation question */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Czy zastosowałeś się do rekomendacji?
            </Label>
            <RadioGroup
              value={followedRecommendation}
              onValueChange={(value) =>
                setFollowedRecommendation(value as "yes" | "no")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="followed-yes" />
                <Label htmlFor="followed-yes">Tak, zastosowałem się</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="followed-no" />
                <Label htmlFor="followed-no">Nie, użyłem innego ubioru</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Outfit editor (only if not followed) */}
          {followedRecommendation === "no" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Edytuj faktycznie użyte ubranie
              </Label>
              <OutfitEditor />
            </div>
          )}

          {/* Overall rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-center block">
              Jak czułeś się termicznie podczas treningu?
            </Label>
            <RatingEmojis value={overallRating} onChange={setOverallRating} />
            <p className="text-xs text-center text-muted-foreground">
              1 = bardzo zimno, 3 = optymalnie, 5 = bardzo gorąco
            </p>
          </div>

          {/* Zone-specific ratings (optional) */}
          <Accordion type="single" collapsible>
            <AccordionItem value="zone-ratings">
              <AccordionTrigger className="text-sm">
                Oceń poszczególne strefy ciała (opcjonalnie)
              </AccordionTrigger>
              <AccordionContent>
                <ZoneRatingsInput
                  value={zoneRatings}
                  onChange={setZoneRatings}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Dodatkowe uwagi (opcjonalnie)
            </Label>
            <Textarea
              id="notes"
              placeholder="Opisz swoje doświadczenia, co sprawdziło się dobrze, co można poprawić..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500 znaków
            </p>
          </div>

          {/* Share with community */}
          <div className="space-y-2">
            <div
              className={`flex items-center justify-between p-3 rounded-lg ${
                defaultLocation
                  ? "bg-muted"
                  : "bg-orange-50 border border-orange-200"
              }`}
            >
              <div className="space-y-1">
                <Label
                  htmlFor="share-community"
                  className="text-sm font-medium"
                >
                  Udostępnij społeczności
                </Label>
                <p className="text-xs text-muted-foreground">
                  {defaultLocation
                    ? "Inni użytkownicy zobaczą Twoje doświadczenie"
                    : "Ustaw domyślną lokalizację aby udostępnić doświadczenie społeczności"}
                </p>
              </div>
              <Switch
                id="share-community"
                checked={shareWithCommunity && !!defaultLocation}
                onCheckedChange={(checked) => {
                  if (!defaultLocation && checked) {
                    // Don't allow enabling if no location
                    return;
                  }
                  setShareWithCommunity(checked);
                }}
                disabled={!defaultLocation}
              />
            </div>
            {!defaultLocation && (
              <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                <p className="text-xs text-orange-700">
                  Aby udostępnić feedback społeczności, ustaw domyślną
                  lokalizację w ustawieniach profilu.
                </p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {submitted && (
            <Alert>
              <Sparkles className="w-4 h-4" />
              <AlertDescription>
                Feedback zapisany! Dziękujemy za pomoc w poprawie rekomendacji.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Zapisuję..." : "Zapisz feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
