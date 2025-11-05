import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { WeatherDTO } from "../types";

/**
 * AdditionalTipsSection - AI-powered additional tips component
 * Shows button to load AI tips with rate limiting and loading states
 */
interface AdditionalTipsSectionProps {
  recommendationId?: string;
  weatherConditions: WeatherDTO;
  onTipsLoad?: (tips: string[]) => void;
}

export default function AdditionalTipsSection({
  recommendationId,
  weatherConditions,
  onTipsLoad,
}: AdditionalTipsSectionProps) {
  const [tips, setTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isRateLimited = rateLimitedUntil && new Date() < rateLimitedUntil;

  const handleLoadTips = async () => {
    if (isRateLimited) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommendations/ai-tips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          weather_conditions: weatherConditions,
        }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const rateLimitedUntil = retryAfter
          ? new Date(Date.now() + parseInt(retryAfter) * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default

        setRateLimitedUntil(rateLimitedUntil);
        setError(
          "Osiągnięto dzienny limit zapytań AI. Spróbuj ponownie jutro.",
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Nie udało się pobrać wskazówek AI");
      }

      const data: string[] = await response.json();
      setTips(data);

      if (onTipsLoad) {
        onTipsLoad(data);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas ładowania wskazówek",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeUntilReset = () => {
    if (!rateLimitedUntil) return "";

    const now = new Date();
    const diffMs = rateLimitedUntil.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffHours >= 24) return "jutro";
    if (diffHours > 1) return `za ${diffHours} godz.`;
    return "za mniej niż godzinę";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Dodatkowe wskazówki
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tips.length === 0 && !isLoading && !error && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Uzyskaj spersonalizowane wskazówki AI dostosowane do Twoich
              warunków treningowych.
            </p>
            <Button
              onClick={handleLoadTips}
              disabled={!!isRateLimited}
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Pokaż wskazówki AI
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Generuję wskazówki AI...
            </p>
          </div>
        )}

        {tips.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Wskazówki AI</span>
            </div>
            <ul className="space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-purple-500 mt-1">•</span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={handleLoadTips}
              disabled={isLoading || !!isRateLimited}
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Odśwież wskazówki
            </Button>
          </div>
        )}

        {error && (
          <Alert variant={isRateLimited ? "default" : "destructive"}>
            <AlertDescription>
              {isRateLimited
                ? `Limit zapytań AI został osiągnięty. Spróbuj ponownie ${formatTimeUntilReset()}.`
                : error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
