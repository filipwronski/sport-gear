import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RecommendationDTO } from "../types";

/**
 * AddFeedbackCTA - Call-to-action component for adding feedback
 * Encourages users to provide feedback after training for better personalization
 */
interface AddFeedbackCTAProps {
  onFeedbackClick: () => void;
  feedbackCount?: number;
}

export default function AddFeedbackCTA({
  onFeedbackClick,
  feedbackCount = 0,
}: AddFeedbackCTAProps) {
  const getPersonalizationMessage = () => {
    if (feedbackCount === 0) {
      return "Dodaj pierwszą ocenę aby rozpocząć personalizację rekomendacji!";
    } else if (feedbackCount < 5) {
      return `Masz ${feedbackCount}/5 ocen. Dodaj kolejną aby poprawić personalizację!`;
    } else {
      return "Świetnie! Masz już pełne dane do spersonalizowanych rekomendacji.";
    }
  };

  const isPersonalizationActive = feedbackCount >= 5;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <MessageSquarePlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Czy już trenowałeś?
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Oceń komfort rekomendacji aby poprawić przyszłe sugestie.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={onFeedbackClick}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <MessageSquarePlus className="w-4 h-4 mr-2" />
              Dodaj feedback po treningu
            </Button>

            <p className="text-xs text-blue-600 dark:text-blue-400">
              {getPersonalizationMessage()}
            </p>
          </div>

          {isPersonalizationActive && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                ✨ Personalizacja aktywna - Twoje rekomendacje są
                optymalizowane!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
