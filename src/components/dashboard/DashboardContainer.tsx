import { useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { WEATHER_REFRESH_INTERVAL_MS } from "./types";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorDisplay } from "./ErrorDisplay";
import { WeatherSection } from "./WeatherSection";
import { EquipmentStatusSection } from "./EquipmentStatusSection";
import { CommunityActivitySection } from "./CommunityActivitySection";
import { PersonalizationStatusSection } from "./PersonalizationStatusSection";
import { QuickActionsBar } from "./QuickActionsBar";
import type { DashboardContainerProps } from "./types";

export default function DashboardContainer({
  userId,
  initialLocationId,
}: DashboardContainerProps) {
  const [currentLocationId] = useState<
    string | undefined
  >(initialLocationId);

  const { data, isLoading, error, refetch, lastRefresh } = useDashboardData(
    userId,
    currentLocationId,
  );

  useAutoRefresh({
    enabled: !!data && !error,
    intervalMs: WEATHER_REFRESH_INTERVAL_MS,
    onRefresh: refetch,
  });

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <WeatherSection data={data.weather_summary} lastRefresh={lastRefresh} />

      <div className="grid gap-6 md:grid-cols-2 mb-6 md:mb-8">
        <div className="rounded-lg border bg-white p-6">
          <EquipmentStatusSection data={data.equipment_status} />
        </div>

        <div className="rounded-lg border bg-white p-6">
          <CommunityActivitySection data={data.community_activity} />
        </div>
      </div>

      <PersonalizationStatusSection data={data.personalization_status} />

      <QuickActionsBar currentLocationId={currentLocationId} />
    </div>
  );
}
