import { useState, useEffect } from "react";
import { useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useLocations } from "../../components/profile/hooks/useLocations";
import { useProfile } from "../../components/profile/hooks/useProfile";
import { WEATHER_REFRESH_INTERVAL_MS } from "./types";
import { SkeletonLoader } from "./SkeletonLoader";
import { ErrorDisplay } from "./ErrorDisplay";
import { WeatherSection } from "./WeatherSection";
import { EquipmentStatusSection } from "./EquipmentStatusSection";
import { CommunityActivitySection } from "./CommunityActivitySection";
import { PersonalizationStatusSection } from "./PersonalizationStatusSection";
import type { DashboardContainerProps } from "./types";

// Create a client for dashboard
const dashboardQueryClient = new QueryClient({
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

// Internal component that uses React Query hooks
function DashboardContainerInternal({
  userId,
  initialLocationId,
}: DashboardContainerProps) {
  const [currentLocationId, setCurrentLocationId] = useState<
    string | undefined
  >(initialLocationId);
  const [browserCoordinates, setBrowserCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const { data, isLoading, error, refetch, lastRefresh, coordinates } =
    useDashboardData(userId, currentLocationId, browserCoordinates);

  // Fetch user locations for the location selector
  const {
    locations: userLocations,
    isLoading: isLoadingLocations,
    fetchLocations,
  } = useLocations();

  // Profile hook for updating default location
  const { updateProfile } = useProfile();

  // Query client for invalidating cache
  const queryClient = useQueryClient();

  // Load user locations on mount and set default location from profile
  useEffect(() => {
    const loadInitialData = async () => {
      // Fetch user locations
      await fetchLocations();

      // If no location is selected initially, try to get default from profile
      if (!initialLocationId) {
        try {
          const profileResponse = await fetch("/api/profile", {
            credentials: "include",
          });
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            if (profile.default_location_id) {
              console.info(
                `Setting default location from profile: ${profile.default_location_id}`,
              );
              setCurrentLocationId(profile.default_location_id);
            }
          }
        } catch (error) {
          console.warn("Could not fetch profile for default location:", error);
        }
      }
    };

    loadInitialData();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select default location when locations are loaded and no location is selected
  useEffect(() => {
    if (userLocations.length > 0 && !currentLocationId) {
      const defaultLocation = userLocations.find((loc) => loc.is_default);
      if (defaultLocation) {
        console.info(
          `Auto-selecting default location from loaded locations: ${defaultLocation.city}`,
        );
        setCurrentLocationId(defaultLocation.id);
      }
    }
  }, [userLocations, currentLocationId]);

  useAutoRefresh({
    enabled: !!data && !error,
    intervalMs: WEATHER_REFRESH_INTERVAL_MS,
    onRefresh: refetch,
  });

  // Handle location change
  const handleLocationChange = async (
    locationId: string | null,
    coordinates?: { lat: number; lng: number },
  ) => {
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

    // If user selected a specific user location (not suggested city), update default location in profile
    if (locationId && !locationId.startsWith("suggested-city-") && locationId !== "browser") {
      try {
        await updateProfile({ default_location_id: locationId });
        console.log(`Updated default location to: ${locationId}`);

        // Invalidate default location cache so other components refresh
        queryClient.invalidateQueries({ queryKey: ["defaultLocation"] });
      } catch (error) {
        console.error("Failed to update default location:", error);
      }
    }
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

// Wrapper component with QueryClientProvider
export default function DashboardContainer(props: DashboardContainerProps) {
  return (
    <QueryClientProvider client={dashboardQueryClient}>
      <DashboardContainerInternal {...props} />
    </QueryClientProvider>
  );
}
