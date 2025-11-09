import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ClothingItem, ClothingRecommendationDTO } from "../types";

interface OutfitRecommendationListProps {
  recommendation: ClothingRecommendationDTO;
  title?: string;
  expandedZone?: string;
}

/**
 * OutfitRecommendationList - Simple list display of recommended clothing items
 */
export default function OutfitRecommendationList({
  recommendation,
  title: _title = "Zalecane ubranie",
  expandedZone: _expandedZone,
}: OutfitRecommendationListProps) {
  const getClothingLabel = (item: ClothingItem): string => {
    const labels: Record<ClothingItem, string> = {
      nogawki: "Nogawki",
      rękawki: "Rękawki",
      "koszulka termoaktywna": "Koszulka termoaktywna",
      bluza: "Bluza",
      kurtka: "Kurtka",
      "krótkie spodenki": "Krótkie spodenki",
      "długie spodnie": "Długie spodnie",
      czapka: "Czapka",
      "rękawiczki letnie": "Rękawiczki letnie",
      "rękawiczki jesienne": "Rękawiczki jesienne",
      "rękawiczki zimowe": "Rękawiczki zimowe",
      "skarpetki letnie": "Skarpetki letnie",
      "skarpetki zimowe": "Skarpetki zimowe",
      "noski na buty": "Noski na buty",
      "ochraniacze na buty": "Ochraniacze na buty",
      "komin na szyję": "Komin na szyję",
      "kurtka przeciwwiatrowa": "Kurtka przeciwwiatrowa",
      "kurtka zimowa": "Kurtka zimowa",
      "kamizelka przeciwwiatrowa": "Kamizelka przeciwwiatrowa",
    };
    return labels[item];
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      head: "Głowa",
      neck: "Szyja",
      torso: "Tułów",
      arms: "Ramiona",
      hands: "Dłonie",
      legs: "Nogi",
      feet: "Stopy",
      other: "Inne",
    };
    return labels[category] || category;
  };

  const getClothingCategory = (item: ClothingItem): string => {
    if (
      item.includes("koszulka") ||
      item.includes("bluza") ||
      item.includes("kurtka") ||
      item.includes("kamizelka")
    ) {
      return "torso";
    }
    if (
      item.includes("spodenki") ||
      item.includes("spodnie") ||
      item.includes("nogawki")
    ) {
      return "legs";
    }
    if (item.includes("rękawiczki") || item.includes("rękawki")) {
      return "hands"; // Changed to match CyclistSVG zone name
    }
    if (item.includes("czapka")) {
      return "head";
    }
    if (item.includes("szyję") || item.includes("komin")) {
      return "neck";
    }
    if (item.includes("noski") || item.includes("ochraniacze") || item.includes("skarpetki")) {
      return "feet";
    }
    return "other";
  };

  // Group items by category
  const groupedItems = recommendation.items.reduce(
    (acc, item) => {
      const category = getClothingCategory(item);
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, ClothingItem[]>,
  );

  // Define the logical order of body parts for display
  const categoryOrder = [
    "head",
    "neck",
    "torso",
    "arms",
    "hands",
    "legs",
    "feet",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Szczegóły rekomendacji
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categoryOrder
            .filter(
              (category) =>
                groupedItems[category] && groupedItems[category].length > 0,
            )
            .map((category) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(category)}
                  </Badge>
                </div>
                <div className="ml-4 space-y-1">
                  {groupedItems[category].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{getClothingLabel(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {recommendation.items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak rekomendacji ubioru dla tych warunków</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
