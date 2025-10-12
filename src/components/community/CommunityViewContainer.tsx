import React, { useState, useEffect } from "react";
import { CommunityViewState, LocationDTO, CommunityOutfitDTO } from "../../types";
import { useCommunityView } from "../../hooks/useCommunityView";
import CommunityHeader from "./CommunityHeader";
import CommunityFiltersPanel from "./CommunityFiltersPanel";
import ActiveFiltersDisplay from "./ActiveFiltersDisplay";
import OutfitsList from "./OutfitsList";
import OutfitDetailModal from "./OutfitDetailModal";

export default function CommunityViewContainer() {
  const [userLocations, setUserLocations] = useState<LocationDTO[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "shared">("browse");
  const [sharedOutfits, setSharedOutfits] = useState<CommunityOutfitDTO[]>([]);
  const [isLoadingShared, setIsLoadingShared] = useState(false);

  // Get default location ID from user's locations
  const defaultLocationId = userLocations.find((l) => l.is_default)?.id;

  const {
    state,
    setFilters,
    resetFilters,
    loadMore,
    openOutfitDetail,
    closeOutfitDetail,
    refetch,
  } = useCommunityView({ defaultLocationId });

  // Fetch user locations on mount
  useEffect(() => {
    fetchUserLocations();
  }, []);

  // Fetch shared outfits when tab changes to 'shared'
  useEffect(() => {
    if (activeTab === "shared") {
      fetchSharedOutfits();
    }
  }, [activeTab]);

  const fetchSharedOutfits = async () => {
    try {
      setIsLoadingShared(true);
      const response = await fetch(
        "/api/feedbacks?shared_with_community=true&limit=50&sort=created_at_desc",
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch shared outfits");
      }

      const data = await response.json();
      setSharedOutfits(data.feedbacks || []);
    } catch (error) {
      console.error("Error fetching shared outfits:", error);
      setSharedOutfits([]);
    } finally {
      setIsLoadingShared(false);
    }
  };

  const fetchUserLocations = async () => {
    try {
      setIsLoadingLocations(true);
      setLocationError(null);

      const response = await fetch("/api/locations");

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if not authenticated
          window.location.href = "/auth/login";
          return;
        }
        throw new Error("Failed to fetch locations");
      }

      const data = await response.json();
      setUserLocations(data.locations || []);
    } catch (error) {
      console.error("Error fetching user locations:", error);
      setLocationError("Failed to load locations");
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Show loading state while fetching locations
  if (isLoadingLocations) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie lokalizacji...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if locations failed to load
  if (locationError) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{locationError}</p>
            <button
              onClick={fetchUserLocations}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no locations
  if (userLocations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Nie masz jeszcze żadnych lokalizacji.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Dodaj lokalizację w ustawieniach profilu, aby móc przeglądać
              zestawy społeczności.
            </p>
            <button
              onClick={() => (window.location.href = "/profile")}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Przejdź do profilu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleFiltersChange = (
    filters: Partial<CommunityViewState["filters"]>,
  ) => {
    setFilters(filters);
  };

  const handleResetFilters = () => {
    resetFilters();
  };

  const handleOutfitClick = (outfitId: string) => {
    openOutfitDetail(outfitId);
  };

  // Determine which data to show based on active tab
  const currentOutfits = activeTab === "shared" ? sharedOutfits : state.outfits;
  const currentLoading =
    activeTab === "shared" ? isLoadingShared : state.isLoading;
  const currentError = activeTab === "shared" ? null : state.error; // Shared outfits don't have complex filtering errors
  const currentHasMore = activeTab === "shared" ? false : state.hasMore; // No pagination for shared outfits for now

  return (
    <div className="container mx-auto px-4 py-6">
      <CommunityHeader
        onRefresh={activeTab === "browse" ? refetch : fetchSharedOutfits}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRefreshing={currentLoading}
      />

      {activeTab === "browse" ? (
        // Browse tab - show filters and community outfits
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <CommunityFiltersPanel
              filters={state.filters}
              onFiltersChange={handleFiltersChange}
              onReset={handleResetFilters}
              userLocations={userLocations}
              isMobile={false}
            />
          </aside>

          <main className="lg:col-span-3">
            <ActiveFiltersDisplay
              filters={state.filters}
              onRemoveFilter={(key) => {
                // Reset specific filter to default value
                const defaultValues: Record<string, any> = {
                  location_id: state.filters.location_id, // Keep location
                  radius_km: 50,
                  temperature: undefined,
                  temperature_range: 3,
                  wind_speed: undefined,
                  activity_type: undefined,
                  min_rating: undefined,
                  reputation_filter: undefined,
                  time_range: 24,
                  sort: "reputation" as const,
                  limit: 10,
                  offset: 0,
                };

                setFilters({ [key]: defaultValues[key] });
              }}
              onClearAll={handleResetFilters}
            />

            <OutfitsList
              outfits={currentOutfits}
              isLoading={currentLoading}
              error={currentError}
              onOutfitClick={handleOutfitClick}
              onLoadMore={currentHasMore ? loadMore : undefined}
              hasMore={currentHasMore}
              currentFilters={state.filters}
              onExpandRadius={() =>
                setFilters({ radius_km: (state.filters.radius_km || 50) * 2 })
              }
              onResetFilters={handleResetFilters}
            />
          </main>
        </div>
      ) : (
        // Shared tab - show user's shared outfits without filters
        <div className="max-w-6xl mx-auto">
          <OutfitsList
            outfits={currentOutfits}
            isLoading={currentLoading}
            error={currentError}
            onOutfitClick={handleOutfitClick}
            onLoadMore={undefined} // No pagination for shared outfits
            hasMore={false}
          />
        </div>
      )}

      {/* Mobile Filters Panel - only show for browse tab */}
      {activeTab === "browse" && (
        <div className="lg:hidden mt-6">
          <CommunityFiltersPanel
            filters={state.filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
            userLocations={userLocations}
            isMobile={true}
          />
        </div>
      )}

      <OutfitDetailModal
        outfit={state.selectedOutfit}
        isOpen={state.selectedOutfitId !== null}
        onClose={closeOutfitDetail}
      />
    </div>
  );
}
