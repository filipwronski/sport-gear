import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedbackProgressBar } from "./FeedbackProgressBar";
import type { PersonalizationStatusSectionProps } from "./types";

export function PersonalizationStatusSection({
  data,
}: PersonalizationStatusSectionProps) {
  const handleAddFeedback = () => {
    window.location.href = "/feedbacks/new";
  };

  return (
    <section
      className="rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 p-6"
      aria-labelledby="personalization-heading"
    >
      <h2 id="personalization-heading" className="mb-4 text-lg font-semibold">
        Status personalizacji
      </h2>

      {data.personalization_active ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              ✓ Personalizacja aktywna
            </Badge>
            {data.thermal_adjustment !== 0 && (
              <span className="text-sm text-gray-600">
                Dostosowanie termiczne: {data.thermal_adjustment > 0 ? "+" : ""}
                {data.thermal_adjustment}°C
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600">
            AI analizuje Twoje preferencje i dostosowuje rekomendacje ubioru na
            podstawie {data.feedback_count} dodanych feedbacków.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Jeszcze {data.next_personalization_at - data.feedback_count}{" "}
            feedbacków do pełnej personalizacji
          </p>

          <FeedbackProgressBar
            current={data.feedback_count}
            target={data.next_personalization_at}
          />
        </div>
      )}

      <Button
        onClick={handleAddFeedback}
        variant="outline"
        size="sm"
        className="mt-4"
      >
        Dodaj feedback
      </Button>
    </section>
  );
}
