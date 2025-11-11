import { useState, useEffect } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useLocations } from "../../components/profile/hooks/useLocations";
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
  const [currentLocationId, setCurrentLocationId] = useState<string | undefined>(initialLocationId);
  const [browserCoordinates, setBrowserCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const { data, isLoading, error, refetch, lastRefresh, coordinates } =
    useDashboardData(userId, currentLocationId, browserCoordinates);

  // Fetch user locations for the location selector
  const {
    locations: userLocations,
    isLoading: isLoadingLocations,
    fetchLocations,
  } = useLocations();

  // Load user locations on mount
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useAutoRefresh({
    enabled: !!data && !error,
    intervalMs: WEATHER_REFRESH_INTERVAL_MS,
    onRefresh: refetch,
  });

  // Handle location change
  const handleLocationChange = (locationId: string | null, coordinates?: { lat: number; lng: number }) => {
    setCurrentLocationId(locationId || undefined);

    if (coordinates) {
      setBrowserCoordinates(coordinates);
    } else {
      setBrowserCoordinates(null);
    }

    // Update URL to persist location selection
    const url = new URL(window.location.href);
    if (locationId && locationId !== "browser") {
      url.searchParams.set("location_id", locationId);
    } else {
      url.searchParams.delete("location_id");
    }

    // Update URL without triggering a page reload
    window.history.replaceState({}, "", url.toString());
  };

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <WeatherSection
        data={data.weather_summary}
        lastRefresh={lastRefresh}
        coordinates={coordinates}
        currentLocationId={currentLocationId}
        userLocations={userLocations}
        isLoadingLocations={isLoadingLocations}
        onLocationChange={handleLocationChange}
      />

      <div className="grid gap-6 md:grid-cols-2 mb-6 md:mb-8">
        <div className="rounded-lg border bg-white p-6">
          <EquipmentStatusSection data={data.equipment_status} />
        </div>

        <div className="rounded-lg border bg-white p-6">
          <CommunityActivitySection data={data.community_activity} />
        </div>
      </div>

      <PersonalizationStatusSection data={data.personalization_status} />
    </div>
  );
}
