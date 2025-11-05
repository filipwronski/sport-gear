import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecommendationView from "./RecommendationView";
import WeeklyForecast from "./WeeklyForecast";
import OutfitHistory from "./OutfitHistory";
import { useDefaultLocation } from "@/hooks/useLocationSelection";

// Create a client for recommendations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: unknown) => {
        const status = (error as any)?.status;
        if (status >= 400 && status < 500) {
          return status === 408 || status === 429;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

interface RecommendationsTabsProps {
  defaultLocationId?: string;
}

export default function RecommendationsTabs({
  defaultLocationId,
}: RecommendationsTabsProps) {
  const [activeTab, setActiveTab] = useState("current");
  const { defaultLocation } = useDefaultLocation();

  return (
    <QueryClientProvider client={queryClient}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="current">Aktualna rekomendacja</TabsTrigger>
          <TabsTrigger value="forecast">Prognoza tygodniowa</TabsTrigger>
          <TabsTrigger value="history">Historia treningów</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          <RecommendationView defaultLocationId={defaultLocationId} />
        </TabsContent>

        {activeTab === "forecast" && (
          <TabsContent value="forecast" className="space-y-6">
            <WeeklyForecast
              location={defaultLocation?.location}
              onDaySelect={(date) => {
                // Switch to current tab with selected date
                // This would need URL state management for full implementation
                console.info("Selected date:", date);
                setActiveTab("current");
              }}
            />
          </TabsContent>
        )}

        {activeTab === "history" && (
          <TabsContent value="history" className="space-y-6">
            <OutfitHistory
              onOutfitClick={(outfit) => {
                // Handle outfit click - could open detailed view
                console.info("Clicked outfit:", outfit);
              }}
            />
          </TabsContent>
        )}
      </Tabs>
    </QueryClientProvider>
  );
}
